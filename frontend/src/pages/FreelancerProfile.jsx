import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProfile, getUserReviews, followUser, unfollowUser, checkFollow, getFollowers, getFollowing, getFollowCounts } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiStar, FiMapPin, FiDollarSign, FiExternalLink, FiCalendar, FiUserPlus, FiUserMinus, FiUsers } from 'react-icons/fi';

const FreelancerProfile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [followCounts, setFollowCounts] = useState({ followers_count: 0, following_count: 0 });
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  useEffect(() => {
    Promise.all([
      getProfile(id),
      getUserReviews(id),
      getFollowCounts(id),
    ]).then(([profileRes, reviewsRes, countsRes]) => {
      if (profileRes.data.success) setProfile(profileRes.data.data);
      if (reviewsRes.data.success) setReviews(reviewsRes.data.data);
      if (countsRes.data.success) setFollowCounts(countsRes.data.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (user && user.id !== parseInt(id)) {
      checkFollow(id).then(res => {
        if (res.data.success) setIsFollowing(res.data.data.is_following);
      }).catch(() => {});
    }
  }, [user, id]);

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        await unfollowUser(id);
        setIsFollowing(false);
        setFollowCounts(prev => ({ ...prev, followers_count: prev.followers_count - 1 }));
        toast.success('Вы отписались');
      } else {
        await followUser(id);
        setIsFollowing(true);
        setFollowCounts(prev => ({ ...prev, followers_count: prev.followers_count + 1 }));
        toast.success('Вы подписались!');
      }
    } catch {
      toast.error('Ошибка');
    }
  };

  const loadFollowers = async () => {
    try {
      const res = await getFollowers(id);
      if (res.data.success) setFollowers(res.data.data);
      setShowFollowers(true);
      setShowFollowing(false);
    } catch {}
  };

  const loadFollowing = async () => {
    try {
      const res = await getFollowing(id);
      if (res.data.success) setFollowing(res.data.data);
      setShowFollowing(true);
      setShowFollowers(false);
    } catch {}
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;
  if (!profile) return <div className="page"><div className="container"><h2>Профиль не найден</h2></div></div>;

  const featuredProject = profile.portfolio?.find(p => p.is_featured);
  const otherProjects = profile.portfolio?.filter(p => !p.is_featured) || [];

  return (
    <div className="page">
      <div className="container">
        <div className="profile-layout">
          {/* Main content */}
          <div className="profile-main">
            {/* Hero */}
            <div className="card profile-hero">
              <div className="profile-hero-top">
                <div className="profile-avatar-large">
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt={profile.first_name} />
                    : <div className="avatar-placeholder-lg">{profile.first_name?.[0]}{profile.last_name?.[0]}</div>}
                </div>
                <div className="profile-hero-info">
                  <h1>{profile.first_name} {profile.last_name} {profile.patronymic || ''}</h1>
                  {profile.title && <p className="profile-title">{profile.title}</p>}
                  <div className="profile-meta">
                    {profile.rating > 0 && (
                      <span className="rating"><FiStar className="star-filled" /> {profile.rating?.toFixed(1)}/10 ({profile.reviews_count} отзывов)</span>
                    )}
                    {profile.location && <span><FiMapPin /> {profile.location}</span>}
                    {profile.hourly_rate && <span><FiDollarSign /> ${profile.hourly_rate}/час</span>}
                    <span><FiCalendar /> На платформе с {new Date(profile.created_at).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <div className="card">
                <h2>О себе</h2>
                <p className="profile-bio">{profile.bio}</p>
              </div>
            )}

            {/* Skills */}
            {profile.skills?.length > 0 && (
              <div className="card">
                <h2>Навыки</h2>
                <div className="skill-tags skill-tags-lg">
                  {profile.skills.map(s => (
                    <span key={s.id} className="skill-tag">{s.name}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Featured Project */}
            {featuredProject && (
              <div className="card featured-project">
                <h2>Главный проект</h2>
                <div className="portfolio-featured">
                  {featuredProject.image_url && (
                    <img src={featuredProject.image_url} alt={featuredProject.title} className="portfolio-featured-img" />
                  )}
                  <div className="portfolio-featured-info">
                    <h3>{featuredProject.title}</h3>
                    {featuredProject.description && <p>{featuredProject.description}</p>}
                    {featuredProject.project_url && (
                      <a href={featuredProject.project_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                        <FiExternalLink /> Посмотреть проект
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Portfolio */}
            {otherProjects.length > 0 && (
              <div className="card">
                <h2>Портфолио</h2>
                <div className="portfolio-grid">
                  {otherProjects.map(p => (
                    <div key={p.id} className="portfolio-item">
                      {p.image_url && <img src={p.image_url} alt={p.title} className="portfolio-img" />}
                      <div className="portfolio-info">
                        <h4>{p.title}</h4>
                        {p.description && <p>{p.description}</p>}
                        {p.project_url && (
                          <a href={p.project_url} target="_blank" rel="noopener noreferrer">
                            <FiExternalLink /> Посмотреть
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <div className="card">
                <h2>Отзывы ({reviews.length})</h2>
                <div className="reviews-list">
                  {reviews.map(r => (
                    <div key={r.id} className="review-item">
                      <div className="review-header">
                        <div className="review-author">
                          <div className="avatar-small">
                            {r.reviewer?.avatar_url
                              ? <img src={r.reviewer.avatar_url} alt="" />
                              : <span>{r.reviewer?.first_name?.[0]}{r.reviewer?.last_name?.[0]}</span>}
                          </div>
                          <div>
                            <strong>{r.reviewer?.first_name} {r.reviewer?.last_name}</strong>
                            <span className="text-muted">{new Date(r.created_at).toLocaleDateString('ru-RU')}</span>
                          </div>
                        </div>
                        <div className="review-stars">
                          {[1,2,3,4,5,6,7,8,9,10].map(n => (
                            <FiStar key={n} className={n <= r.rating ? 'star-filled' : 'star-empty'} />
                          ))}
                        </div>
                      </div>
                      {r.comment && <p className="review-comment">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="profile-sidebar">
            <div className="card">
              <h3>Контактная информация</h3>
              <p><strong>Телефон:</strong> {profile.phone}</p>
              <p><strong>Роль:</strong> {profile.role === 'freelancer' ? 'Фрилансер' : 'Заказчик'}</p>
            </div>

            {/* Follow button */}
            {user && user.id !== profile.id && (
              <button
                className={`btn btn-full ${isFollowing ? 'btn-outline' : 'btn-primary'}`}
                onClick={handleFollow}
                style={{ marginTop: '12px' }}
              >
                {isFollowing ? <><FiUserMinus /> Отписаться</> : <><FiUserPlus /> Подписаться</>}
              </button>
            )}

            {/* Follow counts */}
            <div className="card" style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                <div style={{ cursor: 'pointer' }} onClick={loadFollowers}>
                  <strong>{followCounts.followers_count}</strong>
                  <p style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Подписчики</p>
                </div>
                <div style={{ cursor: 'pointer' }} onClick={loadFollowing}>
                  <strong>{followCounts.following_count}</strong>
                  <p style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Подписки</p>
                </div>
              </div>
            </div>

            {/* Followers list */}
            {showFollowers && (
              <div className="card" style={{ marginTop: '12px' }}>
                <h3><FiUsers /> Подписчики ({followers.length})</h3>
                {followers.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                    {followers.map(f => (
                      <Link to={`/profile/${f.id}`} key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}>
                        <div className="avatar-small">
                          {f.avatar_url ? <img src={f.avatar_url} alt="" /> : <span>{f.first_name?.[0]}{f.last_name?.[0]}</span>}
                        </div>
                        <div>
                          <strong>{f.first_name} {f.last_name}</strong>
                          {f.title && <p style={{ fontSize: '12px', color: 'var(--gray-500)', margin: 0 }}>{f.title}</p>}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--gray-500)', fontSize: '14px', marginTop: '8px' }}>Нет подписчиков</p>
                )}
              </div>
            )}

            {/* Following list */}
            {showFollowing && (
              <div className="card" style={{ marginTop: '12px' }}>
                <h3><FiUsers /> Подписки ({following.length})</h3>
                {following.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                    {following.map(f => (
                      <Link to={`/profile/${f.id}`} key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}>
                        <div className="avatar-small">
                          {f.avatar_url ? <img src={f.avatar_url} alt="" /> : <span>{f.first_name?.[0]}{f.last_name?.[0]}</span>}
                        </div>
                        <div>
                          <strong>{f.first_name} {f.last_name}</strong>
                          {f.title && <p style={{ fontSize: '12px', color: 'var(--gray-500)', margin: 0 }}>{f.title}</p>}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--gray-500)', fontSize: '14px', marginTop: '8px' }}>Нет подписок</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreelancerProfile;
