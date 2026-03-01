// API base URL - will be the Workers endpoint
const API_BASE_URL = import.meta.env.PROD
  ? 'https://magic-brush-api.your-subdomain.workers.dev'
  : 'http://localhost:8787';

/**
 * Save HTML to R2 storage via Workers API
 */
export async function saveHtml(uuid: string, html: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/save-html`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uuid, html }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save HTML: ${response.statusText}`);
  }
}

/**
 * Fetch HTML from R2 storage via Workers API
 */
export async function fetchHtml(uuid: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/preview/${uuid}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch HTML: ${response.statusText}`);
  }

  return response.text();
}

/**
 * Message type for conversation history
 */
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/**
 * Save conversation history to R2 storage via Workers API
 */
export async function saveHistory(
  uuid: string,
  history: ConversationMessage[]
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/save-history`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uuid, history }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save history: ${response.statusText}`);
  }
}

/**
 * Fetch conversation history from R2 storage via Workers API
 */
export async function fetchHistory(
  uuid: string
): Promise<ConversationMessage[]> {
  const response = await fetch(`${API_BASE_URL}/api/history/${uuid}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch history: ${response.statusText}`);
  }

  return response.json();
}
