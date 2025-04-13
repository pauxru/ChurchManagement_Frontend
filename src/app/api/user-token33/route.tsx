import { getSession } from '@auth0/nextjs-auth0';

export async function GET(req: Request) {
  const session = await getSession(); // 👈 this works in API routes (Pages Router)

  if (!session || !session.accessToken) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ token: session.accessToken }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
