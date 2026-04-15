import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createJob, getCategories, getSkills } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const CreateJob = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [skills, setSkills] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category_id: '',
    budget_min: '',
    budget_max: '',
    duration: '',
    experience_level: '',
  });

  useEffect(() => {
    getCategories().then(res => {
      if (res.data.success) setCategories(res.data.data);
    });
    getSkills().then(res => {
      if (res.data.success) setSkills(res.data.data);
    });
  }, []);

  if (user?.role !== 'client') {
    return (
      <div className="page"><div className="container">
        <div className="empty-state"><h3>Только заказчики могут создавать заказы</h3></div>
      </div></div>
    );
  }

  const toggleSkill = (skillId) => {
    setSelectedSkills(prev =>
      prev.includes(skillId)
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description) {
      toast.error('Заполните название и описание');
      return;
    }

    setLoading(true);
    try {
      const data = {
        title: form.title,
        description: form.description,
        category_id: form.category_id ? parseInt(form.category_id) : undefined,
        budget_min: form.budget_min ? parseFloat(form.budget_min) : undefined,
        budget_max: form.budget_max ? parseFloat(form.budget_max) : undefined,
        duration: form.duration || undefined,
        experience_level: form.experience_level || undefined,
        skill_ids: selectedSkills,
      };

      const res = await createJob(data);
      if (res.data.success) {
        toast.success('Заказ создан!');
        navigate(`/jobs/${res.data.data.id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка создания заказа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="container container-sm">
        <div className="page-header">
          <h1>Создать заказ</h1>
          <p>Опишите вашу задачу и найдите исполнителя</p>
        </div>

        <form onSubmit={handleSubmit} className="card form-card">
          <div className="form-group">
            <label>Название проекта *</label>
            <input
              type="text"
              placeholder="Например: Создать лендинг для интернет-магазина"
              value={form.title}
              onChange={e => setForm({...form, title: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>Описание проекта *</label>
            <textarea
              rows="8"
              placeholder="Подробно опишите задачу, требования и ожидаемый результат..."
              value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>Категория</label>
            <select value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}>
              <option value="">Выберите категорию</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Бюджет от ($)</label>
              <input
                type="number"
                placeholder="100"
                value={form.budget_min}
                onChange={e => setForm({...form, budget_min: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Бюджет до ($)</label>
              <input
                type="number"
                placeholder="5000"
                value={form.budget_max}
                onChange={e => setForm({...form, budget_max: e.target.value})}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Сроки</label>
              <select value={form.duration} onChange={e => setForm({...form, duration: e.target.value})}>
                <option value="">Не указано</option>
                <option value="Менее 1 недели">Менее 1 недели</option>
                <option value="1-2 недели">1-2 недели</option>
                <option value="2-4 недели">2-4 недели</option>
                <option value="1-3 месяца">1-3 месяца</option>
                <option value="3-6 месяцев">3-6 месяцев</option>
                <option value="Более 6 месяцев">Более 6 месяцев</option>
              </select>
            </div>
            <div className="form-group">
              <label>Уровень опыта</label>
              <select value={form.experience_level} onChange={e => setForm({...form, experience_level: e.target.value})}>
                <option value="">Любой</option>
                <option value="Junior">Junior</option>
                <option value="Middle">Middle</option>
                <option value="Senior">Senior</option>
                <option value="Expert">Expert</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Требуемые навыки</label>
            <div className="skills-selector">
              {skills.map(s => (
                <button
                  type="button"
                  key={s.id}
                  className={`skill-chip ${selectedSkills.includes(s.id) ? 'active' : ''}`}
                  onClick={() => toggleSkill(s.id)}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Создание...' : 'Создать заказ'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateJob;
