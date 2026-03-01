import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DesignAgent } from '../agents/DesignAgent';
import {
  fetchHtml,
  saveHtml,
  fetchHistory,
  saveHistory,
  ConversationMessage,
} from '../utils/api';
import { loadConfig } from '../utils/storage';
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

      // Load HTML and conversation history in parallel
      const [content, history] = await Promise.all([
        fetchHtml(uuid),
        fetchHistory(uuid),
      ]);

      setHtml(content);
      setConversationHistory(history);
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

      // Add assistant response to history
      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        content: 'Updated the prototype based on your feedback.',
        timestamp: new Date().toISOString(),
      };

      const updatedHistory = [...conversationHistory, newUserMessage, assistantMessage];
      setConversationHistory(updatedHistory);

      // Save updated HTML and history
      if (uuid) {
        await Promise.all([
          saveHtml(uuid, updatedHtml),
          saveHistory(uuid, updatedHistory),
        ]);
      }

      // Update local state
      setHtml(updatedHtml);

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
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--paper)] text-[var(--ink)] flex-col lg:flex-row">
      {/* Left: Preview iframe */}
      <div className="flex-1 relative p-5">
        <div className="h-full w-full rounded-2xl border border-[var(--border)] bg-white shadow-[var(--shadow)] overflow-hidden">
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
            <button
              onClick={() => navigate('/')}
              className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] underline"
            >
              Back
            </button>
          </div>
          <p className="text-xs text-[var(--ink-muted)] mt-1">
            Keep iterating with focused instructions.
          </p>
        </div>

        {/* Chat content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Show welcome message if no history */}
          {conversationHistory.length === 0 && (
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

          {/* Display conversation history */}
          {conversationHistory.map((message, index) => (
            <ChatMessage key={index} message={message} />
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
            placeholder="Describe your changes..."
            rows={3}
            className="w-full px-3 py-2 bg-white border border-[var(--border)] rounded-xl text-[var(--ink)] placeholder-[var(--ink-muted)] focus:outline-none focus:ring-1 focus:ring-black/70 resize-none text-sm"
            disabled={isModifying}
          />
          <button
            onClick={handleModify}
            disabled={isModifying || !chatInput.trim()}
            className="w-full mt-2 bg-black/90 hover:bg-black disabled:bg-black/20 disabled:text-black/40 text-white py-2 rounded-xl transition-all disabled:cursor-not-allowed text-sm font-medium"
          >
            {isModifying ? 'Modifying...' : 'Apply Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
