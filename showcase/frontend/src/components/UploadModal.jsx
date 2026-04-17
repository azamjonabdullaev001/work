import React, { useState } from "react";
import { addProject } from "../api/api";

export default function UploadModal({ onClose, onUploaded, existingProjectId }) {
  const [name, setName] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!githubUrl.trim()) return setError("Enter a GitHub repository URL");
    if (!existingProjectId && !name.trim()) return setError("Enter a project name");

    setLoading(true);
    setError("");
    try {
      const res = await addProject(githubUrl, name || "Untitled", existingProjectId);
      onUploaded(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{existingProjectId ? "Update Repository URL" : "New Project"}</h2>
        <form onSubmit={handleSubmit}>
          {!existingProjectId && (
            <input
              type="text"
              placeholder="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <input
            type="url"
            placeholder="https://github.com/owner/repo"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
          />
          {error && (
            <p style={{ color: "#f85149", fontSize: "0.85rem", marginBottom: 8 }}>
              {error}
            </p>
          )}
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Adding…" : existingProjectId ? "Update" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
