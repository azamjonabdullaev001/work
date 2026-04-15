import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listJobs, getCategories } from '../api/api';
import JobCard from '../components/JobCard';
import { FiSearch, FiFilter } from 'react-icons/fi';

const Jobs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [categoryId, setCategoryId] = useState(searchParams.get('category_id') || '');
  const [page, setPage] = useState(1);

  useEffect(() => {
    getCategories().then(res => {
      if (res.data.success) setCategories(res.data.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { page };
    if (search) params.q = search;
    if (categoryId) params.category_id = categoryId;

    listJobs(params).then(res => {
      if (res.data.success) setJobs(res.data.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [page, categoryId, searchParams]);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = {};
    if (search) params.q = search;
    if (categoryId) params.category_id = categoryId;
    setSearchParams(params);
    setPage(1);
  };

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1>Найти заказы</h1>
          <p>Просматривайте открытые проекты и находите интересную работу</p>
        </div>

        <div className="search-filters">
          <form onSubmit={handleSearch} className="search-bar">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Поиск заказов..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">Найти</button>
          </form>

          <div className="filter-bar">
            <FiFilter />
            <select
              value={categoryId}
              onChange={e => {
                setCategoryId(e.target.value);
                const params = {};
                if (search) params.q = search;
                if (e.target.value) params.category_id = e.target.value;
                setSearchParams(params);
                setPage(1);
              }}
            >
              <option value="">Все категории</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-screen"><div className="spinner"></div></div>
        ) : jobs.length === 0 ? (
          <div className="empty-state">
            <h3>Заказы не найдены</h3>
            <p>Попробуйте изменить параметры поиска</p>
          </div>
        ) : (
          <>
            <div className="jobs-list">
              {jobs.map(job => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>

            <div className="pagination">
              {page > 1 && (
                <button className="btn btn-outline" onClick={() => setPage(page - 1)}>
                  Назад
                </button>
              )}
              <span className="page-info">Страница {page}</span>
              {jobs.length === 20 && (
                <button className="btn btn-outline" onClick={() => setPage(page + 1)}>
                  Далее
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Jobs;
