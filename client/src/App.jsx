import { useState, useEffect, useCallback } from 'react';
import Auth from './components/Auth.jsx';
import Dashboard from './components/Dashboard.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('jcg_token');
    const stored = localStorage.getItem('jcg_user');
    if (token && stored) {
      try {
        const u = JSON.parse(stored);
        // Check token expiry
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) {
          setUser(u);
        } else {
          localStorage.removeItem('jcg_token');
          localStorage.removeItem('jcg_user');
        }
      } catch {
        localStorage.removeItem('jcg_token');
        localStorage.removeItem('jcg_user');
      }
    }
    setLoading(false);
  }, []);

  const handleAuth = useCallback((token, u) => {
    localStorage.setItem('jcg_token', token);
    localStorage.setItem('jcg_user', JSON.stringify(u));
    setUser(u);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('jcg_token');
    localStorage.removeItem('jcg_user');
    setUser(null);
  }, []);

  if (loading) {
    return (
      <div className="splash">
        <div className="splash-icon">🦌</div>
        <p>Loading…</p>
      </div>
    );
  }

  return user
    ? <Dashboard user={user} onLogout={handleLogout} />
    : <Auth onAuth={handleAuth} />;
}
