import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiArrowRight, FiCheckCircle, FiSearch, FiBriefcase, FiUsers,
  FiMonitor, FiSmartphone, FiPenTool, FiBox, FiCamera, FiTrendingUp,
  FiEdit3, FiClipboard, FiCpu, FiCloud
} from 'react-icons/fi';
import { getCategories, listJobs, getFeaturedFreelancers } from '../api/api';
import JobCard from '../components/JobCard';
import FreelancerCard from '../components/FreelancerCard';

const categoryIconMap = {
  'web': FiMonitor,
  'mobile': FiSmartphone,
  'design': FiPenTool,
  '3d': FiBox,
  'media': FiCamera,
  'marketing': FiTrendingUp,
  'writing': FiEdit3,
  'admin': FiClipboard,
  'ai': FiCpu,
  'devops': FiCloud,
};

const getCategoryIcon = (iconKey) => {
  const Icon = categoryIconMap[iconKey] || FiBriefcase;
  return <Icon />;
};

const Home = () => {
  const [categories, setCategories] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const [featuredFreelancers, setFeaturedFreelancers] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    getCategories().then(res => {
      if (res.data.success) setCategories(res.data.data);
    }).catch(() => {});

    listJobs({ page: 1 }).then(res => {
      if (res.data.success) setRecentJobs(res.data.data.slice(0, 6));
    }).catch(() => {});

    loadFeaturedFreelancers();
  }, []);

  const loadFeaturedFreelancers = (categoryId) => {
    const params = categoryId ? { category_id: categoryId } : {};
    getFeaturedFreelancers(params).then(res => {
      if (res.data.success) setFeaturedFreelancers(res.data.data);
    }).catch(() => {});
  };

  const handleCategoryFilter = (catId) => {
    const newCat = selectedCategory === String(catId) ? '' : String(catId);
    setSelectedCategory(newCat);
    loadFeaturedFreelancers(newCat || undefined);
  };

  return (
    <div className="home-page">
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1>Профессиональная платформа для <span className="text-primary">фриланса</span></h1>
            <p className="hero-subtitle">
              Объединяем квалифицированных специалистов и бизнес. Веб-разработка, мобильные приложения, 
              дизайн, Data Science и другие направления.
            </p>
            <div className="hero-actions">
              <Link to="/jobs" className="btn btn-primary btn-lg">
                <FiSearch /> Найти проект
              </Link>
              <Link to="/freelancers" className="btn btn-outline-light btn-lg">
                <FiUsers /> Найти специалиста
              </Link>
            </div>
            <div className="hero-stats">
              <div className="stat">
                <strong>1 000+</strong>
                <span>Специалистов</span>
              </div>
              <div className="stat">
                <strong>5 000+</strong>
                <span>Выполненных проектов</span>
              </div>
              <div className="stat">
                <strong>98%</strong>
                <span>Успешных сделок</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Freelancers */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>Рекомендуемые специалисты</h2>
            <p>Проверенные профессионалы с подтвержденным опытом</p>
          </div>
          <div className="category-filter-bar">
            <button
              className={`filter-chip ${selectedCategory === '' ? 'active' : ''}`}
              onClick={() => handleCategoryFilter('')}
            >
              Все направления
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`filter-chip ${selectedCategory === String(cat.id) ? 'active' : ''}`}
                onClick={() => handleCategoryFilter(cat.id)}
              >
                {getCategoryIcon(cat.icon)} {cat.name}
              </button>
            ))}
          </div>
          {featuredFreelancers.length > 0 ? (
            <div className="freelancers-grid">
              {featuredFreelancers.map(f => (
                <FreelancerCard key={f.id} freelancer={f} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>Специалисты в данной категории пока не зарегистрированы</p>
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <Link to="/freelancers" className="btn btn-outline">
              Все специалисты <FiArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="section section-gray">
        <div className="container">
          <div className="section-header">
            <h2>Направления</h2>
            <p>Выберите нужную область для поиска специалистов</p>
          </div>
          <div className="categories-grid">
            {categories.map(cat => (
              <Link to={`/freelancers?category_id=${cat.id}`} key={cat.id} className="category-card">
                <span className="category-icon">{getCategoryIcon(cat.icon)}</span>
                <span className="category-name">{cat.name}</span>
                <FiArrowRight className="category-arrow" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>Как это работает</h2>
            <p>Три простых шага для начала работы</p>
          </div>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Регистрация</h3>
              <p>Создайте аккаунт, укажите ПИНФЛ и заполните профиль. Выберите роль: специалист или заказчик.</p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3>Размещение задачи</h3>
              <p>Заказчик описывает проект, устанавливает бюджет и сроки. Специалисты получают уведомления.</p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3>Выполнение проекта</h3>
              <p>Специалист подает предложение, согласовывает условия и приступает к выполнению задачи.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Jobs */}
      {recentJobs.length > 0 && (
        <section className="section section-gray">
          <div className="container">
            <div className="section-header">
              <h2>Актуальные проекты</h2>
              <Link to="/jobs" className="link-all">Все проекты <FiArrowRight /></Link>
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
            <h2>Начните работу на платформе</h2>
            <p>Присоединяйтесь к сообществу профессионалов</p>
            <div className="cta-features">
              <div className="cta-feature"><FiCheckCircle /> Бесплатная регистрация</div>
              <div className="cta-feature"><FiCheckCircle /> Безопасные сделки</div>
              <div className="cta-feature"><FiCheckCircle /> Техническая поддержка</div>
            </div>
            <Link to="/register" className="btn btn-primary btn-lg">Создать аккаунт</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
