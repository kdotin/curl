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

IMPORTANT: Respond with ONLY a valid JSON object, no additional text before or after.

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

SPECIFIC API EXAMPLES:
- "curl google ads for keyword policy check" → Google Ads API keyword policy endpoint
- "get user profile from github" → GitHub API user profile endpoint  
- "get airtable records" → should ask for "Airtable Base URL" in missingInfo
- "post new tweet" → Twitter API tweet creation endpoint

Focus on finding real, working API endpoints. If the URL contains placeholders or requires specific IDs/domains, prefer asking for full URLs when possible.

INSTRUCTIONS QUALITY CHECKLIST:
- Always include direct clickable URLs to credential generation pages
- Use numbered steps (1. 2. 3.) for clarity
- Mention required permissions/scopes when relevant
- Include warnings about key security (don't share, regenerate if compromised)
- Be specific about where to find the credential in the UI (e.g., "Copy the generated token")`;

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
      const apiInfo = JSON.parse(jsonString);
      
      // Validate the parsed object has required fields
      if (!apiInfo.endpoint || !apiInfo.method) {
        throw new Error('Invalid API info: missing required fields');
      }
      
      return NextResponse.json(apiInfo);
      
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