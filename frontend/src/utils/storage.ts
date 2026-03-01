// Storage utilities for managing API keys and session data in browser

const STORAGE_KEYS = {
  API_KEY: 'magic_brush_api_key',
  PROVIDER: 'magic_brush_provider',
  CURRENT_UUID: 'magic_brush_current_uuid',
  AUTH_TOKEN: 'magic_brush_auth_token',
  USER: 'magic_brush_user',
  DRAFT_DESCRIPTION: 'magic_brush_draft_description',
} as const;

export interface StoredConfig {
  apiKey: string;
  provider: 'openai' | 'claude';
}

export interface StoredUser {
  id: number;
  email: string;
  username: string;
}

/**
 * Save API configuration to localStorage (persistent across sessions)
 */
export function saveConfig(config: StoredConfig): void {
  localStorage.setItem(STORAGE_KEYS.API_KEY, config.apiKey);
  localStorage.setItem(STORAGE_KEYS.PROVIDER, config.provider);
}

/**
 * Load API configuration from localStorage
 */
export function loadConfig(): StoredConfig | null {
  const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
  const provider = localStorage.getItem(STORAGE_KEYS.PROVIDER) as
    | 'openai'
    | 'claude'
    | null;

  if (!apiKey || !provider) {
    return null;
  }

  return { apiKey, provider };
}

/**
 * Clear API configuration from localStorage
 */
export function clearConfig(): void {
  localStorage.removeItem(STORAGE_KEYS.API_KEY);
  localStorage.removeItem(STORAGE_KEYS.PROVIDER);
}

/**
 * Save current UUID
 */
export function saveCurrentUuid(uuid: string): void {
  sessionStorage.setItem(STORAGE_KEYS.CURRENT_UUID, uuid);
}

/**
 * Load current UUID
 */
export function loadCurrentUuid(): string | null {
  return sessionStorage.getItem(STORAGE_KEYS.CURRENT_UUID);
}

/**
 * Clear current UUID
 */
export function clearCurrentUuid(): void {
  sessionStorage.removeItem(STORAGE_KEYS.CURRENT_UUID);
}

/**
 * Save auth token and user
 */
export function saveAuth(token: string, user: StoredUser): void {
  localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

/**
 * Load auth token and user
 */
export function loadAuth(): { token: string; user: StoredUser } | null {
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  const userRaw = localStorage.getItem(STORAGE_KEYS.USER);

  if (!token || !userRaw) {
    return null;
  }

  try {
    const user = JSON.parse(userRaw) as StoredUser;
    return { token, user };
  } catch {
    return null;
  }
}

/**
 * Get auth token only
 */
export function getAuthToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
}

/**
 * Get stored user only
 */
export function getStoredUser(): StoredUser | null {
  const userRaw = localStorage.getItem(STORAGE_KEYS.USER);
  if (!userRaw) {
    return null;
  }
  try {
    return JSON.parse(userRaw) as StoredUser;
  } catch {
    return null;
  }
}

/**
 * Clear auth token and user
 */
export function clearAuth(): void {
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
}

/**
 * Save draft product description
 */
export function saveDraftDescription(text: string): void {
  localStorage.setItem(STORAGE_KEYS.DRAFT_DESCRIPTION, text);
}

/**
 * Load draft product description
 */
export function loadDraftDescription(): string {
  return localStorage.getItem(STORAGE_KEYS.DRAFT_DESCRIPTION) || '';
}

/**
 * Clear draft product description
 */
export function clearDraftDescription(): void {
  localStorage.removeItem(STORAGE_KEYS.DRAFT_DESCRIPTION);
}

/**
 * Detect provider from API key format
 */
export function detectProvider(apiKey: string): 'openai' | 'claude' {
  if (apiKey.startsWith('sk-ant-')) {
    return 'claude';
  }
  return 'openai'; // Default to OpenAI
}
