import { useState, useEffect, useCallback } from 'react';
import FlowDiagram from './components/FlowDiagram';
import RequestPanel from './components/RequestPanel';
import ResponsePanel from './components/ResponsePanel';
import LogPanel from './components/LogPanel';
import MetricsPanel from './components/MetricsPanel';
import ComparisonPanel from './components/ComparisonPanel';

const API_BASE = 'http://localhost:8081/api';

export default function App() {
  const [loading, setLoading]           = useState(false);
  const [lastResponse, setLastResponse] = useState(null);
  const [logs, setLogs]                 = useState([]);
  const [metrics, setMetrics]           = useState(null);
  const [animating, setAnimating]       = useState(false);
  const [isError, setIsError]           = useState(false);
  const [serverStatus, setServerStatus] = useState('checking');
  const [activeTab, setActiveTab]       = useState('response');
  const [animKey, setAnimKey]           = useState(0);
  const [demoRunning, setDemoRunning]   = useState(false);

  useEffect(() => {
    checkServerStatus();
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkServerStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/status`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) setServerStatus('online');
      else setServerStatus('error');
    } catch { setServerStatus('offline'); }
  };

  const fetchMetrics = async () => {
    try {
      const res = await fetch(`${API_BASE}/metrics`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch {}
  };

  const sendRequest = useCallback(async (reqConfig) => {
    if (loading) return;
    setLoading(true); setAnimating(false); setAnimKey(k => k + 1);
    requestAnimationFrame(() => setTimeout(() => setAnimating(true), 50));

    try {
      const res = await fetch(`${API_BASE}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqConfig),
      });
      const data = await res.json();
      const isErr = res.status >= 400 || data.response?.status_code >= 400;
      setIsError(isErr);
      setLastResponse({
        request: data.request,
        response: { ...data.response, body: data.response?.body },
      });
      setLogs(prev => [{
        method: data.request?.method, endpoint: data.request?.endpoint, scenario: data.request?.scenario,
        status: data.request?.status, status_code: data.response?.status_code,
        processing_time_ms: data.response?.processing_time_ms, timestamp: new Date().toISOString(),
      }, ...prev].slice(0, 100));
      setActiveTab('response');
    } catch (err) {
      setIsError(true);
      setLogs(prev => [{
        method: reqConfig.method, endpoint: reqConfig.endpoint, scenario: reqConfig.scenario,
        status: 'error', status_code: 503, processing_time_ms: 0, timestamp: new Date().toISOString(),
      }, ...prev].slice(0, 100));
    } finally {
      setLoading(false);
      await fetchMetrics();
    }
  }, [loading]);

  const runDemo = useCallback(async (latencyMs, errorRate) => {
    if (demoRunning) return;
    setDemoRunning(true);
    const demoScenarios = [
      { method:'GET', endpoint:'/products', scenario:'GET /products', payload:'' },
      { method:'POST', endpoint:'/order', scenario:'POST /order', payload:'{"produk_id":"P002","quantity":1,"customer":"demo_user"}' },
      { method:'GET', endpoint:'/order/status', scenario:'GET /order/status', payload:'' },
    ];
    for (let i = 0; i < demoScenarios.length; i++) {
      await sendRequest({ ...demoScenarios[i], client_id: `demo-client`, latency_ms: latencyMs, error_rate: errorRate });
      await new Promise(r => setTimeout(r, latencyMs + 200));
    }
    setDemoRunning(false);
  }, [demoRunning, sendRequest]);

  const clearAll = async () => {
    try { await fetch(`${API_BASE}/requests`, { method:'DELETE' }); setLastResponse(null); setLogs([]); setMetrics(null); await fetchMetrics(); } catch {}
  };

  const isLoading = loading || demoRunning;

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      {/* HEADER */}
      <header style={{ padding:'16px 24px', background:'var(--bg-base)', borderBottom:'1px solid var(--border-default)', display:'flex', alignItems:'center', gap:'24px', position:'sticky', top:0, zIndex:100 }}>
        <div>
          <h1 style={{ fontSize:'1.1rem', letterSpacing:'0.02em', margin:0 }}>REQUEST \ RESPONSE</h1>
          <p style={{ fontSize:'0.7rem', color:'var(--text-muted)', textTransform:'uppercase', margin:0, letterSpacing:'0.05em' }}>Simulasi Sistem Terdistribusi</p>
        </div>
        <div style={{ flex:1 }} />
        <div style={{ display:'flex', alignItems:'center', gap:'12px', fontSize:'0.7rem', fontFamily:'var(--font-mono)', textTransform:'uppercase', color:'var(--text-secondary)' }}>
          <div>GIN: {serverStatus === 'online' ? 'ONLINE :8081' : serverStatus === 'checking' ? 'CHECKING...' : 'OFFLINE'}</div>
          <div>|</div>
          <div>DB: MYSQL SISTER2</div>
        </div>
      </header>

      {/* MAIN */}
      <main style={{ display:'grid', gridTemplateColumns:'300px 1fr 340px', gap:'16px', padding:'20px 24px', flex:1, alignItems:'start' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          <div className="card"><RequestPanel onSend={sendRequest} onDemo={runDemo} onClear={clearAll} loading={isLoading} /></div>
          <div className="card"><MetricsPanel metrics={metrics} loading={isLoading} /></div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          <div className="card">
            <div className="section-header"><h3>FLOW DIAGRAM</h3></div>
            <FlowDiagram animating={animating} isError={isError} resetKey={animKey} />
          </div>
          <div className="card"><LogPanel logs={logs} /></div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          <div style={{ display:'flex', gap:'8px', borderBottom:'1px solid var(--border-default)', paddingBottom:'8px' }}>
            {['response', 'comparison', 'doc'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ background:'none', border:'none', color: activeTab === tab ? '#fff' : '#666', borderBottom: activeTab === tab ? '1px solid #fff' : 'none', padding:'4px 8px', fontSize:'0.75rem', textTransform:'uppercase', letterSpacing:'0.05em', cursor:'pointer' }}>
                {tab}
              </button>
            ))}
          </div>
          <div className="card" style={{ minHeight:'400px', border:'none', padding:'8px 0' }}>
            {activeTab === 'response' && <ResponsePanel response={lastResponse} loading={loading} />}
            {activeTab === 'comparison' && <ComparisonPanel />}
            {activeTab === 'doc' && <DocumentationTab />}
          </div>
        </div>
      </main>
    </div>
  );
}

function DocumentationTab() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px', color:'#ccc', fontSize:'0.8rem', lineHeight:'1.6' }}>
      <div className="section-header"><h3>DOCUMENTATION</h3></div>
      <div>
        <strong style={{ color:'#fff' }}>01 / OBJECTIVE</strong><br/>
        Simulasi ini menunjukkan pola Request-Response sinkron. Permintaan berjalan dari client ke server, disimpan, dan dibalas kembali.
      </div>
      <div>
        <strong style={{ color:'#fff' }}>02 / STACK</strong><br/>
        Frontend: React. Backend: Golang Gin. Database: MySQL.
      </div>
      <div>
        <strong style={{ color:'#fff' }}>03 / USAGE</strong><br/>
        - Atur skenario, delay, & error rate.<br/>
        - Klik SEND REQUEST.<br/>
        - Amati alur pada flow diagram.
      </div>
    </div>
  );
}
