// FlowDiagram.jsx
// Komponen ini menampilkan visualisasi animasi SVG dari alur komunikasi Request-Response.
// 
// Alur yang divisualisasikan:
//   [Client] --request--> [Gin Server] --query--> [MySQL DB]
//   [MySQL DB] --result--> [Gin Server] --response--> [Client]
//
// Setiap fase ditunjukkan dengan warna dan animasi yang berbeda.
import { useEffect, useRef, useState } from 'react';

// Warna per fase
const PHASE_COLORS = {
  idle:       '#484f58',
  sending:    '#2563eb',
  received:   '#8b5cf6',
  processing: '#d97706',
  db_write:   '#06b6d4',
  db_read:    '#06b6d4',
  responding: '#10b981',
  success:    '#10b981',
  error:      '#ef4444',
};

const PHASE_LABELS = {
  idle:       'Menunggu',
  sending:    'Mengirim Request',
  received:   'Request Diterima Server',
  processing: 'Server Memproses',
  db_write:   'Menyimpan ke Database',
  db_read:    'Membaca dari Database',
  responding: 'Mengirim Response',
  success:    'Selesai — Sukses',
  error:      'Selesai — Error',
};

// Urutan fase animasi
const PHASES_SUCCESS = ['idle','sending','received','processing','db_write','db_read','responding','success'];
const PHASES_ERROR   = ['idle','sending','received','processing','error'];

