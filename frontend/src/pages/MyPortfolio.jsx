import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyPortfolio, createPortfolioItem, deletePortfolioItem } from '../api/api';
import { toast } from 'react-toastify';
import { FiPlus, FiTrash2, FiStar, FiExternalLink, FiGithub } from 'react-icons/fi';

const MyPortfolio = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    project_url: '',
    github_url: '',
    is_featured: false,
    image: null,
  });

  const navigate = useNavigate();

  useEffect(() => {
    loadPortfolio();
  }, []);
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
  const loadPortfolio = async () => {

      const res = await createPortfolioItem(formData);
      if (res.data.success) {
        toast.success('Проект добавлен!');
        setShowForm(false);
      if (form.image) formData.append('image', form.image);
      if (form.github_url) formData.append('github_url', form.github_url);
        loadPortfolio();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка');
    } finally {
      setSubmitting(false);
    }
  };

        setForm({ title: '', description: '', project_url: '', github_url: '', is_featured: false, image: null });
    if (!window.confirm('Удалить этот проект?')) return;
    try {
      await deletePortfolioItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success('Проект удалён');
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  const handleDelete = async (id) => {

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

            {/* GitHub repository URL */}
            <div className="form-group">
              <label><FiGithub /> GitHub репозиторий</label>
              <input
                type="url"
                placeholder="https://github.com/username/repo"
                value={form.github_url}
                onChange={e => setForm({...form, github_url: e.target.value})}
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

        {/* no global drag zone */}

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

                  {/* Show GitHub link if provided */}
                  {item.project_zip_url && (
                    <div className="project-badge">
                      <FiGithub /> GitHub репозиторий
                    </div>
                  )}

                  <div className="portfolio-actions">
                    {item.project_zip_url && (
                      <a
                        href={item.project_zip_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-xs"
                      >
                        <FiGithub /> GitHub
                      </a>
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
