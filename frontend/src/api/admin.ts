import api from "./client";
import type { User, Department, Project, PlatformKey, SyncLogItem } from "@/types";

// Departments
export const fetchDepartments = () => api.get<Department[]>("/admin/departments").then((r) => r.data);
export const createDepartment = (data: { name: string; description?: string }) =>
  api.post<Department>("/admin/departments", data).then((r) => r.data);
export const updateDepartment = (id: string, data: { name?: string; description?: string }) =>
  api.put<Department>(`/admin/departments/${id}`, data).then((r) => r.data);
export const deleteDepartment = (id: string) => api.delete(`/admin/departments/${id}`);

// Users
export const fetchUsers = () => api.get<User[]>("/admin/users").then((r) => r.data);
export const createUser = (data: { email: string; password: string; full_name: string; role?: string; department_id?: string }) =>
  api.post<User>("/admin/users", data).then((r) => r.data);
export const updateUser = (id: string, data: Record<string, unknown>) =>
  api.put<User>(`/admin/users/${id}`, data).then((r) => r.data);
export const deleteUser = (id: string) => api.delete(`/admin/users/${id}`);

// Projects
export const fetchProjects = () => api.get<Project[]>("/admin/projects").then((r) => r.data);
export const createProject = (data: { name: string; description?: string; department_id?: string }) =>
  api.post<Project>("/admin/projects", data).then((r) => r.data);
export const updateProject = (id: string, data: Partial<Project>) =>
  api.put<Project>(`/admin/projects/${id}`, data).then((r) => r.data);
export const deleteProject = (id: string) => api.delete(`/admin/projects/${id}`);

// Platform Keys
export const fetchKeys = (projectId: string) =>
  api.get<PlatformKey[]>(`/admin/projects/${projectId}/keys`).then((r) => r.data);
export const addKey = (projectId: string, data: { platform: string; api_key: string; key_label: string }) =>
  api.post<PlatformKey>(`/admin/projects/${projectId}/keys`, data).then((r) => r.data);
export const deleteKey = (projectId: string, keyId: string) =>
  api.delete(`/admin/projects/${projectId}/keys/${keyId}`);

// User Access
export const fetchUserAccess = (userId: string) =>
  api.get(`/admin/users/${userId}/access`).then((r) => r.data);
export const updateUserAccess = (userId: string, data: { project_ids: string[]; permission_level: string }) =>
  api.put(`/admin/users/${userId}/access`, data);

// Sync
export const triggerSyncAll = () => api.post("/sync/trigger");
export const triggerSyncKey = (keyId: string) => api.post(`/sync/trigger/${keyId}`);
export const fetchSyncLogs = () => api.get<SyncLogItem[]>("/admin/sync-logs").then((r) => r.data);
export const fetchSyncStatus = () => api.get("/sync/status").then((r) => r.data);

// Sync interval
export const updateSyncInterval = (hours: number) =>
  api.put("/admin/settings/sync-interval", { interval_hours: hours });
