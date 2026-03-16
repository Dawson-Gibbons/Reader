export async function extractArticle(url) {
  const response = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'An unexpected error occurred.');
  }

  return data.data;
}
