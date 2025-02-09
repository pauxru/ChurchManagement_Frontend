import { NextApiRequest, NextApiResponse } from 'next';
import { handleLogin } from '@auth0/nextjs-auth0';

export default async function customLogin(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log('Here at customLogin');
    await handleLogin(req, res);
  } catch (error) {
    throw new Error(`Failed to login: ${error}`);
  }
}
