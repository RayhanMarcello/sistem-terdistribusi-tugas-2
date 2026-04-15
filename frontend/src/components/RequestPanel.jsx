// RequestPanel.jsx
// Panel kontrol utama untuk mengirim request simulasi.
// Pengguna dapat mengkonfigurasi method, endpoint, payload, latency, dan error rate.
import { useState } from 'react';

const SCENARIOS = [
  { label: 'GET  /products     — Ambil daftar produk',    method:'GET',    endpoint:'/products',      payload:'' },
  { label: 'POST /order        — Buat pesanan baru',      method:'POST',   endpoint:'/order',         payload:'{"produk_id":"P001","quantity":2,"customer":"pelanggan_001","alamat":"Jl. Contoh No.1"}' },
  { label: 'GET  /order/status — Cek status pesanan',     method:'GET',    endpoint:'/order/status',  payload:'' },
  { label: 'PUT  /order/update — Update status pesanan',  method:'PUT',    endpoint:'/order/update',  payload:'{"order_id":"ORD-001","status":"paid"}' },
  { label: 'DELETE /order/cancel — Batalkan pesanan',     method:'DELETE', endpoint:'/order/cancel',  payload:'{"order_id":"ORD-001","alasan":"stok habis"}' },
  { label: 'GET  /payment/status — Status pembayaran',    method:'GET',    endpoint:'/payment/status',payload:'' },
];

const METHOD_COLORS = { GET:'#56d364', POST:'#79c0ff', PUT:'#e3b341', DELETE:'#f85149' };

