import { UserProfileResponse, TokenResponse, LoginRequest, SignupRequest, LogoutResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function loginApi(credentials: LoginRequest): Promise<TokenResponse> {
  // Target canonical /api/v1/auth/login first, fallback to /auth/login
  let response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (response.status === 404) {
    response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || 'Login failed. Invalid username or password.');
  }

  return data;
}

export async function signupApi(payload: SignupRequest): Promise<TokenResponse> {
  let response = await fetch(`${API_BASE_URL}/api/v1/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 404) {
    response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || 'Signup failed. Please check your information and try again.');
  }

  return data;
}

export async function logoutApi(token: string): Promise<LogoutResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    return response.json();
  } catch {
    return { message: 'Session cleared locally' };
  }
}

export async function getMeApi(token: string): Promise<UserProfileResponse> {
  let response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  if (response.status === 404) {
    response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || 'Session expired or invalid.');
  }

  return data;
}
