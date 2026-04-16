import React, { useState } from "react";

export default function FileTree({ tree, onSelect, selectedPath }) {
  return (
    <div className="file-tree">
      {tree.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          onSelect={onSelect}
          selectedPath={selectedPath}
        />
      ))}
    </div>
  );
}

function TreeNode({ node, onSelect, selectedPath, depth = 0 }) {
  const [open, setOpen] = useState(depth < 1);

  if (node.type === "directory") {
    return (
      <div>
        <div
          className="tree-item tree-dir"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "📂" : "📁"} {node.name}
        </div>
        {open && (
          <div className="tree-children">
            {node.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                onSelect={onSelect}
                selectedPath={selectedPath}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const icon = getFileIcon(node.name);
  return (
    <div
      className={`tree-item ${selectedPath === node.path ? "active" : ""}`}
      onClick={() => onSelect(node)}
    >
      {icon} {node.name}
    </div>
  );
}

function getFileIcon(name) {
  const ext = name.split(".").pop().toLowerCase();
  const icons = {
    html: "🌐",
    css: "🎨",
    js: "⚡",
    jsx: "⚛️",
    ts: "📘",
    tsx: "📘",
    json: "📋",
    md: "📝",
    png: "🖼️",
    jpg: "🖼️",
    svg: "🖼️",
    gif: "🖼️",
  };
  return icons[ext] || "📄";
}
