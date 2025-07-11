import { useState } from 'react';
import { useTheme } from './ThemeProvider';
import ResponseDisplay from "./ResponseDisplay";

interface ChatMessageProps {
  type: 'user' | 'discovery' | 'response' | 'error' | 'auth-request';
  content: any;
  timestamp: Date;
  onAuthSubmit?: (authData: any) => void;
  onAuthSkip?: () => void;
}

export default function ChatMessage({ type, content, timestamp, onAuthSubmit, onAuthSkip }: ChatMessageProps) {
  const { colors } = useTheme();
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  
  // Helper function to get method badge colors
  const getMethodBadgeColors = (method: string) => {
    const methodUpper = method.toUpperCase();
    switch (methodUpper) {
      case 'GET':
        return { bg: '#10B981', text: 'white' }; // Green
      case 'POST':
        return { bg: '#3B82F6', text: 'white' }; // Blue
      case 'PUT':
        return { bg: '#F59E0B', text: 'white' }; // Amber
      case 'PATCH':
        return { bg: '#8B5CF6', text: 'white' }; // Purple
      case 'DELETE':
        return { bg: '#EF4444', text: 'white' }; // Red
      default:
        return { bg: colors.textSecondary, text: 'white' }; // Gray for unknown methods
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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

  if (type === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div 
          className="max-w-[80%] px-4 py-3 rounded-2xl"
          style={{ 
            backgroundColor: colors.primary,
            color: 'white'
          }}
        >
          <p className="text-sm leading-relaxed">{content}</p>
        </div>
      </div>
    );
  }

  if (type === 'discovery') {
    const methodColors = getMethodBadgeColors(content.method);
    
    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-[90%] py-2">
          <div className="flex items-center mb-3">
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center mr-3"
              style={{ backgroundColor: colors.success }}
            >
              <i className="ri-search-line text-white text-xs"></i>
            </div>
            <h3 className="font-medium text-sm" style={{ color: colors.text }}>
              API Discovered
            </h3>
          </div>
          <p className="text-sm mb-3 leading-relaxed" style={{ color: colors.text }}>
            {content.description}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1 mr-2">
              {/* Method Badge */}
              <span 
                className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider"
                style={{ 
                  backgroundColor: methodColors.bg,
                  color: methodColors.text
                }}
              >
                {content.method}
              </span>
              {/* Endpoint */}
              <div 
                className="flex-1 text-sm font-mono rounded-lg px-3 py-2"
                style={{ 
                  backgroundColor: colors.surfaceHover,
                  color: colors.text
                }}
              >
                {content.endpoint}
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(`${content.method} ${content.endpoint}`, 'endpoint')}
              className="p-1.5 rounded text-xs transition-all duration-200 hover:scale-105 flex-shrink-0"
              style={{ 
                backgroundColor: copiedStates.endpoint ? colors.success + '20' : colors.surfaceHover,
                color: copiedStates.endpoint ? colors.success : colors.textSecondary
              }}
            >
              <i className={copiedStates.endpoint ? "ri-check-line" : "ri-file-copy-line"}></i>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'response') {
    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-[95%] w-full py-2">
          <div className="flex items-center mb-4">
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center mr-3"
              style={{ backgroundColor: colors.info }}
            >
              <i className="ri-radar-line text-white text-xs"></i>
            </div>
            <h3 className="font-medium text-sm" style={{ color: colors.text }}>
              Response
            </h3>
          </div>
          <ResponseDisplay response={content} isLoading={false} />
        </div>
      </div>
    );
  }

  if (type === 'error') {
    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-[90%] py-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center mr-3"
                style={{ backgroundColor: colors.error }}
              >
                <i className="ri-error-warning-line text-white text-xs"></i>
              </div>
              <h3 className="font-medium text-sm" style={{ color: colors.error }}>
                Error
              </h3>
            </div>
            <button
              onClick={() => copyToClipboard(content, 'error')}
              className="p-1.5 rounded text-xs transition-all duration-200 hover:scale-105"
              style={{ 
                backgroundColor: copiedStates.error ? colors.success + '20' : colors.surfaceHover,
                color: copiedStates.error ? colors.success : colors.textSecondary
              }}
            >
              <i className={copiedStates.error ? "ri-check-line" : "ri-file-copy-line"}></i>
            </button>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: colors.text }}>
            {content}
          </p>
        </div>
      </div>
    );
  }

  if (type === 'auth-request') {
    return <AuthRequestMessage 
      content={content} 
      timestamp={timestamp} 
      onAuthSubmit={onAuthSubmit}
      onAuthSkip={onAuthSkip}
    />;
  }

  return null;
}

