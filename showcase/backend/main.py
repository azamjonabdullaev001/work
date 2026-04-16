"""
Project Showcase — FastAPI Backend
Features: ZIP upload with versioning, file tree, live preview, download, README rendering
"""

import json
import os
import shutil
import tempfile
import time
import uuid
import zipfile
from pathlib import Path
from typing import Dict, List, Optional

import markdown
from fastapi import (
    FastAPI,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from starlette.background import BackgroundTask

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
STORAGE_DIR = Path("storage")
METADATA_FILE = STORAGE_DIR / "projects.json"
MAX_UPLOAD_SIZE = 50 * 1024 * 1024          # 50 MB
MAX_FILES_IN_ZIP = 5000                      # zip-bomb guard
ALLOWED_ORIGINS = ["http://localhost:3000"]

# ---------------------------------------------------------------------------
# App & middleware
# ---------------------------------------------------------------------------
app = FastAPI(title="Project Showcase API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# WebSocket connection manager (live-preview updates)
# ---------------------------------------------------------------------------
class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, ws: WebSocket, project_id: str):
        await ws.accept()
        self.active.setdefault(project_id, []).append(ws)

    def disconnect(self, ws: WebSocket, project_id: str):
        conns = self.active.get(project_id, [])
        if ws in conns:
            conns.remove(ws)

    async def notify(self, project_id: str, message: dict):
        for ws in list(self.active.get(project_id, [])):
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(ws, project_id)


manager = ConnectionManager()

# ---------------------------------------------------------------------------
# Metadata helpers (simple JSON file — no DB required)
# ---------------------------------------------------------------------------
def _init_storage():
    STORAGE_DIR.mkdir(exist_ok=True)
    if not METADATA_FILE.exists():
        METADATA_FILE.write_text(json.dumps({"projects": {}}, indent=2))


def load_metadata() -> dict:
    return json.loads(METADATA_FILE.read_text(encoding="utf-8"))


def save_metadata(data: dict):
    METADATA_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False))


_init_storage()

# ---------------------------------------------------------------------------
# Utility: recursive file-tree builder
# ---------------------------------------------------------------------------
def build_file_tree(directory: Path, base: Optional[Path] = None) -> List[dict]:
    if base is None:
        base = directory
    tree: list = []
    try:
        for item in sorted(directory.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower())):
            rel = str(item.relative_to(base)).replace("\\", "/")
            if item.is_dir():
                tree.append({
                    "name": item.name,
                    "path": rel,
                    "type": "directory",
                    "children": build_file_tree(item, base),
                })
            else:
                tree.append({
                    "name": item.name,
                    "path": rel,
                    "type": "file",
                    "size": item.stat().st_size,
                })
    except PermissionError:
        pass
    return tree

# ---------------------------------------------------------------------------
# Security: path-traversal guard
# ---------------------------------------------------------------------------
def safe_resolve(base: Path, user_path: str) -> Path:
    resolved = (base / user_path).resolve()
    if not str(resolved).startswith(str(base.resolve())):
        raise HTTPException(status_code=403, detail="Access denied")
    if resolved.is_symlink():
        raise HTTPException(status_code=403, detail="Symlinks not allowed")
    return resolved

# ---------------------------------------------------------------------------
# ZIP extraction with security checks
# ---------------------------------------------------------------------------
def extract_zip_safely(zip_bytes: bytes, dest: Path):
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
    try:
        tmp.write(zip_bytes)
        tmp.close()

        with zipfile.ZipFile(tmp.name, "r") as zf:
            names = zf.namelist()
            if len(names) > MAX_FILES_IN_ZIP:
                raise HTTPException(400, "ZIP contains too many files")
            for name in names:
                if name.startswith("/") or ".." in name:
                    raise HTTPException(400, "Invalid file paths in ZIP")
            zf.extractall(dest)
    except zipfile.BadZipFile:
        raise HTTPException(400, "Invalid ZIP file")
    finally:
        os.unlink(tmp.name)

    # Flatten single root-directory wrapper (common pattern)
    items = list(dest.iterdir())
    if len(items) == 1 and items[0].is_dir():
        wrapper = items[0]
        for child in list(wrapper.iterdir()):
            shutil.move(str(child), str(dest / child.name))
        wrapper.rmdir()


# ===================================================================
#  API ENDPOINTS
# ===================================================================

# 1. Upload project (creates new project or new version)
# -------------------------------------------------------------------
@app.post("/api/projects/upload")
async def upload_project(
    file: UploadFile = File(...),
    project_name: str = Form(...),
    project_id: Optional[str] = Form(None),
):
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(400, "Only .zip files are accepted")

    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(400, f"File exceeds {MAX_UPLOAD_SIZE // (1024*1024)} MB limit")

    metadata = load_metadata()

    # Existing project → new version, else create fresh
    if project_id and project_id in metadata["projects"]:
        project = metadata["projects"][project_id]
        version_num = project["latest_version"] + 1
    else:
        project_id = uuid.uuid4().hex[:12]
        project = {
            "id": project_id,
            "name": project_name,
            "created_at": time.time(),
            "latest_version": 0,
            "versions": [],
        }
        version_num = 1

    version_tag = f"v{version_num}"
    version_dir = STORAGE_DIR / project_id / version_tag
    version_dir.mkdir(parents=True, exist_ok=True)

    try:
        extract_zip_safely(content, version_dir)
    except HTTPException:
        shutil.rmtree(version_dir, ignore_errors=True)
        raise
    except Exception as exc:
        shutil.rmtree(version_dir, ignore_errors=True)
        raise HTTPException(500, f"Extraction failed: {exc}")

    has_index = (version_dir / "index.html").exists()
    has_readme = (version_dir / "README.md").exists()
    file_count = sum(1 for _ in version_dir.rglob("*") if _.is_file())

    version_info = {
        "version": version_tag,
        "uploaded_at": time.time(),
        "has_index": has_index,
        "has_readme": has_readme,
        "file_count": file_count,
    }

    project["latest_version"] = version_num
    project["versions"].append(version_info)
    metadata["projects"][project_id] = project
    save_metadata(metadata)

    # Notify connected WebSocket clients
    await manager.notify(project_id, {
        "type": "new_version",
        "version": version_tag,
        "project_id": project_id,
    })

    return {
        "project_id": project_id,
        "version": version_tag,
        "file_count": file_count,
        "has_index": has_index,
    }


