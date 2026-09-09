export interface HealthResponse {
  status: string;
  service: string;
}

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  disabled?: boolean;
}

export interface UserProfileResponse {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  role: 'SOC_ANALYST' | 'ALERT_SOURCE';
  is_active: boolean;
}

export interface TokenResponse {
  token: string;
  token_type: string;
  user: UserProfileResponse;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface SignupRequest {
  full_name: string;
  username: string;
  email: string;
  password: string;
  role: 'SOC_ANALYST' | 'ALERT_SOURCE';
}

export interface LogoutResponse {
  message: string;
}

export interface DashboardMetrics {
  live_alerts_count: number;
  critical_high_alerts_count: number;
  active_incidents_count: number;
  active_investigations_count: number;
  execution_gaps_count: number;
  negative_space_count: number;
  review_priorities_count: number;
}

export interface DistributionItem {
  name: string;
  count: number;
}

export interface OperationalIndicators {
  avg_risk_score: number;
  avg_confidence_score: number;
  resolved_incidents_count: number;
  total_incidents_count: number;
}

export interface DashboardAlertItem {
  id: string;
  alert_code: string;
  event_type: string;
  event_category: string;
  severity: string;
  status: string;
  timestamp: string;
  risk_score?: number;
  source_name?: string;
  user_context?: string;
}

export interface DashboardIncidentItem {
  id: string;
  incident_number: string;
  title: string;
  severity: string;
  risk_score: number;
  confidence_score: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface FindingSummaryItem {
  id: string;
  title: string;
  category: string;
  severity: string;
  created_at: string;
}

export interface DashboardSummaryResponse {
  metrics: DashboardMetrics;
  severity_distribution: DistributionItem[];
  risk_distribution: DistributionItem[];
  source_distribution: DistributionItem[];
  category_distribution: DistributionItem[];
  incident_status_distribution?: DistributionItem[];
  critical_alerts: DashboardAlertItem[];
  active_incidents: DashboardIncidentItem[];
  recent_incidents: DashboardIncidentItem[];
  operational_findings: FindingSummaryItem[];
  execution_gaps: FindingSummaryItem[];
  negative_space: FindingSummaryItem[];
  operational_indicators: OperationalIndicators;
}
