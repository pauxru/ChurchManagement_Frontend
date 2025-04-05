// app/api/get-api-access-token/route.ts
import axios from 'axios';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

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
    const token = response.data.access_token;
    console.log(`TOKEN: ${token}`);

    // ✅ Set up JWKS client
    const client = jwksClient({
      jwksUri: 'https://dev-gzvq12kbzcc6n8au.us.auth0.com/.well-known/jwks.json',
    });

    // ✅ Extract header to find which key to use
    const decodedHeader = jwt.decode(token, { complete: true }) as { header: { kid: string } };
    if (!decodedHeader || !decodedHeader.header.kid) {
      throw new Error('Token header missing kid');
    }

    // ✅ Get signing key
    const key = await client.getSigningKey(decodedHeader.header.kid);
    const signingKey = key.getPublicKey();

    // ✅ Verify the token
    const verified = jwt.verify(token, signingKey, {
      audience: 'https://localhost:5000/Churches/diocese',
      issuer: 'https://dev-gzvq12kbzcc6n8au.us.auth0.com/',
      algorithms: ['RS256'],
    });

    console.log('✅ Token verified:', verified);

    return new Response(token); // return only if verified
  } catch (error) {
    console.error('❌ Error verifying access token:', error);
    return new Response('Failed to verify access token', { status: 401 });
  }
}
