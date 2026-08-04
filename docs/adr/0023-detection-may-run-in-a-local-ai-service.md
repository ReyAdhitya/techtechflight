# Detection may run in a local AI service; browser wasm remains the fallback

Object detection on the board may be performed by a **local Python FastAPI service**
running Ultralytics YOLO11x (or Teacher-supplied weights) on the classroom machine.
CUDA is used when present; CPU otherwise. The in-browser YOLOv8n ONNX path and the demo
detector remain the fallbacks when the service is unset or unreachable.

## Context

The board historically ran YOLOv8n entirely in the browser (`onnxruntime-web`). That path
satisfies ADR-0002 (local-first, works offline once weights are fetched) and ADR-0005
(static export / Vercel). It does not satisfy a Teacher who needs YOLO11x-class accuracy,
ByteTrack ids, or custom-trained weights.

Moving inference into Telemetry or the ground-station Node process would couple vision to
Fleet State and break the rule that stream URLs and detection boxes never ride the wire.

## Decision

1. **Optional local AI service** at `ai-service/` (default `http://127.0.0.1:8090`).
2. **`boardDetector()` preference order:** reachable AI service → YOLOv8n wasm → demo.
3. **Same `ObjectDetector` seam** — overlays and Vision check do not care which backend ran.
4. **No boxes on Telemetry / MAVLink.** Session-only track ids stay in the detector result.
5. **Vercel / static demo** does not host YOLO11x; it keeps wasm/demo.

## Consequences

- A classroom with Python (or Docker) can opt into YOLO11x without rewriting Control/Fleet.
- A classroom without the service is unchanged.
- RTX is an acceleration, not a requirement.
- Operators must not assume Vercel preview equals classroom AI-service behaviour.

## Alternatives rejected

- **Cloud-only GPU API** — breaks offline classroom teaching (ADR-0002).
- **Rewriting the board around a new vision stack** — unnecessary; the seam already exists.
- **Bundling YOLO11x into the Next static export** — weights and runtime do not fit.
