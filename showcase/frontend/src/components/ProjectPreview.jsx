import React, { useState, useEffect } from "react";
import { fileUrl } from "../api/api";

const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"]);

export default function ProjectPreview({ projectId, branch, selectedFile }) {
  const [code, setCode] = useState("");

  const ext = selectedFile
    ? selectedFile.name.split(".").pop().toLowerCase()
    : "";
  const isImage = IMAGE_EXT.has(ext);

  // Load file content for code view
  useEffect(() => {
    if (!selectedFile || isImage) {
      setCode("");
      return;
    }
    fetch(fileUrl(projectId, selectedFile.path, branch))
      .then((r) => r.text())
      .then(setCode)
      .catch(() => setCode("// Failed to load file"));
  }, [projectId, branch, selectedFile, isImage]);

  return (
    <div className="preview-panel">
      <div className="tab-bar">
        <div className="tab active">
          {isImage ? "Image" : "Code"}
        </div>
      </div>

      <div style={{ flex: 1 }}>
        {isImage && selectedFile && (
          <div style={{ padding: 16, textAlign: "center" }}>
            <img
              src={fileUrl(projectId, selectedFile.path, branch)}
              alt={selectedFile.name}
              style={{ maxWidth: "100%", maxHeight: "60vh" }}
            />
          </div>
        )}

        {!isImage && (
          <div className="code-viewer">
            {code || "Select a file to view its content"}
          </div>
        )}
      </div>
    </div>
  );
}
