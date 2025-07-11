import { useState } from 'react';
import { useTheme } from './ThemeProvider';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  disabled: boolean;
  placeholder?: string;
}

export default function ChatInput({ onSubmit, disabled, placeholder = "Ask anything about APIs..." }: ChatInputProps) {
  const { colors } = useTheme();
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || disabled) return;
    
    onSubmit(message);
    setMessage("");
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
      <div 
        className="flex items-center rounded-xl p-3 transition-all duration-200 focus-within:shadow-lg"
        style={{ 
          backgroundColor: colors.surface,
          boxShadow: `0 0 0 1px ${colors.border}20`
        }}
      >
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400"
          style={{ color: colors.text }}
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={disabled || !message.trim()}
          className="ml-2 p-2 transition-all duration-200 hover:scale-105 disabled:opacity-50"
          style={{ 
            color: disabled || !message.trim() ? colors.textSecondary : colors.primary
          }}
        >
          {disabled ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <i className="ri-terminal-fill text-base"></i>
          )}
        </button>
      </div>
    </form>
  );
} 