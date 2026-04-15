export default function ResponsePanel({ response, loading }) {
  if (!response && !loading) {
    return (
      <div style={{ textAlign:'center', padding:'40px 0', fontFamily:'var(--font-mono)', color:'var(--text-muted)', fontSize:'0.8rem' }}>
        WAITING FOR REQUEST...
      </div>
    );
  }

  if (loading) {
    return <div style={{ fontFamily:'var(--font-mono)', color:'#fff', fontSize:'0.8rem' }}>LOADING...</div>;
  }

  const { request: req, response: res } = response;
  const isSuccess = res?.status_code < 400;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', borderBottom:'1px dashed #333', paddingBottom:'8px' }}>
        <span className={isSuccess ? 'badge badge-success' : 'badge badge-error'}>
          {res?.status_code} {isSuccess ? 'OK' : 'ERR'}
        </span>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.75rem', color:'#aaa' }}>
          LATENCY: {res?.processing_time_ms}ms
        </span>
      </div>

      <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.75rem', color:'#888', marginBottom:'8px' }}>
        ID: #{req?.id} | CLIENT: {req?.client_id} | {req?.method} {req?.endpoint}
      </div>

      <div className="form-group">
        <label className="label">BODY</label>
        <div className="json-output"><JsonHighlight data={res?.body} /></div>
      </div>
    </div>
  );
}

function JsonHighlight({ data }) {
  if (!data) return <span>-</span>;
  let str;
  try { str = typeof data === 'string' ? JSON.stringify(JSON.parse(data), null, 2) : JSON.stringify(data, null, 2); } 
  catch { str = String(data); }

  const tokens = str.split(/("(?:[^"\\]|\\.)*"(?:\s*:)?|\b\d+\.?\d*\b|true|false|null|[{}\[\],])/g);
  return (
    <span>
      {tokens.map((t, i) => {
        if (!t) return null;
        if (t.endsWith('":')) return <span key={i} style={{ color:'#ffffff', fontWeight:600 }}>{t}</span>;
        if (t.startsWith('"')) return <span key={i} style={{ color:'#aaaaaa' }}>{t}</span>;
        if ('{['.includes(t) || '}]'.includes(t)) return <span key={i} style={{ color:'#555555' }}>{t}</span>;
        return <span key={i} style={{ color:'#888888' }}>{t}</span>;
      })}
    </span>
  );
}
