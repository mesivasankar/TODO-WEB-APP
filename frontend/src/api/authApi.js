import { apiRequest } from './client';

export async function resendVerificationEmail(token) {
  return fetch(
    `${import.meta.env.VITE_API_BASE_URL}/api/auth/resend-verification`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
      credentials: "include",
    }
  );
}

export async function login(email, password) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function register({name, email, password}) {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export async function getCurrentUser() {
  return apiRequest('/api/auth/me');
}

export async function logout() {
  return apiRequest('/api/auth/logout', {
    method: 'POST',
  });
}

// 🔥 NEW FUNCTION: Update Profile
export async function updateProfile(updates) {
  return apiRequest('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}