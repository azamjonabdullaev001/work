import React from 'react';
import { Link } from 'react-router-dom';
import { FiClock, FiDollarSign, FiUsers } from 'react-icons/fi';

const JobCard = ({ job }) => {
  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Только что';
    if (hours < 24) return `${hours} ч. назад`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} дн. назад`;
    return `${Math.floor(days / 30)} мес. назад`;
  };

  return (
    <div className="job-card">
      <div className="job-card-header">
        <Link to={`/jobs/${job.id}`} className="job-title">{job.title}</Link>
        <span className="job-time"><FiClock /> {timeAgo(job.created_at)}</span>
      </div>

      <p className="job-description">
        {job.description?.length > 200
          ? job.description.substring(0, 200) + '...'
          : job.description}
      </p>

      {job.skills?.length > 0 && (
        <div className="skill-tags">
          {job.skills.map(s => (
            <span key={s.id} className="skill-tag">{s.name}</span>
          ))}
        </div>
      )}

      <div className="job-card-footer">
        <div className="job-meta">
          {(job.budget_min || job.budget_max) && (
            <span className="job-budget">
              <FiDollarSign />
              {job.budget_min && job.budget_max
                ? `$${job.budget_min} - $${job.budget_max}`
                : job.budget_max
                  ? `До $${job.budget_max}`
                  : `От $${job.budget_min}`}
            </span>
          )}
          {job.duration && <span className="job-duration">{job.duration}</span>}
          {job.experience_level && <span className="job-level">{job.experience_level}</span>}
        </div>
        <span className="job-proposals"><FiUsers /> {job.proposal_count} откликов</span>
      </div>

      {job.category && (
        <span className="job-category">{job.category.name}</span>
      )}
    </div>
  );
};

export default JobCard;
