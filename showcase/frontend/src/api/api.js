import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

// Projects
export const listProjects = () => api.get("/projects");
export const getProject = (id) => api.get(`/projects/${id}`);
export const listVersions = (id) => api.get(`/projects/${id}/versions`);
export const getFileTree = (id, version) =>
  api.get(`/projects/${id}/versions/${version}/tree`);
export const getReadme = (id, version) =>
  api.get(`/projects/${id}/versions/${version}/readme`);

export const uploadProject = (file, projectName, projectId) => {
  const form = new FormData();
  form.append("file", file);
  form.append("project_name", projectName);
  if (projectId) form.append("project_id", projectId);
  return api.post("/projects/upload", form);
};

// Helpers — build full URLs for preview iframe and file download
export const previewUrl = (id, version, path = "index.html") =>
  `/api/preview/${id}/${version}/${path}`;

export const downloadUrl = (id, version) =>
  `/api/projects/${id}/versions/${version}/download`;

export const fileUrl = (id, version, path) =>
  `/api/projects/${id}/versions/${version}/files?path=${encodeURIComponent(path)}`;

export default api;
