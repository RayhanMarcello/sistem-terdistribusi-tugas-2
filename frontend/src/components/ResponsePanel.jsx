// ResponsePanel.jsx
// Menampilkan response server dari simulasi Request-Response.
// Response ditampilkan dengan syntax highlighting JSON dan informasi status code.
export default function ResponsePanel({ response, loading }) {
  if (!response && !loading) {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
        <div className="section-header">
          <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--text-muted)' }} />
          <h3>Response Server</h3>
        </div>
        <div style={{
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          padding:'40px 20px', gap:'12px',
          background:'var(--bg-base)', border:'1px dashed var(--border-default)',
          borderRadius:'8px', color:'var(--text-muted)', textAlign:'center',
        }}>
          <div style={{ fontSize:'2rem', opacity:0.3 }}>&#9679;</div>
          <p style={{ fontSize:'0.82rem' }}>Belum ada response.</p>
          <p style={{ fontSize:'0.75rem' }}>Kirim request untuk memulai simulasi.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
        <div className="section-header">
          <div className="dot dot-active" />
          <h3>Response Server</h3>
          <span className="badge badge-pending" style={{ marginLeft:'auto' }}>Menunggu...</span>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          {[80,100,60,90,70].map((w,i) => (
            <div key={i} className="skeleton" style={{ height:'16px', width:`${w}%` }} />
          ))}
        </div>
      </div>
    );
  }

  const { request: req, response: res } = response;
  const isSuccess = res?.status_code < 400;
  const statusColor = isSuccess ? 'var(--green-400)' : 'var(--red-400)';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
      {/* Header */}
      <div className="section-header">
        <div style={{
          width:8, height:8, borderRadius:'50%',
          background: isSuccess ? 'var(--green-400)' : 'var(--red-400)',
          boxShadow: `0 0 8px ${isSuccess ? 'var(--green-400)' : 'var(--red-400)'}`,
        }} />
        <h3>Response Server</h3>
        <span className={`badge ${isSuccess ? 'badge-success' : 'badge-error'}`} style={{ marginLeft:'auto' }}>
          {res?.status_code} {isSuccess ? 'OK' : 'ERROR'}
        </span>
      </div>

      {/* Request info */}
      <div style={{
        display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px',
        padding:'10px 12px',
        background:'var(--bg-base)', border:'1px solid var(--border-muted)',
        borderRadius:'8px', fontSize:'0.78rem',
      }}>
        <InfoRow label="Request ID" value={`#${req?.id}`} mono />
        <InfoRow label="Client ID" value={req?.client_id} />
        <InfoRow label="Method" value={req?.method} mono color={req?.method === 'GET' ? '#56d364' : req?.method === 'POST' ? '#79c0ff' : req?.method === 'PUT' ? '#e3b341' : '#f85149'} />
        <InfoRow label="Status" value={req?.status} color={isSuccess ? '#56d364' : '#f85149'} />
        <InfoRow label="Latency" value={`${res?.processing_time_ms} ms`} mono />
        <InfoRow label="Status Code" value={res?.status_code} mono color={statusColor} />
      </div>

      {/* Response Body JSON */}
      <div className="form-group">
        <label className="label">Response Body</label>
        <div className="json-output" id="response-body-output">
          <JsonHighlight data={res?.body} />
        </div>
      </div>

      {/* Flow steps */}
      {res?.body?.flow_steps && (
        <div className="form-group">
          <label className="label">Alur Komunikasi yang Terjadi</label>
          <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
            {res.body.flow_steps.map((step, i) => (
              <div key={i} style={{
                display:'flex', gap:'8px', alignItems:'flex-start',
                padding:'4px 8px',
                background:'var(--bg-base)', borderRadius:'4px',
                fontSize:'0.78rem',
              }}>
                <span style={{
                  minWidth:'18px', height:'18px',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background:'var(--blue-500)', borderRadius:'50%',
                  color:'white', fontSize:'0.65rem', fontWeight:700, flexShrink:0,
                }}>{i+1}</span>
                <span style={{ color:'var(--text-secondary)' }}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono, color }) {
  return (
    <div>
      <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.04em' }}>{label}</div>
      <div style={{
        fontFamily: mono ? 'var(--font-mono)' : 'inherit',
        color: color || 'var(--text-primary)',
        fontSize:'0.82rem', fontWeight:500,
      }}>{value ?? '-'}</div>
    </div>
  );
}

// Simple JSON syntax highlighter
function JsonHighlight({ data }) {
  if (!data) return <span style={{ color:'var(--text-muted)' }}>-</span>;

  let str;
  try {
    str = typeof data === 'string' ? JSON.stringify(JSON.parse(data), null, 2) : JSON.stringify(data, null, 2);
  } catch {
    str = String(data);
  }

  // Tokenize and color
  const tokens = str.split(/("(?:[^"\\]|\\.)*"(?:\s*:)?|\b\d+\.?\d*\b|true|false|null|[{}\[\],])/g);

  return (
    <span>
      {tokens.map((t, i) => {
        if (!t) return null;
        if (t.endsWith('":'))     return <span key={i} style={{ color:'#79c0ff' }}>{t}</span>;
        if (t.startsWith('"'))    return <span key={i} style={{ color:'#a5d6ff' }}>{t}</span>;
        if (t === 'true')         return <span key={i} style={{ color:'#56d364' }}>{t}</span>;
        if (t === 'false')        return <span key={i} style={{ color:'#f85149' }}>{t}</span>;
        if (t === 'null')         return <span key={i} style={{ color:'#8b949e' }}>{t}</span>;
        if (/^\d/.test(t))        return <span key={i} style={{ color:'#e3b341' }}>{t}</span>;
        if ('{['.includes(t))     return <span key={i} style={{ color:'#e6edf3' }}>{t}</span>;
        if ('}]'.includes(t))     return <span key={i} style={{ color:'#e6edf3' }}>{t}</span>;
        return <span key={i} style={{ color:'#8b949e' }}>{t}</span>;
      })}
    </span>
  );
}
