import React, { useState } from "react";
import { uploadProject } from "../api/api";

export default function UploadModal({ onClose, onUploaded, existingProjectId }) {
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return setError("Select a ZIP file");
    if (!existingProjectId && !name.trim()) return setError("Enter a project name");

    setUploading(true);
    setError("");
    try {
      const res = await uploadProject(file, name || "Untitled", existingProjectId);
      onUploaded(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{existingProjectId ? "Upload New Version" : "New Project"}</h2>
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
            type="file"
            accept=".zip"
            onChange={(e) => setFile(e.target.files[0])}
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
            <button type="submit" className="btn btn-primary" disabled={uploading}>
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
