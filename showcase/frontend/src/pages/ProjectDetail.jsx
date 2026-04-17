import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  getProject,
  listVersions,
  getFileTree,
  getReadme,
  downloadUrl,
} from "../api/api";
import FileTree from "../components/FileTree";
import ProjectPreview, {
  useVersionNotification,
} from "../components/ProjectPreview";
import ReadmeViewer from "../components/ReadmeViewer";

export default function ProjectDetail() {
  const { projectId } = useParams();

  const [project, setProject] = useState(null);
  const [versions, setVersions] = useState([]);
  const [version, setVersion] = useState(null);
  const [tree, setTree] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [readme, setReadme] = useState(null);
  const [loading, setLoading] = useState(true);

  // WebSocket: live version push
  const latestPush = useVersionNotification(projectId);

  const loadProject = useCallback(async () => {
    try {
      const { data } = await getProject(projectId);
      setProject(data);
      const branches = await listVersions(projectId).then((r) => r.data.versions);
      setVersions(branches);
      const defaultBranch =
        data.default_branch || (branches[0] && branches[0].version) || "main";
      setVersion((prev) => prev || defaultBranch);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Initial load
  useEffect(() => {
    loadProject();
  }, [loadProject]);

  // Auto-refresh when new version pushed via WebSocket
  useEffect(() => {
    if (latestPush) {
      setVersion(latestPush);
      loadProject();
    }
  }, [latestPush, loadProject]);

  // Load tree + readme when version changes
  useEffect(() => {
    if (!version) return;

    getFileTree(projectId, version)
      .then(({ data }) => setTree(data.tree))
      .catch(() => setTree([]));

    getReadme(projectId, version)
      .then(({ data }) => setReadme(data.markdown))
      .catch(() => setReadme(null));

    setSelectedFile(null);
  }, [projectId, version]);

  if (loading) return <div className="spinner">Loading…</div>;
  if (!project) return <div className="empty-state"><h2>Project not found</h2></div>;

  return (
    <div>
      {/* Header */}
      <div className="detail-header">
        <div>
          <h1>{project.name}</h1>
          <span className="meta">
            <a href={project.github_url} target="_blank" rel="noreferrer">
              {project.github_url}
            </a>
          </span>
        </div>

        <div className="detail-actions">
          {/* Branch selector */}
          <select
            value={version || ""}
            onChange={(e) => setVersion(e.target.value)}
          >
            {versions.map((v) => (
              <option key={v.version} value={v.version}>
                {v.version} ({v.commit})
              </option>
            ))}
          </select>

          {/* Download */}
          <a
            className="btn"
            href={downloadUrl(projectId, version)}
          >
            ⬇ Download ZIP
          </a>
        </div>
      </div>

      {/* Body: file tree + preview */}
      <div className="detail-body">
        <FileTree
          tree={tree}
          selectedPath={selectedFile?.path}
          onSelect={setSelectedFile}
        />

        <ProjectPreview
          projectId={projectId}
          version={version}
          selectedFile={selectedFile}
        />
      </div>

      {/* README */}
      <ReadmeViewer markdown={readme} />
    </div>
  );
}

