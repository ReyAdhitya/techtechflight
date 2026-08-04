"""
Load a YOLO weights file by path or Ultralytics model id.

Swapping YOLO11x for a custom-trained `best.pt` is an env change, not an API change.
"""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Any

from .device import resolve_device


def model_path() -> str:
    return os.environ.get("YOLO_MODEL", "yolo11x.pt")


def imgsz() -> int:
    raw = int(os.environ.get("YOLO_IMGSZ", "1280"))
    return max(1024, min(1536, raw))


def conf() -> float:
    return float(os.environ.get("YOLO_CONF", "0.25"))


def iou() -> float:
    return float(os.environ.get("YOLO_IOU", "0.45"))


def tracker_name() -> str:
    """bytetrack.yaml or botsort.yaml — Ultralytics tracker configs."""
    name = os.environ.get("YOLO_TRACKER", "bytetrack.yaml").strip()
    return name or "bytetrack.yaml"


@lru_cache(maxsize=1)
def get_model() -> Any:
    from ultralytics import YOLO

    path = model_path()
    model = YOLO(path)
    # Move once; Ultralytics also accepts device= on predict/track.
    device = resolve_device()
    try:
        model.to(device)
    except Exception:
        pass
    return model


def model_id() -> str:
    path = model_path()
    base = os.path.basename(path)
    return os.path.splitext(base)[0] or path
