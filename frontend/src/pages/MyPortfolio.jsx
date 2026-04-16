import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyPortfolio, createPortfolioItem, deletePortfolioItem } from '../api/api';
import { toast } from 'react-toastify';
import { FiPlus, FiTrash2, FiStar, FiExternalLink, FiUploadCloud, FiFolder, FiEye, FiDownload } from 'react-icons/fi';

const MyPortfolio = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    project_url: '',
    is_featured: false,
    image: null,
    project_zip: null,
  });
  const dropRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    try {
      const res = await getMyPortfolio();
      if (res.data.success) setItems(res.data.data);
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title) { toast.error('Введите название'); return; }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      if (form.description) formData.append('description', form.description);
      if (form.project_url) formData.append('project_url', form.project_url);
      formData.append('is_featured', form.is_featured);
      if (form.image) formData.append('image', form.image);
      if (form.project_zip) formData.append('project_zip', form.project_zip);

      const res = await createPortfolioItem(formData);
      if (res.data.success) {
        toast.success('Проект добавлен!');
        setShowForm(false);
        setForm({ title: '', description: '', project_url: '', is_featured: false, image: null, project_zip: null });
        loadPortfolio();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить этот проект?')) return;
    try {
      await deletePortfolioItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success('Проект удалён');
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  // Drag & Drop handlers
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragOut = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.toLowerCase().endsWith('.zip')) {
        setForm(prev => ({ ...prev, project_zip: file }));
        if (!form.title) {
          setForm(prev => ({ ...prev, title: file.name.replace('.zip', '') }));
        }
        setShowForm(true);
        toast.info(`📁 ${file.name} выбран для загрузки`);
      } else {
        toast.error('Перетащите .zip файл');
      }
    }
  }, [form.title]);

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1>Моё портфолио</h1>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <FiPlus /> Добавить проект
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="card form-card">
            <h3>Новый проект</h3>
            <div className="form-group">
              <label>Название *</label>
              <input
                type="text"
                placeholder="Название проекта"
                value={form.title}
                onChange={e => setForm({...form, title: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Описание</label>
              <textarea
                rows="4"
                placeholder="Опишите проект..."
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Ссылка на проект</label>
              <input
                type="url"
                placeholder="https://example.com"
                value={form.project_url}
                onChange={e => setForm({...form, project_url: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Изображение</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => setForm({...form, image: e.target.files[0]})}
              />
            </div>

            {/* ZIP upload with Drag & Drop */}
            <div className="form-group">
              <label><FiFolder /> Файлы проекта (.zip)</label>
              <div
                ref={dropRef}
                className={`drop-zone ${dragActive ? 'drop-zone-active' : ''} ${form.project_zip ? 'drop-zone-has-file' : ''}`}
                onDragEnter={handleDragIn}
                onDragLeave={handleDragOut}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('zip-input').click()}
              >
                <FiUploadCloud size={32} />
                {form.project_zip ? (
                  <div>
                    <strong>📁 {form.project_zip.name}</strong>
                    <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                      {(form.project_zip.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p><strong>Перетащите .zip файл сюда</strong></p>
                    <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>или нажмите для выбора файла</p>
                  </div>
                )}
              </div>
              <input
                id="zip-input"
                type="file"
                accept=".zip"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files[0];
                  if (file) {
                    setForm(prev => ({ ...prev, project_zip: file }));
                    if (!form.title) {
                      setForm(prev => ({ ...prev, title: file.name.replace('.zip', '') }));
                    }
                  }
                }}
              />
            </div>

            <div className="form-group form-check">
              <label>
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={e => setForm({...form, is_featured: e.target.checked})}
                />
                Сделать главным проектом
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Загрузка...' : 'Добавить'}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>
                Отмена
              </button>
            </div>
          </form>
        )}

        {/* Drag & Drop zone visible always when no form */}
        {!showForm && (
          <div
            className={`drop-zone drop-zone-global ${dragActive ? 'drop-zone-active' : ''}`}
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <FiUploadCloud size={40} />
            <p><strong>Перетащите .zip файл для создания проекта</strong></p>
          </div>
        )}

        {items.length === 0 ? (
          <div className="empty-state">
            <h3>Портфолио пусто</h3>
            <p>Добавьте свои лучшие работы, чтобы привлечь заказчиков</p>
          </div>
        ) : (
          <div className="portfolio-grid">
            {items.map(item => (
              <div key={item.id} className={`portfolio-item ${item.is_featured ? 'featured' : ''}`}>
                {item.image_url && <img src={item.image_url} alt={item.title} className="portfolio-img" />}
                <div className="portfolio-info">
                  <div className="portfolio-title-row">
                    <h4>{item.title}</h4>
                    {item.is_featured && <span className="badge badge-featured"><FiStar /> Главный</span>}
                  </div>
                  {item.description && <p>{item.description}</p>}

                  {/* Show project badge if has uploaded files */}
                  {item.project_zip_url && (
                    <div className="project-badge">
                      <FiFolder /> Проект с файлами
                      {item.has_index && <span className="badge badge-preview">Preview</span>}
                    </div>
                  )}

                  <div className="portfolio-actions">
                    {item.project_zip_url && (
                      <>
                        <button
                          className="btn btn-outline btn-xs"
                          onClick={() => navigate(`/project/${item.id}`)}
                        >
                          <FiEye /> Просмотр
                        </button>
                        <a
                          href={`/api/portfolio/${item.id}/download`}
                          className="btn btn-outline btn-xs"
                          download
                        >
                          <FiDownload /> Скачать
                        </a>
                      </>
                    )}
                    {item.project_url && (
                      <a href={item.project_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-xs">
                        <FiExternalLink /> Открыть
                      </a>
                    )}
                    <button className="btn btn-danger btn-xs" onClick={() => handleDelete(item.id)}>
                      <FiTrash2 /> Удалить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPortfolio;
