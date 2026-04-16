import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ReadmeViewer({ markdown: md }) {
  if (!md) return null;

  return (
    <div className="readme-section">
      <h2>📝 README.md</h2>
      <div className="readme-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
      </div>
    </div>
  );
}
