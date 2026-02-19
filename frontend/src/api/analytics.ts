import api from "./client";
import type { ProjectDetail, KeyDetail, DepartmentDetail, UserRankingItem } from "@/types";

export const fetchProjectDetail = (id: string) =>
  api.get<ProjectDetail>(`/analytics/project/${id}`).then((r) => r.data);

export const fetchKeyDetail = (id: string) =>
  api.get<KeyDetail>(`/analytics/key/${id}`).then((r) => r.data);

export const fetchDepartmentDetail = (id: string) =>
  api.get<DepartmentDetail>(`/analytics/department/${id}`).then((r) => r.data);

export const fetchUserRanking = () =>
  api.get<UserRankingItem[]>("/analytics/user-ranking").then((r) => r.data);

export const exportCSV = (range = "30d") =>
  api.get("/analytics/export", { params: { range }, responseType: "blob" }).then((r) => {
    const url = window.URL.createObjectURL(new Blob([r.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = "usage_export.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  });
