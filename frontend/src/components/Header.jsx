import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiSearch, FiBriefcase, FiUser, FiLogOut, FiMenu } from 'react-icons/fi';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="logo">
          <span className="logo-icon">F</span>
          <span className="logo-text">FreelanceHub</span>
        </Link>

        <nav className={`nav ${menuOpen ? 'nav-open' : ''}`}>
          <Link to="/jobs" className="nav-link">
            <FiBriefcase /> Заказы
          </Link>
          <Link to="/freelancers" className="nav-link">
            <FiSearch /> Фрилансеры
          </Link>
          {user ? (
            <>
              <Link to="/dashboard" className="nav-link">
                <FiUser /> Панель
              </Link>
              {user.role === 'client' && (
                <Link to="/create-job" className="btn btn-primary btn-sm">
                  Создать заказ
                </Link>
              )}
              <div className="user-menu">
                <div className="user-avatar-small">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.first_name} />
                  ) : (
                    <span>{user.first_name?.[0]}{user.last_name?.[0]}</span>
                  )}
                </div>
                <div className="user-dropdown">
                  <Link to="/dashboard">Мой профиль</Link>
                  <Link to="/edit-profile">Настройки</Link>
                  {user.role === 'freelancer' && <Link to="/my-portfolio">Портфолио</Link>}
                  <button onClick={handleLogout}><FiLogOut /> Выйти</button>
                </div>
              </div>
            </>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-outline btn-sm">Войти</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Регистрация</Link>
            </div>
          )}
        </nav>

        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          <FiMenu />
        </button>
      </div>
    </header>
  );
};

export default Header;
