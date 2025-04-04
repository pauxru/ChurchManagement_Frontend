import axios from 'axios';

export async function GET(req: Request) {
  console.log('Fetching access token from Auth0');
  
  const options = {
    method: 'POST',
    url: 'https://dev-gzvq12kbzcc6n8au.us.auth0.com/oauth/token',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    data: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: 'dmj6Lh0qF7KEZ849zklR2asGWxpt0zY3',
      client_secret: 'NYcz_NLA_7Bi0hmccPPnvIaXuNGin9PsI238g2ANNvWjK9s8V0WrUo0hHkvGk1wc',
      audience: 'https://localhost:5000/Churches/diocese',
    }),
    timeout: 10000,
  };

  try {
    const response = await axios.request(options);
    console.log(`TOKEN: ${response.data.access_token}`);
    
    return new Response(response.data.access_token); // ✅ Return only the token
  } catch (error) {
    console.error('Error fetching access token:', error);
    return new Response('Failed to fetch access token', { status: 500 });
  }
}
