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

IMPORTANT CONTEXT HANDLING: 
When users ask for modifications like "second one", "third one", "free one", "alternative", "different one", they are referring to something from the conversation history. Look at the conversation history carefully:

- If they say "second one" and you previously listed options, they want the second option from that list
- If they say "free one" and previously discussed paid APIs, they want a free alternative in the same category
- If they say "alternative", they want a different API but for the same purpose
- ALWAYS maintain the topic/category context from previous messages
- Don't jump to unrelated topics (like going from schedulers to GitHub unless the context specifically relates to GitHub schedulers)

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
- For specific API requests → use "api" type
- For follow-up requests like "second one", "third one", "free one", "alternative" → use "api" type and CAREFULLY look at conversation history to understand what they're referring to
- When user asks for numbered options ("second one", "third one") → find the specific option from your previous response that matches that number
- When user asks for modifications (free, paid, different service) → maintain the exact topic context from conversation history
- Be friendly and helpful in conversation responses
- NO emojis in responses - keep text clean and professional
- Use proper formatting with line breaks for readability
- Keep responses concise but informative

EXAMPLES:

Input: "hi"
Output: {"type": "conversation", "response": "Hi there! I'm curl, your AI-powered API testing assistant. I can help you discover and test APIs, or chat about development topics. What can I help you with today?"}

Input: "what is REST API"
Output: {"type": "conversation", "response": "REST (Representational State Transfer) is an architectural style for designing web APIs. It uses standard HTTP methods like GET, POST, PUT, DELETE to interact with resources through URLs. REST APIs are stateless, meaning each request contains all the information needed to process it, and they typically return data in JSON format."}

Input: "get user profile data" 
Output: {"type": "api", "endpoint": "https://jsonplaceholder.typicode.com/users/1", "method": "GET", "headers": {}, "body": null, "description": "Get user profile information", "requiredAuth": {"type": "none", "description": "No authentication required", "mandatory": false, "instructions": "", "alternativeEndpoint": ""}, "missingInfo": []}

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
- Use numbered steps (1. 2. 3.) for clarity
- Include direct URLs to developer portals/documentation  
- Mention account creation if needed
- Specify where to find/generate the credentials
- Include any important notes about permissions or scopes

SMART URL PARAMETER HANDLING:
- For Airtable: Instead of asking for "Base ID" and "Table ID" separately, ask for "Airtable Base URL" and extract IDs from it
  Example: "https://api.airtable.com/v0/appXXXXXXXXXXXXXX/tblYYYYYYYYYYYYYY" contains both Base ID and Table ID
- For Notion: Ask for "Database URL" instead of just "Database ID"
- For Shopify: Ask for "Shop URL" instead of just "Shop domain"
- If URL contains all needed parameters, prefer asking for the URL and parsing it

URL PARSING GUIDELINES:
- If a service has a specific URL format, ask for the complete URL rather than individual parameters
- Parse URLs to extract needed components when possible
- Ask for individual parameters only when URL parsing isn't suitable
- Always provide clear examples of what format is expected

ENDPOINT REQUIREMENTS:
- Always include required query parameters in the endpoint URL
- For search APIs: include query, limit parameters
- For data APIs: include necessary filters and format parameters
- Make endpoints immediately functional with proper parameters
- Avoid incomplete base URLs that will cause 400 errors

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