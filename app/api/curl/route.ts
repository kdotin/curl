import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { endpoint, method, headers, body, auth } = await request.json();

    // Prepare headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'curl-interface/1.0',
      ...headers
    };

    // Add authentication if provided
    if (auth) {
      if (auth.type === 'bearer') {
        requestHeaders['Authorization'] = `Bearer ${auth.token}`;
      } else if (auth.type === 'apikey') {
        if (auth.headerName) {
          requestHeaders[auth.headerName] = auth.token;
        } else {
          requestHeaders['X-API-Key'] = auth.token;
        }
      } else if (auth.type === 'basic') {
        const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
        requestHeaders['Authorization'] = `Basic ${credentials}`;
      }
    }

    const startTime = Date.now();

    // Make the actual request
    const response = await fetch(endpoint, {
      method: method.toUpperCase(),
      headers: requestHeaders,
      body: method.toUpperCase() !== 'GET' && body ? JSON.stringify(body) : undefined,
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Get response data
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    // Format the curl command that was executed
    const curlCommand = formatCurlCommand(endpoint, method, requestHeaders, body);

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
      responseTime,
      curlCommand,
      size: responseText.length
    });

  } catch (error: any) {
    console.error('Error executing curl request:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to execute curl request', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

function formatCurlCommand(
  endpoint: string, 
  method: string, 
  headers: Record<string, string>, 
  body?: any
): string {
  let curl = `curl -X ${method.toUpperCase()} "${endpoint}"`;
  
  // Add headers
  for (const [key, value] of Object.entries(headers)) {
    curl += ` \\\n  -H "${key}: ${value}"`;
  }
  
  // Add body if present
  if (body && method.toUpperCase() !== 'GET') {
    curl += ` \\\n  -d '${JSON.stringify(body)}'`;
  }
  
  return curl;
} 