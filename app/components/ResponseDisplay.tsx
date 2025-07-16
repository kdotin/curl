import { useState } from 'react';
import { useTheme } from './ThemeProvider';

interface CurlResponse {
  success: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  responseTime: number;
  curlCommand: string;
  size: number;
  error?: string;
  details?: string;
  conversational?: boolean;
  aiSummary?: string;
}

interface ResponseDisplayProps {
  response: CurlResponse | null;
  isLoading: boolean;
}

// Utility function to format markdown text
const formatMarkdownText = (text: string): React.ReactElement[] => {
  if (!text || typeof text !== 'string') {
    return [<span key="0">{text}</span>];
  }

  const parts: React.ReactElement[] = [];
  const lines = text.split('\n');

  lines.forEach((line, lineIndex) => {
    // Process each line for markdown formatting
    let remainingText = line;
    const lineParts: React.ReactElement[] = [];
    let partIndex = 0;

    // Process URLs first
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urlParts = remainingText.split(urlRegex);
    
    urlParts.forEach((part, urlIndex) => {
      if (urlRegex.test(part)) {
        lineParts.push(
          <a
            key={`${lineIndex}-url-${urlIndex}`}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline transition-all duration-200"
            style={{ color: 'inherit' }}
          >
            {part}
          </a>
        );
      } else {
        // Process markdown formatting in non-URL parts
        let textPart = part;
        const formattedParts: React.ReactElement[] = [];
        
        // Split by markdown patterns while preserving the delimiters
        const markdownRegex = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|___[^_]+___|__[^_]+__|_[^_]+_|\*[^*]+\*)/g;
        const segments = textPart.split(markdownRegex);
        
        segments.forEach((segment, segmentIndex) => {
          if (!segment) return;
          
          // Check what type of markdown this is
          if (segment.startsWith('***') && segment.endsWith('***')) {
            // Bold and italic
            const innerText = segment.slice(3, -3);
            formattedParts.push(
              <strong key={`${lineIndex}-${urlIndex}-${segmentIndex}`}>
                <em>{innerText}</em>
              </strong>
            );
          } else if (segment.startsWith('**') && segment.endsWith('**')) {
            // Bold
            const innerText = segment.slice(2, -2);
            formattedParts.push(
              <strong key={`${lineIndex}-${urlIndex}-${segmentIndex}`}>
                {innerText}
              </strong>
            );
          } else if (segment.startsWith('___') && segment.endsWith('___')) {
            // Bold (alternative syntax)
            const innerText = segment.slice(3, -3);
            formattedParts.push(
              <strong key={`${lineIndex}-${urlIndex}-${segmentIndex}`}>
                {innerText}
              </strong>
            );
          } else if (segment.startsWith('__') && segment.endsWith('__')) {
            // Bold (alternative syntax)
            const innerText = segment.slice(2, -2);
            formattedParts.push(
              <strong key={`${lineIndex}-${urlIndex}-${segmentIndex}`}>
                {innerText}
              </strong>
            );
          } else if (segment.startsWith('_') && segment.endsWith('_')) {
            // Italic
            const innerText = segment.slice(1, -1);
            formattedParts.push(
              <em key={`${lineIndex}-${urlIndex}-${segmentIndex}`}>
                {innerText}
              </em>
            );
          } else if (segment.startsWith('*') && segment.endsWith('*')) {
            // Italic
            const innerText = segment.slice(1, -1);
            formattedParts.push(
              <em key={`${lineIndex}-${urlIndex}-${segmentIndex}`}>
                {innerText}
              </em>
            );
          } else {
            // Regular text
            formattedParts.push(
              <span key={`${lineIndex}-${urlIndex}-${segmentIndex}`}>
                {segment}
              </span>
            );
          }
        });
        
        lineParts.push(...formattedParts);
      }
    });

    // Add the line with a line break (except for the last line)
    parts.push(
      <div key={lineIndex} className="mb-2 last:mb-0">
        {lineParts}
      </div>
    );
  });

  return parts;
};

