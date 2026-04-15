import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyJobs, getMyProposals, getMyPortfolio, getMyContracts, confirmContract } from '../api/api';
import { FiBriefcase, FiSend, FiDollarSign, FiEdit, FiImage, FiPlus, FiTrash2, FiCheckCircle, FiFileText } from 'react-icons/fi';
import { deleteJob } from '../api/api';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const { user } = useAuth();
  const [myJobs, setMyJobs] = useState([]);
  const [myProposals, setMyProposals] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const contractsRes = await getMyContracts();
      if (contractsRes.data.success) setContracts(contractsRes.data.data);

      if (user?.role === 'client') {
        const res = await getMyJobs();
        if (res.data.success) setMyJobs(res.data.data);
      } else if (user?.role === 'freelancer') {
        const [proposalsRes, portfolioRes] = await Promise.all([
          getMyProposals(),
          getMyPortfolio(),
        ]);
        if (proposalsRes.data.success) setMyProposals(proposalsRes.data.data);
        if (portfolioRes.data.success) setPortfolio(portfolioRes.data.data);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleConfirmContract = async (contractId) => {
    try {
      const res = await confirmContract(contractId);
      if (res.data.success) {
        toast.success('Контракт подтверждён!');
        setContracts(prev =>
          prev.map(c => c.id === contractId ? { ...c, ...res.data.data } : c)
        );
      }
    } catch {
      toast.error('Ошибка подтверждения');
    }
  };

  const handleDeleteJob = async (id) => {
    if (!window.confirm('Удалить этот заказ?')) return;
    try {
      await deleteJob(id);
      setMyJobs(prev => prev.filter(j => j.id !== id));
      toast.success('Заказ удалён');
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  const statusLabels = {
    open: 'Открыт',
    in_progress: 'В работе',
    completed: 'Завершён',
    cancelled: 'Отменён',
    pending: 'На рассмотрении',
    accepted: 'Принято',
    rejected: 'Отклонено',
    withdrawn: 'Отозвано',
  };

  return (
    <div className="page">
      <div className="container">
        {/* Profile Summary */}
        <div className="dashboard-header">
          <div className="dashboard-avatar">
            {user.avatar_url
              ? <img src={user.avatar_url} alt="" />
              : <div className="avatar-placeholder-lg">{user.first_name?.[0]}{user.last_name?.[0]}</div>}
          </div>
          <div className="dashboard-info">
            <h1>{user.first_name} {user.last_name}</h1>
            {user.title && <p className="text-muted">{user.title}</p>}
            <span className="badge">{user.role === 'freelancer' ? 'Фрилансер' : 'Заказчик'}</span>
          </div>
          <div className="dashboard-actions">
            <Link to="/edit-profile" className="btn btn-outline"><FiEdit /> Редактировать</Link>
            <Link to={`/profile/${user.id}`} className="btn btn-outline">Мой профиль</Link>
            {user.role === 'client' && (
              <Link to="/create-job" className="btn btn-primary"><FiPlus /> Новый заказ</Link>
            )}
          </div>
        </div>

        {/* Contracts */}
        {contracts.length > 0 && (
          <div className="dashboard-section">
            <h2><FiFileText /> Контракты ({contracts.length})</h2>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Проект</th>
                    <th>Партнёр</th>
                    <th>Сумма</th>
                    <th>Статус</th>
                    <th>Подтверждение</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map(c => {
                    const isClient = user.id === c.client_id;
                    const myConfirmed = isClient ? c.client_confirmed : c.freelancer_confirmed;
                    const partnerConfirmed = isClient ? c.freelancer_confirmed : c.client_confirmed;
                    const partnerName = isClient ? c.freelancer_name : c.client_name;

                    return (
                      <tr key={c.id}>
                        <td><Link to={`/jobs/${c.job_id}`} className="table-link">{c.job_title}</Link></td>
                        <td>{partnerName}</td>
                        <td>${c.amount}</td>
                        <td>
                          <span className={`badge badge-${c.status}`}>
                            {c.status === 'active' ? 'Активен' : c.status === 'pending' ? 'Ожидание' : c.status}
                          </span>
                        </td>
                        <td>
                          {c.status === 'active' ? (
                            <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <FiCheckCircle /> Обе стороны подтвердили
                            </span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ fontSize: '13px', color: 'var(--gray-500)' }}>
                                Вы: {myConfirmed ? '✅ Подтверждено' : '⏳ Не подтверждено'}
                              </div>
                              <div style={{ fontSize: '13px', color: 'var(--gray-500)' }}>
                                Партнёр: {partnerConfirmed ? '✅ Подтверждено' : '⏳ Не подтверждено'}
                              </div>
                              {!myConfirmed && (
                                <button
                                  className="btn btn-success btn-xs"
                                  onClick={() => handleConfirmContract(c.id)}
                                >
                                  <FiCheckCircle /> Подтвердить начало работы
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Client Dashboard */}
        {user.role === 'client' && (
          <div className="dashboard-section">
            <h2><FiBriefcase /> Мои заказы ({myJobs.length})</h2>
            {myJobs.length === 0 ? (
              <div className="empty-state">
                <p>У вас пока нет заказов</p>
                <Link to="/create-job" className="btn btn-primary">Создать первый заказ</Link>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Заказ</th>
                      <th>Статус</th>
                      <th>Бюджет</th>
                      <th>Отклики</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myJobs.map(job => (
                      <tr key={job.id}>
                        <td>
                          <Link to={`/jobs/${job.id}`} className="table-link">{job.title}</Link>
                        </td>
                        <td><span className={`badge badge-${job.status}`}>{statusLabels[job.status] || job.status}</span></td>
                        <td>
                          {job.budget_min || job.budget_max
                            ? `$${job.budget_min || 0} - $${job.budget_max || '∞'}`
                            : '—'}
                        </td>
                        <td>{job.proposal_count}</td>
                        <td>
                          <Link to={`/jobs/${job.id}`} className="btn btn-outline btn-xs">Смотреть</Link>
                          {job.status === 'open' && (
                            <button className="btn btn-danger btn-xs" onClick={() => handleDeleteJob(job.id)}>
                              <FiTrash2 />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Freelancer Dashboard */}
        {user.role === 'freelancer' && (
          <>
            {/* Proposals */}
            <div className="dashboard-section">
              <h2><FiSend /> Мои предложения ({myProposals.length})</h2>
              {myProposals.length === 0 ? (
                <div className="empty-state">
                  <p>У вас пока нет предложений</p>
                  <Link to="/jobs" className="btn btn-primary">Найти заказы</Link>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Заказ</th>
                        <th>Ваша цена</th>
                        <th>Статус</th>
                        <th>Дата</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myProposals.map(p => (
                        <tr key={p.id}>
                          <td>
                            <Link to={`/jobs/${p.job_id}`} className="table-link">
                              {p.job?.title || `Заказ #${p.job_id}`}
                            </Link>
                          </td>
                          <td><FiDollarSign /> ${p.bid_amount}</td>
                          <td><span className={`badge badge-${p.status}`}>{statusLabels[p.status] || p.status}</span></td>
                          <td>{new Date(p.created_at).toLocaleDateString('ru-RU')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Portfolio Preview */}
            <div className="dashboard-section">
              <div className="section-header">
                <h2><FiImage /> Портфолио ({portfolio.length})</h2>
                <Link to="/my-portfolio" className="btn btn-outline btn-sm"><FiPlus /> Управление</Link>
              </div>
              {portfolio.length === 0 ? (
                <div className="empty-state">
                  <p>Добавьте работы в портфолио</p>
                  <Link to="/my-portfolio" className="btn btn-primary">Добавить проект</Link>
                </div>
              ) : (
                <div className="portfolio-grid-sm">
                  {portfolio.slice(0, 4).map(p => (
                    <div key={p.id} className="portfolio-item-sm">
                      {p.image_url && <img src={p.image_url} alt={p.title} />}
                      <h4>{p.title}</h4>
                      {p.is_featured && <span className="badge badge-featured">Главный</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
