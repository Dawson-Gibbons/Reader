export default function LoadingState() {
  return (
    <div className="loading-container">
      <p className="loading-text">Fetching article...</p>
      <div className="skeleton-line skeleton-title" />
      <div className="skeleton-line skeleton-short" />
      <div className="skeleton-line skeleton-long" />
      <div className="skeleton-line skeleton-long" />
      <div className="skeleton-line skeleton-medium" />
      <div className="skeleton-line skeleton-long" />
      <div className="skeleton-line skeleton-short" />
    </div>
  );
}
