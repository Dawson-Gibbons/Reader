import { useState, useCallback } from 'react';
import URLInput from './components/URLInput';
import SpeechBubble from './components/SpeechBubble';
import ThemeToggle from './components/ThemeToggle';
import { extractArticle } from './utils/api';
import './styles/bubble.css';

export default function App() {
  const [article, setArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async (url) => {
    setIsLoading(true);
    setError('');
    setArticle(null);

    try {
      const data = await extractArticle(url);
      setArticle(data);
    } catch (err) {
      setError(err.message || "Couldn't fetch that page. Try a different article.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRetry = useCallback(() => {
    setError('');
    setArticle(null);
  }, []);

  return (
    <>
      <header className="header">
        <div className="header-row">
          <h1>Reader</h1>
          <ThemeToggle />
        </div>
        <p>Paste a link. Read without distractions.</p>
      </header>

      <main>
        <URLInput onSubmit={handleSubmit} isLoading={isLoading} />
        <SpeechBubble
          article={article}
          isLoading={isLoading}
          error={error}
          onRetry={handleRetry}
        />
      </main>
    </>
  );
}
