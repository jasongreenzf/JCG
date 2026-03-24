import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api.js';
import HuntStand from './HuntStand.jsx';
import WeatherWidget from './WeatherWidget.jsx';

export default function Dashboard({ user, onLogout }) {
  const [huntData, setHuntData] = useState(null);
  const [gps, setGps] = useState(null);
  const [gpsError, setGpsError] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [error, setError] = useState('');

  const loadHunt = useCallback(async () => {
    try {
      const data = await api.getHunt();
      setHuntData(data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    loadHunt();
    // Auto-refresh stand status every 30s
    const interval = setInterval(loadHunt, 30 * 1000);
    return () => clearInterval(interval);
  }, [loadHunt]);

  const requestGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation not supported on this device');
      return;
    }
    setGpsLoading(true);
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setGpsLoading(false);
      },
      (err) => {
        setGpsError(`GPS error: ${err.message}`);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Auto-request GPS on mount
  useEffect(() => {
    requestGps();
  }, [requestGps]);

  return (
    <div className="dashboard">
      <header className="app-header">
        <div className="header-left">
          <span className="header-logo">🦌</span>
          <span className="header-title">JCG Hunt Tracker</span>
        </div>
        <div className="header-right">
          <span className="header-user">👤 {user.username}</span>
          <button className="btn-logout" onClick={onLogout}>Sign Out</button>
        </div>
      </header>

      <main className="dashboard-main">
        {error && (
          <div className="alert-error">
            {error}
            <button onClick={() => setError('')}>✕</button>
          </div>
        )}

        {/* GPS Card */}
        <div className="card gps-card">
          <div className="card-title-row">
            <h2 className="card-title">📍 Your Location</h2>
            <button className="btn-icon" onClick={requestGps} disabled={gpsLoading} title="Refresh GPS">
              {gpsLoading ? '⏳' : '🔄'}
            </button>
          </div>
          {gpsError && <p className="error-msg">{gpsError}</p>}
          {gps ? (
            <div className="gps-info">
              <div className="gps-row">
                <span className="gps-label">Latitude</span>
                <span className="gps-value">{gps.lat.toFixed(6)}°</span>
              </div>
              <div className="gps-row">
                <span className="gps-label">Longitude</span>
                <span className="gps-value">{gps.lng.toFixed(6)}°</span>
              </div>
              {gps.accuracy && (
                <div className="gps-row">
                  <span className="gps-label">Accuracy</span>
                  <span className="gps-value">±{Math.round(gps.accuracy)}m</span>
                </div>
              )}
              <p className="gps-note">GPS location will be saved on check-in</p>
            </div>
          ) : (
            !gpsLoading && (
              <button className="btn-secondary" onClick={requestGps}>
                Enable GPS
              </button>
            )
          )}
          {gpsLoading && <p className="muted">Acquiring GPS signal…</p>}
        </div>

        {/* Hunt Stand Card */}
        {huntData ? (
          <HuntStand
            hunt={huntData.hunt}
            stand={huntData.stand}
            occupants={huntData.occupants}
            myCheckin={huntData.myCheckin}
            history={huntData.history}
            user={user}
            onRefresh={loadHunt}
            gps={gps}
          />
        ) : (
          <div className="card">
            <p className="muted">Loading hunt data…</p>
          </div>
        )}

        {/* Weather Card */}
        <WeatherWidget gps={gps} />
      </main>

      <footer className="app-footer">
        JCG Hunt Tracker • Auto-refreshes every 30s
      </footer>
    </div>
  );
}
