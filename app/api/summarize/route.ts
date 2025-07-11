import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const { responseData, endpoint, method, status } = await request.json();

    if (!process.env.CLAUDE_API_KEY) {
      return NextResponse.json(
        { error: 'Claude API key not configured' },
        { status: 500 }
      );
    }

    const prompt = `You are an API response summarizer. Given an API response, provide a clear, concise, and user-friendly summary.

API Details:
- Endpoint: ${method} ${endpoint}
- Status: ${status}

Response Data:
${typeof responseData === 'object' ? JSON.stringify(responseData, null, 2) : responseData}

Please provide a summary that:
1. Explains what the API returned in simple terms
2. Highlights the most important/interesting data points
3. Is conversational and easy to understand
4. Is 2-3 sentences maximum
5. Avoids technical jargon when possible

Focus on making the response accessible to both technical and non-technical users.

IMPORTANT: Respond with ONLY the summary text, no additional formatting or explanations.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const summaryText = message.content[0]?.type === 'text' ? message.content[0].text : '';
    
    return NextResponse.json({ summary: summaryText.trim() });

  } catch (error: any) {
    console.error('Error summarizing response:', error);
    return NextResponse.json(
      { error: 'Failed to summarize response', details: error.message },
      { status: 500 }
    );
  }
} 