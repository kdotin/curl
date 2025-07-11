import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!process.env.CLAUDE_API_KEY) {
      return NextResponse.json(
        { error: 'Claude API key not configured' },
        { status: 500 }
      );
    }

    const prompt = `You are an API discovery assistant. Given a natural language request about curling an API, determine the exact API endpoint, HTTP method, required headers, and parameters.

User request: "${query}"

Please respond with a JSON object containing:
{
  "endpoint": "full URL of the API endpoint",
  "method": "GET/POST/PUT/DELETE",
  "headers": {
    "required headers as key-value pairs"
  },
  "body": "request body if needed (for POST/PUT)",
  "description": "brief description of what this API call does",
  "requiredAuth": {
    "type": "bearer/apikey/basic/none",
    "description": "what authentication is needed - use consistent terminology",
    "mandatory": true/false,
    "instructions": "step-by-step instructions on how to obtain this authentication",
    "alternativeEndpoint": "optional unauthenticated endpoint if auth is not mandatory"
  },
  "missingInfo": ["array of specific information needed from user"]
}

IMPORTANT AUTHENTICATION GUIDELINES:
- For APIs that use Personal Access Tokens (PATs), Bearer tokens, or API tokens, always use "bearer" type
- Use clear, consistent terminology: "Personal Access Token" or "API Token" (not both "bearer" and "PAT")
- For header-based API keys (like X-API-Key), use "apikey" type

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

SPECIFIC API EXAMPLES:
- "curl google ads for keyword policy check" → Google Ads API keyword policy endpoint
- "get user profile from github" → GitHub API user profile endpoint  
- "get airtable records" → should ask for "Airtable Base URL" in missingInfo
- "post new tweet" → Twitter API tweet creation endpoint

Focus on finding real, working API endpoints. If the URL contains placeholders or requires specific IDs/domains, prefer asking for full URLs when possible.

For authentication instructions, provide direct links to official documentation.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
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
    
    // Try to parse the JSON response from Claude
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const apiInfo = JSON.parse(jsonMatch[0]);
      return NextResponse.json(apiInfo);
    } else {
      return NextResponse.json({
        error: 'Could not parse API information from response',
        rawResponse: responseText
      });
    }

  } catch (error: any) {
    console.error('Error discovering API endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to discover API endpoint', details: error.message },
      { status: 500 }
    );
  }
} 