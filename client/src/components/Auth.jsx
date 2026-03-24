import { useState } from 'react';
import { api } from '../utils/api.js';

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let data;
      if (mode === 'register') {
        data = await api.register(form.email, form.username, form.password);
      } else {
        data = await api.login(form.email, form.password);
      }
      onAuth(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-logo">🦌</span>
          <h1>JCG Hunt Tracker</h1>
          <p>Stand check-in • GPS • Live weather</p>
        </div>

        <div className="tab-row">
          <button
            className={`tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
          >
            Sign In
          </button>
          <button
            className={`tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError(''); }}
          >
            Register
          </button>
        </div>

        <form onSubmit={submit} className="auth-form">
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={update('email')}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </label>

          {mode === 'register' && (
            <label>
              Username
              <input
                type="text"
                value={form.username}
                onChange={update('username')}
                placeholder="HunterJoe"
                required
                minLength={2}
                maxLength={30}
                autoComplete="username"
              />
            </label>
          )}

          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={update('password')}
              placeholder={mode === 'register' ? 'Min. 6 characters' : 'Password'}
              required
              minLength={6}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
          </label>

          {error && <p className="error-msg">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'register' ? 'Create Account' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
