import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Header from './components/Header';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import CreateJob from './pages/CreateJob';
import FreelancerSearch from './pages/FreelancerSearch';
import FreelancerProfile from './pages/FreelancerProfile';
import Dashboard from './pages/Dashboard';
import EditProfile from './pages/EditProfile';
import MyPortfolio from './pages/MyPortfolio';

function App() {
  return (
    <div className="app">
      {/* Fixed animated background */}
      <div className="animated-bg">
        <div className="animated-bg-layer"></div>
        <div className="animated-bg-orbs">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
          <div className="orb orb-4"></div>
        </div>
      </div>

      <div className="app-content">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/freelancers" element={<FreelancerSearch />} />
            <Route path="/profile/:id" element={<FreelancerProfile />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
            <Route path="/create-job" element={<ProtectedRoute><CreateJob /></ProtectedRoute>} />
            <Route path="/my-portfolio" element={<ProtectedRoute><MyPortfolio /></ProtectedRoute>} />
          </Routes>
        </main>
        <Footer />
      </div>
      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
}

export default App;
