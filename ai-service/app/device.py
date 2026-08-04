"""Pick CUDA when present, otherwise CPU — same API either way."""

from __future__ import annotations


def resolve_device() -> str:
    try:
        import torch

        if torch.cuda.is_available():
            return "cuda"
    except Exception:
        pass
    return "cpu"
