"""Run YOLO predict / track and normalise boxes to 0–1 for the board overlay."""

from __future__ import annotations

import time
from typing import Any

import numpy as np

from .device import resolve_device
from .model_registry import conf, get_model, imgsz, iou, model_id, tracker_name


def _normalise_detections(
    result: Any,
    src_w: int,
    src_h: int,
    *,
    with_tracks: bool,
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    boxes = getattr(result, "boxes", None)
    if boxes is None:
        return out

    names = result.names if hasattr(result, "names") else {}
    try:
        xyxy = np.asarray(boxes.xyxy.cpu().numpy())
    except Exception:
        return out
    if xyxy.size == 0:
        return out
    scores = np.asarray(boxes.conf.cpu().numpy())
    classes = np.asarray(boxes.cls.cpu().numpy()).astype(int)
    track_ids = None
    if with_tracks and getattr(boxes, "id", None) is not None:
        track_ids = np.asarray(boxes.id.cpu().numpy()).astype(int)

    for i in range(len(xyxy)):
        x1, y1, x2, y2 = xyxy[i]
        bw = max(1.0, float(x2 - x1))
        bh = max(1.0, float(y2 - y1))
        label = names.get(int(classes[i]), f"class-{int(classes[i])}")
        tid = None
        if track_ids is not None:
            tid = str(int(track_ids[i]))
        out.append(
            {
                "id": f"yolo-{i}-{int(classes[i])}" + (f"-{tid}" if tid else ""),
                "label": str(label),
                "confidence": float(scores[i]),
                "box": {
                    "x": float(x1) / src_w,
                    "y": float(y1) / src_h,
                    "width": bw / src_w,
                    "height": bh / src_h,
                },
                "track_id": tid,
            }
        )
    return out


def detect_image(image_bgr: np.ndarray, *, track: bool = False) -> dict[str, Any]:
    """
    image_bgr: OpenCV BGR ndarray (H, W, 3).
    track: use ByteTrack/BoT-SORT when True (stream path).
    """
    h, w = image_bgr.shape[:2]
    model = get_model()
    device = resolve_device()
    kwargs = dict(
        source=image_bgr,
        imgsz=imgsz(),
        conf=conf(),
        iou=iou(),
        device=device,
        verbose=False,
    )

    if track:
        results = model.track(**kwargs, tracker=tracker_name(), persist=True)
        with_tracks = True
    else:
        results = model.predict(**kwargs)
        with_tracks = False

    result = results[0]
    detections = _normalise_detections(result, w, h, with_tracks=with_tracks)
    return {
        "detections": detections,
        "ts": int(time.time() * 1000),
        "model_id": model_id(),
        "device": device,
    }
