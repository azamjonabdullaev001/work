import React from 'react';
import { Link } from 'react-router-dom';
import { FiStar, FiMapPin } from 'react-icons/fi';

const FreelancerCard = ({ freelancer }) => {
  return (
    <div className="freelancer-card">
      <div className="freelancer-card-top">
        <div className="freelancer-avatar">
          {freelancer.avatar_url ? (
            <img src={freelancer.avatar_url} alt={freelancer.first_name} />
          ) : (
            <div className="avatar-placeholder">
              {freelancer.first_name?.[0]}{freelancer.last_name?.[0]}
            </div>
          )}
        </div>
        <div className="freelancer-info">
          <Link to={`/profile/${freelancer.id}`} className="freelancer-name">
            {freelancer.first_name} {freelancer.last_name}
          </Link>
          {freelancer.title && <p className="freelancer-title">{freelancer.title}</p>}
          <div className="freelancer-meta">
            {freelancer.rating > 0 && (
              <span className="rating">
                <FiStar className="star-icon" /> {freelancer.rating?.toFixed(1)} ({freelancer.reviews_count})
              </span>
            )}
            {freelancer.location && (
              <span className="location"><FiMapPin /> {freelancer.location}</span>
            )}
            {freelancer.hourly_rate && (
              <span className="rate">${freelancer.hourly_rate}/час</span>
            )}
          </div>
        </div>
      </div>

      {freelancer.bio && (
        <p className="freelancer-bio">
          {freelancer.bio.length > 150 ? freelancer.bio.substring(0, 150) + '...' : freelancer.bio}
        </p>
      )}

      {freelancer.skills?.length > 0 && (
        <div className="skill-tags">
          {freelancer.skills.slice(0, 6).map(s => (
            <span key={s.id} className="skill-tag">{s.name}</span>
          ))}
          {freelancer.skills.length > 6 && (
            <span className="skill-tag skill-tag-more">+{freelancer.skills.length - 6}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default FreelancerCard;
