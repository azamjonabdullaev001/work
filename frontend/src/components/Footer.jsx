import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <h4>FreelanceHub</h4>
            <p>Профессиональная платформа для поиска специалистов и размещения проектов.</p>
          </div>
          <div className="footer-col">
            <h4>Для заказчиков</h4>
            <ul>
              <li><Link to="/freelancers">Найти фрилансера</Link></li>
              <li><Link to="/create-job">Разместить заказ</Link></li>
              <li><Link to="/jobs">Все заказы</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Для фрилансеров</h4>
            <ul>
              <li><Link to="/jobs">Найти работу</Link></li>
              <li><Link to="/register">Создать профиль</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Категории</h4>
            <ul>
              <li><Link to="/jobs?category=web-development">Веб-разработка</Link></li>
              <li><Link to="/jobs?category=design">Дизайн</Link></li>
              <li><Link to="/jobs?category=3d-modeling">3D-моделирование</Link></li>
              <li><Link to="/jobs?category=mobile-development">Мобильная разработка</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 FreelanceHub. Все права защищены.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
