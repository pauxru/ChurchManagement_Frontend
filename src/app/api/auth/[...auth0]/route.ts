import { handleAuth, handleLogin } from '@auth0/nextjs-auth0';

export const GET = handleAuth({
    login: handleLogin({
      authorizationParams: {
        audience: 'https://localhost:5000/Churches/diocese', // 👈 your API identifier
        scope: 'openid profile email read:profile', // 👈 required scopes
      },
    }),
  });
export const POST = handleAuth();