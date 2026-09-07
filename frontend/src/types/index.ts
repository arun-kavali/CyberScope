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
