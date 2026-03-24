import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api.js';
import WindCone from './WindCone.jsx';

const WMO_CODES = {
  0: { label: 'Clear sky', icon: '☀️' },
  1: { label: 'Mainly clear', icon: '🌤️' },
  2: { label: 'Partly cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Fog', icon: '🌫️' },
  48: { label: 'Icy fog', icon: '🌫️' },
  51: { label: 'Light drizzle', icon: '🌦️' },
  53: { label: 'Drizzle', icon: '🌦️' },
  55: { label: 'Heavy drizzle', icon: '🌧️' },
  61: { label: 'Light rain', icon: '🌧️' },
  63: { label: 'Rain', icon: '🌧️' },
  65: { label: 'Heavy rain', icon: '🌧️' },
  71: { label: 'Light snow', icon: '🌨️' },
  73: { label: 'Snow', icon: '❄️' },
  75: { label: 'Heavy snow', icon: '❄️' },
  80: { label: 'Rain showers', icon: '🌦️' },
  81: { label: 'Showers', icon: '🌧️' },
  82: { label: 'Heavy showers', icon: '⛈️' },
  95: { label: 'Thunderstorm', icon: '⛈️' },
  99: { label: 'Thunderstorm w/ hail', icon: '⛈️' },
};

function getCondition(code) {
  return WMO_CODES[code] || { label: 'Unknown', icon: '🌡️' };
}

export default function WeatherWidget({ gps }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCone, setShowCone] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchWeather = useCallback(async (lat, lng) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getWeather(lat, lng);
      setWeather(data.current);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch when GPS becomes available, then refresh every 5 min
  useEffect(() => {
    if (!gps) return;
    fetchWeather(gps.lat, gps.lng);
    const interval = setInterval(() => fetchWeather(gps.lat, gps.lng), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [gps, fetchWeather]);

  if (!gps) {
    return (
      <div className="card weather-card">
        <h2 className="card-title">🌤️ Weather</h2>
        <p className="muted">Enable GPS to load live weather</p>
      </div>
    );
  }

  return (
    <div className="card weather-card">
      <div className="card-title-row">
        <h2 className="card-title">🌤️ Live Weather</h2>
        <button
          className="btn-icon"
          onClick={() => fetchWeather(gps.lat, gps.lng)}
          disabled={loading}
          title="Refresh weather"
        >
          {loading ? '⏳' : '🔄'}
        </button>
      </div>

      {error && <p className="error-msg">{error}</p>}

      {weather && (
        <>
          <div className="weather-grid">
            <div className="weather-main">
              <span className="weather-icon">
                {getCondition(weather.weather_code).icon}
              </span>
              <div>
                <div className="weather-temp">{Math.round(weather.temperature_2m)}°F</div>
                <div className="weather-feels">
                  Feels like {Math.round(weather.apparent_temperature)}°F
                </div>
                <div className="weather-cond">
                  {getCondition(weather.weather_code).label}
                </div>
              </div>
            </div>

            <div className="weather-details">
              <div className="weather-stat">
                <span className="stat-label">💨 Wind</span>
                <span className="stat-value">
                  {Math.round(weather.wind_speed_10m)} mph
                  {weather.wind_gusts_10m > 0 &&
                    ` (gusts ${Math.round(weather.wind_gusts_10m)})`}
                </span>
              </div>
              <div className="weather-stat">
                <span className="stat-label">🧭 Direction</span>
                <span className="stat-value">
                  {degToCardinal(weather.wind_direction_10m)}{' '}
                  ({Math.round(weather.wind_direction_10m)}°)
                </span>
              </div>
              <div className="weather-stat">
                <span className="stat-label">💧 Humidity</span>
                <span className="stat-value">{weather.relative_humidity_2m}%</span>
              </div>
              {weather.precipitation > 0 && (
                <div className="weather-stat">
                  <span className="stat-label">🌧️ Precip</span>
                  <span className="stat-value">{weather.precipitation}" </span>
                </div>
              )}
            </div>
          </div>

          {lastUpdated && (
            <p className="weather-updated">
              Updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}

          <button
            className={`btn-wind-toggle ${showCone ? 'active' : ''}`}
            onClick={() => setShowCone(v => !v)}
          >
            {showCone ? '▲ Hide Wind Direction' : '🌬️ Show Wind Direction'}
          </button>

          {showCone && (
            <div className="wind-cone-section">
              <p className="wind-cone-hint">
                Cone shows direction wind is <strong>blowing toward</strong>
              </p>
              <WindCone
                windDirection={weather.wind_direction_10m}
                windSpeed={weather.wind_speed_10m}
              />
            </div>
          )}
        </>
      )}

      {!weather && !loading && !error && (
        <p className="muted">Fetching weather…</p>
      )}
    </div>
  );
}

function degToCardinal(deg) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}
