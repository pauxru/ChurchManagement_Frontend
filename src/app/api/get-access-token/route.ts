// app/api/auth/tokens/route.ts
import { auth0 } from "../../../lib/auth0";
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const session = await auth0.getSession(); // Pass the request object
    
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // For security, don't log full tokens in production
    console.log("Token exists:", !!session.accessToken);
    console.log("Token ID: ", session.idToken);
    
    return NextResponse.json(session.accessToken, {
      headers: {
        'Content-Type': 'text/plain'
      }
    });
    
  } catch (error) {
    console.error("Token error:", error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
