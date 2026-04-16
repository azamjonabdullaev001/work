import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import ProjectList from "./pages/ProjectList";
import ProjectDetail from "./pages/ProjectDetail";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <header className="app-header">
        <Link to="/" className="logo">
          📦 Project Showcase
        </Link>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<ProjectList />} />
          <Route path="/projects/:projectId" element={<ProjectDetail />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
