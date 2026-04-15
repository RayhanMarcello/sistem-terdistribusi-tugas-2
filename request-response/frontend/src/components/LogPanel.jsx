import { useEffect, useRef } from 'react';

export default function LogPanel({ logs }) {
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [logs]);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div className="section-header">
        <h3>SYS LOGS</h3>
        <span style={{ marginLeft:'auto', fontSize:'0.75rem', fontFamily:'var(--font-mono)', color:'#fff' }}>[{logs.length}]</span>
      </div>
      <div className="scroll-area" style={{ flex:1, maxHeight:'200px' }}>
        {logs.map((log, i) => (
          <div key={i} className="log-entry">
            <span className="log-method">{log.method}</span>
            <span style={{ color:'#fff', flex:1 }}>{log.endpoint}</span>
            <span style={{ color: log.status==='success' ? '#fff' : '#666', textDecoration: log.status!=='success' ? 'line-through' : 'none' }}>
              {log.status_code || '---'}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
