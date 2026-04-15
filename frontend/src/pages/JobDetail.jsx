import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getJob, createProposal, getJobProposals, acceptProposal } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiDollarSign, FiClock, FiUsers, FiSend, FiCheck, FiMapPin } from 'react-icons/fi';

const JobDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalForm, setProposalForm] = useState({
    cover_letter: '',
    bid_amount: '',
    duration: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadJob();
  }, [id]);

  const loadJob = async () => {
    try {
      const res = await getJob(id);
      if (res.data.success) setJob(res.data.data);
    } catch {
      toast.error('Заказ не найден');
    } finally {
      setLoading(false);
    }
  };

  const loadProposals = async () => {
    try {
      const res = await getJobProposals(id);
      if (res.data.success) setProposals(res.data.data);
    } catch {}
  };

  useEffect(() => {
    if (user && job && user.id === job.client_id) {
      loadProposals();
    }
  }, [user, job]);

  const handleSubmitProposal = async (e) => {
    e.preventDefault();
    if (!proposalForm.bid_amount) {
      toast.error('Укажите сумму');
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        ...proposalForm,
        bid_amount: parseFloat(proposalForm.bid_amount),
        cover_letter: proposalForm.cover_letter || undefined,
        duration: proposalForm.duration || undefined,
      };
      const res = await createProposal(id, data);
      if (res.data.success) {
        toast.success('Предложение отправлено!');
        setShowProposalForm(false);
        loadJob();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async (proposalId) => {
    try {
      const res = await acceptProposal(proposalId);
      if (res.data.success) {
        toast.success('Предложение принято!');
        loadJob();
        loadProposals();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка');
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;
  if (!job) return <div className="page"><div className="container"><h2>Заказ не найден</h2></div></div>;

  const isOwner = user && user.id === job.client_id;
  const isFreelancer = user && user.role === 'freelancer';

  return (
    <div className="page">
      <div className="container">
        <div className="job-detail-layout">
          <div className="job-detail-main">
            <div className="card">
              <div className="job-detail-header">
                <h1>{job.title}</h1>
                {job.category && (
                  <span className="badge">{job.category.icon} {job.category.name}</span>
                )}
              </div>

              <div className="job-detail-meta">
                {(job.budget_min || job.budget_max) && (
                  <span><FiDollarSign />
                    {job.budget_min && job.budget_max
                      ? `$${job.budget_min} - $${job.budget_max}`
                      : job.budget_max ? `До $${job.budget_max}` : `От $${job.budget_min}`}
                  </span>
                )}
                {job.duration && <span><FiClock /> {job.duration}</span>}
                {job.experience_level && <span>{job.experience_level}</span>}
                <span><FiUsers /> {job.proposal_count} откликов</span>
              </div>

              <div className="job-description">
                <h3>Описание</h3>
                <p>{job.description}</p>
              </div>

              {job.skills?.length > 0 && (
                <div className="job-skills-section">
                  <h3>Требуемые навыки</h3>
                  <div className="skill-tags">
                    {job.skills.map(s => (
                      <span key={s.id} className="skill-tag">{s.name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Proposal form for freelancers */}
            {isFreelancer && job.status === 'open' && (
              <div className="card">
                {!showProposalForm ? (
                  <button className="btn btn-primary btn-full" onClick={() => setShowProposalForm(true)}>
                    <FiSend /> Откликнуться на заказ
                  </button>
                ) : (
                  <form onSubmit={handleSubmitProposal} className="proposal-form">
                    <h3>Ваше предложение</h3>
                    <div className="form-group">
                      <label>Сопроводительное письмо</label>
                      <textarea
                        rows="5"
                        placeholder="Расскажите, почему вы подходите для этого проекта..."
                        value={proposalForm.cover_letter}
                        onChange={e => setProposalForm({...proposalForm, cover_letter: e.target.value})}
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Ваша цена ($) *</label>
                        <input
                          type="number"
                          placeholder="1000"
                          value={proposalForm.bid_amount}
                          onChange={e => setProposalForm({...proposalForm, bid_amount: e.target.value})}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Сроки выполнения</label>
                        <input
                          type="text"
                          placeholder="2 недели"
                          value={proposalForm.duration}
                          onChange={e => setProposalForm({...proposalForm, duration: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary" disabled={submitting}>
                        {submitting ? 'Отправка...' : 'Отправить предложение'}
                      </button>
                      <button type="button" className="btn btn-outline" onClick={() => setShowProposalForm(false)}>
                        Отмена
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Proposals list (for job owner) */}
            {isOwner && proposals.length > 0 && (
              <div className="card">
                <h3>Предложения ({proposals.length})</h3>
                <div className="proposals-list">
                  {proposals.map(p => (
                    <div key={p.id} className="proposal-item">
                      <div className="proposal-header">
                        <Link to={`/profile/${p.freelancer?.id}`} className="proposal-freelancer">
                          <div className="avatar-small">
                            {p.freelancer?.avatar_url
                              ? <img src={p.freelancer.avatar_url} alt="" />
                              : <span>{p.freelancer?.first_name?.[0]}{p.freelancer?.last_name?.[0]}</span>}
                          </div>
                          <div>
                            <strong>{p.freelancer?.first_name} {p.freelancer?.last_name}</strong>
                            {p.freelancer?.title && <span className="text-muted">{p.freelancer.title}</span>}
                          </div>
                        </Link>
                        <div className="proposal-bid">
                          <strong>${p.bid_amount}</strong>
                          {p.duration && <span>{p.duration}</span>}
                        </div>
                      </div>
                      {p.cover_letter && <p className="proposal-letter">{p.cover_letter}</p>}
                      {p.freelancer?.skills?.length > 0 && (
                        <div className="skill-tags skill-tags-sm">
                          {p.freelancer.skills.slice(0, 5).map(s => (
                            <span key={s.id} className="skill-tag">{s.name}</span>
                          ))}
                        </div>
                      )}
                      {p.status === 'pending' && (
                        <button className="btn btn-success btn-sm" onClick={() => handleAccept(p.id)}>
                          <FiCheck /> Принять
                        </button>
                      )}
                      {p.status !== 'pending' && (
                        <span className={`badge badge-${p.status}`}>{p.status}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="job-detail-sidebar">
            <div className="card">
              <h3>О заказчике</h3>
              {job.client && (
                <div className="client-info">
                  <div className="avatar-medium">
                    {job.client.avatar_url
                      ? <img src={job.client.avatar_url} alt="" />
                      : <span>{job.client.first_name?.[0]}{job.client.last_name?.[0]}</span>}
                  </div>
                  <Link to={`/profile/${job.client.id}`}>
                    <strong>{job.client.first_name} {job.client.last_name}</strong>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
