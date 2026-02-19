export interface User {
  id: string;
  tenant_id: string;
  department_id: string | null;
  email: string;
  full_name: string;
  role: "admin" | "user";
  is_active: boolean;
}

export interface Department {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  tenant_id: string;
  department_id: string | null;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformKey {
  id: string;
  project_id: string;
  platform: "openai" | "anthropic" | "google";
  key_label: string;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
}

export interface KPIOverview {
  total_tokens: number;
  total_cost: number;
  active_keys: number;
  active_projects: number;
  total_requests: number;
}

export interface UsageTrendPoint {
  date: string;
  tokens: number;
  cost: number;
  requests: number;
}

export interface CostBreakdownItem {
  platform: string;
  cost: number;
  percentage: number;
}

export interface ModelDistributionItem {
  model: string;
  tokens: number;
  cost: number;
  requests: number;
}

export interface TopProjectItem {
  project_id: string;
  project_name: string;
  total_cost: number;
  total_tokens: number;
}

export interface BillingSummaryRow {
  project_id: string;
  project_name: string;
  platform: string;
  key_label: string;
  cost: number;
  tokens: number;
}

export interface ProjectDetail {
  project_id: string;
  project_name: string;
  total_tokens: number;
  total_cost: number;
  total_requests: number;
  keys_count: number;
  daily_usage: Array<{ date: string; tokens: number; cost: number; requests: number }>;
  model_breakdown: Array<{ model: string; tokens: number; cost: number; requests: number }>;
}

export interface KeyDetail {
  key_id: string;
  key_label: string;
  platform: string;
  total_tokens: number;
  total_cost: number;
  total_requests: number;
  daily_usage: Array<{ date: string; tokens: number; cost: number; requests: number }>;
  model_breakdown: Array<{ model: string; tokens: number; cost: number; requests: number }>;
}

export interface DepartmentDetail {
  department_id: string;
  department_name: string;
  projects_count: number;
  total_tokens: number;
  total_cost: number;
  project_breakdown: Array<{ project_id: string; project_name: string; tokens: number; cost: number }>;
}

export interface UserRankingItem {
  user_id: string;
  full_name: string;
  email: string;
  department_name: string | null;
  total_tokens: number;
  total_cost: number;
  projects_count: number;
}

export interface SyncLogItem {
  id: string;
  platform_key_id: string;
  sync_type: string;
  status: string;
  records_synced: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}