// Separate component for auth request to keep it clean
function AuthRequestMessage({ content, timestamp, onAuthSubmit, onAuthSkip }: {
  content: any;
  timestamp: Date;
  onAuthSubmit?: (authData: any) => void;
  onAuthSkip?: () => void;
}) {
  const { colors } = useTheme();
  const [authData, setAuthData] = useState<any>({});
  const [customHeaders, setCustomHeaders] = useState<Record<string, string>>({});
  const [missingInfoData, setMissingInfoData] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(true);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Function to format instructions with clickable links
  const formatInstructions = (text: any) => {
    // Safety check: ensure text is a string
    if (!text || typeof text !== 'string') {
      return <span>No instructions available</span>;
    }
    
    // Split text into lines and process each line
    const lines = text.split('\n');
    
    return lines.map((line, lineIndex) => {
      // Check if line contains URLs
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const parts = line.split(urlRegex);
      
      return (
        <div key={lineIndex} className="mb-2 last:mb-0">
          {parts.map((part, partIndex) => {
            if (urlRegex.test(part)) {
              return (
                <a
                  key={partIndex}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline transition-all duration-200"
                  style={{ color: colors.primary }}
                >
                  {part}
                </a>
              );
            }
            return <span key={partIndex}>{part}</span>;
          })}
        </div>
      );
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAuthSubmit) {
      const submitData = {
        auth: content.requiredAuth.type !== 'none' ? {
          type: content.requiredAuth.type,
          ...authData
        } : null,
        headers: customHeaders,
        missingInfo: missingInfoData
      };
      onAuthSubmit(submitData);
      setShowForm(false);
    }
  };

  const handleSkip = () => {
    if (onAuthSkip) {
      onAuthSkip();
      setShowForm(false);
    }
  };

  const addCustomHeader = () => {
    const key = prompt('Header name:');
    const value = prompt('Header value:');
    if (key && value) {
      setCustomHeaders((prev: Record<string, string>) => ({ ...prev, [key]: value }));
    }
  };

  return (
    <div className="flex justify-start">
      <div className="max-w-[95%] w-full">
        <div 
          className="rounded-lg shadow-sm border px-4 py-4"
          style={{ 
            backgroundColor: colors.surface,
            borderColor: colors.warning
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center mr-2"
                style={{ backgroundColor: colors.warning }}
              >
                <i className="ri-key-line text-white text-xs"></i>
              </div>
              <div>
                <h3 className="font-medium text-sm" style={{ color: colors.text }}>
                  Authentication {content.requiredAuth.mandatory ? 'Required' : 'Recommended'}
                </h3>
                {!content.requiredAuth.mandatory && (
                  <p className="text-xs" style={{ color: colors.textSecondary }}>
                    Optional - you can continue without authentication
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs" style={{ color: colors.textSecondary }}>
              {formatTime(timestamp)}
            </p>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Auth type and description */}
              <div>
                <h4 className="font-medium text-sm mb-1" style={{ color: colors.text }}>
                  {content.requiredAuth.type === 'bearer' ? 'API Token' : 
                   content.requiredAuth.type === 'apikey' ? 'API Key' :
                   content.requiredAuth.type === 'basic' ? 'Basic Authentication' : 'Authentication'}
                </h4>
                <p className="text-xs mb-3" style={{ color: colors.textSecondary }}>
                  {content.requiredAuth.description}
                </p>

                {/* Instructions */}
                {content.requiredAuth.instructions && typeof content.requiredAuth.instructions === 'string' && content.requiredAuth.instructions.trim() && (
                  <div 
                    className="rounded-lg p-3 mb-3 border"
                    style={{ 
                      backgroundColor: colors.surfaceHover,
                      borderColor: colors.border
                    }}
                  >
                    <h5 className="font-medium text-xs mb-2" style={{ color: colors.text }}>
                      How to obtain:
                    </h5>
                    <div className="text-xs" style={{ color: colors.textSecondary }}>
                      {formatInstructions(content.requiredAuth.instructions)}
                    </div>
                  </div>
                )}
              </div>

              {/* Auth input fields - clearer labels */}
              {content.requiredAuth.type === 'bearer' && (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: colors.text }}>
                    API Token / Personal Access Token:
                  </label>
                  <input
                    type="text"
                    placeholder="Paste your API token here"
                    className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                    style={{ 
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text
                    }}
                    onChange={(e) => setAuthData((prev: any) => ({ ...prev, token: e.target.value }))}
                  />
                  <p className="text-xs mt-1 opacity-75" style={{ color: colors.textSecondary }}>
                    This will be sent as a Bearer token in the Authorization header
                  </p>
                </div>
              )}

              {content.requiredAuth.type === 'apikey' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: colors.text }}>
                      API Key:
                    </label>
                    <input
                      type="text"
                      placeholder="Paste your API key here"
                      className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                      style={{ 
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.text
                      }}
                      onChange={(e) => setAuthData((prev: any) => ({ ...prev, token: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: colors.text }}>
                      Header Name (optional):
                    </label>
                    <input
                      type="text"
                      placeholder="Default: X-API-Key"
                      className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                      style={{ 
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.text
                      }}
                      onChange={(e) => setAuthData((prev: any) => ({ ...prev, headerName: e.target.value }))}
                    />
                    <p className="text-xs mt-1 opacity-75" style={{ color: colors.textSecondary }}>
                      Some APIs use custom header names like 'X-RapidAPI-Key'
                    </p>
                  </div>
                </div>
              )}

              {content.requiredAuth.type === 'basic' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: colors.text }}>
                      Username:
                    </label>
                    <input
                      type="text"
                      placeholder="Enter username"
                      className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                      style={{ 
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.text
                      }}
                      onChange={(e) => setAuthData((prev: any) => ({ ...prev, username: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: colors.text }}>
                      Password:
                    </label>
                    <input
                      type="password"
                      placeholder="Enter password"
                      className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                      style={{ 
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.text
                      }}
                      onChange={(e) => setAuthData((prev: any) => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {/* Missing Info Fields - improved labels */}
              {content.missingInfo && content.missingInfo.length > 0 && (
                <div className="space-y-3">
                  <h5 className="font-medium text-xs" style={{ color: colors.text }}>
                    Required Information:
                  </h5>
                  {content.missingInfo.map((info: string, index: number) => (
                    <div key={index}>
                      <label className="block text-xs font-medium mb-1" style={{ color: colors.text }}>
                        {info}:
                      </label>
                      <input
                        type="text"
                        placeholder={
                          info.toLowerCase().includes('url') ? 
                            `Paste the full ${info.toLowerCase()} here` :
                            `Enter ${info.toLowerCase()}`
                        }
                        className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                        style={{ 
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                          color: colors.text
                        }}
                        onChange={(e) => setMissingInfoData((prev) => ({ ...prev, [info]: e.target.value }))}
                      />
                      {info.toLowerCase().includes('airtable') && info.toLowerCase().includes('url') && (
                        <p className="text-xs mt-1 opacity-75" style={{ color: colors.textSecondary }}>
                          Example: https://api.airtable.com/v0/appXXXXXXXXXXXXXX/tblYYYYYYYYYYYYYY
                        </p>
                      )}
                      {info.toLowerCase().includes('notion') && info.toLowerCase().includes('url') && (
                        <p className="text-xs mt-1 opacity-75" style={{ color: colors.textSecondary }}>
                          Example: https://api.notion.com/v1/databases/abc-123-def-456
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Action buttons - compact */}
              <div className="flex space-x-2 pt-2">
                {!content.requiredAuth.mandatory && onAuthSkip && (
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="px-3 py-1.5 text-xs rounded-lg border transition-colors"
                    style={{ 
                      borderColor: colors.border,
                      color: colors.textSecondary,
                      backgroundColor: colors.background
                    }}
                  >
                    Skip
                  </button>
                )}
                
                <button
                  type="submit"
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg transition-colors"
                  style={{ 
                    backgroundColor: colors.primary,
                    color: 'white'
                  }}
                >
                  Continue
                </button>
              </div>
            </form>
          )}

          {!showForm && (
            <div 
              className="text-center py-3 rounded-lg"
              style={{ backgroundColor: colors.surfaceHover }}
            >
              <p className="text-sm" style={{ color: colors.success }}>
                ✓ Authentication handled
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 