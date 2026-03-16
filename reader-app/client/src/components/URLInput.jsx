import { useState } from 'react';

export default function URLInput({ onSubmit, isLoading }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const validate = (value) => {
    if (!value.trim()) return 'Please enter a valid URL.';
    if (!value.startsWith('http://') && !value.startsWith('https://')) {
      return 'URL must start with http:// or https://';
    }
    try {
      new URL(value);
    } catch {
      return 'Please enter a valid URL.';
    }
    return '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationError = validate(url);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    onSubmit(url);
  };

  const handleChange = (e) => {
    setUrl(e.target.value);
    if (error) setError('');
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="url-input-container">
        <input
          type="text"
          className={`url-input${error ? ' input-error' : ''}`}
          placeholder="Paste an article URL here..."
          value={url}
          onChange={handleChange}
          disabled={isLoading}
          autoFocus
        />
        <button type="submit" className="read-btn" disabled={isLoading}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          {isLoading ? 'Reading...' : 'Read'}
        </button>
      </div>
      {error && <p className="validation-msg">{error}</p>}
    </form>
  );
}
