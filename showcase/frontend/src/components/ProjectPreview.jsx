import React, { useState, useEffect, useRef } from "react";
import { previewUrl, fileUrl } from "../api/api";

const PREVIEWABLE = new Set(["html", "htm"]);
const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"]);

export default function ProjectPreview({
  projectId,
  version,
  selectedFile,
}) {
  const [tab, setTab] = useState("preview"); // "preview" | "code"
  const [code, setCode] = useState("");
  const iframeRef = useRef(null);

  const ext = selectedFile
    ? selectedFile.name.split(".").pop().toLowerCase()
    : "";
  const canPreview = !selectedFile || PREVIEWABLE.has(ext);
  const isImage = IMAGE_EXT.has(ext);

  // Load file content for code view
  useEffect(() => {
    if (!selectedFile || isImage) {
      setCode("");
      return;
    }
    fetch(fileUrl(projectId, version, selectedFile.path))
      .then((r) => r.text())
      .then(setCode)
      .catch(() => setCode("// Failed to load file"));
  }, [projectId, version, selectedFile, isImage]);

  // Auto-switch tab
  useEffect(() => {
    if (selectedFile && !canPreview && !isImage) {
      setTab("code");
    }
  }, [selectedFile, canPreview, isImage]);

  const iframeSrc = canPreview
    ? previewUrl(projectId, version, selectedFile?.path || "index.html")
    : null;

  return (
    <div className="preview-panel">
      <div className="tab-bar">
        {canPreview && (
          <div
            className={`tab ${tab === "preview" ? "active" : ""}`}
            onClick={() => setTab("preview")}
          >
            Preview
          </div>
        )}
        {isImage && (
          <div
            className={`tab ${tab === "preview" ? "active" : ""}`}
            onClick={() => setTab("preview")}
          >
            Image
          </div>
        )}
        {!isImage && (
          <div
            className={`tab ${tab === "code" ? "active" : ""}`}
            onClick={() => setTab("code")}
          >
            Code
          </div>
        )}
      </div>

      <div style={{ flex: 1 }}>
        {tab === "preview" && canPreview && (
          <iframe
            ref={iframeRef}
            key={`${version}-${selectedFile?.path || "index"}`}
            className="preview-iframe"
            src={iframeSrc}
            sandbox="allow-scripts allow-same-origin"
            title="Project Preview"
          />
        )}

        {tab === "preview" && isImage && (
          <div style={{ padding: 16, textAlign: "center" }}>
            <img
              src={fileUrl(projectId, version, selectedFile.path)}
              alt={selectedFile.name}
              style={{ maxWidth: "100%", maxHeight: "60vh" }}
            />
          </div>
        )}

        {tab === "code" && (
          <div className="code-viewer">
            {code || "Select a file to view its content"}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Hook: connects a WebSocket for live version notifications.
 * Returns the latest version tag pushed via WS.
 */
export function useVersionNotification(projectId) {
  const [latestPush, setLatestPush] = useState(null);

  useEffect(() => {
    if (!projectId) return;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(
      `${proto}://${window.location.host}/ws/projects/${projectId}`
    );
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "new_version") {
          setLatestPush(data.version);
        }
      } catch {
        /* ignore */
      }
    };
    return () => ws.close();
  }, [projectId]);

  return latestPush;
}
