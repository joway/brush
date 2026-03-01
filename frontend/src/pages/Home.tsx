import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { DesignAgent } from '../agents/DesignAgent';
import { saveHtml, saveHistory, ConversationMessage } from '../utils/api';
import {
  saveConfig,
  saveCurrentUuid,
  detectProvider,
  loadConfig,
  clearConfig,
} from '../utils/storage';

export default function Home() {
  const navigate = useNavigate();

  const [apiKey, setApiKey] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [hasStoredKey, setHasStoredKey] = useState(false);

  // Load API key from localStorage on mount
  useEffect(() => {
    const config = loadConfig();
    if (config) {
      setApiKey(config.apiKey);
      setHasStoredKey(true);
      setShowApiKeyInput(false);
    } else {
      setShowApiKeyInput(true);
    }
  }, []);

  const handleDesign = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your API key');
      return;
    }

    if (!description.trim()) {
      setError('Please describe your product');
      return;
    }

    setIsLoading(true);
    setError('');
    setProgress('Initializing AI agent...');

    try {
      // Detect provider from API key
      const provider = detectProvider(apiKey);

      // Save config to session storage
      saveConfig({ apiKey, provider });

      // Initialize Design Agent
      const agent = new DesignAgent({ provider, apiKey });

      setProgress('Generating product prototype...');

      // Generate prototype
      const html = await agent.generatePrototype(description, {
        onProgress: (chunk) => {
          // Show streaming progress
          if (chunk.includes('<!DOCTYPE') || chunk.includes('<html')) {
            setProgress('Building HTML structure...');
          } else if (chunk.includes('<style') || chunk.includes('class=')) {
            setProgress('Styling components...');
          } else if (chunk.includes('<script')) {
            setProgress('Adding interactivity...');
          }
        },
      });

      // Check if it's a rejection message
      if (
        html.includes('只能帮助设计产品原型') ||
        html.includes('can only help design product prototypes')
      ) {
        setError(html);
        setIsLoading(false);
        return;
      }

      // Generate UUID for this design
      const uuid = nanoid(10);

      setProgress('Saving prototype...');

      // Create initial conversation history
      const initialHistory: ConversationMessage[] = [
        {
          role: 'user',
          content: description,
          timestamp: new Date().toISOString(),
        },
        {
          role: 'assistant',
          content: 'Generated initial product prototype based on your description.',
          timestamp: new Date().toISOString(),
        },
      ];

      // Save HTML and history to R2
      await Promise.all([
        saveHtml(uuid, html),
        saveHistory(uuid, initialHistory),
      ]);

      // Save current UUID
      saveCurrentUuid(uuid);

      setProgress('Complete! Redirecting...');

      // Navigate to preview page
      setTimeout(() => {
        navigate(`/${uuid}`);
      }, 500);
    } catch (err) {
      console.error('Design error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to generate prototype. Please check your API key and try again.'
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-black/5 blur-3xl"></div>
      <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-black/5 blur-3xl"></div>

      <div className="mx-auto max-w-3xl px-5 py-16">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs text-[var(--ink-muted)] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-black/60"></span>
            Minimal AI Prototyping
          </div>
          <h1 className="mt-5 text-5xl font-semibold tracking-tight font-['Fraunces']">
            Magic Brush
          </h1>
          <p className="mt-4 text-lg text-[var(--ink-muted)]">
            Describe your product in a few lines. Get a clean, interactive prototype in seconds.
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl border border-[var(--border)] bg-white p-8 shadow-[var(--shadow)]">
          {/* API Key Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-[var(--ink)]">
                API Key (OpenAI or Claude)
              </label>
              {hasStoredKey && !showApiKeyInput && (
                <button
                  onClick={() => setShowApiKeyInput(true)}
                  className="text-[var(--ink-muted)] hover:text-[var(--ink)] text-xs underline"
                >
                  Change
                </button>
              )}
            </div>

            {/* Show stored key indicator or input */}
            {hasStoredKey && !showApiKeyInput ? (
              <div className="flex items-center gap-3 px-4 py-3 bg-[var(--paper-2)] border border-[var(--border)] rounded-xl">
                <svg
                  className="w-5 h-5 text-[var(--ink)] flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-[var(--ink)]">
                    API Key configured ({detectProvider(apiKey) === 'openai' ? 'OpenAI' : 'Claude'})
                  </p>
                  <p className="text-xs mt-0.5 text-[var(--ink-muted)]">
                    {apiKey.substring(0, 10)}...
                  </p>
                </div>
                <button
                  onClick={() => {
                    clearConfig();
                    setApiKey('');
                    setHasStoredKey(false);
                    setShowApiKeyInput(true);
                  }}
                  className="text-[var(--ink-muted)] hover:text-[var(--ink)] text-xs"
                  title="Remove API Key"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-4 py-3 bg-white border border-[var(--border)] rounded-xl text-[var(--ink)] placeholder-[var(--ink-muted)] focus:outline-none focus:ring-1 focus:ring-black/70 focus:border-black/60"
                  disabled={isLoading}
                />
                <p className="text-xs mt-1 text-[var(--ink-muted)]">
                  Stored locally in your browser only.
                </p>
              </>
            )}
          </div>

          {/* Product Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-[var(--ink)]">
              Product Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Example: A todo list app with drag-and-drop sorting, focus mode, and categories..."
              rows={6}
              className="w-full px-4 py-3 bg-white border border-[var(--border)] rounded-xl text-[var(--ink)] placeholder-[var(--ink-muted)] focus:outline-none focus:ring-1 focus:ring-black/70 focus:border-black/60 resize-none"
              disabled={isLoading}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-[var(--paper-2)] border border-[var(--border)] rounded-xl text-[var(--ink)] text-sm">
              {error}
            </div>
          )}

          {/* Progress */}
          {isLoading && (
            <div className="mb-6 p-4 bg-[var(--paper-2)] border border-[var(--border)] rounded-xl text-[var(--ink)] text-sm">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black/70 mr-3"></div>
                {progress}
              </div>
            </div>
          )}

          {/* Design Button */}
          <button
            onClick={handleDesign}
            disabled={isLoading}
            className="w-full bg-black/90 hover:bg-black text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 disabled:bg-black/20 disabled:text-black/40 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Designing...' : 'Design'}
          </button>
        </div>

        <div className="mt-8 grid gap-3 text-sm text-[var(--ink-muted)]">
          <div className="flex items-start gap-3">
            <span className="mt-1 h-2 w-2 rounded-full bg-black/70"></span>
            Works with OpenAI or Claude API keys.
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-1 h-2 w-2 rounded-full bg-black/70"></span>
            Your key stays local; no backend storage.
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-1 h-2 w-2 rounded-full bg-black/70"></span>
            Refine with chat-based iterations.
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 text-sm text-[var(--ink-muted)]">
          Powered by AI • Privacy-First • No Data Storage
        </div>
      </div>
    </div>
  );
}
