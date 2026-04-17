"""
Project Showcase — FastAPI Backend
Features: GitHub repo integration, file tree, code preview, README rendering
No local file storage — all content fetched from GitHub via HTTPS.
"""

import json
import re
import time
import uuid
from pathlib import Path
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
STORAGE_DIR = Path("storage")
METADATA_FILE = STORAGE_DIR / "projects.json"
ALLOWED_ORIGINS = ["http://localhost:3000"]
GITHUB_API = "https://api.github.com"
GITHUB_RAW = "https://raw.githubusercontent.com"

# Optional: set a GitHub token for higher rate limits (60/hr without, 5000/hr with)
# GITHUB_TOKEN = "ghp_..."
GITHUB_TOKEN: Optional[str] = None

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
# Shared HTTP client
# ---------------------------------------------------------------------------
_http_client: Optional[httpx.AsyncClient] = None


def _github_headers() -> dict:
    h = {"Accept": "application/vnd.github.v3+json"}
    if GITHUB_TOKEN:
        h["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return h


async def gh_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(
            headers=_github_headers(),
            timeout=30.0,
            follow_redirects=True,
        )
    return _http_client


@app.on_event("shutdown")
async def _shutdown():
    if _http_client and not _http_client.is_closed:
        await _http_client.aclose()


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
# GitHub URL parser
# ---------------------------------------------------------------------------
_GITHUB_RE = re.compile(
    r"https?://github\.com/(?P<owner>[A-Za-z0-9_.\-]+)/(?P<repo>[A-Za-z0-9_.\-]+)"
)


def parse_github_url(url: str) -> tuple[str, str]:
    """Extract (owner, repo) from a GitHub HTTPS URL."""
    m = _GITHUB_RE.match(url.strip().rstrip("/").removesuffix(".git"))
    if not m:
        raise HTTPException(400, "Invalid GitHub URL. Example: https://github.com/owner/repo")
    return m.group("owner"), m.group("repo")


# ---------------------------------------------------------------------------
# GitHub API helpers
# ---------------------------------------------------------------------------
async def github_get(path: str) -> dict:
    """GET request to GitHub API, returns parsed JSON."""
    client = await gh_client()
    resp = await client.get(f"{GITHUB_API}{path}")
    if resp.status_code == 404:
        raise HTTPException(404, "Not found on GitHub")
    if resp.status_code == 403:
        raise HTTPException(429, "GitHub API rate limit exceeded. Try again later.")
    if resp.status_code != 200:
        raise HTTPException(502, f"GitHub API error: {resp.status_code}")
    return resp.json()


async def github_get_raw(owner: str, repo: str, branch: str, file_path: str) -> bytes:
    """Fetch raw file content from GitHub."""
    client = await gh_client()
    url = f"{GITHUB_RAW}/{owner}/{repo}/{branch}/{file_path}"
    resp = await client.get(url)
    if resp.status_code == 404:
        raise HTTPException(404, "File not found on GitHub")
    if resp.status_code != 200:
        raise HTTPException(502, f"GitHub raw fetch error: {resp.status_code}")
    return resp.content


# ---------------------------------------------------------------------------
# Recursive tree builder from GitHub flat tree
# ---------------------------------------------------------------------------
def build_tree_from_github(items: list) -> list:
    """Convert GitHub flat tree (recursive) into nested tree structure."""
    root: list = []
    dirs: dict = {}  # path → children list

    # Sort: directories first, then alphabetical
    files = [i for i in items if i["type"] == "blob"]
    trees = [i for i in items if i["type"] == "tree"]

    # Create directory nodes
    for t in sorted(trees, key=lambda x: x["path"].lower()):
        parts = t["path"].rsplit("/", 1)
        node = {
            "name": parts[-1],
            "path": t["path"],
            "type": "directory",
            "children": [],
        }
        dirs[t["path"]] = node["children"]

        parent_path = parts[0] if len(parts) > 1 else None
        if parent_path and parent_path in dirs:
            dirs[parent_path].append(node)
        else:
            root.append(node)

    # Place file nodes
    for f in sorted(files, key=lambda x: x["path"].lower()):
        parts = f["path"].rsplit("/", 1)
        node = {
            "name": parts[-1],
            "path": f["path"],
            "type": "file",
            "size": f.get("size", 0),
        }
        parent_path = parts[0] if len(parts) > 1 else None
        if parent_path and parent_path in dirs:
            dirs[parent_path].append(node)
        else:
            root.append(node)

    # Sort each level: directories first, then files, alphabetically
    def sort_nodes(nodes):
        nodes.sort(key=lambda n: (n["type"] != "directory", n["name"].lower()))
        for n in nodes:
            if "children" in n:
                sort_nodes(n["children"])

    sort_nodes(root)
    return root


# ===================================================================
#  API ENDPOINTS
# ===================================================================

# 1. Add project by GitHub URL
# -------------------------------------------------------------------
@app.post("/api/projects")
async def add_project(body: dict):
    github_url = body.get("github_url", "").strip()
    project_name = body.get("project_name", "").strip()

    if not github_url:
        raise HTTPException(400, "github_url is required")

    owner, repo = parse_github_url(github_url)

    # Verify the repo exists on GitHub
    repo_info = await github_get(f"/repos/{owner}/{repo}")

    if not project_name:
        project_name = repo_info.get("name", repo)

    default_branch = repo_info.get("default_branch", "main")

    metadata = load_metadata()

    # Check for duplicates
    for proj in metadata["projects"].values():
        if proj["owner"] == owner and proj["repo"] == repo:
            raise HTTPException(409, "This repository is already added")

    project_id = uuid.uuid4().hex[:12]
    project = {
        "id": project_id,
        "name": project_name,
        "owner": owner,
        "repo": repo,
        "github_url": f"https://github.com/{owner}/{repo}",
        "default_branch": default_branch,
        "description": repo_info.get("description", ""),
        "created_at": time.time(),
    }

    metadata["projects"][project_id] = project
    save_metadata(metadata)

    return project


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
            "description": proj.get("description", ""),
            "default_branch": proj["default_branch"],
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


# 4. Delete a project
# -------------------------------------------------------------------
@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: str):
    metadata = load_metadata()
    if project_id not in metadata["projects"]:
        raise HTTPException(404, "Project not found")
    del metadata["projects"][project_id]
    save_metadata(metadata)
    return {"ok": True}


