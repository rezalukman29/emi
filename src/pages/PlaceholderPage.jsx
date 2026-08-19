export default function PlaceholderPage({ title }) {
  return (
    <>
      <h1 className="page-title">{title}</h1>
      <div className="card" style={{ padding: '56px 32px', textAlign: 'center' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{title}</p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>This feature will be available soon</p>
      </div>
    </>
  );
}
