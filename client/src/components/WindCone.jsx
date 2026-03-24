import { useEffect, useRef } from 'react';

/**
 * Draws a wind direction cone on a canvas.
 * windDirection: meteorological degrees (0 = from N, 90 = from E, etc.)
 * windSpeed: mph
 */
export default function WindCone({ windDirection, windSpeed }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const radius = (size / 2) - 10;

    ctx.clearRect(0, 0, size, size);

    // ── Background circle ───────────────────────────────────────────────────
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20, 30, 15, 0.9)';
    ctx.fill();
    ctx.strokeStyle = '#4a7c3f';
    ctx.lineWidth = 2;
    ctx.stroke();

    // ── Compass tick marks ──────────────────────────────────────────────────
    ctx.strokeStyle = '#3a5030';
    ctx.lineWidth = 1;
    for (let i = 0; i < 36; i++) {
      const ang = (i * 10 - 90) * (Math.PI / 180);
      const inner = i % 9 === 0 ? radius - 18 : (i % 3 === 0 ? radius - 12 : radius - 7);
      ctx.beginPath();
      ctx.moveTo(cx + inner * Math.cos(ang), cy + inner * Math.sin(ang));
      ctx.lineTo(cx + radius * Math.cos(ang), cy + radius * Math.sin(ang));
      ctx.stroke();
    }

    // ── Cardinal labels ─────────────────────────────────────────────────────
    const cardinals = [
      { label: 'N', deg: 0 },
      { label: 'E', deg: 90 },
      { label: 'S', deg: 180 },
      { label: 'W', deg: 270 },
    ];
    ctx.fillStyle = '#9aaa80';
    ctx.font = `bold ${size * 0.06}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const { label, deg } of cardinals) {
      const ang = (deg - 90) * (Math.PI / 180);
      const r = radius - 28;
      ctx.fillText(label, cx + r * Math.cos(ang), cy + r * Math.sin(ang));
    }

    // ── Wind cone ───────────────────────────────────────────────────────────
    // windDirection = where wind comes FROM (meteorological)
    // We draw cone pointing TO where wind is going
    const windGoesTo = (windDirection + 180) % 360;
    const coneAngle = (windGoesTo - 90) * (Math.PI / 180);
    const halfSpread = 28 * (Math.PI / 180); // 28° half-spread
    const coneLength = radius * 0.72;

    const leftAng = coneAngle - halfSpread;
    const rightAng = coneAngle + halfSpread;

    const tipX = cx + coneLength * Math.cos(coneAngle);
    const tipY = cy + coneLength * Math.sin(coneAngle);
    const leftX = cx + (coneLength * 0.25) * Math.cos(leftAng);
    const leftY = cy + (coneLength * 0.25) * Math.sin(leftAng);
    const rightX = cx + (coneLength * 0.25) * Math.cos(rightAng);
    const rightY = cy + (coneLength * 0.25) * Math.sin(rightAng);

    // Gradient fill for depth
    const grad = ctx.createLinearGradient(cx, cy, tipX, tipY);
    grad.addColorStop(0, 'rgba(100, 200, 255, 0.15)');
    grad.addColorStop(1, 'rgba(100, 200, 255, 0.70)');

    ctx.beginPath();
    ctx.moveTo(leftX, leftY);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(rightX, rightY);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // ── Arrow along center ──────────────────────────────────────────────────
    const arrowLen = coneLength * 0.6;
    const arrowX = cx + arrowLen * Math.cos(coneAngle);
    const arrowY = cy + arrowLen * Math.sin(coneAngle);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(arrowX, arrowY);
    ctx.strokeStyle = 'rgba(100, 220, 255, 1)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // arrowhead
    const headLen = 12;
    const headAng = 0.4;
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(
      arrowX - headLen * Math.cos(coneAngle - headAng),
      arrowY - headLen * Math.sin(coneAngle - headAng)
    );
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(
      arrowX - headLen * Math.cos(coneAngle + headAng),
      arrowY - headLen * Math.sin(coneAngle + headAng)
    );
    ctx.strokeStyle = 'rgba(100, 220, 255, 1)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // ── Center dot ─────────────────────────────────────────────────────────
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#c8a850';
    ctx.fill();

    // ── Speed label ─────────────────────────────────────────────────────────
    ctx.fillStyle = '#c8d8b0';
    ctx.font = `bold ${size * 0.08}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(windSpeed)} mph`, cx, cy + radius * 0.55);

    const fromLabel = degToCardinal(windDirection);
    ctx.font = `${size * 0.06}px sans-serif`;
    ctx.fillStyle = '#8aaa70';
    ctx.fillText(`from ${fromLabel}`, cx, cy + radius * 0.70);
  }, [windDirection, windSpeed]);

  return (
    <div className="wind-cone-wrap">
      <canvas ref={canvasRef} width={260} height={260} className="wind-canvas" />
    </div>
  );
}

function degToCardinal(deg) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}
