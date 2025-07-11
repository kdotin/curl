"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "./components/ThemeProvider";
import ThemeToggle from "./components/ThemeToggle";
import ChatMessage from "./components/ChatMessage";
import ChatInput from "./components/ChatInput";

interface ApiDiscoveryResult {
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  description: string;
  requiredAuth: {
    type: 'bearer' | 'apikey' | 'basic' | 'none';
    description: string;
    mandatory?: boolean;
    instructions?: string;
    alternativeEndpoint?: string;
  };
  missingInfo: string[];
}

interface ChatMessageData {
  id: string;
  type: 'user' | 'discovery' | 'response' | 'error' | 'auth-request';
  content: any;
  timestamp: Date;
}

export default function Home() {
  const { colors } = useTheme();
  const [message, setMessage] = useState("");
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isCurling, setIsCurling] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [discoveredApi, setDiscoveredApi] = useState<ApiDiscoveryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Chat state
  const [isChatMode, setIsChatMode] = useState(false);
  const [conversation, setConversation] = useState<ChatMessageData[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messageCounter = useRef<number>(0);



  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    const scrollToBottom = () => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    };

    // Multiple scroll attempts for reliability
    requestAnimationFrame(scrollToBottom);
    const timeoutId1 = setTimeout(scrollToBottom, 100);
    const timeoutId2 = setTimeout(scrollToBottom, 250);
    const timeoutId3 = setTimeout(scrollToBottom, 500);
    
    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
    };
  }, [conversation, isDiscovering, isCurling, isSummarizing]);

  const addMessage = (type: ChatMessageData['type'], content: any) => {
    messageCounter.current += 1;
    const newMessage: ChatMessageData = {
      id: `msg-${messageCounter.current}-${Date.now()}`,
      type,
      content,
      timestamp: new Date()
    };
    setConversation(prev => [...prev, newMessage]);
    
    // Multiple scroll attempts with different timings to ensure reliability
    const scrollToBottom = () => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    };
    
    // Immediate scroll
    requestAnimationFrame(scrollToBottom);
    
    // Delayed scrolls to handle dynamic content rendering
    setTimeout(scrollToBottom, 50);
    setTimeout(scrollToBottom, 150);
    setTimeout(scrollToBottom, 300);
  };

  const handleSubmit = async (inputMessage: string) => {
    if (!inputMessage.trim()) return;

    // Switch to chat mode after first message
    if (!isChatMode) {
      setIsChatMode(true);
    }

    // Add user message to conversation
    addMessage('user', inputMessage);

    // Remove old conversational check - now handled by AI

    setError(null);
    setIsDiscovering(true);
    setDiscoveredApi(null);

    try {
      // Step 1: Discover API endpoint using Claude
      const discoverResponse = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: inputMessage })
      });

      const result = await discoverResponse.json();
      
      if (!discoverResponse.ok) {
        throw new Error(result.error || 'Failed to process request');
      }

      setIsDiscovering(false);

      // Check if this is a conversational response or API discovery
      if (result.type === 'conversation') {
        // Handle conversational response
        addMessage('response', { 
          success: true, 
          status: 200,
          statusText: 'OK',
          headers: {},
          data: result.response,
          responseTime: 0,
          curlCommand: '',
          size: 0,
          conversational: true 
        });
        return;
      }

      // Handle API discovery response
      if (result.type === 'api') {
        const apiData = result;
        setDiscoveredApi(apiData);

        // Add discovery message to conversation
        addMessage('discovery', apiData);

              // Step 2: Check if authentication is needed
      if (apiData.requiredAuth.type !== 'none' || apiData.missingInfo.length > 0) {
        // Add auth request message to conversation
        addMessage('auth-request', { requiredAuth: apiData.requiredAuth, missingInfo: apiData.missingInfo });
        
        // Extra scroll for auth forms since they contain complex UI
        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
        }, 600);
        
        return;
      }

        // Step 3: Execute curl directly if no auth needed
        await executeCurl(apiData);
      }

    } catch (error: any) {
      setError(error.message);
      addMessage('error', error.message);
      setIsDiscovering(false);
    }
  };

  const executeCurl = async (apiData: ApiDiscoveryResult, authData?: any) => {
    setIsCurling(true);

    try {
      // If user skipped authentication and there's an alternative endpoint, use it
      let endpoint = (authData === null && apiData.requiredAuth.alternativeEndpoint) 
        ? apiData.requiredAuth.alternativeEndpoint 
        : apiData.endpoint;

      // Process missing info data to replace placeholders in endpoint
      if (authData?.missingInfo) {
        Object.entries(authData.missingInfo).forEach(([key, value]) => {
          if (value) {
            // Smart URL parsing for common APIs
            if (key.toLowerCase().includes('url')) {
              const urlValue = value as string;
              
              // Airtable URL parsing
              if (urlValue.includes('api.airtable.com/v0/')) {
                const airtableMatch = urlValue.match(/api\.airtable\.com\/v0\/([^\/]+)\/([^\/\?]+)/);
                if (airtableMatch) {
                  const [, baseId, tableId] = airtableMatch;
                  // Replace the endpoint with the parsed values
                  endpoint = endpoint.replace(/\/v0\/[^\/]*\/[^\/\?]*/, `/v0/${baseId}/${tableId}`);
                  return; // Skip the normal placeholder replacement
                }
              }
              
              // Notion URL parsing
              if (urlValue.includes('api.notion.com/v1/databases/')) {
                const notionMatch = urlValue.match(/api\.notion\.com\/v1\/databases\/([^\/\?]+)/);
                if (notionMatch) {
                  const [, databaseId] = notionMatch;
                  endpoint = endpoint.replace(/\/databases\/[^\/\?]*/, `/databases/${databaseId}`);
                  return;
                }
              }
              
              // Shopify URL parsing
              if (urlValue.includes('.myshopify.com')) {
                const shopifyMatch = urlValue.match(/https?:\/\/([^\.]+)\.myshopify\.com/);
                if (shopifyMatch) {
                  const [, shopDomain] = shopifyMatch;
                  endpoint = endpoint.replace('{shop}', shopDomain);
                  return;
                }
              }
            }
            
            // Standard placeholder replacement for non-URL fields
            const patterns = [
              `{${key}}`,
              `{${key.toLowerCase()}}`,
              `{${key.toUpperCase()}}`,
              `{baseId}`, // Legacy Airtable support
              `{tableId}`, // Legacy Airtable support
              `(baseId)`, // Alternative pattern
              `(tableId)`, // Alternative pattern
            ];
            
            patterns.forEach(pattern => {
              if (endpoint.includes(pattern)) {
                endpoint = endpoint.replace(pattern, value as string);
              }
            });

            // Legacy Airtable handling (for backwards compatibility)
            if (key === 'Base ID' && endpoint.includes('api.airtable.com')) {
              endpoint = endpoint.replace(/\/v0\/[^\/]*\//, `/v0/${value}/`);
            }
            if (key === 'Table ID' && endpoint.includes('api.airtable.com')) {
              endpoint = endpoint.replace(/\/v0\/[^\/]*\/[^\/]*$/, endpoint.split('/v0/')[1].split('/')[0] ? `/v0/${endpoint.split('/v0/')[1].split('/')[0]}/${value}` : `/v0/${value}/${value}`);
            }
          }
        });
      }

      const curlResponse = await fetch('/api/curl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint,
          method: apiData.method,
          headers: { ...apiData.headers, ...(authData?.headers || {}) },
          body: apiData.body,
          auth: authData?.auth || null
        })
      });

      const result = await curlResponse.json();
      
      // Generate AI summary of the response
      setIsSummarizing(true);
      let aiSummary = null;
      try {
        const summarizeResponse = await fetch('/api/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            responseData: result.data,
            endpoint,
            method: apiData.method,
            status: result.status
          })
        });
        
        if (summarizeResponse.ok) {
          const summaryData = await summarizeResponse.json();
          aiSummary = summaryData.summary;
        }
      } catch (summaryError) {
        console.error('Failed to generate summary:', summaryError);
        // Continue without summary if it fails
      } finally {
        setIsSummarizing(false);
      }
      
      // Add response to conversation with AI summary
      addMessage('response', { ...result, aiSummary });
      
    } catch (error: any) {
      const errorMsg = error.message;
      setError(errorMsg);
      addMessage('error', errorMsg);
    } finally {
      setIsCurling(false);
      setIsSummarizing(false);
    }
  };

  const handleAuthSubmit = (authData: any) => {
    if (discoveredApi) {
      executeCurl(discoveredApi, authData);
    }
  };

  const handleAuthSkip = () => {
    if (discoveredApi) {
      // Execute curl without authentication
      executeCurl(discoveredApi, null);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
  };

  const handleLogoClick = () => {
    // Reset chat state and return to home
    setIsChatMode(false);
    setConversation([]);
    setMessage("");
    setDiscoveredApi(null);
    setError(null);
    setIsDiscovering(false);
    setIsCurling(false);
    setIsSummarizing(false);
  };

  const isLoading = isDiscovering || isCurling || isSummarizing;

  // Landing page view (before first message)
  if (!isChatMode) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative"
        style={{ backgroundColor: colors.background }}
      >
        {/* Subtle Background Pattern */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, ${colors.text} 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }}
        ></div>
        {/* Theme Toggle */}
        <div className="absolute top-6 right-6 z-10">
          <ThemeToggle />
        </div>

        {/* Logo */}
        <div className="text-center mb-12 relative z-10">
          <div className="flex items-center justify-center mb-6">
            {/* Enhanced Typography */}
            <div className="flex flex-col">
              <h1 
                className="text-8xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r"
                style={{ 
                  backgroundImage: `linear-gradient(135deg, ${colors.text}, ${colors.primary})`,
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}
              >
                curl
              </h1>
            </div>
          </div>
          
          {/* Enhanced Tagline */}
          <div className="space-y-2">
            <p 
              className="text-xl font-medium"
              style={{ color: colors.text }}
            >
              Test API's with AI
            </p>
            <p 
              className="text-sm opacity-75 max-w-md mx-auto"
              style={{ color: colors.textSecondary }}
            >
              Describe any API in plain english and watch curl discover, authenticate, and test it automatically.
            </p>
          </div>
        </div>

        {/* Search Form */}
        <div className="w-full max-w-xl mb-8 relative z-10">
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(message); }}>
            <div 
              className="flex items-center rounded-xl shadow-sm border transition-all duration-200 focus-within:shadow-md"
              style={{ 
                backgroundColor: colors.surface,
                borderColor: colors.border
              }}
            >
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe the API you want to test or ask any question..."
                className="flex-1 px-4 py-3 bg-transparent outline-none text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400"
                style={{ 
                  color: colors.text
                }}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !message.trim()}
                className="m-1 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:scale-100"
                style={{ 
                  background: `linear-gradient(135deg, ${colors.text}, ${colors.primary})`,
                  color: 'white'
                }}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <i className="ri-terminal-fill"></i>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mb-8 relative z-10">
          {[
            { 
              icon: "ri-robot-line", 
              title: "AI-Powered Discovery", 
              description: "Describe APIs in plain English" 
            },
            { 
              icon: "ri-shield-check-line", 
              title: "Smart Authentication", 
              description: "Handles Bearer, API keys & Basic auth" 
            },
            { 
              icon: "ri-chat-3-line", 
              title: "Natural Language", 
              description: "No complex configurations needed" 
            },
            { 
              icon: "ri-flashlight-line", 
              title: "Real-time Testing", 
              description: "Instant API responses & debugging" 
            }
          ].map((feature, index) => (
            <div
              key={index}
              className="text-center p-4 rounded-xl transition-all duration-200 hover:scale-105"
              style={{ 
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`
              }}
            >
              <div 
                className="w-8 h-8 mx-auto mb-2 flex items-center justify-center rounded-lg"
                style={{ backgroundColor: colors.primary + '15' }}
              >
                <i 
                  className={`${feature.icon} text-lg`}
                  style={{ color: colors.primary }}
                ></i>
              </div>
              <h3 
                className="text-xs font-semibold mb-1"
                style={{ color: colors.text }}
              >
                {feature.title}
              </h3>
              <p 
                className="text-xs leading-tight"
                style={{ color: colors.textSecondary }}
              >
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Footer Disclaimer */}
        <div className="absolute bottom-4 left-4 right-4 text-center z-10">
          <p 
            className="text-xs opacity-50 max-w-2xl mx-auto"
            style={{ color: colors.textSecondary }}
          >
            Disclaimer: This tool makes requests to external APIs. Please ensure you have proper authorization and follow API terms of service. Use responsibly.
            <br />
            Made with passion by{' '}
            <a 
              href="https://x.com/kdotinx" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:no-underline transition-all duration-200"
              style={{ color: colors.primary }}
            >
              Krishna Moorthy
            </a>
          </p>
        </div>
      </div>
    );
  }

  // Chat mode view (after first message)
  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: colors.background }}
    >
      {/* Minimal Header */}
      <div className="px-6 py-4 flex items-center justify-between">
        <button 
          onClick={handleLogoClick}
          className="transition-all duration-200 hover:scale-105 cursor-pointer"
        >
          <h1 
            className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r"
            style={{ 
              backgroundImage: `linear-gradient(135deg, ${colors.text}, ${colors.primary})`,
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            curl
          </h1>
        </button>
        
        <ThemeToggle />
      </div>

      {/* Chat Messages Area */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto pb-32 scrollbar-hide"
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
          scrollBehavior: 'smooth'
        }}
      >
        <div className="max-w-3xl mx-auto px-6 py-4 space-y-6">
          {conversation.map((msg) => (
            <ChatMessage 
              key={msg.id}
              type={msg.type}
              content={msg.content}
              timestamp={msg.timestamp}
              onAuthSubmit={msg.type === 'auth-request' ? handleAuthSubmit : undefined}
              onAuthSkip={msg.type === 'auth-request' ? handleAuthSkip : undefined}
            />
          ))}
          
          {/* Loading states */}
          {isDiscovering && (
            <div className="flex justify-start">
              <div className="flex items-center py-2">
                <div 
                  className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin mr-3"
                  style={{ borderColor: colors.primary }}
                ></div>
                <span className="text-sm" style={{ color: colors.textSecondary }}>
                  Thinking...
                </span>
              </div>
            </div>
          )}
          
          {isCurling && (
            <div className="flex justify-start">
              <div className="flex items-center py-2">
                <div 
                  className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin mr-3"
                  style={{ borderColor: colors.primary }}
                ></div>
                <span className="text-sm" style={{ color: colors.textSecondary }}>
                  Executing request...
                </span>
              </div>
            </div>
          )}
          
          {isSummarizing && (
            <div className="flex justify-start">
              <div className="flex items-center py-2">
                <div 
                  className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin mr-3"
                  style={{ borderColor: colors.primary }}
                ></div>
                <span className="text-sm" style={{ color: colors.textSecondary }}>
                  Generating AI summary...
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Chat Input at Bottom */}
      <div 
        className="fixed bottom-0 left-0 right-0 px-6 py-4"
        style={{ backgroundColor: colors.background }}
      >
        <ChatInput 
          onSubmit={handleSubmit}
          disabled={isLoading}
          placeholder="Ask for another API or modify the current one..."
        />
        {/* Disclaimer */}
        <div className="text-center mt-3">
          <p 
            className="text-xs opacity-50 max-w-2xl mx-auto"
            style={{ color: colors.textSecondary }}
          >
            Disclaimer: This tool makes requests to external APIs. Please ensure you have proper authorization and follow API terms of service. Use responsibly.
            <br />
            Made with passion by{' '}
            <a 
              href="https://x.com/kdotinx" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:no-underline transition-all duration-200"
              style={{ color: colors.primary }}
            >
              Krishna Moorthy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
