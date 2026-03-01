import { ConversationMessage } from '../utils/api';

interface ChatMessageProps {
  message: ConversationMessage;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const time = new Date(message.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={`max-w-[80%] ${
          isUser
            ? 'bg-black/90 text-white'
            : 'bg-[var(--paper-2)] text-[var(--ink)]'
        } rounded-2xl px-4 py-2 shadow-sm border border-[var(--border)]`}
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
        </div>
      </div>
    </div>
  );
}
