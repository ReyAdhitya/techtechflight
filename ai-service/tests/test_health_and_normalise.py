"""Smoke tests that do not require YOLO weights or a GPU."""

from __future__ import annotations

from app.device import resolve_device
from app.infer import _normalise_detections
from app.model_registry import imgsz


class _Tensor:
    def __init__(self, rows: list[list[float]] | list[float]) -> None:
        import numpy as np

        self._arr = np.asarray(rows, dtype=float)

    def cpu(self) -> "_Tensor":
        return self

    def numpy(self):  # noqa: ANN201
        return self._arr

    def astype(self, dtype):  # noqa: ANN001, ANN201
        return self._arr.astype(dtype)


class _FakeBoxes:
    xyxy = _Tensor([[10.0, 20.0, 110.0, 220.0]])
    conf = _Tensor([0.91])
    cls = _Tensor([0.0])
    id = _Tensor([7.0])


class _FakeResult:
    names = {0: "person"}
    boxes = _FakeBoxes()


def test_imgsz_clamped() -> None:
    assert 1024 <= imgsz() <= 1536


def test_device_is_cpu_or_cuda() -> None:
    assert resolve_device() in {"cpu", "cuda"}


def test_normalise_with_track_id() -> None:
    dets = _normalise_detections(_FakeResult(), src_w=200, src_h=400, with_tracks=True)
    assert len(dets) == 1
    d = dets[0]
    assert d["label"] == "person"
    assert d["track_id"] == "7"
    assert abs(d["box"]["x"] - 0.05) < 1e-6
    assert abs(d["box"]["width"] - 0.5) < 1e-6
