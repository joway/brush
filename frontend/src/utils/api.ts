import { getAuthToken, StoredUser } from './storage';

// API base URL - will be the Workers endpoint
const API_BASE_URL = import.meta.env.PROD
  ? 'https://brush-api.elsetech.app'
  : 'http://localhost:8787';

const authHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Save HTML to R2 storage via Workers API
 */
export async function savePageHtml(
  uuid: string,
  html: string,
  metadata?: {
    name?: string;
    public?: boolean;
    createVersion?: boolean;
    versionNumber?: number;
  }
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/page/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ uuid, html, ...metadata }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save HTML: ${response.statusText}`);
  }
}

/**
 * Fetch HTML from R2 storage via Workers API
 */
export async function fetchPageHtml(uuid: string, version?: number): Promise<string> {
  const suffix = version ? `?version=${version}` : '';
  const response = await fetch(`${API_BASE_URL}/pages/${uuid}${suffix}`, {
    headers: {
      ...authHeaders(),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch HTML: ${response.statusText}`);
  }

  return response.text();
}

export function getPageEmbedUrl(uuid: string): string {
  return `${API_BASE_URL}/pages/${uuid}`;
}

/**
 * Message type for conversation history
 */
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  version?: number;
}

/**
 * Save conversation history to R2 storage via Workers API
 */
export async function savePageHistory(
  uuid: string,
  history: ConversationMessage[]
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/page/history`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
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
export async function fetchPageHistory(
  uuid: string
): Promise<ConversationMessage[]> {
  const response = await fetch(`${API_BASE_URL}/api/page/history/${uuid}`, {
    headers: {
      ...authHeaders(),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch history: ${response.statusText}`);
  }

  return response.json();
}

export async function requestEmailCode(email: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/request-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to send code');
  }
}

export async function verifyEmailCode(
  email: string,
  code: string,
  username?: string,
  mode?: 'signin' | 'signup'
): Promise<{ token: string; user: StoredUser }> {
  const response = await fetch(`${API_BASE_URL}/api/auth/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, username, mode }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to verify code');
  }

  return data as { token: string; user: StoredUser };
}

export async function fetchMe(): Promise<StoredUser> {
  const response = await fetch(`${API_BASE_URL}/api/me`, {
    headers: {
      ...authHeaders(),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.user) {
    throw new Error('Not authenticated');
  }

  return data.user as StoredUser;
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE_URL}/api/logout`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
    },
  });
}

export interface SquareItem {
  id: string;
  name: string;
  likes_count: number;
  updated_at: string;
  created_at: string;
  owner_username: string;
  liked?: boolean;
}

export async function fetchPages(
  sort: 'latest' | 'top' = 'latest',
  filter: 'public' | 'mine' = 'public'
): Promise<SquareItem[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/pages?sort=${sort}&filter=${filter}`,
    {
    headers: {
      ...authHeaders(),
    },
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch square');
  }
  return (data.items || []) as SquareItem[];
}

export interface PageMeta {
  id: string;
  name: string;
  public: boolean;
  likesCount: number;
  versionCount: number;
  createdAt: string;
  updatedAt: string;
  owner: { id: number; username: string };
  canEdit: boolean;
  canDelete: boolean;
  liked: boolean;
}

export async function fetchPageMeta(uuid: string): Promise<PageMeta> {
  const response = await fetch(`${API_BASE_URL}/api/page/${uuid}`, {
    headers: {
      ...authHeaders(),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch page');
  }
  return data as PageMeta;
}

export async function updatePageMeta(
  uuid: string,
  payload: { name?: string; public?: boolean }
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/page/${uuid}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to update page');
  }
}

export async function deletePage(uuid: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/page/${uuid}`, {
    method: 'DELETE',
    headers: {
      ...authHeaders(),
    },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete page');
  }
}

export async function togglePageLike(
  uuid: string
): Promise<{ liked: boolean; likesCount: number }> {
  const response = await fetch(`${API_BASE_URL}/api/page/${uuid}/like`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to toggle like');
  }
  return data as { liked: boolean; likesCount: number };
}

export async function downloadPageHtml(uuid: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/api/page/${uuid}/download`, {
    headers: {
      ...authHeaders(),
    },
  });
  if (!response.ok) {
    const data = await response.text().catch(() => '');
    throw new Error(data || 'Failed to download');
  }
  return response.blob();
}
