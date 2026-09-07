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

export interface LogoutResponse {
  message: string;
}

