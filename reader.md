# Reader — Article-to-Speech-Bubble Web App

## Spec Document

---

## 1. Overview

**Reader** is a web application that allows users to paste a URL (e.g., a news article, blog post, or any text-heavy webpage) into an input field. The app fetches the page, extracts the readable text content, and displays it inside a styled speech bubble for easy, distraction-free reading.

### Goals

- Provide a clean, minimal interface for reading web articles without ads, popups, or clutter.
- Extract article text faithfully — preserving paragraphs, headings, and basic structure.
- Present the content in a visually appealing speech bubble UI.
- Handle errors gracefully (blocked sites, invalid URLs, JS-rendered pages).
- Be fully buildable using **Claude Code** as the primary development tool.

---

## 2. User Flow

1. User opens the Reader app in their browser.
2. User pastes a URL into the input field (e.g., `https://www.reuters.com/some-article`).
3. User clicks the **"Read"** button (or presses Enter).
4. A loading spinner/skeleton appears inside the speech bubble area.
5. The backend fetches the URL, extracts the main article text, and returns it.
6. The frontend renders the extracted content inside a speech bubble.
7. User reads the article in a clean, styled format.
8. User can paste another URL to read a different article — the previous content is replaced.

### Error States

- **Invalid URL**: Inline validation message — "Please enter a valid URL."
- **Fetch failure** (site blocks request, timeout, 404, etc.): Speech bubble displays a friendly error — "Couldn't fetch that page. The site may be blocking automated requests. Try a different article."
- **No readable content found**: Speech bubble displays — "No article text found on that page. It may rely on JavaScript rendering."

---

## 3. Architecture

### High-Level Diagram

```
┌──────────────────────────────────┐
│           Frontend               │
│  (React or Vanilla HTML/CSS/JS)  │
│                                  │
│  ┌──────────────────────────┐    │
│  │  URL Input + Read Button │    │
│  └──────────┬───────────────┘    │
│             │ POST /api/extract  │
│  ┌──────────▼───────────────┐    │
│  │  Speech Bubble Display   │    │
│  │  (rendered article text) │    │
│  └──────────────────────────┘    │
└──────────────┬───────────────────┘
               │ HTTP
┌──────────────▼───────────────────┐
│           Backend                │
│  (Node.js + Express)             │
│                                  │
│  1. Validate incoming URL        │
│  2. Fetch HTML from URL          │
│  3. Parse with JSDOM             │
│  4. Extract with Readability     │
│  5. Sanitize output              │
│  6. Return JSON response         │
└──────────────────────────────────┘
```

### Tech Stack

| Layer      | Technology                                  | Purpose                                      |
|------------|---------------------------------------------|----------------------------------------------|
| Frontend   | React (Vite) **or** Vanilla HTML/CSS/JS     | UI, input handling, speech bubble rendering   |
| Backend    | Node.js + Express                           | API server, URL fetching, text extraction     |
| Parsing    | `jsdom`                                     | Create a DOM from fetched HTML               |
| Extraction | `@mozilla/readability`                      | Extract article content (title, body, byline)|
| Sanitization | `dompurify` (via `isomorphic-dompurify`)  | Prevent XSS from injected HTML               |
| HTTP Client| `axios`                                     | Fetch remote web pages                       |

---

## 4. Backend Specification

### 4.1 Project Setup

```bash
mkdir reader-app && cd reader-app
npm init -y
npm install express axios jsdom @mozilla/readability isomorphic-dompurify cors
```

### 4.2 API Endpoint

#### `POST /api/extract`

**Request Body:**

```json
{
  "url": "https://www.reuters.com/world/some-article-2025"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "title": "Article Headline Here",
    "byline": "By John Smith",
    "content": "<p>Sanitized HTML content of the article...</p>",
    "textContent": "Plain text version of the article...",
    "excerpt": "A short excerpt or description of the article.",
    "siteName": "Reuters",
    "length": 4523
  }
}
```

**Error Response (400 — bad input):**

```json
{
  "success": false,
  "error": "Invalid URL provided."
}
```

**Error Response (502 — fetch failure):**

```json
{
  "success": false,
  "error": "Could not fetch the provided URL. The site may be blocking automated requests."
}
```

**Error Response (422 — no content extracted):**

```json
{
  "success": false,
  "error": "No readable article content found on that page."
}
```

### 4.3 Backend Logic (Pseudocode)

```
function extractArticle(url):
    1. Validate URL format (must start with http:// or https://)
    2. Fetch the HTML:
        - Use axios.get(url) with a browser-like User-Agent header
        - Set a timeout of 10 seconds
        - Follow redirects (up to 5)
    3. Parse the HTML into a DOM:
        - Create a JSDOM instance from the fetched HTML
    4. Run Readability:
        - Instantiate new Readability(document)
        - Call .parse() to get title, byline, content, textContent, excerpt
    5. Check if extraction succeeded:
        - If parse() returns null or content is empty, return 422
    6. Sanitize the HTML content:
        - Run content through DOMPurify.sanitize()
        - Allow basic tags: p, h1-h6, a, strong, em, ul, ol, li, blockquote, img, figure, figcaption
        - Strip all event handlers, scripts, iframes
    7. Return the sanitized result as JSON
```