export default function ResponseDisplay({ response, isLoading }: ResponseDisplayProps) {
  const { colors } = useTheme();
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [headersCollapsed, setHeadersCollapsed] = useState(true); // Headers collapsed by default

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  if (isLoading) {
    return (
      <div 
        className="rounded-lg shadow-sm border p-4"
        style={{ 
          backgroundColor: colors.surface,
          borderColor: colors.border
        }}
      >
        <div className="flex items-center justify-center">
          <div 
            className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mr-3"
            style={{ borderColor: colors.primary }}
          ></div>
          <span className="text-sm" style={{ color: colors.textSecondary }}>
            Executing request...
          </span>
        </div>
      </div>
    );
  }

  if (!response) {
    return null;
  }

  // Handle conversational responses
  if (response.conversational) {
    return (
      <div className="py-2">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div 
              className="text-sm whitespace-pre-line leading-relaxed"
              style={{ color: colors.text }}
            >
              {formatMarkdownText(response.data)}
            </div>
          </div>
          <button
            onClick={() => copyToClipboard(response.data || '', 'conversation')}
            className="p-1.5 rounded text-xs transition-all duration-200 hover:scale-105 ml-3 flex-shrink-0"
            style={{ 
              backgroundColor: copiedStates.conversation ? colors.success + '20' : colors.surfaceHover,
              color: copiedStates.conversation ? colors.success : colors.textSecondary
            }}
          >
            <i className={copiedStates.conversation ? "ri-check-line" : "ri-file-copy-line"}></i>
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return colors.success;
    if (status >= 400 && status < 500) return colors.warning;
    if (status >= 500) return colors.error;
    return colors.info;
  };

  return (
    <div className="space-y-6">
      {/* AI Summary */}
      {response.aiSummary && (
        <div className="py-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium flex items-center" style={{ color: colors.text }}>
              <i className="ri-sparkles-line mr-2" style={{ color: colors.primary }}></i>
              AI Summary
            </h3>
            <button
              onClick={() => copyToClipboard(response.aiSummary || '', 'summary')}
              className="p-1.5 rounded text-xs transition-all duration-200 hover:scale-105"
              style={{ 
                backgroundColor: copiedStates.summary ? colors.success + '20' : colors.surfaceHover,
                color: copiedStates.summary ? colors.success : colors.textSecondary
              }}
            >
              <i className={copiedStates.summary ? "ri-check-line" : "ri-file-copy-line"}></i>
            </button>
          </div>
          <div 
            className="p-4 rounded-lg border-l-4"
            style={{ 
              backgroundColor: colors.primary + '10',
              borderLeftColor: colors.primary
            }}
          >
            <div className="text-sm leading-relaxed" style={{ color: colors.text }}>
              {formatMarkdownText(response.aiSummary)}
            </div>
          </div>
        </div>
      )}

      {/* Status and Metadata */}
      <div className="py-2">
        <div className="flex items-center space-x-4 mb-4">
          <span 
            className="px-3 py-1.5 rounded-lg text-white text-sm font-medium"
            style={{ backgroundColor: getStatusColor(response.status || 200) }}
          >
            {response.status || 200} {response.statusText || 'OK'}
          </span>
          <span className="text-sm" style={{ color: colors.textSecondary }}>
            {response.responseTime || 0}ms
          </span>
          <span className="text-sm" style={{ color: colors.textSecondary }}>
            {((response.size || 0) / 1024).toFixed(2)} KB
          </span>
        </div>

        {/* Error Display */}
        {response.error && (
          <div 
            className="p-4 rounded-lg mb-4"
            style={{ 
              backgroundColor: colors.surfaceHover,
            }}
          >
            <p className="font-medium text-sm mb-2" style={{ color: colors.error }}>Error:</p>
            <div className="text-sm leading-relaxed" style={{ color: colors.text }}>
              {formatMarkdownText(response.error)}
            </div>
            {response.details && (
              <div className="text-sm mt-2 leading-relaxed" style={{ color: colors.textSecondary }}>
                {formatMarkdownText(response.details)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Curl Command */}
      <div className="py-2">
        <div 
          className="flex items-center justify-between px-4 py-3 rounded-t-lg border"
          style={{ 
            backgroundColor: colors.surface,
            borderColor: colors.border
          }}
        >
          <h3 className="text-sm font-semibold flex items-center" style={{ color: colors.text }}>
            <i className="ri-terminal-line mr-2" style={{ color: colors.primary }}></i>
            Curl Command
          </h3>
          <button
            onClick={() => copyToClipboard(response.curlCommand || '', 'curl')}
            className="p-1.5 rounded text-xs transition-all duration-200 hover:scale-105"
            style={{ 
              backgroundColor: copiedStates.curl ? colors.success + '20' : colors.surfaceHover,
              color: copiedStates.curl ? colors.success : colors.textSecondary
            }}
          >
            <i className={copiedStates.curl ? "ri-check-line" : "ri-file-copy-line"}></i>
          </button>
        </div>
        <div 
          className="p-4 rounded-b-lg border border-t-0"
          style={{ 
            backgroundColor: colors.surfaceHover,
            borderColor: colors.border
          }}
        >
          <pre className="text-sm overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed" style={{ color: colors.text }}>
            {response.curlCommand || 'No curl command available'}
          </pre>
        </div>
      </div>

      {/* Response Headers */}
      <div className="py-2">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setHeadersCollapsed(!headersCollapsed)}
            className="flex items-center text-sm font-medium transition-all duration-200 hover:scale-105"
            style={{ color: colors.text }}
          >
            <i 
              className={`mr-2 transition-transform duration-200 ${headersCollapsed ? 'ri-arrow-right-s-line' : 'ri-arrow-down-s-line'}`}
              style={{ color: colors.textSecondary }}
            ></i>
            Response Headers ({Object.keys(response.headers || {}).length})
          </button>
          <button
            onClick={() => {
              const headersText = Object.entries(response.headers || {})
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n');
              copyToClipboard(headersText, 'headers');
            }}
            className="p-1.5 rounded text-xs transition-all duration-200 hover:scale-105"
            style={{ 
              backgroundColor: copiedStates.headers ? colors.success + '20' : colors.surfaceHover,
              color: copiedStates.headers ? colors.success : colors.textSecondary
            }}
          >
            <i className={copiedStates.headers ? "ri-check-line" : "ri-file-copy-line"}></i>
          </button>
        </div>
        {!headersCollapsed && (
          <div className="space-y-2">
            {Object.entries(response.headers || {}).map(([key, value]) => (
              <div key={key} className="flex text-sm">
                <span className="font-medium w-40 flex-shrink-0" style={{ color: colors.text }}>
                  {key}:
                </span>
                <span className="break-all leading-relaxed" style={{ color: colors.textSecondary }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Response Body */}
      <div className="py-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium" style={{ color: colors.text }}>
            Response Body
          </h3>
          <button
            onClick={() => {
              const bodyText = typeof response.data === 'object' 
                ? JSON.stringify(response.data, null, 2)
                : (response.data || 'No data available');
              copyToClipboard(bodyText, 'body');
            }}
            className="p-1.5 rounded text-xs transition-all duration-200 hover:scale-105"
            style={{ 
              backgroundColor: copiedStates.body ? colors.success + '20' : colors.surfaceHover,
              color: copiedStates.body ? colors.success : colors.textSecondary
            }}
          >
            <i className={copiedStates.body ? "ri-check-line" : "ri-file-copy-line"}></i>
          </button>
        </div>
        <div 
          className="p-4 rounded-lg max-h-96 overflow-y-auto scrollbar-hide"
          style={{ backgroundColor: colors.surfaceHover }}
        >
          <pre 
            className="text-sm whitespace-pre-wrap leading-relaxed" 
            style={{ 
              color: colors.text,
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
            }}
          >
            {typeof response.data === 'object' 
              ? JSON.stringify(response.data, null, 2)
              : (response.data || 'No data available')
            }
          </pre>
        </div>
      </div>
    </div>
  );
} 