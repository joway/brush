import { ConversationMessage } from '../utils/api';

interface ChatMessageProps {
  message: ConversationMessage;
  onSelectVersion?: (version: number) => void;
}

export default function ChatMessage({ message, onSelectVersion }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const time = new Date(message.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isVersionLink = !isUser && typeof message.version === 'number';

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={`max-w-[80%] ${
          isUser
            ? 'bg-black/90 text-white'
            : 'bg-[var(--paper-2)] text-[var(--ink)]'
        } rounded-2xl px-4 py-2 shadow-sm border border-[var(--border)] ${
          isVersionLink ? 'cursor-pointer hover:bg-white' : ''
        }`}
        onClick={() => {
          if (isVersionLink && onSelectVersion) {
            onSelectVersion(message.version as number);
          }
        }}
        title={isVersionLink ? `View version v${message.version}` : undefined}
      >
        {/* Message content */}
        <div className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </div>

        {/* Timestamp */}
        <div
          className={`text-xs mt-1 ${
            isUser ? 'text-white/70' : 'text-[var(--ink-muted)]'
          }`}
        >
          {time}
          {isVersionLink && (
            <span className="ml-2">v{message.version}</span>
          )}
        </div>
      </div>
    </div>
  );
}
