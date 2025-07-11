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
}

interface ResponseDisplayProps {
  response: CurlResponse | null;
  isLoading: boolean;
}

export default function ResponseDisplay({ response, isLoading }: ResponseDisplayProps) {
  const { colors } = useTheme();
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

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
              {response.data}
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
            <p className="text-sm leading-relaxed" style={{ color: colors.text }}>{response.error}</p>
            {response.details && (
              <p className="text-sm mt-2 leading-relaxed" style={{ color: colors.textSecondary }}>{response.details}</p>
            )}
          </div>
        )}
      </div>

      {/* Curl Command */}
      <div className="py-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium" style={{ color: colors.text }}>
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
          className="p-4 rounded-lg"
          style={{ backgroundColor: colors.surfaceHover }}
        >
          <pre className="text-sm overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed" style={{ color: colors.text }}>
            {response.curlCommand || 'No curl command available'}
          </pre>
        </div>
      </div>

      {/* Response Headers */}
      <div className="py-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium" style={{ color: colors.text }}>
            Response Headers
          </h3>
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
          <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed" style={{ color: colors.text }}>
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