import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateProfile, uploadAvatar, getSkills } from '../api/api';
import { toast } from 'react-toastify';
import { FiSave, FiCamera } from 'react-icons/fi';

const EditProfile = () => {
  const { user, loadUser } = useAuth();
  const navigate = useNavigate();
  const [allSkills, setAllSkills] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    patronymic: '',
    title: '',
    bio: '',
    hourly_rate: '',
    location: '',
  });

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        patronymic: user.patronymic || '',
        title: user.title || '',
        bio: user.bio || '',
        hourly_rate: user.hourly_rate || '',
        location: user.location || '',
      });
      setSelectedSkills(user.skills?.map(s => s.id) || []);
    }
  }, [user]);

  useEffect(() => {
    getSkills().then(res => {
      if (res.data.success) setAllSkills(res.data.data);
    });
  }, []);

  const toggleSkill = (skillId) => {
    setSelectedSkills(prev =>
      prev.includes(skillId)
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await uploadAvatar(formData);
      if (res.data.success) {
        toast.success('Аватар обновлён!');
        loadUser();
      }
    } catch {
      toast.error('Ошибка загрузки аватара');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        first_name: form.first_name || undefined,
        last_name: form.last_name || undefined,
        patronymic: form.patronymic || undefined,
        title: form.title || undefined,
        bio: form.bio || undefined,
        hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : undefined,
        location: form.location || undefined,
        skill_ids: selectedSkills.length > 0 ? selectedSkills : undefined,
      };

      const res = await updateProfile(data);
      if (res.data.success) {
        toast.success('Профиль обновлён!');
        await loadUser();
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка обновления');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="container container-sm">
        <div className="page-header">
          <h1>Редактировать профиль</h1>
        </div>

        {/* Avatar Upload */}
        <div className="card avatar-upload-card">
          <div className="avatar-upload">
            <div className="profile-avatar-large">
              {user?.avatar_url
                ? <img src={user.avatar_url} alt="" />
                : <div className="avatar-placeholder-lg">{user?.first_name?.[0]}{user?.last_name?.[0]}</div>}
            </div>
            <label className="btn btn-outline btn-sm avatar-btn">
              <FiCamera /> Изменить фото
              <input type="file" accept="image/*" onChange={handleAvatarUpload} hidden />
            </label>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card form-card">
          <div className="form-row">
            <div className="form-group">
              <label>Имя</label>
              <input type="text" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Фамилия</label>
              <input type="text" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} />
            </div>
          </div>

          <div className="form-group">
            <label>Отчество</label>
            <input type="text" value={form.patronymic} onChange={e => setForm({...form, patronymic: e.target.value})} />
          </div>

          <div className="form-group">
            <label>Специализация</label>
            <input type="text" placeholder="Например: Full-Stack разработчик" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
          </div>

          <div className="form-group">
            <label>О себе</label>
            <textarea rows="5" placeholder="Расскажите о своём опыте и навыках..." value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Ставка ($/час)</label>
              <input type="number" placeholder="50" value={form.hourly_rate} onChange={e => setForm({...form, hourly_rate: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Местоположение</label>
              <input type="text" placeholder="Ташкент, Узбекистан" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
            </div>
          </div>

          {user?.role === 'freelancer' && (
            <div className="form-group">
              <label>Навыки</label>
              <div className="skills-selector">
                {allSkills.map(s => (
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
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            <FiSave /> {loading ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
