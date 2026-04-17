import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

// Projects
export const listProjects = () => api.get("/projects");
export const getProject = (id) => api.get(`/projects/${id}`);
export const deleteProject = (id) => api.delete(`/projects/${id}`);

export const addProject = (githubUrl, projectName) =>
  api.post("/projects", { github_url: githubUrl, project_name: projectName });

// Branches
export const listBranches = (id) => api.get(`/projects/${id}/branches`);

// Tree & files (branch-based)
export const getFileTree = (id, ref) =>
  api.get(`/projects/${id}/tree`, { params: { ref } });

export const getReadme = (id, ref) =>
  api.get(`/projects/${id}/readme`, { params: { ref } });

// Helpers — build full URLs for file content
export const fileUrl = (id, path, ref) =>
  `/api/projects/${id}/file?path=${encodeURIComponent(path)}${ref ? `&ref=${encodeURIComponent(ref)}` : ""}`;

export default api;