export default function RequestPanel({ onSend, onDemo, onClear, loading }) {
  const [selectedScenario, setSelectedScenario] = useState(0);
  const [payload, setPayload]       = useState(SCENARIOS[0].payload);
  const [latency, setLatency]       = useState(500);
  const [errorRate, setErrorRate]   = useState(5);
  const [clientId, setClientId]     = useState('client-browser');

  const scenario = SCENARIOS[selectedScenario];

  const handleScenarioChange = (e) => {
    const idx = parseInt(e.target.value);
    setSelectedScenario(idx);
    setPayload(SCENARIOS[idx].payload);
  };

  const handleSend = () => {
    onSend({
      client_id:  clientId || 'client-browser',
      method:     scenario.method,
      endpoint:   scenario.endpoint,
      scenario:   scenario.method + ' ' + scenario.endpoint,
      payload:    payload,
      latency_ms: latency,
      error_rate: errorRate / 100,
    });
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>

      {/* Header */}
      <div className="section-header">
        <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--blue-400)' }} />
        <h3>Kontrol Request</h3>
      </div>

      {/* Client ID */}
      <div className="form-group">
        <label className="label">ID Client</label>
        <input
          className="input"
          value={clientId}
          onChange={e => setClientId(e.target.value)}
          placeholder="client-browser"
          id="input-client-id"
        />
      </div>

      {/* Scenario selector */}
      <div className="form-group">
        <label className="label">Skenario Request</label>
        <div style={{ position:'relative' }}>
          <select
            className="select"
            value={selectedScenario}
            onChange={handleScenarioChange}
            id="select-scenario"
            style={{ paddingRight:'28px' }}
          >
            {SCENARIOS.map((s, i) => (
              <option key={i} value={i}>{s.label}</option>
            ))}
          </select>
          <div style={{
            position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)',
            pointerEvents:'none', color:'var(--text-muted)', fontSize:'10px'
          }}>▼</div>
        </div>
      </div>

      {/* Method + Endpoint display */}
      <div style={{
        display:'flex', gap:'8px', alignItems:'center',
        padding:'8px 12px',
        background:'var(--bg-base)',
        border:'1px solid var(--border-default)',
        borderRadius:'8px',
        fontFamily:'var(--font-mono)',
        fontSize:'0.82rem',
      }}>
        <span style={{
          padding:'2px 8px', borderRadius:'4px', fontWeight:700,
          background: `rgba(${hexChannel(METHOD_COLORS[scenario.method])},0.15)`,
          color: METHOD_COLORS[scenario.method],
          border: `1px solid ${METHOD_COLORS[scenario.method]}44`,
          fontSize:'0.75rem',
        }}>
          {scenario.method}
        </span>
        <span style={{ color:'var(--text-secondary)' }}>http://localhost:8080/api</span>
        <span style={{ color:'var(--blue-300)', fontWeight:500 }}>{scenario.endpoint}</span>
      </div>

      {/* Payload editor (hanya tampil jika bukan GET) */}
      {(scenario.method === 'POST' || scenario.method === 'PUT' || scenario.method === 'DELETE') && (
        <div className="form-group">
          <label className="label">Request Body (JSON)</label>
          <textarea
            className="textarea"
            value={payload}
            onChange={e => setPayload(e.target.value)}
            rows={4}
            id="textarea-payload"
            style={{ minHeight:'90px' }}
          />
        </div>
      )}

      {/* Slider: Latency */}
      <div className="form-group">
        <label className="label" style={{ display:'flex', justifyContent:'space-between' }}>
          <span>Delay Simulasi (Latency)</span>
          <span style={{ color:'var(--blue-400)', fontFamily:'var(--font-mono)' }}>{latency} ms</span>
        </label>
        <div className="slider-container">
          <input
            type="range" className="slider"
            min={100} max={3000} step={100}
            value={latency}
            onChange={e => setLatency(parseInt(e.target.value))}
            id="slider-latency"
          />
          <div className="slider-labels">
            <span>100ms (cepat)</span>
            <span>3000ms (lambat)</span>
          </div>
        </div>
        <div style={{
          display:'flex', justifyContent:'center',
          padding:'4px 0',
        }}>
          <div className="progress-bar" style={{ width:'100%' }}>
            <div className="progress-fill" style={{
              width: `${((latency-100)/2900)*100}%`,
              background: latency < 1000 ? 'var(--green-500)' : latency < 2000 ? 'var(--yellow-500)' : 'var(--red-500)',
            }} />
          </div>
        </div>
      </div>

      {/* Slider: Error Rate */}
      <div className="form-group">
        <label className="label" style={{ display:'flex', justifyContent:'space-between' }}>
          <span>Simulasi Error Rate</span>
          <span style={{
            color: errorRate === 0 ? 'var(--green-400)' : errorRate < 15 ? 'var(--yellow-400)' : 'var(--red-400)',
            fontFamily:'var(--font-mono)',
          }}>{errorRate}%</span>
        </label>
        <div className="slider-container">
          <input
            type="range" className="slider"
            min={0} max={30} step={5}
            value={errorRate}
            onChange={e => setErrorRate(parseInt(e.target.value))}
            id="slider-error-rate"
          />
          <div className="slider-labels">
            <span>0% (tidak ada error)</span>
            <span>30% (sering error)</span>
          </div>
        </div>
      </div>

      <div className="divider" />

      {/* Action buttons */}
      <button
        className="btn btn-primary btn-lg btn-full"
        onClick={handleSend}
        disabled={loading}
        id="btn-send-request"
      >
        {loading ? (
          <>
            <span style={{ animation:'spin 1s linear infinite', display:'inline-block' }}>&#9696;</span>
            Menunggu Response...
          </>
        ) : (
          <>Kirim Request</>
        )}
      </button>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
        <button
          className="btn btn-success"
          onClick={() => onDemo(latency, errorRate / 100)}
          disabled={loading}
          id="btn-auto-demo"
        >
          Auto Demo (10x)
        </button>
        <button
          className="btn btn-danger"
          onClick={onClear}
          disabled={loading}
          id="btn-clear-history"
        >
          Clear Data
        </button>
      </div>

      {/* Info card */}
      <div style={{
        padding:'10px 12px',
        background:'rgba(37,99,235,0.07)',
        border:'1px solid rgba(37,99,235,0.2)',
        borderRadius:'8px',
        fontSize:'0.75rem',
        color:'var(--text-secondary)',
        lineHeight:'1.6',
      }}>
        <strong style={{ color:'var(--blue-300)' }}>Cara kerja:</strong><br/>
        Setiap klik "Kirim Request" memulai satu siklus komunikasi Request-Response.
        Client mengirim HTTP request ke Gin server, server memprosesnya selama
        <span style={{ color:'var(--blue-400)', fontFamily:'var(--font-mono)' }}> {latency}ms</span>,
        menyimpan hasilnya ke MySQL, dan mengembalikan response.
      </div>
    </div>
  );
}

function hexChannel(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}
