// LogPanel.jsx
// Menampilkan log real-time semua request dan response dalam format terminal.
import { useEffect, useRef } from 'react';

const METHOD_STYLE = {
  GET:    { bg:'rgba(86,211,100,0.1)',   color:'#56d364' },
  POST:   { bg:'rgba(121,192,255,0.1)', color:'#79c0ff' },
  PUT:    { bg:'rgba(227,179,65,0.1)',  color:'#e3b341' },
  DELETE: { bg:'rgba(248,81,73,0.1)',   color:'#f85149' },
};

export default function LogPanel({ logs }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [logs]);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div className="section-header">
        <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--cyan-400)', animation:'pulse 2s infinite' }} />
        <h3>Log Real-Time</h3>
        <span style={{ marginLeft:'auto', fontSize:'0.72rem', color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>
          {logs.length} entri
        </span>
      </div>

      <div className="scroll-area" style={{ flex:1, maxHeight:'320px' }}>
        {logs.length === 0 ? (
          <div style={{ padding:'20px', textAlign:'center', color:'var(--text-muted)', fontSize:'0.8rem' }}>
            Log kosong — kirim request untuk memulai simulasi
          </div>
        ) : (
          logs.map((log, i) => (
            <LogEntry key={i} log={log} />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function LogEntry({ log }) {
  const ms = METHOD_STYLE[log.method] || { bg:'rgba(255,255,255,0.05)', color:'var(--text-muted)' };
  const time = new Date(log.timestamp).toLocaleTimeString('id-ID', { hour12:false });
  const isSuccess = log.status === 'success';

  return (
    <div className="log-entry" style={{ animation:'fadeIn 0.3s ease' }}>
      <span className="log-time">{time}</span>
      <span style={{
        padding:'1px 5px', borderRadius:'3px', fontWeight:700,
        fontSize:'0.68rem', background: ms.bg, color: ms.color,
        border:`1px solid ${ms.color}33`, minWidth:'44px', textAlign:'center',
      }}>
        {log.method}
      </span>
      <span style={{ color:'var(--text-secondary)', flex:1 }}>
        <span style={{ color:'var(--blue-300)' }}>{log.endpoint}</span>
        {' '}
        <span style={{ color:'var(--text-muted)' }}>— {log.scenario}</span>
      </span>
      <span style={{ display:'flex', alignItems:'center', gap:'4px' }}>
        <span style={{
          fontSize:'0.72rem',
          color: isSuccess ? 'var(--green-400)' : log.status === 'error' ? 'var(--red-400)' : 'var(--yellow-400)',
        }}>
          {log.status_code || '...'}
        </span>
        <span style={{ fontSize:'0.68rem', color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>
          {log.processing_time_ms ? `${log.processing_time_ms}ms` : ''}
        </span>
      </span>
    </div>
  );
}
