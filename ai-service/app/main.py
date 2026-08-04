"""
Local AI detection service for TechTech Flight.

YOLO11x (or any Ultralytics weights) over HTTP + WebSocket. CUDA when available,
CPU otherwise. Bind localhost by default — the board opens this from the same machine.
"""

from __future__ import annotations

import base64
import json
import os
from typing import Any

import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .device import resolve_device
from .infer import detect_image
from .model_registry import get_model, imgsz, model_id, model_path, tracker_name

app = FastAPI(title="TechTech Flight AI service", version="1.0.0")

# Board may be on :3000 / :4321 while this is on :8090.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Health(BaseModel):
    status: str
    device: str
    model_id: str
    imgsz: int
    tracker: str
    model_path: str


class Base64DetectBody(BaseModel):
    image_base64: str = Field(..., description="Raw base64 or data-URL JPEG/PNG")
    track: bool = False


@app.on_event("startup")
def warm_model() -> None:
    """Load weights at boot so the first Teacher frame is not the download."""
    get_model()


@app.get("/health", response_model=Health)
def health() -> Health:
    return Health(
        status="ok",
        device=resolve_device(),
        model_id=model_id(),
        imgsz=imgsz(),
        tracker=tracker_name(),
        model_path=model_path(),
    )


def _decode_upload(data: bytes) -> np.ndarray:
    arr = np.frombuffer(data, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("could not decode image")
    return image


def _decode_base64(payload: str) -> np.ndarray:
    raw = payload
    if "," in raw and raw.strip().startswith("data:"):
        raw = raw.split(",", 1)[1]
    data = base64.b64decode(raw)
    return _decode_upload(data)


@app.post("/detect")
async def detect_upload(
    file: UploadFile = File(...),
    track: bool = False,
) -> dict[str, Any]:
    data = await file.read()
    image = _decode_upload(data)
    return detect_image(image, track=track)


@app.post("/detect/json")
async def detect_json(body: Base64DetectBody) -> dict[str, Any]:
    image = _decode_base64(body.image_base64)
    return detect_image(image, track=body.track)


@app.websocket("/stream")
async def stream(ws: WebSocket) -> None:
    """
    Client sends binary JPEG/WebP frames (or JSON {"image_base64": "..."}).
    Server replies with detection JSON at inference pace — not a fixed FPS.
    """
    await ws.accept()
    try:
        while True:
            message = await ws.receive()
            if message.get("type") == "websocket.disconnect":
                break
            image: np.ndarray | None = None
            if message.get("bytes") is not None:
                image = _decode_upload(message["bytes"])
            elif message.get("text") is not None:
                payload = json.loads(message["text"])
                image = _decode_base64(payload["image_base64"])
            if image is None:
                await ws.send_json({"error": "no frame", "detections": []})
                continue
            result = detect_image(image, track=True)
            await ws.send_json(result)
    except WebSocketDisconnect:
        return
    except Exception as exc:  # noqa: BLE001 — surface to client, keep socket honest
        try:
            await ws.send_json({"error": str(exc), "detections": []})
        except Exception:
            return


def run() -> None:
    import uvicorn

    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8090"))
    uvicorn.run("app.main:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    run()
