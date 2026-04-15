import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiCheckCircle, FiSearch, FiBriefcase, FiUsers } from 'react-icons/fi';
import { getCategories, listJobs } from '../api/api';
import JobCard from '../components/JobCard';

const Home = () => {
  const [categories, setCategories] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);

  useEffect(() => {
    getCategories().then(res => {
      if (res.data.success) setCategories(res.data.data);
    }).catch(() => {});

    listJobs({ page: 1 }).then(res => {
      if (res.data.success) setRecentJobs(res.data.data.slice(0, 6));
    }).catch(() => {});
  }, []);

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1>Найдите лучших <span className="text-primary">фрилансеров</span> для вашего проекта</h1>
            <p className="hero-subtitle">
              Тысячи талантливых специалистов готовы воплотить ваши идеи в жизнь.
              Веб-разработка, дизайн, 3D-моделирование и многое другое.
            </p>
            <div className="hero-actions">
              <Link to="/jobs" className="btn btn-primary btn-lg">
                <FiSearch /> Найти работу
              </Link>
              <Link to="/freelancers" className="btn btn-outline btn-lg">
                <FiUsers /> Найти специалиста
              </Link>
            </div>
            <div className="hero-stats">
              <div className="stat">
                <strong>1000+</strong>
                <span>Фрилансеров</span>
              </div>
              <div className="stat">
                <strong>5000+</strong>
                <span>Проектов</span>
              </div>
              <div className="stat">
                <strong>98%</strong>
                <span>Довольных клиентов</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>Популярные категории</h2>
            <p>Найдите специалистов в любой области</p>
          </div>
          <div className="categories-grid">
            {categories.map(cat => (
              <Link to={`/jobs?category_id=${cat.id}`} key={cat.id} className="category-card">
                <span className="category-icon">{cat.icon}</span>
                <span className="category-name">{cat.name}</span>
                <FiArrowRight className="category-arrow" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section section-gray">
        <div className="container">
          <div className="section-header">
            <h2>Как это работает</h2>
            <p>Начать работать на платформе — просто</p>
          </div>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Создайте аккаунт</h3>
              <p>Зарегистрируйтесь как фрилансер или заказчик. Заполните профиль и укажите свои навыки.</p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3>Найдите проект</h3>
              <p>Просматривайте заказы или ищите специалистов. Подберите идеальное предложение.</p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3>Начните работать</h3>
              <p>Обсудите детали, согласуйте бюджет и приступайте к работе. Всё просто и безопасно.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Jobs */}
      {recentJobs.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-header">
              <h2>Последние заказы</h2>
              <Link to="/jobs" className="link-all">Все заказы <FiArrowRight /></Link>
            </div>
            <div className="jobs-grid">
              {recentJobs.map(job => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="section cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Готовы начать?</h2>
            <p>Присоединяйтесь к тысячам профессионалов и найдите свой следующий проект</p>
            <div className="cta-features">
              <div className="cta-feature"><FiCheckCircle /> Бесплатная регистрация</div>
              <div className="cta-feature"><FiCheckCircle /> Безопасные платежи</div>
              <div className="cta-feature"><FiCheckCircle /> Поддержка 24/7</div>
            </div>
            <Link to="/register" className="btn btn-primary btn-lg">Зарегистрироваться бесплатно</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
