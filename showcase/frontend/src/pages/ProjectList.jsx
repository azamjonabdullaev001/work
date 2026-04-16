import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listProjects } from "../api/api";
import UploadModal from "../components/UploadModal";

export default function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  const fetchProjects = async () => {
    try {
      const { data } = await listProjects();
      setProjects(data.projects);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleUploaded = (result) => {
    setShowUpload(false);
    fetchProjects();
  };

  if (loading) return <div className="spinner">Loading…</div>;

  return (
    <div>
      <div className="project-list-header">
        <h1>Projects</h1>
        <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
          + New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <h2>No projects yet</h2>
          <p>Upload a ZIP file to get started</p>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((p) => (
            <Link key={p.id} to={`/projects/${p.id}`} className="project-card">
              <h3>{p.name}</h3>
              <div className="meta">
                {p.version_count} version{p.version_count !== 1 ? "s" : ""} ·
                Latest: {p.latest_version}
              </div>
            </Link>
          ))}
        </div>
      )}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={handleUploaded}
        />
      )}
    </div>
  );
}
