import api from "./client";
import type {
  KPIOverview,
  UsageTrendPoint,
  CostBreakdownItem,
  ModelDistributionItem,
  TopProjectItem,
  BillingSummaryRow,
} from "@/types";

export const fetchOverview = () => api.get<KPIOverview>("/dashboard/overview").then((r) => r.data);

export const fetchUsageTrends = (range = "30d", platform?: string) =>
  api.get<UsageTrendPoint[]>("/dashboard/usage-trends", { params: { range, platform } }).then((r) => r.data);

export const fetchCostBreakdown = () =>
  api.get<CostBreakdownItem[]>("/dashboard/cost-breakdown").then((r) => r.data);

export const fetchModelDistribution = () =>
  api.get<ModelDistributionItem[]>("/dashboard/model-distribution").then((r) => r.data);

export const fetchTopProjects = () =>
  api.get<TopProjectItem[]>("/dashboard/top-projects").then((r) => r.data);

export const fetchBillingSummary = () =>
  api.get<BillingSummaryRow[]>("/dashboard/billing-summary").then((r) => r.data);
