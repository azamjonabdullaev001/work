import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPortfolioItem, getProjectPreviewUrl, getProjectDownloadUrl } from '../api/api';
import { FiArrowLeft, FiDownload, FiExternalLink, FiFile, FiFolder, FiChevronRight, FiChevronDown } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico']);
const PREVIEWABLE = new Set(['html', 'htm']);

const ProjectViewer = () => {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [tab, setTab] = useState('preview');
  const [fileContent, setFileContent] = useState('');
  const [readme, setReadme] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getPortfolioItem(id);
        if (res.data.success) {
          setItem(res.data.data);
          // Check for README.md
          const tree = res.data.data.project_tree;
          if (tree) {
            const readmeNode = findFile(tree, 'README.md');
            if (readmeNode) {
              const resp = await fetch(`/api/portfolio/${id}/preview/${readmeNode.path}`);
              const text = await resp.text();
              setReadme(text);
            }
          }
        }
      } catch {} finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const findFile = (tree, name) => {
    for (const node of tree) {
      if (node.type === 'file' && node.name.toLowerCase() === name.toLowerCase()) return node;
      if (node.children) {
        const found = findFile(node.children, name);
        if (found) return found;
      }
    }
    return null;
  };

  const handleFileSelect = useCallback(async (node) => {
    setSelectedFile(node);
    const ext = node.name.split('.').pop().toLowerCase();
    if (PREVIEWABLE.has(ext)) {
      setTab('preview');
    } else if (IMAGE_EXT.has(ext)) {
      setTab('preview');
    } else {
      setTab('code');
      try {
        const resp = await fetch(`/api/portfolio/${id}/preview/${node.path}`);
        const text = await resp.text();
        setFileContent(text);
      } catch {
        setFileContent('// Ошибка загрузки файла');
      }
    }
  }, [id]);

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;
  if (!item) return <div className="page"><div className="container"><h2>Проект не найден</h2></div></div>;

  const ext = selectedFile ? selectedFile.name.split('.').pop().toLowerCase() : '';
  const isPreviewable = !selectedFile || PREVIEWABLE.has(ext);
  const isImage = IMAGE_EXT.has(ext);

  const previewSrc = isPreviewable
    ? getProjectPreviewUrl(id, selectedFile?.path || 'index.html')
    : null;

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div className="project-viewer-header">
          <div className="project-viewer-title">
            <Link to="/my-portfolio" className="btn btn-outline btn-xs">
              <FiArrowLeft /> Назад
            </Link>
            <h1>{item.title}</h1>
          </div>
          <div className="project-viewer-actions">
            {item.project_url && (
              <a href={item.project_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                <FiExternalLink /> Открыть сайт
              </a>
            )}
            <a href={getProjectDownloadUrl(id)} download className="btn btn-outline">
              <FiDownload /> Скачать ZIP
            </a>
          </div>
        </div>

        {item.description && <p className="project-viewer-desc">{item.description}</p>}

        {/* File tree + Preview */}
        {item.project_tree && (
          <div className="project-viewer-body">
            <div className="project-file-tree">
              <div className="file-tree-header">Файлы проекта</div>
              {item.project_tree.map((node) => (
                <TreeNode
                  key={node.path}
                  node={node}
                  onSelect={handleFileSelect}
                  selectedPath={selectedFile?.path}
                />
              ))}
            </div>

            <div className="project-preview-panel">
              <div className="preview-tab-bar">
                {(isPreviewable || isImage) && (
                  <div className={`preview-tab ${tab === 'preview' ? 'active' : ''}`}
                    onClick={() => setTab('preview')}>
                    {isImage ? '🖼️ Изображение' : '🌐 Preview'}
                  </div>
                )}
                {!isImage && (
                  <div className={`preview-tab ${tab === 'code' ? 'active' : ''}`}
                    onClick={() => setTab('code')}>
                    📝 Код
                  </div>
                )}
                {selectedFile && (
                  <span className="preview-filename">{selectedFile.path}</span>
                )}
              </div>

              <div className="preview-content">
                {tab === 'preview' && isPreviewable && (
                  <iframe
                    key={selectedFile?.path || 'index'}
                    className="project-preview-iframe"
                    src={previewSrc}
                    sandbox="allow-scripts"
                    title="Project Preview"
                  />
                )}
                {tab === 'preview' && isImage && selectedFile && (
                  <div style={{ padding: 20, textAlign: 'center' }}>
                    <img
                      src={getProjectPreviewUrl(id, selectedFile.path)}
                      alt={selectedFile.name}
                      style={{ maxWidth: '100%', maxHeight: '60vh' }}
                    />
                  </div>
                )}
                {tab === 'code' && (
                  <pre className="project-code-viewer">
                    {fileContent || 'Выберите файл для просмотра'}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}

        {/* README */}
        {readme && (
          <div className="project-readme">
            <h2>📝 README.md</h2>
            <div className="readme-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{readme}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Recursive tree node component
const TreeNode = ({ node, onSelect, selectedPath, depth = 0 }) => {
  const [open, setOpen] = useState(depth < 1);

  if (node.type === 'directory') {
    return (
      <div>
        <div className="tree-item tree-dir" onClick={() => setOpen(o => !o)}>
          {open ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
          <FiFolder size={14} />
          <span>{node.name}</span>
        </div>
        {open && node.children && (
          <div style={{ paddingLeft: 16 }}>
            {node.children.map(child => (
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

  return (
    <div
      className={`tree-item tree-file ${selectedPath === node.path ? 'active' : ''}`}
      onClick={() => onSelect(node)}
    >
      <FiFile size={14} />
      <span>{node.name}</span>
    </div>
  );
};

export default ProjectViewer;
