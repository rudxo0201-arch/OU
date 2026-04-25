export default function DSPage() {
  return (
    <iframe
      src="/design-system-preview.html"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        border: 'none',
      }}
      title="OU Design System"
    />
  );
}
