import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getProject,
  getFileTree,
  getReadme,
  listBranches,
  deleteProject,
} from "../api/api";
import FileTree from "../components/FileTree";
import ProjectPreview from "../components/ProjectPreview";
import ReadmeViewer from "../components/ReadmeViewer";

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [branches, setBranches] = useState([]);
  const [branch, setBranch] = useState(null);
  const [tree, setTree] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [readme, setReadme] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProject = useCallback(async () => {
    try {
      const { data } = await getProject(projectId);
      setProject(data);
      setBranch((prev) => prev || data.default_branch);

      const branchRes = await listBranches(projectId);
      setBranches(branchRes.data.branches);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  // Load tree + readme when branch changes
  useEffect(() => {
    if (!branch) return;

    getFileTree(projectId, branch)
      .then(({ data }) => setTree(data.tree))
      .catch(() => setTree([]));

    getReadme(projectId, branch)
      .then(({ data }) => setReadme(data.markdown))
      .catch(() => setReadme(null));

    setSelectedFile(null);
  }, [projectId, branch]);

  const handleDelete = async () => {
    if (!window.confirm("Delete this project?")) return;
    try {
      await deleteProject(projectId);
      navigate("/");
    } catch {
      /* empty */
    }
  };

  if (loading) return <div className="spinner">Loading…</div>;
  if (!project) return <div className="empty-state"><h2>Project not found</h2></div>;

  return (
    <div>
      {/* Header */}
      <div className="detail-header">
        <div>
          <h1>{project.name}</h1>
          <a
            href={project.github_url}
            target="_blank"
            rel="noopener noreferrer"
            className="meta"
            style={{ textDecoration: "underline" }}
          >
            {project.github_url}
          </a>
        </div>

        <div className="detail-actions">
          {/* Branch selector */}
          <select
            value={branch || ""}
            onChange={(e) => setBranch(e.target.value)}
          >
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {/* Open on GitHub */}
          <a
            className="btn"
            href={`${project.github_url}/tree/${branch}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            🔗 GitHub
          </a>

          {/* Delete */}
          <button className="btn" onClick={handleDelete} style={{ color: "#f85149" }}>
            🗑 Delete
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
          branch={branch}
          selectedFile={selectedFile}
        />
      </div>

      {/* README */}
      <ReadmeViewer markdown={readme} />
    </div>
  );
}
