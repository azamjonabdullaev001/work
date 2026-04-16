import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  getProject,
  getFileTree,
  getReadme,
  downloadUrl,
} from "../api/api";
import FileTree from "../components/FileTree";
import ProjectPreview, {
  useVersionNotification,
} from "../components/ProjectPreview";
import ReadmeViewer from "../components/ReadmeViewer";
import UploadModal from "../components/UploadModal";

export default function ProjectDetail() {
  const { projectId } = useParams();

  const [project, setProject] = useState(null);
  const [version, setVersion] = useState(null);
  const [tree, setTree] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [readme, setReadme] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);

  // WebSocket: live version push
  const latestPush = useVersionNotification(projectId);

  const loadProject = useCallback(async () => {
    try {
      const { data } = await getProject(projectId);
      setProject(data);
      const latest = `v${data.latest_version}`;
      setVersion((prev) => prev || latest);
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

  const handleUploaded = (result) => {
    setShowUpload(false);
    setVersion(result.version);
    loadProject();
  };

  if (loading) return <div className="spinner">Loading…</div>;
  if (!project) return <div className="empty-state"><h2>Project not found</h2></div>;

  return (
    <div>
      {/* Header */}
      <div className="detail-header">
        <div>
          <h1>{project.name}</h1>
          <span className="meta">
            {project.versions.length} version
            {project.versions.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="detail-actions">
          {/* Version selector */}
          <select
            value={version || ""}
            onChange={(e) => setVersion(e.target.value)}
          >
            {project.versions.map((v) => (
              <option key={v.version} value={v.version}>
                {v.version} ({v.file_count} files)
              </option>
            ))}
          </select>

          {/* Download */}
          <a
            className="btn"
            href={downloadUrl(projectId, version)}
            download
          >
            ⬇ Download ZIP
          </a>

          {/* Upload new version */}
          <button
            className="btn btn-primary"
            onClick={() => setShowUpload(true)}
          >
            + New Version
          </button>
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

      {/* Upload modal */}
      {showUpload && (
        <UploadModal
          existingProjectId={projectId}
          onClose={() => setShowUpload(false)}
          onUploaded={handleUploaded}
        />
      )}
    </div>
  );
}
