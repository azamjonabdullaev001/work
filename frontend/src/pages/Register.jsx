import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { register as registerApi } from '../api/api';
import { toast } from 'react-toastify';
import { FiUser, FiPhone, FiLock, FiBriefcase, FiCode } from 'react-icons/fi';

const Register = () => {
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('freelancer');
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    patronymic: '',
    phone: '',
    password: '',
    confirm_password: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.phone || !form.password) {
      toast.error('Заполните обязательные поля');
      return;
    }
    if (form.password !== form.confirm_password) {
      toast.error('Пароли не совпадают');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Пароль должен быть не менее 6 символов');
      return;
    }

    setLoading(true);
    try {
      const data = {
        ...form,
        role,
        patronymic: form.patronymic || undefined,
      };
      const res = await registerApi(data);
      if (res.data.success) {
        loginUser(res.data.data.token, res.data.data.user);
        toast.success('Регистрация успешна!');
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-header">
          <h1>Регистрация</h1>
          <p>Создайте аккаунт и начните работать</p>
        </div>

        {/* Role Selector */}
        <div className="role-selector">
          <button
            className={`role-btn ${role === 'freelancer' ? 'active' : ''}`}
            onClick={() => setRole('freelancer')}
            type="button"
          >
            <FiCode className="role-icon" />
            <div>
              <strong>Фрилансер</strong>
              <span>Я ищу работу</span>
            </div>
          </button>
          <button
            className={`role-btn ${role === 'client' ? 'active' : ''}`}
            onClick={() => setRole('client')}
            type="button"
          >
            <FiBriefcase className="role-icon" />
            <div>
              <strong>Заказчик</strong>
              <span>Я хочу нанять</span>
            </div>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <div className="form-group">
              <label><FiUser /> Имя *</label>
              <input
                type="text"
                placeholder="Введите имя"
                value={form.first_name}
                onChange={e => setForm({ ...form, first_name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label><FiUser /> Фамилия *</label>
              <input
                type="text"
                placeholder="Введите фамилию"
                value={form.last_name}
                onChange={e => setForm({ ...form, last_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label><FiUser /> Отчество (необязательно)</label>
            <input
              type="text"
              placeholder="Введите отчество"
              value={form.patronymic}
              onChange={e => setForm({ ...form, patronymic: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label><FiPhone /> Номер телефона *</label>
            <input
              type="tel"
              placeholder="+998 90 123 45 67"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label><FiLock /> Пароль *</label>
              <input
                type="password"
                placeholder="Минимум 6 символов"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label><FiLock /> Повторите пароль *</label>
              <input
                type="password"
                placeholder="Повторите пароль"
                value={form.confirm_password}
                onChange={e => setForm({ ...form, confirm_password: e.target.value })}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Уже есть аккаунт? <Link to="/login">Войти</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Register;
