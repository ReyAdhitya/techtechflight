# TechTech Flight — AI detection service

Local **YOLO11x** (Ultralytics) inference for the board. Runs next to the ground station on
the classroom PC. **CUDA when an NVIDIA GPU is present, CPU otherwise** — same API.

The static Vercel deploy does **not** run this service. The board falls back to in-browser
YOLOv8n wasm (or the demo detector) when `http://127.0.0.1:8090/health` is unreachable.

## Quick start (Windows)

```bat
cd ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
set YOLO_MODEL=yolo11x.pt
uvicorn app.main:app --host 127.0.0.1 --port 8090
```

First boot downloads `yolo11x.pt` via Ultralytics (large). Subsequent boots reuse the cache.

Point the board at the service (one of):

- Env at build time: `NEXT_PUBLIC_AI_DETECT_URL=http://127.0.0.1:8090`
- Or in the browser console / Settings later:  
  `localStorage.setItem('techtechflight:ai-detect-url', 'http://127.0.0.1:8090')`  
  then reload.

Open `/vision` — **Runs on** should read `AI service (CUDA)` or `AI service (CPU)`.

## Config (env)

| Variable | Default | Meaning |
|---|---|---|
| `YOLO_MODEL` | `yolo11x.pt` | Ultralytics id or path to custom `best.pt` |
| `YOLO_IMGSZ` | `1280` | Letterbox edge; clamped 1024–1536 |
| `YOLO_CONF` | `0.25` | Confidence threshold |
| `YOLO_IOU` | `0.45` | NMS IoU |
| `YOLO_TRACKER` | `bytetrack.yaml` | Or `botsort.yaml` |
| `HOST` / `PORT` | `127.0.0.1` / `8090` | Bind address |

## API

- `GET /health` → `{ status, device, model_id, imgsz, tracker, model_path }`
- `POST /detect` multipart `file` (+ optional `track=true`)
- `POST /detect/json` `{ "image_base64": "...", "track": false }`
- `WS /stream` — binary JPEG frames in, detection JSON out (tracking on)

Boxes are normalised **0–1** (same shape as the board's `Detection`).

## Custom-trained weights

```bat
yolo train data=path/to/data.yaml model=yolo11x.pt epochs=100
set YOLO_MODEL=runs\detect\train\weights\best.pt
uvicorn app.main:app --host 127.0.0.1 --port 8090
```

No board code change — `model_registry` loads whatever path you set.

## Docker

```bat
docker compose --profile ai up ai-service
```

GPU host with NVIDIA Container Toolkit:

```bat
docker compose --profile ai-gpu up ai-service-gpu
```

## TensorRT (optional later)

```bat
yolo export model=yolo11x.pt format=engine imgsz=1280
set YOLO_MODEL=yolo11x.engine
```

Not required for v1. Use when a classroom GPU needs lower latency after the `.pt` path works.

## Tests

```bat
cd ai-service
pytest -q
```

These do not download weights; they cover device selection and box normalisation.
