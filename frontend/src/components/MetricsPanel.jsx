export default function MetricsPanel({ metrics }) {
  if (!metrics) return null;
  const successRate = parseFloat(metrics.success_rate_pct || 0);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
      <div className="section-header"><h3>METRICS</h3></div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'8px' }}>
        <div className="metric-card"><div className="metric-value">{metrics.total_requests}</div><div className="metric-label">TOTAL</div></div>
        <div className="metric-card"><div className="metric-value">{metrics.avg_latency_ms}</div><div className="metric-label">AVG MS</div></div>
        <div className="metric-card"><div className="metric-value">{successRate}%</div><div className="metric-label">SUCCESS</div></div>
      </div>
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.7rem', fontFamily:'var(--font-mono)', marginBottom:'4px', color:'#aaa' }}>
          <span>OK: {metrics.success_requests}</span><span>ERR: {metrics.error_requests}</span>
        </div>
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${successRate}%` }} /></div>
      </div>
    </div>
  );
}
