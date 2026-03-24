import { useState } from 'react';
import { api } from '../utils/api.js';

function formatTime(dt) {
  if (!dt) return '—';
  return new Date(dt + (dt.endsWith('Z') ? '' : 'Z')).toLocaleString();
}

function timeSince(dt) {
  const ms = Date.now() - new Date(dt + (dt.endsWith('Z') ? '' : 'Z')).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function HuntStand({ hunt, stand, occupants, myCheckin, history, user, onRefresh, gps }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const handleCheckIn = async () => {
    setError('');
    setLoading(true);
    try {
      await api.checkIn(gps?.lat, gps?.lng);
      await onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setError('');
    setLoading(true);
    try {
      await api.checkOut();
      await onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isCheckedIn = Boolean(myCheckin);
  const occupied = occupants.length > 0;

  return (
    <div className="card stand-card">
      <div className="hunt-badge">
        <span className="hunt-season">{hunt.season}</span>
        <h2 className="hunt-name">{hunt.name}</h2>
        <p className="hunt-desc">{hunt.description}</p>
      </div>

      <div className="stand-header">
        <div className="stand-icon">🌳</div>
        <div>
          <h3 className="stand-name">{stand.name}</h3>
          <p className="stand-desc">{stand.description}</p>
          <span className={`stand-type-badge`}>{stand.type.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Occupancy status */}
      <div className={`occupancy-banner ${occupied ? 'occupied' : 'vacant'}`}>
        <span className="occupancy-dot" />
        <span className="occupancy-label">
          {occupied
            ? `Stand Occupied — ${occupants.length} hunter${occupants.length > 1 ? 's' : ''}`
            : 'Stand Vacant'}
        </span>
      </div>

      {/* Current occupants list */}
      {occupants.length > 0 && (
        <div className="occupants-list">
          {occupants.map(o => (
            <div key={o.checkin_id} className={`occupant ${o.user_id === user.id ? 'me' : ''}`}>
              <span className="occupant-icon">🧑</span>
              <span className="occupant-name">{o.username}</span>
              <span className="occupant-since">{timeSince(o.checked_in_at)}</span>
              {o.user_id === user.id && <span className="you-badge">You</span>}
            </div>
          ))}
        </div>
      )}

      {error && <p className="error-msg">{error}</p>}

      {/* Check in / out */}
      <div className="checkin-actions">
        {isCheckedIn ? (
          <button className="btn-checkout" onClick={handleCheckOut} disabled={loading}>
            {loading ? 'Checking out…' : '✅ Check Out of Stand'}
          </button>
        ) : (
          <button className="btn-checkin" onClick={handleCheckIn} disabled={loading}>
            {loading ? 'Checking in…' : '📍 Check In to Stand'}
          </button>
        )}
      </div>

      {isCheckedIn && (
        <p className="checkin-status">
          You checked in {timeSince(myCheckin.checked_in_at)}
          {gps && ' • GPS recorded'}
        </p>
      )}

      {/* History toggle */}
      <button
        className="btn-link"
        onClick={() => setShowHistory(v => !v)}
      >
        {showHistory ? '▲ Hide History' : `📋 View History (${history.length})`}
      </button>

      {showHistory && (
        <div className="history-list">
          {history.length === 0 && <p className="muted">No history yet</p>}
          {history.map(h => (
            <div key={h.id} className={`history-row ${h.checked_out_at ? '' : 'active'}`}>
              <span className="h-user">{h.username}</span>
              <span className="h-in">In: {formatTime(h.checked_in_at)}</span>
              {h.checked_out_at
                ? <span className="h-out">Out: {formatTime(h.checked_out_at)}</span>
                : <span className="h-out active-tag">Still in</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
