// app/api/some-data/route.ts

import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

export const GET = async function shows() {
  try {
    const session = await auth0.getSession();

    if (!session) {
      return new NextResponse("Not authenticated", { status: 401 });
    }

    const { token: accessToken } = await auth0.getAccessToken();
    //const { token: accessToken2 } = await auth0.getAccessTokenForConnection();

    if (!accessToken) {
      return new NextResponse("Access token not found", { status: 404 });
    }

    return new NextResponse(accessToken, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error) {
    console.error("Failed here:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
};
