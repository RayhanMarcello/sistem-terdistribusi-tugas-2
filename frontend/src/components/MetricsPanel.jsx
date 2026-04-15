// MetricsPanel.jsx
// Dashboard statistik dari semua request yang tersimpan di MySQL.
import { useEffect, useState } from 'react';

export default function MetricsPanel({ metrics, loading }) {
  if (!metrics) return null;

  const successRate = parseFloat(metrics.success_rate_pct || 0);
  const successColor = successRate >= 90 ? 'var(--green-400)' : successRate >= 70 ? 'var(--yellow-400)' : 'var(--red-400)';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
      <div className="section-header">
        <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--purple-400)' }} />
        <h3>Metrik Simulasi</h3>
        {loading && <span className="badge badge-pending" style={{ marginLeft:'auto', fontSize:'0.65rem' }}>Memuat...</span>}
      </div>

      {/* Grid metrik utama */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'8px' }}>
        <MetricCard
          value={metrics.total_requests || 0}
          label="Total Request"
          color="var(--blue-400)"
        />
        <MetricCard
          value={`${metrics.avg_latency_ms || 0}ms`}
          label="Rata-rata Latency"
          color="var(--purple-400)"
        />
        <MetricCard
          value={`${metrics.success_rate_pct || 0}%`}
          label="Success Rate"
          color={successColor}
        />
      </div>

      {/* Success vs Error bar */}
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem', marginBottom:'4px', color:'var(--text-muted)' }}>
          <span style={{ color:'var(--green-400)' }}>Sukses: {metrics.success_requests || 0}</span>
          <span style={{ color:'var(--red-400)' }}>Error: {metrics.error_requests || 0}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{
            width: metrics.total_requests > 0 ? `${successRate}%` : '0%',
            background: `linear-gradient(90deg, var(--green-500), var(--green-400))`,
          }} />
        </div>
      </div>

      {/* Latency Range */}
      <div style={{
        display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px',
        padding:'8px 12px',
        background:'var(--bg-base)', border:'1px solid var(--border-muted)',
        borderRadius:'8px', fontSize:'0.78rem',
      }}>
        <div>
          <div style={{ color:'var(--text-muted)', fontSize:'0.7rem', textTransform:'uppercase' }}>Min Latency</div>
          <div style={{ fontFamily:'var(--font-mono)', color:'var(--green-400)' }}>{metrics.min_latency_ms || 0}ms</div>
        </div>
        <div>
          <div style={{ color:'var(--text-muted)', fontSize:'0.7rem', textTransform:'uppercase' }}>Max Latency</div>
          <div style={{ fontFamily:'var(--font-mono)', color:'var(--red-400)' }}>{metrics.max_latency_ms || 0}ms</div>
        </div>
      </div>

      {/* Method breakdown */}
      {metrics.method_breakdown && metrics.method_breakdown.length > 0 && (
        <div>
          <label className="label">Breakdown per HTTP Method</label>
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
            {metrics.method_breakdown.map((m, i) => (
              <MethodBadge key={i} method={m.Method} count={m.Count} total={metrics.total_requests} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ value, label, color }) {
  return (
    <div className="metric-card">
      <div className="metric-value" style={{ color }}>{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  );
}

function MethodBadge({ method, count, total }) {
  const colors = { GET:'#56d364', POST:'#79c0ff', PUT:'#e3b341', DELETE:'#f85149' };
  const c = colors[method] || 'var(--text-muted)';
  const pct = total > 0 ? Math.round((count/total)*100) : 0;
  return (
    <div style={{
      padding:'4px 10px',
      background:`rgba(${method === 'GET' ? '86,211,100' : method === 'POST' ? '121,192,255' : method === 'PUT' ? '227,179,65' : '248,81,73'},0.1)`,
      border:`1px solid ${c}44`, borderRadius:'4px',
      fontSize:'0.75rem', color: c, fontFamily:'var(--font-mono)',
    }}>
      {method} <span style={{ color:'var(--text-muted)' }}>({count} · {pct}%)</span>
    </div>
  );
}
