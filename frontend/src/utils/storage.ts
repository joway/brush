// Storage utilities for managing API keys and session data in browser

const STORAGE_KEYS = {
  API_KEY: 'magic_brush_api_key',
  PROVIDER: 'magic_brush_provider',
  CURRENT_UUID: 'magic_brush_current_uuid',
} as const;

export interface StoredConfig {
  apiKey: string;
  provider: 'openai' | 'claude';
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
 * Detect provider from API key format
 */
export function detectProvider(apiKey: string): 'openai' | 'claude' {
  if (apiKey.startsWith('sk-ant-')) {
    return 'claude';
  }
  return 'openai'; // Default to OpenAI
}