# 5. List branches of a project
# -------------------------------------------------------------------
@app.get("/api/projects/{project_id}/branches")
async def list_branches(project_id: str):
    metadata = load_metadata()
    if project_id not in metadata["projects"]:
        raise HTTPException(404, "Project not found")
    proj = metadata["projects"][project_id]
    data = await github_get(f"/repos/{proj['owner']}/{proj['repo']}/branches?per_page=100")
    branches = [b["name"] for b in data]
    return {"branches": branches, "default": proj["default_branch"]}


# 6. File tree for a specific branch
# -------------------------------------------------------------------
@app.get("/api/projects/{project_id}/tree")
async def get_file_tree(project_id: str, ref: Optional[str] = None):
    metadata = load_metadata()
    if project_id not in metadata["projects"]:
        raise HTTPException(404, "Project not found")
    proj = metadata["projects"][project_id]
    branch = ref or proj["default_branch"]

    data = await github_get(
        f"/repos/{proj['owner']}/{proj['repo']}/git/trees/{branch}?recursive=1"
    )
    if "tree" not in data:
        raise HTTPException(502, "Failed to fetch file tree from GitHub")

    return {"tree": build_tree_from_github(data["tree"])}


# 7. Get a single file's content (proxied from GitHub)
# -------------------------------------------------------------------
@app.get("/api/projects/{project_id}/file")
async def get_file(
    project_id: str,
    path: str = Query(...),
    ref: Optional[str] = None,
):
    metadata = load_metadata()
    if project_id not in metadata["projects"]:
        raise HTTPException(404, "Project not found")
    proj = metadata["projects"][project_id]
    branch = ref or proj["default_branch"]

    # Validate path — no traversal
    if ".." in path or path.startswith("/"):
        raise HTTPException(403, "Invalid file path")

    content = await github_get_raw(proj["owner"], proj["repo"], branch, path)

    # Guess content type
    import mimetypes
    mime, _ = mimetypes.guess_type(path)
    if mime is None:
        mime = "application/octet-stream"

    return Response(content=content, media_type=mime)


# 8. README.md content (raw markdown)
# -------------------------------------------------------------------
@app.get("/api/projects/{project_id}/readme")
async def get_readme(project_id: str, ref: Optional[str] = None):
    metadata = load_metadata()
    if project_id not in metadata["projects"]:
        raise HTTPException(404, "Project not found")
    proj = metadata["projects"][project_id]
    branch = ref or proj["default_branch"]

    try:
        content = await github_get_raw(proj["owner"], proj["repo"], branch, "README.md")
        raw = content.decode("utf-8", errors="replace")
    except HTTPException:
        raise HTTPException(404, "README.md not found")

    return {"markdown": raw}


# ---------------------------------------------------------------------------
# Run with: uvicorn main:app --reload --port 8000
# ---------------------------------------------------------------------------
