// ComparisonPanel.jsx
// Tabel perbandingan Request-Response vs Publish-Subscribe.
// Menampilkan perbedaan karakteristik kedua model komunikasi secara visual.
export default function ComparisonPanel() {
  const rows = [
    {
      aspek: 'Pola Komunikasi',
      reqres: 'Sinkron (Client menunggu response)',
      pubsub: 'Asinkron (Publisher tidak menunggu)',
    },
    {
      aspek: 'Coupling',
      reqres: 'Tight Coupling — Client harus tahu alamat server',
      pubsub: 'Loose Coupling — Publisher tidak tahu Consumer-nya',
    },
    {
      aspek: 'Relasi Pengirim-Penerima',
      reqres: '1-to-1 (satu client, satu server, satu response)',
      pubsub: '1-to-Many (satu publisher, banyak consumer menerima)',
    },
    {
      aspek: 'Scalability',
      reqres: 'Lebih sulit di-scale karena koneksi langsung',
      pubsub: 'Mudah di-scale, tambah consumer tanpa ubah publisher',
    },
    {
      aspek: 'Fault Tolerance',
      reqres: 'Jika server down, request langsung gagal',
      pubsub: 'Pesan di-queue, consumer bisa down sementara',
    },
    {
      aspek: 'Latency',
      reqres: 'Lebih rendah untuk komunikasi tunggal',
      pubsub: 'Lebih tinggi akibat overhead message broker',
    },
    {
      aspek: 'Use Case Terbaik',
      reqres: 'Query data, CRUD, operasi transaksi langsung',
      pubsub: 'Event-driven (order, notifikasi, streaming data)',
    },
    {
      aspek: 'Contoh Teknologi',
      reqres: 'HTTP REST, gRPC, GraphQL',
      pubsub: 'RabbitMQ, Apache Kafka, NATS, Redis Pub/Sub',
    },
    {
      aspek: 'Proyek Ini',
      reqres: 'React → Gin Server → MySQL',
      pubsub: 'Publisher.go → RabbitMQ → 4 Consumer Service',
    },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
      <div className="section-header">
        <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--yellow-400)' }} />
        <h3>Perbandingan Model Komunikasi</h3>
      </div>

      {/* Header keterangan */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
        <div style={{
          padding:'8px 12px', borderRadius:'8px',
          background:'rgba(37,99,235,0.1)', border:'1px solid rgba(37,99,235,0.3)',
          textAlign:'center',
        }}>
          <div style={{ fontSize:'0.72rem', color:'var(--blue-300)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>
            Request-Response
          </div>
          <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:'2px' }}>
            Go + Gin + MySQL (Proyek ini)
          </div>
        </div>
        <div style={{
          padding:'8px 12px', borderRadius:'8px',
          background:'rgba(139,92,246,0.1)', border:'1px solid rgba(139,92,246,0.3)',
          textAlign:'center',
        }}>
          <div style={{ fontSize:'0.72rem', color:'var(--purple-400)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>
            Publish-Subscribe
          </div>
          <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:'2px' }}>
            Go + RabbitMQ (E-commerce)
          </div>
        </div>
      </div>

      {/* Tabel perbandingan */}
      <div style={{ overflow:'auto' }}>
        <table className="comparison-table">
          <thead>
            <tr>
              <th style={{ width:'28%' }}>Aspek</th>
              <th style={{ color:'var(--blue-400)', width:'36%' }}>Request-Response</th>
              <th style={{ color:'var(--purple-400)', width:'36%' }}>Publish-Subscribe</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td style={{ fontWeight:600, color:'var(--text-primary)', fontSize:'0.78rem' }}>
                  {row.aspek}
                </td>
                <td style={{ color:'var(--blue-300)', fontSize:'0.78rem' }}>{row.reqres}</td>
                <td style={{ color:'var(--purple-300)', fontSize:'0.78rem' }}>{row.pubsub}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Kapan menggunakan */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
        <UseCard
          title="Gunakan Request-Response"
          color="var(--blue-400)"
          border="rgba(37,99,235,0.3)"
          items={[
            'Perlu respons langsung (query data)',
            'Transaksi atomik (misalnya pembayaran)',
            'Sistem sederhana & terprediksi',
            'Debugging mudah (langsung lihat error)',
          ]}
        />
        <UseCard
          title="Gunakan Publish-Subscribe"
          color="var(--purple-400)"
          border="rgba(139,92,246,0.3)"
          items={[
            'Event yang ditangani banyak layanan',
            'Sistem microservice yang terdistribusi',
            'Toleransi kegagalan tinggi',
            'Volume pesan sangat besar',
          ]}
        />
      </div>
    </div>
  );
}

function UseCard({ title, color, border, items }) {
  return (
    <div style={{
      padding:'10px 12px',
      background:`rgba(${color2rgb(color)},0.07)`,
      border:`1px solid ${border}`,
      borderRadius:'8px',
    }}>
      <div style={{ fontSize:'0.75rem', fontWeight:600, color, marginBottom:'8px' }}>{title}:</div>
      {items.map((item, i) => (
        <div key={i} style={{
          display:'flex', gap:'6px', alignItems:'flex-start',
          fontSize:'0.72rem', color:'var(--text-secondary)',
          marginBottom:'4px',
        }}>
          <span style={{ color, fontWeight:700, flexShrink:0 }}>+</span>
          {item}
        </div>
      ))}
    </div>
  );
}

function color2rgb(cssVar) {
  const map = {
    'var(--blue-400)': '56,139,253',
    'var(--purple-400)': '163,113,247',
    'var(--green-400)': '86,211,100',
    'var(--red-400)': '248,81,73',
  };
  return map[cssVar] || '255,255,255';
}
