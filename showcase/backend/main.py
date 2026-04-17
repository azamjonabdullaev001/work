"""
Project Showcase — FastAPI Backend
Features: GitHub repository linking, file tree, live preview, README rendering
"""

import json
import re
import time
import uuid
from pathlib import Path
from typing import Dict, List, Optional

import httpx
import markdown
from fastapi import (
    FastAPI,
    Form,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, StreamingResponse

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
STORAGE_DIR = Path("storage")
METADATA_FILE = STORAGE_DIR / "projects.json"
ALLOWED_ORIGINS = ["http://localhost:3000"]
GITHUB_API = "https://api.github.com"
GITHUB_RAW = "https://raw.githubusercontent.com"

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
# GitHub URL parser
# ---------------------------------------------------------------------------
GITHUB_URL_RE = re.compile(
    r"^https://github\.com/(?P<owner>[A-Za-z0-9_.-]+)/(?P<repo>[A-Za-z0-9_.-]+?)(?:\.git)?(?:/.*)?$"
)


def parse_github_url(url: str) -> tuple:
    """Returns (owner, repo) or raises HTTPException."""
    m = GITHUB_URL_RE.match(url.strip())
    if not m:
        raise HTTPException(400, "Invalid GitHub URL. Expected: https://github.com/owner/repo")
    return m.group("owner"), m.group("repo")


# ---------------------------------------------------------------------------
# GitHub file-tree builder from flat list
# ---------------------------------------------------------------------------
def build_tree_from_items(items: list) -> list:
    tree_map: dict = {}
    roots: list = []

    for item in items:
        parts = item["path"].split("/")
        node = {
            "name": parts[-1],
            "path": item["path"],
            "type": "directory" if item["type"] == "tree" else "file",
        }
        if item["type"] == "blob":
            node["size"] = item.get("size", 0)
        else:
            node["children"] = []
        tree_map[item["path"]] = node

    for item in items:
        parts = item["path"].split("/")
        if len(parts) == 1:
            roots.append(tree_map[item["path"]])
        else:
            parent_path = "/".join(parts[:-1])
            if parent_path in tree_map:
                tree_map[parent_path].setdefault("children", []).append(
                    tree_map[item["path"]]
                )

    return roots


# ===================================================================
#  API ENDPOINTS
# ===================================================================

# 1. Add project via GitHub URL
# -------------------------------------------------------------------
@app.post("/api/projects/add")
async def add_project(
    github_url: str = Form(...),
    project_name: str = Form(...),
    project_id: Optional[str] = Form(None),
):
    owner, repo = parse_github_url(github_url)

    # Validate that the repo exists
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}",
            headers={"Accept": "application/vnd.github+json"},
            timeout=10,
        )
    if r.status_code == 404:
        raise HTTPException(404, "GitHub repository not found")
    if r.status_code != 200:
        raise HTTPException(502, "GitHub API error")

    repo_info = r.json()
    default_branch = repo_info.get("default_branch", "main")

    metadata = load_metadata()

    if project_id and project_id in metadata["projects"]:
        project = metadata["projects"][project_id]
        project["github_url"] = github_url
        project["owner"] = owner
        project["repo"] = repo
        project["default_branch"] = default_branch
    else:
        project_id = uuid.uuid4().hex[:12]
        project = {
            "id": project_id,
            "name": project_name,
            "github_url": github_url,
            "owner": owner,
            "repo": repo,
            "default_branch": default_branch,
            "created_at": time.time(),
        }

    metadata["projects"][project_id] = project
    save_metadata(metadata)

    return {
        "project_id": project_id,
        "github_url": github_url,
        "default_branch": default_branch,
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
            "github_url": proj["github_url"],
            "default_branch": proj.get("default_branch", "main"),
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


# 4. List branches (versions) from GitHub
# -------------------------------------------------------------------
@app.get("/api/projects/{project_id}/versions")
async def list_versions(project_id: str):
    metadata = load_metadata()
    if project_id not in metadata["projects"]:
        raise HTTPException(404, "Project not found")
    proj = metadata["projects"][project_id]
    owner, repo = proj["owner"], proj["repo"]

    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/branches",
            headers={"Accept": "application/vnd.github+json"},
            timeout=10,
        )
    if r.status_code != 200:
        raise HTTPException(502, "Failed to fetch branches from GitHub")

    branches = [
        {"version": b["name"], "commit": b["commit"]["sha"][:7]}
        for b in r.json()
    ]
    return {"versions": branches}


