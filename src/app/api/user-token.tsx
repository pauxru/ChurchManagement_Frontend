// pages/api/user-token.ts
import { getAccessToken } from '@auth0/nextjs-auth0';

export default async function handler(req: any, res: any) {
  try {
    const { accessToken } = await getAccessToken(req, res, {
      authorizationParams: {
        audience: 'https://localhost:5000/Churches/diocese',
        scope: 'openid profile email read:profile', // space-separated string
      },
    });

    res.status(200).json({ token: accessToken });
  } catch (error) {
    console.error('Failed to get access token:', error);
    res.status(500).json({ error: 'Token retrieval failed' });
  }
}
