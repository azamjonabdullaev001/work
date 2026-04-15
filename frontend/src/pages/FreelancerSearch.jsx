import React, { useEffect, useState } from 'react';
import { searchFreelancers, getCategories, getSkills } from '../api/api';
import FreelancerCard from '../components/FreelancerCard';
import { FiSearch, FiFilter } from 'react-icons/fi';

const FreelancerSearch = () => {
  const [freelancers, setFreelancers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [skillId, setSkillId] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    getCategories().then(res => {
      if (res.data.success) setCategories(res.data.data);
    });
    getSkills().then(res => {
      if (res.data.success) setSkills(res.data.data);
    });
  }, []);

  useEffect(() => {
    loadFreelancers();
  }, [page, categoryId, skillId]);

  const loadFreelancers = async () => {
    setLoading(true);
    try {
      const params = { page };
      if (search) params.q = search;
      if (categoryId) params.category_id = categoryId;
      if (skillId) params.skill_id = skillId;
      const res = await searchFreelancers(params);
      if (res.data.success) setFreelancers(res.data.data);
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadFreelancers();
  };

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1>Найти фрилансера</h1>
          <p>Найдите идеального специалиста для вашего проекта</p>
        </div>

        <div className="search-filters">
          <form onSubmit={handleSearch} className="search-bar">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Поиск по имени или специализации..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">Найти</button>
          </form>

          <div className="filter-bar">
            <FiFilter />
            <select value={categoryId} onChange={e => { setCategoryId(e.target.value); setPage(1); }}>
              <option value="">Все категории</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
            <select value={skillId} onChange={e => { setSkillId(e.target.value); setPage(1); }}>
              <option value="">Все навыки</option>
              {skills.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-screen"><div className="spinner"></div></div>
        ) : freelancers.length === 0 ? (
          <div className="empty-state">
            <h3>Фрилансеры не найдены</h3>
            <p>Попробуйте изменить параметры поиска</p>
          </div>
        ) : (
          <>
            <div className="freelancers-grid">
              {freelancers.map(f => (
                <FreelancerCard key={f.id} freelancer={f} />
              ))}
            </div>
            <div className="pagination">
              {page > 1 && <button className="btn btn-outline" onClick={() => setPage(page - 1)}>Назад</button>}
              <span className="page-info">Страница {page}</span>
              {freelancers.length === 20 && <button className="btn btn-outline" onClick={() => setPage(page + 1)}>Далее</button>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FreelancerSearch;
