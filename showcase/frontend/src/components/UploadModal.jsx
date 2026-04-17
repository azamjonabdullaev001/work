import React, { useState } from "react";
import { addProject } from "../api/api";

export default function AddRepoModal({ onClose, onAdded }) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return setError("Enter a GitHub repository URL");

    setLoading(true);
    setError("");
    try {
      const res = await addProject(url, name);
      onAdded(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Add GitHub Project</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="url"
            placeholder="https://github.com/owner/repo"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <input
            type="text"
            placeholder="Project name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
              {loading ? "Adding…" : "Add Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
