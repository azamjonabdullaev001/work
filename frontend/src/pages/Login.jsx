import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as loginApi } from '../api/api';
import { toast } from 'react-toastify';
import { FiPhone, FiLock, FiLogIn } from 'react-icons/fi';

const Login = () => {
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ phone: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.phone || !form.password) {
      toast.error('Заполните все поля');
      return;
    }

    setLoading(true);
    try {
      const res = await loginApi(form);
      if (res.data.success) {
        loginUser(res.data.data.token, res.data.data.user);
        toast.success('Добро пожаловать!');
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Вход</h1>
          <p>Рады видеть вас снова!</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label><FiPhone /> Номер телефона</label>
            <input
              type="tel"
              placeholder="+998 90 123 45 67"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label><FiLock /> Пароль</label>
            <input
              type="password"
              placeholder="Введите пароль"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            <FiLogIn /> {loading ? 'Загрузка...' : 'Войти'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
