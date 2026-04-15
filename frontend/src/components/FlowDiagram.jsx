import { useEffect, useRef, useState } from 'react';

const PHASE_LABELS = {
  idle:       'IDLE',
  sending:    'CLIENT -> SERVER',
  received:   'SERVER PROCESSING',
  processing: 'SERVER PROCESSING',
  db_write:   'SERVER -> DATABASE',
  db_read:    'DATABASE -> SERVER',
  responding: 'SERVER -> CLIENT',
  success:    'SUCCESS',
  error:      'ERROR',
};

const PHASES_SUCCESS = ['idle','sending','received','processing','db_write','db_read','responding','success'];
const PHASES_ERROR   = ['idle','sending','received','processing','error'];

export default function FlowDiagram({ animating, isError, resetKey }) {
  const [phase, setPhase] = useState('idle');
  const [packetPos, setPacketPos] = useState(0);
  const [packetReturn, setPacketReturn] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!animating) { setPhase('idle'); setPacketPos(0); setPacketReturn(false); return; }
    const phases = isError ? PHASES_ERROR : PHASES_SUCCESS;
    let step = 0;

    const advance = () => {
      if (step >= phases.length) return;
      const current = phases[step];
      setPhase(current);
      if (current === 'sending') { setPacketPos(0.5); setPacketReturn(false); }
      if (current === 'processing') { setPacketPos(0.5); }
      if (current === 'db_write') { setPacketPos(1); }
      if (current === 'db_read') { setPacketPos(0.5); setPacketReturn(true); }
      if (current === 'responding') { setPacketPos(0); }
      if (current === 'error') { setPacketPos(0.5); }
      step++;
      const delays = { idle:0, sending:600, received:300, processing:800, db_write:500, db_read:500, responding:600, success:0, error:0 };
      if (step < phases.length) timerRef.current = setTimeout(advance, delays[current] || 500);
    };

    timerRef.current = setTimeout(advance, 100);
    return () => clearTimeout(timerRef.current);
  }, [animating, isError, resetKey]);

  const isActive = phase !== 'idle';
  const clientX = 80, serverX = 280, dbX = 480;
  const nodeY = 90;
  const nodeR = 30;

  const getPacketX = () => {
    if (packetReturn) {
      if (phase === 'db_read') return serverX;
      if (phase === 'responding') return clientX;
      return serverX;
    } else {
      if (phase === 'sending') return serverX;
      if (phase === 'db_write') return dbX;
      if (phase === 'error') return serverX;
      return clientX;
    }
  };

  const packetX = getPacketX();
  const cAccent = '#ffffff';
  const cLine = '#444444';

  const isClientActive = phase === 'sending' || phase === 'responding' || phase === 'success';
  const isServerActive = phase === 'received' || phase === 'processing' || phase === 'db_write' || phase === 'db_read';
  const isDbActive     = phase === 'db_write' || phase === 'db_read';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
      <div style={{ padding:'8px 12px', border:'1px dashed #333', fontFamily:'var(--font-mono)', fontSize:'0.75rem', color: isError && phase==='error'? '#999' : '#fff' }}>
        {'>'} STATUS: {PHASE_LABELS[phase]}
      </div>

      <div style={{ background:'var(--bg-base)', border:'1px solid var(--border-default)', padding:'20px 0', overflow:'hidden' }}>
        <svg viewBox="0 0 560 180" width="100%" style={{ display:'block' }}>
          {/* Connection lines */}
          <line x1={clientX+nodeR} y1={nodeY} x2={serverX-nodeR} y2={nodeY} stroke={cLine} strokeWidth="1" strokeDasharray="4,4" />
          <line x1={serverX+nodeR} y1={nodeY} x2={dbX-nodeR} y2={nodeY} stroke={cLine} strokeWidth="1" strokeDasharray="4,4" />

          {/* Active path */}
          {isActive && phase !== 'success' && phase !== 'idle' && (
            <line
              x1={phase === 'sending' ? clientX+nodeR : phase === 'db_write' ? serverX+nodeR : phase === 'db_read' ? dbX-nodeR : phase === 'responding' ? serverX-nodeR : clientX+nodeR}
              y1={nodeY} x2={packetX} y2={nodeY}
              stroke={cAccent} strokeWidth="2"
              style={{ transition:'all 0.5s ease' }}
            />
          )}

          {/* Vector packet */}
          {isActive && phase !== 'idle' && phase !== 'success' && (
            <rect x={packetX-6} y={nodeY-6} width="12" height="12" fill={isError && phase==='error'? 'transparent' : cAccent} stroke={cAccent} strokeWidth="2" style={{ transition:'all 0.5s ease', transform:`rotate(${packetReturn?-45:45}deg)`, transformOrigin:`${packetX}px ${nodeY}px` }} />
          )}

          {/* Nodes */}
          {/* Client */}
          <g>
            <circle cx={clientX} cy={nodeY} r={nodeR} fill="var(--bg-card)" stroke={isClientActive ? '#fff' : '#444'} strokeWidth={isClientActive ? 2 : 1} style={{ transition:'all 0.3s' }} />
            <text x={clientX} y={nodeY+4} textAnchor="middle" fill={isClientActive ? '#fff' : '#888'} fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">CLI</text>
            <text x={clientX} y={nodeY+nodeR+20} textAnchor="middle" fill="#aaa" fontSize="10" fontFamily="var(--font-mono)">REACT</text>
          </g>

          {/* Server */}
          <g>
            <circle cx={serverX} cy={nodeY} r={nodeR} fill="var(--bg-card)" stroke={isServerActive ? '#fff' : '#444'} strokeWidth={isServerActive ? 2 : 1} style={{ transition:'all 0.3s' }} />
            <text x={serverX} y={nodeY+4} textAnchor="middle" fill={isServerActive ? '#fff' : '#888'} fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">APP</text>
            <text x={serverX} y={nodeY+nodeR+20} textAnchor="middle" fill="#aaa" fontSize="10" fontFamily="var(--font-mono)">GIN:8081</text>
          </g>

          {/* DB */}
          <g>
            <circle cx={dbX} cy={nodeY} r={nodeR} fill="var(--bg-card)" stroke={isDbActive ? '#fff' : '#444'} strokeWidth={isDbActive ? 2 : 1} style={{ transition:'all 0.3s' }} />
            <text x={dbX} y={nodeY+4} textAnchor="middle" fill={isDbActive ? '#fff' : '#888'} fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">DB</text>
            <text x={dbX} y={nodeY+nodeR+20} textAnchor="middle" fill="#aaa" fontSize="10" fontFamily="var(--font-mono)">MYSQL</text>
          </g>
        </svg>
      </div>
    </div>
  );
}
