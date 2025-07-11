import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const { query, conversationHistory } = await request.json();

    if (!process.env.CLAUDE_API_KEY) {
      return NextResponse.json(
        { error: 'Claude API key not configured' },
        { status: 500 }
      );
    }

    // Build conversation context from history
    let conversationContext = "";
    if (conversationHistory && conversationHistory.length > 0) {
      conversationContext = "\n\nCONVERSATION HISTORY:\n";
      conversationHistory.forEach((msg: any, index: number) => {
        if (msg.type === 'user') {
          conversationContext += `User: ${msg.content}\n`;
        } else if (msg.type === 'discovery') {
          conversationContext += `Assistant: Found API - ${msg.content.description} (${msg.content.method} ${msg.content.endpoint})\n`;
        } else if (msg.type === 'response' && msg.content.conversational) {
          conversationContext += `Assistant: ${msg.content.data}\n`;
        }
      });
      conversationContext += "\n";
    }

    const prompt = `You are an intelligent assistant that can handle both API discovery and general conversation.
${conversationContext}
Current user request: "${query}"

IMPORTANT: When users ask for modifications like "free one", "something free", "alternative", they want a different API of the SAME TYPE as their previous request. Look at the conversation history to understand the context:
- If previous request was about weather → find free weather API
- If previous request was about crypto → find free crypto API  
- If previous request was about social media → find free social media API
- If previous request was about stocks/finance → find free finance API

Analyze the request and determine if it's:
1. CONVERSATIONAL: greetings (hi, hello), general questions about concepts, non-API topics
2. API-RELATED: requests to test, call, fetch, or interact with specific APIs, modifications to previous requests, asking for alternatives (free, different, etc.)

ALWAYS respond with valid JSON in one of these formats:

For CONVERSATIONAL messages:
{
  "type": "conversation",
  "response": "Your friendly, helpful response here. Be conversational and natural."
}

For API-RELATED requests:
{
  "type": "api",
  "endpoint": "COMPLETE URL with ALL required query parameters",
  "method": "GET/POST/PUT/DELETE",
  "headers": {},
  "body": null,
  "description": "brief description of what this API call does",
  "requiredAuth": {
    "type": "none",
    "description": "No authentication required",
    "mandatory": false,
    "instructions": "",
    "alternativeEndpoint": ""
  },
  "missingInfo": []
}

CRITICAL RULES:
- ALWAYS return valid JSON
- NO text before or after the JSON
- For greetings like "hi", "hello", "hey" → use "conversation" type
- For general concept questions → use "conversation" type  
- For API requests like "get bitcoin price" → use "api" type
- For follow-up requests like "free one", "something free", "alternative", "different API" → use "api" type and find actual APIs OF THE SAME CATEGORY
- When user asks for modifications (free, paid, different service) → maintain the topic context and find alternatives in the same domain (weather stays weather, crypto stays crypto, etc.)
- Be friendly and helpful in conversation responses
- NO emojis in responses - keep text clean and professional
- Use proper formatting with line breaks for readability
- Keep responses concise but informative

EXAMPLES:

Input: "hi"
Output: {"type": "conversation", "response": "Hi there! I'm curl, your AI-powered API testing assistant. I can help you discover and test APIs, or chat about development topics. What can I help you with today?"}

Input: "get bitcoin price"  
Output: {"type": "api", "endpoint": "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd", "method": "GET", "headers": {}, "body": null, "description": "Get current Bitcoin price in USD", "requiredAuth": {"type": "none", "description": "No authentication required", "mandatory": false, "instructions": "", "alternativeEndpoint": ""}, "missingInfo": []}

Input: "find me something free" (after NSE India stock API request)
Output: {"type": "api", "endpoint": "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd", "method": "GET", "headers": {}, "body": null, "description": "Get free cryptocurrency prices - no API key required", "requiredAuth": {"type": "none", "description": "No authentication required", "mandatory": false, "instructions": "", "alternativeEndpoint": ""}, "missingInfo": []}

Input: "need a free one" (after weather request)  
Output: {"type": "api", "endpoint": "https://wttr.in/London?format=j1", "method": "GET", "headers": {}, "body": null, "description": "Free weather data for London - no API key required", "requiredAuth": {"type": "none", "description": "No authentication required", "mandatory": false, "instructions": "", "alternativeEndpoint": ""}, "missingInfo": []}

IMPORTANT AUTHENTICATION GUIDELINES:
- For APIs that use Personal Access Tokens (PATs), Bearer tokens, or API tokens, always use "bearer" type
- Use clear, consistent terminology: "Personal Access Token" or "API Token" (not both "bearer" and "PAT")
- For header-based API keys (like X-API-Key), use "apikey" type

AUTHENTICATION INSTRUCTIONS REQUIREMENTS:
- Provide step-by-step instructions with numbered steps
- Include direct URLs to developer portals/documentation
- Mention account creation if needed
- Specify where to find/generate the credentials
- Include any important notes about permissions or scopes

EXAMPLE QUALITY INSTRUCTIONS:
For GitHub: "1. Go to https://github.com/settings/tokens 2. Click 'Generate new token (classic)' 3. Select required scopes (public_repo for public repos) 4. Copy the generated token"
For Airtable: "1. Go to https://airtable.com/create/tokens 2. Click 'Create new token' 3. Add required scopes (data.records:read) 4. Add your base to the token 5. Copy the generated token"
For OpenAI: "1. Visit https://platform.openai.com/api-keys 2. Click 'Create new secret key' 3. Copy the key immediately (won't show again)"
For Twitter: "1. Apply for developer account at https://developer.twitter.com/ 2. Create a new app 3. Generate API keys in app settings 4. Copy Bearer Token"
For Google APIs: "1. Go to https://console.cloud.google.com/ 2. Create/select a project 3. Enable the specific API 4. Go to Credentials and create API key or OAuth client"

SMART URL PARAMETER HANDLING:
- For Airtable: Instead of asking for "Base ID" and "Table ID" separately, ask for "Airtable Base URL" and extract IDs from it
  Example: "https://api.airtable.com/v0/appXXXXXXXXXXXXXX/tblYYYYYYYYYYYYYY" contains both Base ID and Table ID
- For Notion: Ask for "Database URL" instead of just "Database ID"
- For Shopify: Ask for "Shop URL" instead of just "Shop domain"
- If URL contains all needed parameters, prefer asking for the URL and parsing it

URL PARSING EXAMPLES:
- Airtable URL "https://api.airtable.com/v0/appABC123/tblDEF456" → missingInfo: ["Airtable Base URL"]
- Notion URL "https://api.notion.com/v1/databases/abc-123" → missingInfo: ["Notion Database URL"]  
- Individual parameters only if URL doesn't contain them → missingInfo: ["Base ID", "Table ID"]

QUERY PARAMETERS HANDLING:
- ALWAYS include required query parameters in the endpoint URL
- For cryptocurrency APIs (Binance, CoinGecko): include symbol, interval, limit parameters
- For weather APIs: include location, API key parameters
- For search APIs: include query, limit parameters
- Make endpoints immediately functional, not incomplete base URLs

SPECIFIC API EXAMPLES:
- "bitcoin candle data" → "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=1"
- "get weather for London" → "https://api.openweathermap.org/data/2.5/weather?q=London&appid={API_KEY}"
- "get user profile from github" → "https://api.github.com/users/octocat"
- "get bitcoin price" → "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
- "get airtable records" → should ask for "Airtable Base URL" in missingInfo
- "post new tweet" → Twitter API tweet creation endpoint

CRITICAL: Always provide complete, working endpoint URLs with all required parameters. Do not return incomplete base URLs that will cause 400 errors.

INSTRUCTIONS QUALITY CHECKLIST:
- Always include direct clickable URLs to credential generation pages
- Use numbered steps (1. 2. 3.) for clarity
- Mention required permissions/scopes when relevant
- Include warnings about key security (don't share, regenerate if compromised)
- Be specific about where to find the credential in the UI (e.g., "Copy the generated token")`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract the text content from Claude's response
    const responseText = message.content[0]?.type === 'text' ? message.content[0].text : '';
    
    // Improved JSON extraction - find the first complete JSON object
    try {
      // Find the start of JSON
      const jsonStart = responseText.indexOf('{');
      if (jsonStart === -1) {
        throw new Error('No JSON object found in response');
      }

      // Extract JSON by counting braces to find the complete object
      let braceCount = 0;
      let jsonEnd = jsonStart;
      
      for (let i = jsonStart; i < responseText.length; i++) {
        if (responseText[i] === '{') {
          braceCount++;
        } else if (responseText[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            jsonEnd = i + 1;
            break;
          }
        }
      }

      if (braceCount !== 0) {
        throw new Error('Incomplete JSON object in response');
      }

      const jsonString = responseText.substring(jsonStart, jsonEnd);
      const result = JSON.parse(jsonString);
      
      // Validate the parsed object has required fields based on type
      if (result.type === 'conversation') {
        if (!result.response) {
          throw new Error('Invalid conversation response: missing response field');
        }
      } else if (result.type === 'api') {
        if (!result.endpoint || !result.method) {
          throw new Error('Invalid API info: missing required fields');
        }
      } else {
        throw new Error('Invalid response type: must be "conversation" or "api"');
      }
      
      return NextResponse.json(result);
      
    } catch (parseError: any) {
      console.error('JSON parsing failed:', parseError.message);
      console.error('Raw response:', responseText);
      
      return NextResponse.json({
        error: 'Could not parse API information from response',
        details: parseError.message,
        rawResponse: responseText.substring(0, 500) // Limit raw response length
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error discovering API endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to discover API endpoint', details: error.message },
      { status: 500 }
    );
  }
} 