export default function FlowDiagram({ animating, isError, resetKey }) {
  const [phase, setPhase] = useState('idle');
  const [packetPos, setPacketPos] = useState(0); // 0=client, 0.5=server, 1=db
  const [packetReturn, setPacketReturn] = useState(false); // false=forward, true=return
  const timerRef = useRef(null);

  useEffect(() => {
    if (!animating) {
      setPhase('idle');
      setPacketPos(0);
      setPacketReturn(false);
      return;
    }

    const phases = isError ? PHASES_ERROR : PHASES_SUCCESS;
    let step = 0;

    const advance = () => {
      if (step >= phases.length) return;
      const current = phases[step];
      setPhase(current);

      // Set posisi paket berdasarkan fase
      if (current === 'sending')    { setPacketPos(0.5); setPacketReturn(false); }
      if (current === 'processing') { setPacketPos(0.5); }
      if (current === 'db_write')   { setPacketPos(1); }
      if (current === 'db_read')    { setPacketPos(0.5); setPacketReturn(true); }
      if (current === 'responding') { setPacketPos(0); }
      if (current === 'error')      { setPacketPos(0.5); }

      step++;
      const delays = {
        idle:0, sending:600, received:400, processing:800,
        db_write:600, db_read:600, responding:600,
        success:0, error:0
      };
      if (step < phases.length) {
        timerRef.current = setTimeout(advance, delays[current] || 500);
      }
    };

    timerRef.current = setTimeout(advance, 100);
    return () => clearTimeout(timerRef.current);
  }, [animating, isError, resetKey]);

  const c = PHASE_COLORS[phase] || PHASE_COLORS.idle;
  const isActive = phase !== 'idle';

  // Posisi node di SVG
  const clientX = 80, serverX = 280, dbX = 480;
  const nodeY = 110;
  const nodeR = 32;

  // Warna node berdasarkan fase
  const clientGlow  = (phase === 'sending' || phase === 'responding' || phase === 'success') ? '#2563eb' : (phase === 'error' ? '#ef4444' : '#30363d');
  const serverGlow  = (phase === 'received' || phase === 'processing' || phase === 'db_write' || phase === 'db_read') ? '#8b5cf6' : '#30363d';
  const dbGlow      = (phase === 'db_write' || phase === 'db_read') ? '#06b6d4' : '#30363d';

  // Posisi paket animasi
  const getPacketX = () => {
    if (packetReturn) {
      // Return: db -> server -> client
      if (phase === 'db_read')    return serverX;
      if (phase === 'responding') return clientX;
      return serverX;
    } else {
      // Forward: client -> server -> db
      if (phase === 'sending')    return serverX;
      if (phase === 'db_write')   return dbX;
      if (phase === 'error')      return serverX;
      return clientX;
    }
  };

  const packetX = getPacketX();

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
      {/* Status bar */}
      <div style={{
        display:'flex', alignItems:'center', gap:'8px',
        padding:'8px 12px',
        background: isActive ? `rgba(${hexToRgb(c)},0.1)` : 'var(--bg-elevated)',
        border: `1px solid ${isActive ? c : 'var(--border-default)'}`,
        borderRadius:'8px',
        transition:'all 0.3s ease',
      }}>
        <div style={{
          width:8, height:8, borderRadius:'50%',
          background: c,
          boxShadow: isActive ? `0 0 8px ${c}` : 'none',
          animation: isActive && phase !== 'success' && phase !== 'error' ? 'pulse 1.2s infinite' : 'none',
        }} />
        <span style={{ fontSize:'0.8rem', color: isActive ? c : 'var(--text-muted)', fontWeight:500 }}>
          {PHASE_LABELS[phase]}
        </span>
      </div>

      {/* SVG Diagram */}
      <div style={{
        background:'var(--bg-base)',
        border:'1px solid var(--border-default)',
        borderRadius:'12px',
        padding:'8px',
        overflow:'hidden',
      }}>
        <svg viewBox="0 0 560 220" width="100%" style={{ display:'block' }}>
          <defs>
            {/* Gradients for nodes */}
            {[['client-grad', clientGlow], ['server-grad', serverGlow], ['db-grad', dbGlow]].map(([id, glow]) => (
              <radialGradient key={id} id={id} cx="50%" cy="35%" r="65%">
                <stop offset="0%" stopColor={glow} stopOpacity="0.3" />
                <stop offset="100%" stopColor={glow} stopOpacity="0.05" />
              </radialGradient>
            ))}
            {/* Arrow markers */}
            <marker id="arrow-fwd" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill={c} opacity="0.7" />
            </marker>
            <marker id="arrow-back" markerWidth="8" markerHeight="6" refX="0" refY="3" orient="auto-start-reverse">
              <polygon points="0 0, 8 3, 0 6" fill={c} opacity="0.7" />
            </marker>
          </defs>

          {/* --- Connection lines --- */}
          {/* Client <-> Server */}
          <line x1={clientX+nodeR} y1={nodeY} x2={serverX-nodeR} y2={nodeY}
            stroke="var(--border-default)" strokeWidth="1.5" strokeDasharray="5,3" />
          {/* Server <-> DB */}
          <line x1={serverX+nodeR} y1={nodeY} x2={dbX-nodeR} y2={nodeY}
            stroke="var(--border-default)" strokeWidth="1.5" strokeDasharray="5,3" />

          {/* --- Active packet path line --- */}
          {isActive && phase !== 'success' && phase !== 'idle' && (
            <line
              x1={phase === 'sending' ? clientX+nodeR : phase === 'db_write' ? serverX+nodeR : phase === 'db_read' ? dbX-nodeR : phase === 'responding' ? serverX-nodeR : clientX+nodeR}
              y1={nodeY}
              x2={packetX}
              y2={nodeY}
              stroke={c}
              strokeWidth="2"
              strokeOpacity="0.6"
              strokeLinecap="round"
              style={{ transition:'all 0.5s ease' }}
            />
          )}

          {/* --- Animated packet --- */}
          {isActive && phase !== 'idle' && phase !== 'success' && (
            <g style={{ transition:'all 0.5s ease' }}>
              <circle cx={packetX} cy={nodeY} r={6} fill={c} opacity={0.9}
                style={{ filter:`drop-shadow(0 0 6px ${c})` }} />
              <circle cx={packetX} cy={nodeY} r={11} fill="none" stroke={c}
                strokeWidth="1" opacity="0.4" />
            </g>
          )}

          {/* --- NODE: Client --- */}
          <g>
            <circle cx={clientX} cy={nodeY} r={nodeR+4} fill={`url(#client-grad)`} />
            <circle cx={clientX} cy={nodeY} r={nodeR}
              fill="var(--bg-card)"
              stroke={clientGlow}
              strokeWidth={phase === 'sending' || phase === 'success' ? 2 : 1}
              style={{
                filter: (phase === 'sending' || phase === 'success') ? `drop-shadow(0 0 12px ${clientGlow})` : 'none',
                transition:'all 0.3s ease'
              }}
            />
            {/* Browser icon */}
            <rect x={clientX-14} y={nodeY-10} width="28" height="20" rx="3"
              fill="none" stroke={clientGlow === '#30363d' ? 'var(--text-muted)' : clientGlow}
              strokeWidth="1.5" />
            <line x1={clientX-14} y1={nodeY-4} x2={clientX+14} y2={nodeY-4}
              stroke={clientGlow === '#30363d' ? 'var(--text-muted)' : clientGlow} strokeWidth="1" />
            <circle cx={clientX-9} cy={nodeY-7} r="1.5"
              fill={clientGlow === '#30363d' ? 'var(--text-muted)' : clientGlow} />
            {/* Label */}
            <text x={clientX} y={nodeY+nodeR+16} textAnchor="middle"
              fill="var(--text-primary)" fontSize="11" fontWeight="600" fontFamily="Inter,sans-serif">
              Client
            </text>
            <text x={clientX} y={nodeY+nodeR+28} textAnchor="middle"
              fill="var(--text-muted)" fontSize="9" fontFamily="Inter,sans-serif">
              React + Browser
            </text>
          </g>

          {/* --- NODE: Gin Server --- */}
          <g>
            <circle cx={serverX} cy={nodeY} r={nodeR+4} fill={`url(#server-grad)`} />
            <circle cx={serverX} cy={nodeY} r={nodeR}
              fill="var(--bg-card)"
              stroke={serverGlow}
              strokeWidth={phase === 'received' || phase === 'processing' ? 2 : 1}
              style={{
                filter: (phase === 'received' || phase === 'processing') ? `drop-shadow(0 0 12px ${serverGlow})` : 'none',
                transition:'all 0.3s ease',
                animation: phase === 'processing' ? 'nodePulse 0.8s infinite' : 'none',
              }}
            />
            {/* Server icon */}
            <rect x={serverX-12} y={nodeY-12} width="24" height="6" rx="2"
              fill="none" stroke={serverGlow === '#30363d' ? 'var(--text-muted)' : serverGlow} strokeWidth="1.5" />
            <rect x={serverX-12} y={nodeY-4} width="24" height="6" rx="2"
              fill="none" stroke={serverGlow === '#30363d' ? 'var(--text-muted)' : serverGlow} strokeWidth="1.5" />
            <rect x={serverX-12} y={nodeY+4} width="24" height="6" rx="2"
              fill="none" stroke={serverGlow === '#30363d' ? 'var(--text-muted)' : serverGlow} strokeWidth="1.5" />
            <circle cx={serverX+8} cy={nodeY-9} r="1.5"
              fill={phase === 'received' || phase === 'processing' ? '#10b981' : 'var(--text-muted)'} />
            <text x={serverX} y={nodeY+nodeR+16} textAnchor="middle"
              fill="var(--text-primary)" fontSize="11" fontWeight="600" fontFamily="Inter,sans-serif">
              Gin Server
            </text>
            <text x={serverX} y={nodeY+nodeR+28} textAnchor="middle"
              fill="var(--text-muted)" fontSize="9" fontFamily="Inter,sans-serif">
              Golang :8080
            </text>
          </g>

          {/* --- NODE: MySQL DB --- */}
          <g>
            <circle cx={dbX} cy={nodeY} r={nodeR+4} fill={`url(#db-grad)`} />
            <circle cx={dbX} cy={nodeY} r={nodeR}
              fill="var(--bg-card)"
              stroke={dbGlow}
              strokeWidth={phase === 'db_write' || phase === 'db_read' ? 2 : 1}
              style={{
                filter: (phase === 'db_write' || phase === 'db_read') ? `drop-shadow(0 0 12px ${dbGlow})` : 'none',
                transition:'all 0.3s ease'
              }}
            />
            {/* DB cylinder icon */}
            <ellipse cx={dbX} cy={nodeY-6} rx="11" ry="4"
              fill="none" stroke={dbGlow === '#30363d' ? 'var(--text-muted)' : dbGlow} strokeWidth="1.5" />
            <line x1={dbX-11} y1={nodeY-6} x2={dbX-11} y2={nodeY+6}
              stroke={dbGlow === '#30363d' ? 'var(--text-muted)' : dbGlow} strokeWidth="1.5" />
            <line x1={dbX+11} y1={nodeY-6} x2={dbX+11} y2={nodeY+6}
              stroke={dbGlow === '#30363d' ? 'var(--text-muted)' : dbGlow} strokeWidth="1.5" />
            <ellipse cx={dbX} cy={nodeY+6} rx="11" ry="4"
              fill="none" stroke={dbGlow === '#30363d' ? 'var(--text-muted)' : dbGlow} strokeWidth="1.5" />
            <text x={dbX} y={nodeY+nodeR+16} textAnchor="middle"
              fill="var(--text-primary)" fontSize="11" fontWeight="600" fontFamily="Inter,sans-serif">
              MySQL DB
            </text>
            <text x={dbX} y={nodeY+nodeR+28} textAnchor="middle"
              fill="var(--text-muted)" fontSize="9" fontFamily="Inter,sans-serif">
              sister2
            </text>
          </g>

          {/* --- Step labels on lines --- */}
          {(phase === 'sending') && (
            <text x={(clientX+serverX)/2} y={nodeY-14} textAnchor="middle"
              fill={c} fontSize="9" fontFamily="Inter,sans-serif" fontWeight="500">
              HTTP Request
            </text>
          )}
          {(phase === 'db_write') && (
            <text x={(serverX+dbX)/2} y={nodeY-14} textAnchor="middle"
              fill={c} fontSize="9" fontFamily="Inter,sans-serif" fontWeight="500">
              INSERT / SELECT
            </text>
          )}
          {(phase === 'responding') && (
            <text x={(clientX+serverX)/2} y={nodeY-14} textAnchor="middle"
              fill={c} fontSize="9" fontFamily="Inter,sans-serif" fontWeight="500">
              HTTP Response
            </text>
          )}

          {/* --- Success/Error overlay --- */}
          {phase === 'success' && (
            <g>
              <text x="280" y="200" textAnchor="middle"
                fill="#10b981" fontSize="11" fontWeight="600" fontFamily="Inter,sans-serif">
                Siklus Request-Response Selesai — Data tersimpan di MySQL
              </text>
            </g>
          )}
          {phase === 'error' && (
            <g>
              <text x="280" y="200" textAnchor="middle"
                fill="#ef4444" fontSize="11" fontWeight="600" fontFamily="Inter,sans-serif">
                Server mengembalikan respons error ke client
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Step-by-step indicators */}
      <StepIndicators phase={phase} isError={isError} />
    </div>
  );
}