### 4.4 Request Headers for Fetching

Many sites block requests that don't look like a real browser. Use these headers:

```json
{
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate, br"
}
```

### 4.5 Rate Limiting & Security

- Apply rate limiting to `/api/extract` — max **10 requests per minute per IP** using `express-rate-limit`.
- Reject private/internal IPs to prevent SSRF attacks (block `127.0.0.1`, `10.x.x.x`, `192.168.x.x`, `169.254.x.x`, `::1`, etc.). Use a URL validation library or custom check before fetching.
- Set a maximum response size (e.g., 5MB) to prevent memory exhaustion from huge pages.
- Validate the Content-Type of the fetched response — only process `text/html` responses.

---

## 5. Frontend Specification

### 5.1 Pages & Layout

The app is a **single page** with three zones stacked vertically:

1. **Header** — App name ("Reader") and a one-line description.
2. **Input Area** — URL text input + "Read" button, centered.
3. **Speech Bubble Area** — Where extracted content appears.

### 5.2 Components

#### `URLInput`

- A text input with placeholder: `"Paste an article URL here..."`
- A submit button labeled **"Read"** with a book/reading icon.
- Basic client-side validation: check that the input starts with `http://` or `https://`.
- On submit, send `POST /api/extract` with the URL.
- Disable the button and show a loading state while the request is in flight.

#### `SpeechBubble`

- A rounded rectangle container with a triangular "tail" pointing to the input area (CSS-only triangle using `::after` pseudo-element).
- Displays:
  - **Article title** as an `<h1>` at the top of the bubble.
  - **Byline** (if available) in smaller, muted text below the title.
  - **Site name** as a subtle badge or label.
  - **Article body** as rendered HTML (sanitized on the backend).
- Scrollable if the content exceeds viewport height (`max-height` with `overflow-y: auto`).
- Smooth entrance animation (fade-in + slight slide-up) when content loads.

#### `LoadingState`

- Shown inside the speech bubble while fetching.
- Skeleton loader (pulsing gray rectangles mimicking a title + paragraph lines) **or** a simple spinner with the text "Fetching article..."

#### `ErrorState`

- Shown inside the speech bubble when an error occurs.
- Friendly message (from the backend error response) + an icon (warning triangle or similar).
- A "Try Again" prompt that clears the input and refocuses it.

### 5.3 Speech Bubble CSS

