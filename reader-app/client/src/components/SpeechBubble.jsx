import LoadingState from './LoadingState';
import ErrorState from './ErrorState';

export default function SpeechBubble({ article, isLoading, error, onRetry }) {
  // Nothing to show yet
  if (!isLoading && !error && !article) {
    return (
      <div className="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
        <p>Paste a URL above to start reading</p>
      </div>
    );
  }

  return (
    <div className="speech-bubble" key={isLoading ? 'loading' : error ? 'error' : 'article'}>
      {isLoading && <LoadingState />}
      {error && !isLoading && <ErrorState message={error} onRetry={onRetry} />}
      {article && !isLoading && !error && (
        <>
          {article.paywall && (
            <div className="paywall-notice">
              <svg className="paywall-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <div>
                <p className="paywall-text">{article.paywall.message}</p>
                <p className="paywall-tip">
                  Try accessing via your school library or database subscriptions for full text.
                </p>
              </div>
            </div>
          )}
          <h1 className="bubble-title">{article.title}</h1>
          {article.byline && <p className="bubble-byline">{article.byline}</p>}
          <div className="bubble-meta-row">
            {article.siteName && (
              <span className="bubble-site-badge">{article.siteName}</span>
            )}
            {article.sourceUrl && (
              <a
                className="bubble-source-link"
                href={article.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View original
              </a>
            )}
          </div>
          <div
            className="bubble-content"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </>
      )}
    </div>
  );
}
