import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DesignAgent } from '../agents/DesignAgent';
import {
  fetchHtml,
  saveHtml,
  fetchHistory,
  saveHistory,
  ConversationMessage,
  fetchPrototypeMeta,
  updatePrototypeMeta,
  toggleLike,
  downloadPrototypeHtml,
  deletePrototype,
} from '../utils/api';
import { loadConfig, getStoredUser } from '../utils/storage';
import ChatMessage from '../components/ChatMessage';

export default function Preview() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();

  const [html, setHtml] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isModifying, setIsModifying] = useState(false);
  const [modifyProgress, setModifyProgress] = useState('');
  const [conversationHistory, setConversationHistory] = useState<
    ConversationMessage[]
  >([]);
  const [prototypeName, setPrototypeName] = useState('');
  const [nameDraft, setNameDraft] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [ownerName, setOwnerName] = useState('');
  const [versionCount, setVersionCount] = useState(0);
  const [canDelete, setCanDelete] = useState(false);
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [metaError, setMetaError] = useState('');

  const currentUser = getStoredUser();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const agentRef = useRef<DesignAgent | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load HTML on mount
  useEffect(() => {
    loadHtmlContent();
  }, [uuid]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversationHistory]);

  const loadHtmlContent = async () => {
    if (!uuid) {
      setError('Invalid UUID');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setMetaError('');

      const meta = await fetchPrototypeMeta(uuid);
      setPrototypeName(meta.name);
      setNameDraft(meta.name);
      setIsPublic(meta.public);
      setLikesCount(meta.likesCount);
      setLiked(meta.liked);
      setCanEdit(meta.canEdit);
      setCanDelete(meta.canDelete);
      setOwnerName(meta.owner.username);
      setVersionCount(meta.versionCount || 0);

      const content = await fetchHtml(uuid);
      setHtml(content);

      if (meta.public || meta.canEdit) {
        const history = await fetchHistory(uuid);
        setConversationHistory(history);
      } else {
        setConversationHistory([]);
      }

      setError('');
    } catch (err) {
      console.error('Failed to load HTML:', err);
      setError('Failed to load prototype. It may not exist.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModify = async () => {
    if (!chatInput.trim()) {
      return;
    }

    if (!canEdit) {
      setError('Only the owner can edit this prototype.');
      return;
    }

    // Check if we have API config
    const config = loadConfig();
    if (!config) {
      setError('API key not found. Please start from the home page.');
      return;
    }

    setIsModifying(true);
    setError('');
    setModifyProgress('Processing your request...');

    const userMessage = chatInput.trim();
    const userTimestamp = new Date().toISOString();

    try {
      // Add user message to history immediately
      const newUserMessage: ConversationMessage = {
        role: 'user',
        content: userMessage,
        timestamp: userTimestamp,
      };

      setConversationHistory((prev) => [...prev, newUserMessage]);
      setChatInput(''); // Clear input immediately

      // Initialize agent if needed
      if (!agentRef.current) {
        agentRef.current = new DesignAgent({
          provider: config.provider,
          apiKey: config.apiKey,
        });
      }

      setModifyProgress('Modifying prototype...');

      // Modify the prototype
      const updatedHtml = await agentRef.current.modifyPrototype(
        html,
        userMessage,
        {
          onProgress: (chunk) => {
            if (chunk.includes('<!DOCTYPE') || chunk.includes('<html')) {
              setModifyProgress('Updating HTML structure...');
            } else if (chunk.includes('<style') || chunk.includes('class=')) {
              setModifyProgress('Adjusting styles...');
            } else if (chunk.includes('<script')) {
              setModifyProgress('Updating interactions...');
            }
          },
        }
      );

      setModifyProgress('Saving changes...');

      const newVersion = versionCount + 1;

      // Add assistant response to history
      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        content: 'Updated the prototype based on your feedback.',
        timestamp: new Date().toISOString(),
        version: newVersion,
      };

      const updatedHistory = [...conversationHistory, newUserMessage, assistantMessage];
      setConversationHistory(updatedHistory);

      // Save updated HTML and history
      if (uuid) {
        await Promise.all([
          saveHtml(uuid, updatedHtml, {
            createVersion: true,
            versionNumber: newVersion,
          }),
          saveHistory(uuid, updatedHistory),
        ]);
      }

      // Update local state
      setHtml(updatedHtml);
      setVersionCount(newVersion);

      setModifyProgress('Done! Refreshing...');

      // Close loading state after short delay
      setTimeout(() => {
        setModifyProgress('');
        setIsModifying(false);

        // Refresh iframe
        if (iframeRef.current) {
          iframeRef.current.src = iframeRef.current.src;
        }
      }, 500);
    } catch (err) {
      console.error('Modify error:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to modify prototype'
      );
      setIsModifying(false);
      setModifyProgress('');
    }
  };

  const handleSaveMeta = async () => {
    if (!uuid || !canEdit) {
      return;
    }
    setIsSavingMeta(true);
    setMetaError('');
    try {
      await updatePrototypeMeta(uuid, { name: nameDraft, public: isPublic });
      setPrototypeName(nameDraft.trim() || prototypeName);
    } catch (err) {
      setMetaError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsSavingMeta(false);
    }
  };

  const handleToggleLike = async () => {
    if (!uuid) {
      return;
    }
    if (!currentUser) {
      setMetaError('Please sign in to like.');
      return;
    }
    try {
      const result = await toggleLike(uuid);
      setLiked(result.liked);
      setLikesCount(result.likesCount);
    } catch (err) {
      setMetaError(err instanceof Error ? err.message : 'Like failed');
    }
  };

  const handleDownload = async () => {
    if (!uuid) {
      return;
    }
    try {
      const blob = await downloadPrototypeHtml(uuid);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${(nameDraft || prototypeName || 'prototype').replace(/[^a-zA-Z0-9-_\\u4e00-\\u9fa5]+/g, '_')}.html`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMetaError(err instanceof Error ? err.message : 'Download failed');
    }
  };

  const handleDelete = async () => {
    if (!uuid || !canDelete) {
      return;
    }
    const confirmed = window.confirm(
      'Delete this prototype and all its history? This cannot be undone.'
    );
    if (!confirmed) {
      return;
    }
    try {
      await deletePrototype(uuid);
      navigate('/square');
    } catch (err) {
      setMetaError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleSelectVersion = async (version: number) => {
    if (!uuid) {
      return;
    }
    try {
      const content = await fetchHtml(uuid, version);
      setHtml(content);
      if (iframeRef.current) {
        iframeRef.current.srcdoc = content;
      }
    } catch (err) {
      setMetaError(err instanceof Error ? err.message : 'Failed to load version');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleModify();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--paper)] flex items-center justify-center">
        <div className="text-[var(--ink)] text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black/70 mx-auto mb-4"></div>
          <p>Loading prototype...</p>
        </div>
      </div>
    );
  }

  if (error && !html) {
    return (
      <div className="min-h-screen bg-[var(--paper)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-[var(--border)] rounded-2xl p-6 text-center shadow-[var(--shadow)]">
          <p className="text-[var(--ink)] mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-black/90 hover:bg-black text-white px-6 py-2 rounded-xl"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[var(--paper)] text-[var(--ink)] flex flex-col">
      <div className="border-b border-[var(--border)] bg-white/80 backdrop-blur">
        <div className="mx-auto w-full px-5 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-base font-semibold text-[var(--ink)]"
          >
            Magic Brush
          </button>
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={() => navigate('/')}
              className="text-[var(--ink-muted)] hover:text-[var(--ink)]"
            >
              Home
            </button>
            <button
              onClick={() => navigate('/square')}
              className="text-[var(--ink-muted)] hover:text-[var(--ink)]"
            >
              Square
            </button>
          </div>
        </div>
      </div>

    <div className="flex h-full w-full overflow-hidden bg-[var(--paper)] text-[var(--ink)] flex-col lg:flex-row">
      {/* Left: Preview iframe */}
      <div className="flex-1 relative p-5 flex flex-col">
        <div className="mb-4 flex flex-col gap-3">
          <div className="text-xs text-[var(--ink-muted)]">
            Owner: {ownerName || 'Unknown'}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                disabled={!canEdit}
                className="min-w-[220px] rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-[var(--ink)] text-sm focus:outline-none focus:ring-1 focus:ring-black/70 disabled:bg-[var(--paper-2)]"
              />
              {canEdit && (
                <label className="flex items-center gap-2 text-xs text-[var(--ink)]">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="h-4 w-4 accent-black"
                  />
                  Public
                </label>
              )}
              {canEdit && (
                <button
                  onClick={handleSaveMeta}
                  disabled={isSavingMeta}
                  className="rounded-xl bg-black/90 hover:bg-black text-white text-sm px-4 py-2 disabled:bg-black/20 disabled:text-black/40"
                >
                  Save
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleDownload}
                className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--ink)] hover:bg-[var(--paper-2)]"
              >
                Download HTML
              </button>
              {canDelete && (
                <button
                  onClick={handleDelete}
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 hover:bg-red-100"
                >
                  Delete
                </button>
              )}
              {isPublic && (
                <button
                  onClick={handleToggleLike}
                  className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--ink)] hover:bg-[var(--paper-2)]"
                >
                  {liked ? 'Liked' : 'Like'} · {likesCount}
                </button>
              )}
            </div>
          </div>
          {metaError && (
            <div className="text-xs text-[var(--ink-muted)]">{metaError}</div>
          )}
        </div>

        <div className="flex-1 h-full w-full rounded-2xl border border-[var(--border)] bg-white shadow-[var(--shadow)] overflow-hidden">
          <iframe
            ref={iframeRef}
            srcDoc={html}
            className="w-full h-full border-0"
            title="Product Prototype"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          />
        </div>
      </div>

      {/* Right: Chat sidebar (always visible) */}
      <div className="w-full lg:w-96 flex flex-col bg-white border-t lg:border-t-0 lg:border-l border-[var(--border)]">
        {/* Chat header */}
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center justify-between">
            <h2 className="text-[var(--ink)] font-semibold">Conversation</h2>
          </div>
          <p className="text-xs text-[var(--ink-muted)] mt-1">
            Keep iterating with focused instructions.
          </p>
        </div>

        {/* Chat content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Show welcome message if no history */}
          {conversationHistory.length === 0 && canEdit && (
            <div className="text-[var(--ink-muted)] text-sm mb-4">
              <p className="mb-2 text-[var(--ink)]">
                Describe what you'd like to change about the design:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs text-[var(--ink-muted)]">
                <li>Add or remove features</li>
                <li>Change colors or layout</li>
                <li>Modify text or content</li>
                <li>Adjust interactions</li>
              </ul>
            </div>
          )}
          {!canEdit && (
            <div className="mb-4 p-3 bg-[var(--paper-2)] border border-[var(--border)] rounded-xl text-[var(--ink)] text-sm">
              Only the owner can edit this prototype.
            </div>
          )}

          {/* Display conversation history */}
          {conversationHistory.map((message, index) => (
            <ChatMessage
              key={index}
              message={message}
              onSelectVersion={handleSelectVersion}
            />
          ))}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-[var(--paper-2)] border border-[var(--border)] rounded-xl text-[var(--ink)] text-sm">
              {error}
            </div>
          )}

          {/* Progress indicator */}
          {modifyProgress && (
            <div className="mb-4 p-3 bg-[var(--paper-2)] border border-[var(--border)] rounded-xl text-[var(--ink)] text-sm">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black/70 mr-2"></div>
                {modifyProgress}
              </div>
            </div>
          )}
        </div>

        {/* Chat input */}
        <div className="p-4 border-t border-[var(--border)]">
          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={canEdit ? 'Describe your changes...' : 'Only the owner can edit'}
            rows={3}
            className="w-full px-3 py-2 bg-white border border-[var(--border)] rounded-xl text-[var(--ink)] placeholder-[var(--ink-muted)] focus:outline-none focus:ring-1 focus:ring-black/70 resize-none text-sm"
            disabled={isModifying || !canEdit}
          />
          <button
            onClick={handleModify}
            disabled={isModifying || !chatInput.trim() || !canEdit}
            className="w-full mt-2 bg-black/90 hover:bg-black disabled:bg-black/20 disabled:text-black/40 text-white py-2 rounded-xl transition-all disabled:cursor-not-allowed text-sm font-medium"
          >
            {isModifying ? 'Modifying...' : 'Apply Changes'}
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}
