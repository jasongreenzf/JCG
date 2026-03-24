const BASE = '/api';

function getToken() {
  return localStorage.getItem('jcg_token');
}

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  register: (email, username, password) =>
    request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password }),
    }),

  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),

  getHunt: () =>
    request('/hunt', { headers: authHeaders() }),

  checkIn: (gps_lat, gps_lng) =>
    request('/stand/checkin', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ gps_lat, gps_lng }),
    }),

  checkOut: () =>
    request('/stand/checkout', {
      method: 'POST',
      headers: authHeaders(),
    }),

  getWeather: (lat, lng) =>
    request(`/weather?lat=${lat}&lng=${lng}`, { headers: authHeaders() }),
};