function StepIndicators({ phase, isError }) {
  const steps = [
    { id:'sending',    label:'Client kirim request' },
    { id:'received',   label:'Server terima' },
    { id:'processing', label:'Server proses' },
    { id:'db_write',   label:'Simpan ke DB' },
    { id:'db_read',    label:'Baca dari DB' },
    { id:'responding', label:'Kirim response' },
  ];

  const ORDER = ['idle','sending','received','processing','db_write','db_read','responding','success','error'];
  const phaseIdx = ORDER.indexOf(phase);

  return (
    <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
      {steps.map(step => {
        const stepIdx = ORDER.indexOf(step.id);
        const isDone    = phaseIdx > stepIdx && phase !== 'idle';
        const isActive  = phaseIdx === stepIdx;
        const isSkipped = isError && (step.id === 'db_write' || step.id === 'db_read' || step.id === 'responding') && phaseIdx >= ORDER.indexOf('error');

        let bg = 'var(--bg-elevated)';
        let border = 'var(--border-default)';
        let color = 'var(--text-muted)';

        if (isActive) { bg = 'rgba(37,99,235,0.15)'; border = '#2563eb'; color = '#79c0ff'; }
        else if (isDone && !isSkipped) { bg = 'rgba(16,185,129,0.1)'; border = '#10b981'; color = '#56d364'; }
        else if (isSkipped) { bg = 'rgba(239,68,68,0.1)'; border = '#ef4444'; color = '#f85149'; }

        return (
          <div key={step.id} style={{
            padding:'3px 8px',
            background: bg,
            border: `1px solid ${border}`,
            borderRadius:'4px',
            fontSize:'0.72rem',
            color: color,
            fontWeight: isActive ? 600 : 400,
            transition:'all 0.3s ease',
            opacity: phaseIdx === 0 ? 0.4 : 1,
          }}>
            {step.label}
          </div>
        );
      })}
    </div>
  );
}

// Helper: panjangkan #rrggbb ke r,g,b string
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}
