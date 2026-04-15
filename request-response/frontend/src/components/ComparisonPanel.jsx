export default function ComparisonPanel() {
  const rows = [
    { a: 'Model', r: 'Synchronous', p: 'Asynchronous' },
    { a: 'Coupling', r: 'Tight', p: 'Loose' },
    { a: 'Scaling', r: 'Direct 1:1', p: '1:Many (Broker)' },
    { a: 'Fault Tx', r: 'Fails immediately', p: 'Queue buffers' },
  ];
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
      <div className="section-header"><h3>COMPARISON</h3></div>
      <table className="table">
        <thead><tr><th>Aspect</th><th>Req-Res</th><th>Pub-Sub</th></tr></thead>
        <tbody>
          {rows.map((r,i) => <tr key={i}><td style={{color:'#fff'}}>{r.a}</td><td>{r.r}</td><td>{r.p}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}
