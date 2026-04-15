// App.jsx — Komponen utama simulasi Request-Response
//
// Layout tiga kolom:
//   Kiri  : RequestPanel + MetricsPanel (kontrol simulasi)
//   Tengah: FlowDiagram animasi + LogPanel (visualisasi alur)
//   Kanan : ResponsePanel + ComparisonPanel (hasil + perbandingan)
//
// State Management:
//   - loading: apakah sedang menunggu response dari Gin server
//   - lastResponse: response terakhir yang diterima
//   - logs: riwayat semua request dalam sesi
//   - metrics: statistik dari database MySQL
//   - animating: mengontrol animasi FlowDiagram
//   - activeTab: tab aktif di panel kanan (response/comparison/doc)
import { useState, useEffect, useCallback, useRef } from 'react';
import FlowDiagram from './components/FlowDiagram';
import RequestPanel from './components/RequestPanel';
import ResponsePanel from './components/ResponsePanel';
import LogPanel from './components/LogPanel';
import MetricsPanel from './components/MetricsPanel';
import ComparisonPanel from './components/ComparisonPanel';

const API_BASE = 'http://localhost:8080/api';

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

  // Cek status server saat load
  useEffect(() => {
    checkServerStatus();
    fetchMetrics();
    // Poll metrics setiap 5 detik
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkServerStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/status`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) setServerStatus('online');
      else setServerStatus('error');
    } catch {
      setServerStatus('offline');
    }
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

  // Fungsi utama: kirim satu request ke Gin server
  const sendRequest = useCallback(async (reqConfig) => {
    if (loading) return;

    setLoading(true);
    setAnimating(false);
    setAnimKey(k => k + 1);

    // Mulai animasi setelah reset
    requestAnimationFrame(() => {
      setTimeout(() => setAnimating(true), 50);
    });

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
        response: {
          ...data.response,
          body: data.response?.body,
        },
      });

      // Tambah ke log
      setLogs(prev => [{
        method:            data.request?.method,
        endpoint:          data.request?.endpoint,
        scenario:          data.request?.scenario,
        status:            data.request?.status,
        status_code:       data.response?.status_code,
        processing_time_ms: data.response?.processing_time_ms,
        timestamp:         new Date().toISOString(),
      }, ...prev].slice(0, 100));

      // Switch ke tab response
      setActiveTab('response');

    } catch (err) {
      setIsError(true);
      setLogs(prev => [{
        method:    reqConfig.method,
        endpoint:  reqConfig.endpoint,
        scenario:  reqConfig.scenario,
        status:    'error',
        status_code: 503,
        processing_time_ms: 0,
        timestamp: new Date().toISOString(),
      }, ...prev].slice(0, 100));
    } finally {
      setLoading(false);
      setTimeout(() => setAnimating(false), 500);
      await fetchMetrics();
    }
  }, [loading]);

  // Auto demo: kirim 10 request dengan jeda
  const runDemo = useCallback(async (latencyMs, errorRate) => {
    if (demoRunning) return;
    setDemoRunning(true);

    const demoScenarios = [
      { method:'GET',    endpoint:'/products',      scenario:'GET /products',      payload:'' },
      { method:'POST',   endpoint:'/order',          scenario:'POST /order',        payload:'{"produk_id":"P002","quantity":1,"customer":"demo_user"}' },
      { method:'GET',    endpoint:'/products',       scenario:'GET /products',      payload:'' },
      { method:'GET',    endpoint:'/order/status',   scenario:'GET /order/status',  payload:'' },
      { method:'POST',   endpoint:'/order',          scenario:'POST /order',        payload:'{"produk_id":"P003","quantity":2,"customer":"demo_user2"}' },
      { method:'PUT',    endpoint:'/order/update',   scenario:'PUT /order/update',  payload:'{"order_id":"ORD-001","status":"paid"}' },
      { method:'GET',    endpoint:'/payment/status', scenario:'GET /payment/status',payload:'' },
      { method:'DELETE', endpoint:'/order/cancel',   scenario:'DELETE /order/cancel',payload:'{"order_id":"ORD-002"}' },
      { method:'GET',    endpoint:'/products',       scenario:'GET /products',      payload:'' },
      { method:'GET',    endpoint:'/order/status',   scenario:'GET /order/status',  payload:'' },
    ];

    for (let i = 0; i < demoScenarios.length; i++) {
      await sendRequest({
        ...demoScenarios[i],
        client_id:  `demo-client`,
        latency_ms: latencyMs,
        error_rate: errorRate,
      });
      await new Promise(r => setTimeout(r, latencyMs + 200));
    }

    setDemoRunning(false);
  }, [demoRunning, sendRequest]);

  // Clear semua data simulasi
  const clearAll = async () => {
    try {
      await fetch(`${API_BASE}/requests`, { method:'DELETE' });
      setLastResponse(null);
      setLogs([]);
      setMetrics(null);
      await fetchMetrics();
    } catch {}
  };

  const isLoading = loading || demoRunning;

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-base)', display:'flex', flexDirection:'column' }}>

      {/* ====== HEADER ====== */}
      <header style={{
        padding:'12px 24px',
        background:'var(--bg-surface)',
        borderBottom:'1px solid var(--border-default)',
        display:'flex', alignItems:'center', gap:'16px',
        position:'sticky', top:0, zIndex:100,
      }}>
        {/* Title */}
        <div>
          <h1 style={{ fontSize:'1rem', fontWeight:700, color:'var(--text-white)', margin:0, letterSpacing:'-0.01em' }}>
            Simulasi Model Komunikasi
            <span style={{ color:'var(--blue-400)', marginLeft:'6px' }}>Request-Response</span>
          </h1>
          <p style={{ fontSize:'0.72rem', color:'var(--text-muted)', margin:0 }}>
            Sistem Terdistribusi — Golang + Gin + MySQL + React
          </p>
        </div>

        {/* Spacer */}
        <div style={{ flex:1 }} />

        {/* Server status */}
        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
          <div style={{
            width:7, height:7, borderRadius:'50%',
            background: serverStatus === 'online' ? 'var(--green-400)' : serverStatus === 'checking' ? 'var(--yellow-400)' : 'var(--red-400)',
            boxShadow: serverStatus === 'online' ? '0 0 6px var(--green-400)' : 'none',
            animation: serverStatus === 'online' ? 'pulse 2s infinite' : 'none',
          }} />
          <span style={{ fontSize:'0.75rem', color:'var(--text-secondary)' }}>
            Gin:{' '}
            <span style={{ color: serverStatus === 'online' ? 'var(--green-400)' : 'var(--red-400)', fontFamily:'var(--font-mono)' }}>
              {serverStatus === 'online' ? ':8080 online' : serverStatus === 'checking' ? 'memeriksa...' : 'offline'}
            </span>
          </span>
        </div>

        {/* DB status */}
        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
          <div style={{
            width:7, height:7, borderRadius:'50%',
            background:'var(--cyan-400)',
            boxShadow:'0 0 6px var(--cyan-400)',
          }} />
          <span style={{ fontSize:'0.75rem', color:'var(--text-secondary)', fontFamily:'var(--font-mono)' }}>
            MySQL: sister2
          </span>
        </div>

        {/* Refresh */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={checkServerStatus}
          id="btn-check-server"
          title="Periksa status server"
        >
          Refresh
        </button>
      </header>

      {/* ====== MAIN LAYOUT — 3 KOLOM ====== */}
      <main style={{
        display:'grid',
        gridTemplateColumns:'300px 1fr 340px',
        gap:'16px',
        padding:'16px 20px',
        flex:1,
        minHeight:0,
        alignItems:'start',
      }}>

        {/* ==== KOLOM KIRI: Kontrol ====  */}
        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          {/* Request Panel */}
          <div className="card" style={{ padding:'16px' }}>
            <RequestPanel
              onSend={sendRequest}
              onDemo={runDemo}
              onClear={clearAll}
              loading={isLoading}
            />
          </div>

          {/* Metrics Panel */}
          <div className="card" style={{ padding:'16px' }}>
            <MetricsPanel metrics={metrics} loading={isLoading} />
          </div>
        </div>

        {/* ==== KOLOM TENGAH: Diagram + Log ==== */}
        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>

          {/* Flow Diagram */}
          <div className="card" style={{ padding:'16px' }}>
            <div className="section-header" style={{ marginBottom:'12px' }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--cyan-400)' }} />
              <h3>Diagram Alur Komunikasi</h3>
              {isLoading && (
                <span className="badge badge-pending" style={{ marginLeft:'auto' }}>
                  Berjalan...
                </span>
              )}
            </div>
            <FlowDiagram
              animating={animating}
              isError={isError}
              resetKey={animKey}
            />
          </div>

          {/* Log Panel */}
          <div className="card" style={{ padding:'16px' }}>
            <LogPanel logs={logs} />
          </div>

          {/* Penjelasan singkat model */}
          <div style={{
            padding:'12px 16px',
            background:'rgba(37,99,235,0.06)',
            border:'1px solid rgba(37,99,235,0.2)',
            borderRadius:'12px',
            fontSize:'0.78rem',
            lineHeight:'1.7',
            color:'var(--text-secondary)',
          }}>
            <strong style={{ color:'var(--blue-300)', display:'block', marginBottom:'4px' }}>
              Tentang Model Request-Response
            </strong>
            Model Request-Response adalah pola komunikasi di mana <em>satu client</em> mengirim permintaan ke
            <em> satu server</em>, dan server membalas dengan satu response. Komunikasi bersifat <strong>sinkron</strong>:
            client memblokir eksekusi hingga response tiba. Data request dan response disimpan di MySQL untuk
            memungkinkan analisis riwayat dan metrik performa.
          </div>
        </div>

        {/* ==== KOLOM KANAN: Response + Tab ==== */}
        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>

          {/* Tab navigation */}
          <div style={{
            display:'flex', gap:'4px',
            background:'var(--bg-surface)',
            padding:'4px',
            borderRadius:'8px',
            border:'1px solid var(--border-default)',
          }}>
            {[
              { id:'response',    label:'Response' },
              { id:'comparison',  label:'Perbandingan' },
              { id:'doc',         label:'Dokumentasi' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex:1, padding:'6px 0',
                  background: activeTab === tab.id ? 'var(--bg-card)' : 'transparent',
                  border: activeTab === tab.id ? '1px solid var(--border-default)' : '1px solid transparent',
                  borderRadius:'6px',
                  color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize:'0.78rem', fontWeight: activeTab === tab.id ? 600 : 400,
                  cursor:'pointer',
                  transition:'all 0.15s ease',
                  fontFamily:'var(--font-sans)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="card" style={{ padding:'16px', minHeight:'400px' }}>
            {activeTab === 'response' && (
              <ResponsePanel response={lastResponse} loading={loading} />
            )}
            {activeTab === 'comparison' && (
              <ComparisonPanel />
            )}
            {activeTab === 'doc' && (
              <DocumentationTab />
            )}
          </div>
        </div>
      </main>

      {/* ====== FOOTER ====== */}
      <footer style={{
        padding:'10px 24px',
        background:'var(--bg-surface)',
        borderTop:'1px solid var(--border-muted)',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        fontSize:'0.72rem', color:'var(--text-muted)',
      }}>
        <span>Tugas 2 — Sistem Terdistribusi | Model: Request-Response</span>
        <span style={{ fontFamily:'var(--font-mono)' }}>
          Backend: Golang + Gin v1 | DB: MySQL (GORM) | Frontend: React + Vite
        </span>
      </footer>
    </div>
  );
}

// Dokumentasi inline di dalam tab UI
function DocumentationTab() {
  const sections = [
    {
      title: 'Tujuan Simulasi',
      color: 'var(--blue-400)',
      content: `Simulasi ini menunjukkan cara kerja model komunikasi Request-Response dalam sistem terdistribusi.
      Pengguna dapat mengamati bagaimana request dikirim dari client, diproses oleh server Gin, disimpan ke MySQL,
      dan bagaimana response dikembalikan. Setiap siklus terekam di database untuk analisis.`
    },
    {
      title: 'Komponen Sistem',
      color: 'var(--green-400)',
      content: `- CLIENT: Browser + React (port 5173). Mengirim HTTP request ke server.
- SERVER: Gin Framework (port 8080). Menerima, memproses, dan merespons request.
- DATABASE: MySQL (sister2). Menyimpan riwayat request dan response secara permanen.
- CORS: Middleware yang memungkinkan komunikasi lintas-origin browser.`
    },
    {
      title: 'Cara Menggunakan',
      color: 'var(--yellow-400)',
      content: `1. Pilih skenario dari dropdown (GET produk, POST order, dll)
2. Atur latency simulasi (100ms-3000ms) menggunakan slider
3. Atur error rate (0%-30%) menggunakan slider
4. Klik "Kirim Request" untuk satu siklus simulasi
5. Amati animasi diagram dan response di panel kanan
6. Klik "Auto Demo (10x)" untuk simulasi otomatis 10 request
7. Gunakan tab "Perbandingan" untuk melihat perbedaan dengan Pub-Sub`
    },
    {
      title: 'Interpretasi Hasil',
      color: 'var(--purple-400)',
      content: `- Status 2xx (hijau): Request berhasil diproses server
- Status 4xx/5xx (merah): Terjadi error (sesuai error rate)
- Processing Time: Waktu aktual server memproses (termasuk simulasi delay)
- Flow Steps: 7 langkah siklus Request-Response yang terdokumentasi
- Metrics: Statistik kumulatif dari semua request di database`
    },
    {
      title: 'Logika Simulasi',
      color: 'var(--cyan-400)',
      content: `Setiap request disimulasikan dengan:
- Delay configurable (100-3000ms) untuk mensimulasikan beban server
- Error rate acak (0-30%) untuk mensimulasikan kondisi jaringan/server
- Response template realistis per skenario e-commerce
- Timestamp dan request ID unik per siklus
- Data tersimpan permanen di MySQL untuk analisis`
    }
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
      <div className="section-header">
        <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--yellow-400)' }} />
        <h3>Dokumentasi Simulasi</h3>
      </div>
      {sections.map((s, i) => (
        <div key={i} style={{
          padding:'10px 12px',
          background:'var(--bg-base)',
          border:`1px solid var(--border-muted)`,
          borderLeft:`3px solid ${s.color}`,
          borderRadius:'0 6px 6px 0',
        }}>
          <div style={{ fontSize:'0.75rem', fontWeight:700, color: s.color, marginBottom:'4px' }}>{s.title}</div>
          <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)', lineHeight:'1.7', whiteSpace:'pre-line' }}>
            {s.content}
          </div>
        </div>
      ))}
    </div>
  );
}