# 2. List all projects
# -------------------------------------------------------------------
@app.get("/api/projects")
async def list_projects():
    metadata = load_metadata()
    projects = []
    for proj in metadata["projects"].values():
        projects.append({
            "id": proj["id"],
            "name": proj["name"],
            "latest_version": f"v{proj['latest_version']}",
            "version_count": len(proj["versions"]),
            "created_at": proj["created_at"],
        })
    return {"projects": projects}


# 3. Get single project metadata
# -------------------------------------------------------------------
@app.get("/api/projects/{project_id}")
async def get_project(project_id: str):
    metadata = load_metadata()
    if project_id not in metadata["projects"]:
        raise HTTPException(404, "Project not found")
    return metadata["projects"][project_id]


# 4. List versions of a project
# -------------------------------------------------------------------
@app.get("/api/projects/{project_id}/versions")
async def list_versions(project_id: str):
    metadata = load_metadata()
    if project_id not in metadata["projects"]:
        raise HTTPException(404, "Project not found")
    return {"versions": metadata["projects"][project_id]["versions"]}


# 5. File tree for a specific version
# -------------------------------------------------------------------
@app.get("/api/projects/{project_id}/versions/{version}/tree")
async def get_file_tree(project_id: str, version: str):
    version_dir = STORAGE_DIR / project_id / version
    if not version_dir.exists():
        raise HTTPException(404, "Version not found")
    return {"tree": build_file_tree(version_dir)}


# 6. Get/download a single file
# -------------------------------------------------------------------
@app.get("/api/projects/{project_id}/versions/{version}/files")
async def get_file(project_id: str, version: str, path: str = Query(...)):
    version_dir = STORAGE_DIR / project_id / version
    if not version_dir.exists():
        raise HTTPException(404, "Version not found")
    target = safe_resolve(version_dir, path)
    if not target.exists() or not target.is_file():
        raise HTTPException(404, "File not found")
    return FileResponse(target)


# 7. Download entire version as ZIP
# -------------------------------------------------------------------
@app.get("/api/projects/{project_id}/versions/{version}/download")
async def download_version(project_id: str, version: str):
    version_dir = STORAGE_DIR / project_id / version
    if not version_dir.exists():
        raise HTTPException(404, "Version not found")

    zip_name = f"{project_id}_{version}.zip"
    tmp_dir = tempfile.mkdtemp()
    archive_base = os.path.join(tmp_dir, f"{project_id}_{version}")
    shutil.make_archive(archive_base, "zip", version_dir)
    zip_path = archive_base + ".zip"

    return FileResponse(
        zip_path,
        media_type="application/zip",
        filename=zip_name,
        background=BackgroundTask(lambda: shutil.rmtree(tmp_dir, ignore_errors=True)),
    )


# 8. README.md content (raw markdown + rendered HTML)
# -------------------------------------------------------------------
@app.get("/api/projects/{project_id}/versions/{version}/readme")
async def get_readme(project_id: str, version: str):
    version_dir = STORAGE_DIR / project_id / version
    readme_path = version_dir / "README.md"
    if not readme_path.exists():
        raise HTTPException(404, "README.md not found")

    raw = readme_path.read_text(encoding="utf-8", errors="replace")
    html = markdown.markdown(raw, extensions=["tables", "fenced_code", "codehilite"])
    return {"markdown": raw, "html": html}


# 9. Preview endpoint — serves files inside an iframe-friendly context
# -------------------------------------------------------------------
@app.get("/api/preview/{project_id}/{version}/{file_path:path}")
async def preview_file(project_id: str, version: str, file_path: str):
    version_dir = STORAGE_DIR / project_id / version
    if not version_dir.exists():
        raise HTTPException(404, "Version not found")

    if not file_path:
        file_path = "index.html"

    target = safe_resolve(version_dir, file_path)
    if not target.exists() or not target.is_file():
        raise HTTPException(404, "File not found")

    response = FileResponse(target)
    # Strict Content-Security-Policy for sandboxed preview
    response.headers["Content-Security-Policy"] = (
        "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: blob:; "
        "font-src 'self' data:; "
        "connect-src 'none'; "
        "frame-ancestors http://localhost:3000"
    )
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


# 10. WebSocket — live version notifications
# -------------------------------------------------------------------
@app.websocket("/ws/projects/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: str):
    await manager.connect(websocket, project_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, project_id)


# ---------------------------------------------------------------------------
# Run with: uvicorn main:app --reload --port 8000
# ---------------------------------------------------------------------------
