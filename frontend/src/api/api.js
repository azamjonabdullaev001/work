import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');

// Profile
export const getProfile = (id) => api.get(`/profile/${id}`);
export const updateProfile = (data) => api.put('/profile', data);
export const uploadAvatar = (formData) =>
  api.post('/profile/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const searchFreelancers = (params) => api.get('/freelancers', { params });

// Jobs
export const listJobs = (params) => api.get('/jobs', { params });
export const getJob = (id) => api.get(`/jobs/${id}`);
export const createJob = (data) => api.post('/jobs', data);
export const getMyJobs = () => api.get('/jobs/my');
export const deleteJob = (id) => api.delete(`/jobs/${id}`);

// Proposals
export const createProposal = (jobId, data) => api.post(`/jobs/${jobId}/proposals`, data);
export const getJobProposals = (jobId) => api.get(`/jobs/${jobId}/proposals`);
export const getMyProposals = () => api.get('/proposals/my');
export const acceptProposal = (id) => api.put(`/proposals/${id}/accept`);

// Portfolio
export const getMyPortfolio = () => api.get('/portfolio');
export const createPortfolioItem = (formData) =>
  api.post('/portfolio', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const updatePortfolioItem = (id, data) => api.put(`/portfolio/${id}`, data);
export const deletePortfolioItem = (id) => api.delete(`/portfolio/${id}`);

// Skills & Categories
export const getCategories = () => api.get('/categories');
export const getSkills = (categoryId) =>
  api.get('/skills', { params: categoryId ? { category_id: categoryId } : {} });

// Reviews
export const getUserReviews = (userId) => api.get(`/reviews/${userId}`);
export const createReview = (data) => api.post('/reviews', data);

export default api;
