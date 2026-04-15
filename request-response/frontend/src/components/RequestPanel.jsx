import { useState } from 'react';

const SCENARIOS = [
  { label: 'GET /products', method:'GET', endpoint:'/products', payload:'' },
  { label: 'POST /order', method:'POST', endpoint:'/order', payload:'{"produk_id":"P001","quantity":2,"customer":"user_01"}' },
  { label: 'GET /order/status', method:'GET', endpoint:'/order/status', payload:'' },
  { label: 'PUT /order/update', method:'PUT', endpoint:'/order/update', payload:'{"order_id":"ORD-001","status":"paid"}' },
  { label: 'DEL /order/cancel', method:'DELETE', endpoint:'/order/cancel', payload:'{"order_id":"ORD-001"}' },
];

export default function RequestPanel({ onSend, onDemo, onClear, loading }) {
  const [selectedScenario, setSelectedScenario] = useState(0);
  const [payload, setPayload]       = useState(SCENARIOS[0].payload);
  const [latency, setLatency]       = useState(500);
  const [errorRate, setErrorRate]   = useState(5);
  const [clientId, setClientId]     = useState('client-web');

  const scenario = SCENARIOS[selectedScenario];

  const handleSend = () => {
    onSend({
      client_id:  clientId, method: scenario.method, endpoint: scenario.endpoint,
      scenario: scenario.method + ' ' + scenario.endpoint, payload: payload,
      latency_ms: latency, error_rate: errorRate / 100,
    });
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
      <div className="section-header"><h3>REQUEST CONFIG</h3></div>
      
      <div className="form-group">
        <label className="label">CLIENT ID</label>
        <input className="input" value={clientId} onChange={e => setClientId(e.target.value)} />
      </div>

      <div className="form-group">
        <label className="label">SCENARIO</label>
        <select className="select" value={selectedScenario} onChange={e => { setSelectedScenario(parseInt(e.target.value)); setPayload(SCENARIOS[e.target.value].payload); }}>
          {SCENARIOS.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
        </select>
      </div>

      {(scenario.method !== 'GET') && (
        <div className="form-group">
          <label className="label">PAYLOAD (JSON)</label>
          <textarea className="textarea" value={payload} onChange={e => setPayload(e.target.value)} />
        </div>
      )}

      <div className="form-group" style={{ marginTop:'8px' }}>
        <label className="label" style={{ display:'flex', justifyContent:'space-between' }}>
          <span>LATENCY</span><span style={{ fontFamily:'var(--font-mono)', color:'#fff' }}>{latency}ms</span>
        </label>
        <input type="range" className="slider" min={100} max={3000} step={100} value={latency} onChange={e => setLatency(parseInt(e.target.value))} />
      </div>

      <div className="form-group" style={{ marginTop:'8px' }}>
        <label className="label" style={{ display:'flex', justifyContent:'space-between' }}>
          <span>ERROR RATE</span><span style={{ fontFamily:'var(--font-mono)', color:'#fff' }}>{errorRate}%</span>
        </label>
        <input type="range" className="slider" min={0} max={30} step={5} value={errorRate} onChange={e => setErrorRate(parseInt(e.target.value))} />
      </div>

      <div className="divider" style={{ margin:'8px 0' }} />

      <button className="btn btn-primary btn-full" onClick={handleSend} disabled={loading}>
        {loading ? 'PROCESSING...' : 'SEND REQUEST'}
      </button>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
        <button className="btn btn-ghost" onClick={() => onDemo(latency, errorRate / 100)} disabled={loading}>DEMO 3x</button>
        <button className="btn btn-danger" onClick={onClear} disabled={loading}>CLEAR</button>
      </div>
    </div>
  );
}