```css
.speech-bubble {
  position: relative;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  padding: 24px 32px;
  max-width: 720px;
  margin: 32px auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  animation: fadeSlideIn 0.4s ease-out;
}

.speech-bubble::after {
  content: '';
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 12px solid transparent;
  border-right: 12px solid transparent;
  border-bottom: 12px solid #ffffff;
  filter: drop-shadow(0 -2px 2px rgba(0, 0, 0, 0.04));
}

@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 5.4 Dark Mode Support

- Use CSS custom properties (`--bg-primary`, `--text-primary`, `--bubble-bg`, etc.).
- Toggle based on `prefers-color-scheme: dark` media query.
- Provide a manual toggle button in the header.

### 5.5 Responsive Design

- On mobile (< 640px): Speech bubble goes full-width with reduced padding.
- Input and button stack vertically on narrow screens.
- Font size adjusts for readability on small displays.

---

## 6. Detailed File Structure

```
reader-app/
├── server/
│   ├── index.js              # Express server entry point
│   ├── routes/
│   │   └── extract.js        # POST /api/extract route handler
│   ├── services/
│   │   └── articleExtractor.js  # URL fetching + Readability logic
│   ├── middleware/
│   │   ├── rateLimiter.js     # Rate limiting config
│   │   └── validateUrl.js     # URL validation + SSRF prevention
│   └── utils/
│       └── sanitize.js        # DOMPurify wrapper with allowed tags
│
├── client/
│   ├── index.html             # Entry HTML
│   ├── src/
│   │   ├── App.jsx            # Root component (if React)
│   │   ├── components/
│   │   │   ├── URLInput.jsx
│   │   │   ├── SpeechBubble.jsx
│   │   │   ├── LoadingState.jsx
│   │   │   ├── ErrorState.jsx
│   │   │   └── ThemeToggle.jsx
│   │   ├── styles/
│   │   │   ├── global.css     # CSS variables, resets, dark mode
│   │   │   └── bubble.css     # Speech bubble specific styles
│   │   └── utils/
│   │       └── api.js         # Fetch wrapper for /api/extract
│   │
│   └── public/
│       └── favicon.svg
│
├── package.json
├── .env                       # PORT, optional config
├── .gitignore
└── README.md
```

---

## 7. Implementation Steps (Claude Code Workflow)

These are the prompts/steps you would walk through with Claude Code to build this project end-to-end.

### Step 1 — Scaffold the project

> "Create a new Node.js project called reader-app with an Express backend and a React frontend (using Vite). Set up the folder structure with server/ and client/ directories. Add a root package.json with scripts to run both the server and client concurrently."

### Step 2 — Build the extraction service

> "In server/services/articleExtractor.js, create a function that takes a URL, fetches the HTML using axios with browser-like headers, parses it with JSDOM, runs @mozilla/readability to extract the article, and sanitizes the output with DOMPurify. Return the title, byline, content, textContent, excerpt, siteName, and content length."

### Step 3 — Create the API route

> "Create a POST /api/extract route in server/routes/extract.js. It should validate the URL, call the article extractor service, and return the result as JSON. Handle errors with appropriate status codes: 400 for bad URLs, 502 for fetch failures, 422 for pages with no extractable content."

### Step 4 — Add security middleware

> "Add rate limiting (10 req/min per IP) and SSRF protection (block private IPs) as Express middleware. Apply them to the /api/extract route."

### Step 5 — Build the frontend input component

> "Create a URLInput React component with a text input and a Read button. On submit, POST to /api/extract with the URL. Show a loading state while the request is pending. Validate that the URL starts with http:// or https:// before submitting."

### Step 6 — Build the speech bubble component

> "Create a SpeechBubble React component that receives the extracted article data as props. Display the title as an h1, byline below it, and the sanitized HTML body inside the bubble. Style it with a rounded white card, a CSS triangle pointer at the top, a subtle box shadow, and a fade-in animation. Make it scrollable if the content is long."

### Step 7 — Add error and loading states

> "Create LoadingState and ErrorState components. LoadingState shows a skeleton loader inside the speech bubble. ErrorState shows the error message with a warning icon and a Try Again action."

### Step 8 — Add dark mode

> "Add CSS custom properties for light and dark themes. Detect the user's system preference with prefers-color-scheme and add a manual toggle button in the header."

### Step 9 — Make it responsive

> "Make the layout responsive. On mobile, the speech bubble should be full-width, the input and button should stack vertically, and font sizes should adjust for readability."

### Step 10 — Test with real articles

> "Test the app with these URLs and fix any issues:
> - A Reuters article
> - A BBC News article
> - A Medium blog post
> - A Wikipedia page
> - A site that blocks scraping (to test error handling)"

---

## 8. Known Limitations & Future Enhancements

### Limitations

| Limitation | Explanation |
|---|---|
| **JavaScript-rendered sites** | Sites that load content via client-side JS (e.g., some SPAs) won't return article text with a simple HTTP fetch. Readability needs the HTML to already contain the content. |
| **Paywalled sites** | Articles behind paywalls will return partial content or login pages. |
| **Anti-scraping measures** | Some sites actively block non-browser requests. The browser-like User-Agent helps but isn't foolproof. |
| **Non-English content** | The app will work, but Readability's heuristics are primarily tuned for English-language article structures. |
| **Very long articles** | Extremely long articles may be slow to render and could hit the 5MB response size cap. |

### Future Enhancements

- **Puppeteer/Playwright fallback**: If the simple fetch + Readability approach fails, optionally spin up a headless browser to render the page first and then extract. This handles JS-rendered sites.
- **Reading mode options**: Let users adjust font size, font family, line spacing, and background color within the speech bubble.
- **Text-to-speech**: Add a "Listen" button that uses the Web Speech API to read the article aloud — leaning into the "speech bubble" metaphor.
- **History/bookmarks**: Save previously read articles in localStorage so users can return to them.
- **Share feature**: Generate a shareable link or copy a clean text version to clipboard.
- **Multiple bubbles**: Instead of replacing the bubble, stack multiple articles as a thread of speech bubbles, like a chat conversation.
- **Browser extension**: Package the extraction logic as a browser extension that overlays the speech bubble on any page.

---

## 9. Environment Variables

```env
PORT=3001                  # Backend server port
CLIENT_PORT=5173           # Vite dev server port (default)
MAX_FETCH_TIMEOUT=10000    # Max time to wait for a URL fetch (ms)
MAX_RESPONSE_SIZE=5242880  # Max HTML size to process (bytes, 5MB)
RATE_LIMIT_WINDOW=60000    # Rate limit window (ms)
RATE_LIMIT_MAX=10          # Max requests per window per IP
```

---

## 10. Dependencies

### Production

```json
{
  "express": "^4.18.x",
  "axios": "^1.6.x",
  "jsdom": "^24.x",
  "@mozilla/readability": "^0.5.x",
  "isomorphic-dompurify": "^2.x",
  "cors": "^2.8.x",
  "express-rate-limit": "^7.x"
}
```

### Development

```json
{
  "concurrently": "^8.x",
  "nodemon": "^3.x",
  "vite": "^5.x",
  "@vitejs/plugin-react": "^4.x",
  "react": "^18.x",
  "react-dom": "^18.x"
}
```

---

## 11. Summary

Reader is a focused, single-purpose app: paste a link, read the article in a clean speech bubble. The backend does the heavy lifting (fetching, parsing, extracting, sanitizing), while the frontend provides a minimal and polished reading experience. The entire project can be scaffolded, built, and iterated on using Claude Code by following the step-by-step workflow in Section 7.