# 5. File tree for a branch via GitHub API
# -------------------------------------------------------------------
@app.get("/api/projects/{project_id}/versions/{version}/tree")
async def get_file_tree(project_id: str, version: str):
    metadata = load_metadata()
    if project_id not in metadata["projects"]:
        raise HTTPException(404, "Project not found")
    proj = metadata["projects"][project_id]
    owner, repo = proj["owner"], proj["repo"]

    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/git/trees/{version}?recursive=1",
            headers={"Accept": "application/vnd.github+json"},
            timeout=15,
        )
    if r.status_code == 404:
        raise HTTPException(404, "Branch not found")
    if r.status_code != 200:
        raise HTTPException(502, "Failed to fetch file tree from GitHub")

    items = r.json().get("tree", [])
    return {"tree": build_tree_from_items(items)}


# 6. Get a single file (proxied from GitHub raw)
# -------------------------------------------------------------------
@app.get("/api/projects/{project_id}/versions/{version}/files")
async def get_file(project_id: str, version: str, path: str = Query(...)):
    if ".." in path or path.startswith("/"):
        raise HTTPException(403, "Invalid path")
    metadata = load_metadata()
    if project_id not in metadata["projects"]:
        raise HTTPException(404, "Project not found")
    proj = metadata["projects"][project_id]
    owner, repo = proj["owner"], proj["repo"]

    url = f"{GITHUB_RAW}/{owner}/{repo}/{version}/{path}"
    async with httpx.AsyncClient() as client:
        r = await client.get(url, timeout=15, follow_redirects=True)
    if r.status_code == 404:
        raise HTTPException(404, "File not found")
    if r.status_code != 200:
        raise HTTPException(502, "Failed to fetch file from GitHub")

    content_type = r.headers.get("content-type", "application/octet-stream")
    return StreamingResponse(iter([r.content]), media_type=content_type)


# 7. Download — redirect to GitHub's ZIP archive
# -------------------------------------------------------------------
@app.get("/api/projects/{project_id}/versions/{version}/download")
async def download_version(project_id: str, version: str):
    metadata = load_metadata()
    if project_id not in metadata["projects"]:
        raise HTTPException(404, "Project not found")
    proj = metadata["projects"][project_id]
    owner, repo = proj["owner"], proj["repo"]

    zip_url = f"https://github.com/{owner}/{repo}/archive/refs/heads/{version}.zip"
    return RedirectResponse(url=zip_url)


# 8. README.md content (fetched from GitHub raw)
# -------------------------------------------------------------------
@app.get("/api/projects/{project_id}/versions/{version}/readme")
async def get_readme(project_id: str, version: str):
    metadata = load_metadata()
    if project_id not in metadata["projects"]:
        raise HTTPException(404, "Project not found")
    proj = metadata["projects"][project_id]
    owner, repo = proj["owner"], proj["repo"]

    url = f"{GITHUB_RAW}/{owner}/{repo}/{version}/README.md"
    async with httpx.AsyncClient() as client:
        r = await client.get(url, timeout=10, follow_redirects=True)
    if r.status_code == 404:
        raise HTTPException(404, "README.md not found")
    if r.status_code != 200:
        raise HTTPException(502, "Failed to fetch README from GitHub")

    raw = r.text
    html = markdown.markdown(raw, extensions=["tables", "fenced_code", "codehilite"])
    return {"markdown": raw, "html": html}


# 9. Preview — proxy files from GitHub raw
# -------------------------------------------------------------------
@app.get("/api/preview/{project_id}/{version}/{file_path:path}")
async def preview_file(project_id: str, version: str, file_path: str):
    if ".." in file_path or file_path.startswith("/"):
        raise HTTPException(403, "Invalid path")

    metadata = load_metadata()
    if project_id not in metadata["projects"]:
        raise HTTPException(404, "Project not found")
    proj = metadata["projects"][project_id]
    owner, repo = proj["owner"], proj["repo"]

    if not file_path:
        file_path = "index.html"

    url = f"{GITHUB_RAW}/{owner}/{repo}/{version}/{file_path}"
    async with httpx.AsyncClient() as client:
        r = await client.get(url, timeout=15, follow_redirects=True)
    if r.status_code == 404:
        raise HTTPException(404, "File not found")
    if r.status_code != 200:
        raise HTTPException(502, "Failed to fetch preview from GitHub")

    content_type = r.headers.get("content-type", "text/html")
    response = StreamingResponse(iter([r.content]), media_type=content_type)
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
