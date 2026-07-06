import React, { useRef, useEffect, useState } from 'react';

export default function WaveformCanvas({
  waveformLogs = {},
  scale = 8,
  radix = 'h',
  simulationTime = 100,
  theme = 'dark'
}) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const [activeSignalPath, setActiveSignalPath] = useState(null);
  const [hoverX, setHoverX] = useState(-1);
  const [tooltipText, setTooltipText] = useState('');
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const signalKeys = Object.keys(waveformLogs);
  const totalSignals = signalKeys.length;
  const rowHeight = 36;
  const topOffset = 30; // Timeline header
  const maxTime = Math.max(10, simulationTime);

  // Format 4-value logic representations to selected radix
  const formatValue = (bits, format = 'b') => {
    if (bits.includes('x') || bits.includes('z')) {
      if (bits.includes('x') && !bits.includes('z')) return 'x';
      if (bits.includes('z') && !bits.includes('x')) return 'z';
      return 'x';
    }
    const val = parseInt(bits, 2);
    if (format === 'd') return val.toString(10);
    if (format === 'h') return val.toString(16).toUpperCase();
    if (format === 'o') return val.toString(8);
    return bits;
  };

  // Redraw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || totalSignals === 0) return;

    const ctx = canvas.getContext('2d');
    
    // Scale coordinates
    const canvasWidth = Math.max((wrapperRef.current?.clientWidth || 800) - 200, maxTime * scale + 60);
    const canvasHeight = topOffset + totalSignals * rowHeight;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear background
    ctx.fillStyle = theme === 'light' ? '#ffffff' : '#0b0f19';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 1. Draw Grid lines and Timeline header ticks
    ctx.strokeStyle = theme === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    let step = 10;
    if (scale < 2) step = 50;
    else if (scale < 5) step = 20;
    else if (scale > 20) step = 5;
    if (scale > 40) step = 2;

    ctx.fillStyle = theme === 'light' ? '#4b5563' : 'rgba(255, 255, 255, 0.35)';
    ctx.font = '10px Fira Code, monospace';
    ctx.textAlign = 'center';

    for (let t = 0; t <= maxTime; t += step) {
      const x = 30 + t * scale;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();

      ctx.fillText(`${t}ns`, x, 18);
    }

    // Header dividing line
    ctx.strokeStyle = theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(0, topOffset);
    ctx.lineTo(canvasWidth, topOffset);
    ctx.stroke();

    // 2. Render each signal row
    signalKeys.forEach((path, idx) => {
      const sig = waveformLogs[path];
      const yRowStart = topOffset + idx * rowHeight;
      const yCenter = yRowStart + rowHeight / 2;
      const yHigh = yRowStart + 8;
      const yLow = yRowStart + rowHeight - 8;

      // Draw row boundary
      ctx.strokeStyle = theme === 'light' ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.02)';
      ctx.beginPath();
      ctx.moveTo(0, yRowStart + rowHeight);
      ctx.lineTo(canvasWidth, yRowStart + rowHeight);
      ctx.stroke();

      const vals = sig.values;
      if (!vals || vals.length === 0) return;

      const isBus = sig.width > 1;

      for (let i = 0; i < vals.length; i++) {
        const entry = vals[i];
        const nextTime = (i + 1 < vals.length) ? vals[i + 1].time : maxTime;
        const xStart = 30 + entry.time * scale;
        const xEnd = 30 + nextTime * scale;
        const val = entry.val;

        if (!isBus) {
          // Draw 1-bit line wave
          ctx.lineWidth = 2;
          if (val === '0') {
            ctx.strokeStyle = theme === 'light' ? '#000000' : '#38bdf8'; // Black / Cyan
            ctx.beginPath();
            ctx.moveTo(xStart, yLow);
            ctx.lineTo(xEnd, yLow);
            ctx.stroke();
          } else if (val === '1') {
            ctx.strokeStyle = theme === 'light' ? '#000000' : '#10b981'; // Black / Green
            ctx.beginPath();
            ctx.moveTo(xStart, yHigh);
            ctx.lineTo(xEnd, yHigh);
            ctx.stroke();
          } else if (val === 'x') {
            ctx.strokeStyle = '#ef4444'; // Red
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(xStart, yCenter);
            ctx.lineTo(xEnd, yCenter);
            ctx.stroke();
            ctx.setLineDash([]);
          } else {
            ctx.strokeStyle = '#9ca3af'; // Z - Gray
            ctx.beginPath();
            ctx.moveTo(xStart, yCenter);
            ctx.lineTo(xEnd, yCenter);
            ctx.stroke();
          }

          // Transition edge
          if (i > 0) {
            const prevVal = vals[i - 1].val;
            if (prevVal !== val) {
              ctx.strokeStyle = (prevVal === 'x' || val === 'x') ? '#ef4444' : (theme === 'light' ? '#000000' : 'rgba(255, 255, 255, 0.4)');
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              const y1 = prevVal === '1' ? yHigh : (prevVal === '0' ? yLow : yCenter);
              const y2 = val === '1' ? yHigh : (val === '0' ? yLow : yCenter);
              ctx.moveTo(xStart, y1);
              ctx.lineTo(xStart, y2);
              ctx.stroke();
            }
          }
        } else {
          // Draw Bus hexagon block
          ctx.lineWidth = 1.5;
          if (val.includes('x') || val.includes('z')) {
            ctx.strokeStyle = '#ef4444';
            ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';

            ctx.beginPath();
            ctx.moveTo(xStart, yCenter);
            ctx.lineTo(xStart + 3, yHigh);
            ctx.lineTo(xEnd - 3, yHigh);
            ctx.lineTo(xEnd, yCenter);
            ctx.lineTo(xEnd - 3, yLow);
            ctx.lineTo(xStart + 3, yLow);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ef4444';
            ctx.font = '10px Fira Code, monospace';
            ctx.textAlign = 'center';
            if (xEnd - xStart > 20) {
              ctx.fillText(val, xStart + (xEnd - xStart) / 2, yCenter + 3);
            }
          } else {
            ctx.strokeStyle = theme === 'light' ? '#000000' : '#818cf8';
            ctx.fillStyle = theme === 'light' ? '#f3f4f6' : 'rgba(129, 140, 248, 0.08)';

            ctx.beginPath();
            ctx.moveTo(xStart, yCenter);
            ctx.lineTo(xStart + 4, yHigh);
            ctx.lineTo(xEnd - 4, yHigh);
            ctx.lineTo(xEnd, yCenter);
            ctx.lineTo(xEnd - 4, yLow);
            ctx.lineTo(xStart + 4, yLow);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            const displayStr = formatValue(val, radix);
            ctx.fillStyle = theme === 'light' ? '#000000' : '#ffffff';
            ctx.font = '10px Fira Code, monospace';
            ctx.textAlign = 'center';
            const segmentWidth = xEnd - xStart;
            if (segmentWidth > 32) {
              ctx.fillText(displayStr, xStart + segmentWidth / 2, yCenter + 3);
            }
          }
        }
      }
    });

    // 3. Draw vertical hover line
    if (hoverX !== -1) {
      ctx.strokeStyle = theme === 'light' ? '#000000' : 'hsl(190, 90%, 50%)'; // Black / Cyan cursor
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hoverX, 0);
      ctx.lineTo(hoverX, canvasHeight);
      ctx.stroke();
    }
  }, [waveformLogs, scale, radix, simulationTime, hoverX, totalSignals, theme]);

  // Set default active signal path
  useEffect(() => {
    if (totalSignals > 0 && !activeSignalPath) {
      setActiveSignalPath(signalKeys[0]);
    }
  }, [waveformLogs, totalSignals]);

  // Handle Mouse movements for Tooltip and indicator line
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x < 30 || x > rect.width - 20) {
      setHoverX(-1);
      return;
    }

    setHoverX(x);
    const timeNs = Math.round((x - 30) / scale);

    let hoverValText = `Time: ${timeNs}ns`;
    const targetPath = activeSignalPath || signalKeys[0];
    const sig = waveformLogs[targetPath];
    
    if (sig && sig.values && sig.values.length > 0) {
      let currentVal = 'x';
      for (let entry of sig.values) {
        if (entry.time <= timeNs) {
          currentVal = entry.val;
        } else {
          break;
        }
      }
      const displayVal = sig.width > 1 ? formatValue(currentVal, radix) : currentVal;
      hoverValText += ` | Value: ${displayVal}`;
    }

    setTooltipText(hoverValText);

    // Calculate position relative to container
    const wrapperRect = wrapperRef.current?.getBoundingClientRect();
    if (wrapperRect) {
      setTooltipPos({
        x: e.clientX - wrapperRect.left + 15,
        y: e.clientY - wrapperRect.top + 15
      });
    }
  };

  const handleMouseLeave = () => {
    setHoverX(-1);
  };

  if (totalSignals === 0) {
    return (
      <div className="empty-waveform-msg" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-darker)' }}>
        <i className="fa-solid fa-magnifying-glass-chart" style={{ fontSize: '40px', marginBottom: '12px' }}></i>
        <span>No simulation waveform data. Click <strong>Compile & Run</strong> to generate signals.</span>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="waveform-container-wrapper" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      
      {/* Sidebar signal lists */}
      <div className="waveform-signals-sidebar" style={{ width: '200px', borderRight: '1px solid var(--border-glow)', display: 'flex', flexDirection: 'column' }}>
        <div className="waveform-signals-header" style={{ height: '30px', display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-darker)', borderBottom: '1px solid var(--border-glow)' }}>
          Signals
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {signalKeys.map(path => {
            const sig = waveformLogs[path];
            const isActive = path === activeSignalPath;
            return (
              <div
                key={path}
                className={`waveform-signal-item ${isActive ? 'active' : ''}`}
                style={{
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  color: isActive ? 'var(--color-secondary)' : 'var(--color-text-muted)',
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.02)',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                onClick={() => setActiveSignalPath(path)}
              >
                {sig.name}{sig.width > 1 ? ` [${sig.width - 1}:0]` : ''}
              </div>
            );
          })}
        </div>
      </div>

      {/* Canvas container */}
      <div className="waveform-canvas-container" style={{ flex: 1, height: '100%', overflowX: 'auto', overflowY: 'hidden', position: 'relative' }}>
        <canvas
          ref={canvasRef}
          id="waveform-canvas"
          style={{ display: 'block', cursor: 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
        
        {/* Tooltip cursor */}
        {hoverX !== -1 && (
          <div
            className="waveform-tooltip"
            style={{
              position: 'absolute',
              display: 'block',
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y}px`,
              pointerEvents: 'none',
              backgroundColor: 'rgba(9, 13, 22, 0.95)',
              border: '1px solid var(--color-secondary)',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-text-main)',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
              zIndex: 100
            }}
          >
            {tooltipText}
          </div>
        )}
      </div>

    </div>
  );
}
