import { getAccessToken, getSession, withApiAuthRequired } from '@auth0/nextjs-auth0';

// For Server Components
export async function getAuth0Session() {
    console.log("Here at 0");
  try{
    const session = await getSession();

  if (!session) return null;

  return {
    idToken: session.idToken,
    accessToken: session.accessToken,
    user: session.user
  };
}catch (error){
    console.log("Here at ERROR: ",error);
}
}

// For Route Handlers
export async function getAuth0Tokens(req: Request) {
  try{
  //const { accessToken } = await getAccessToken();
  const session = await getSession();
  
  if (!session) return null;
  console.log("Here at AccessToken: ",session.accessToken);
  console.log("Here at IDToken: ",session.idToken);
  console.log("Here at User: ",session.user);
  return {
    idToken: session.idToken,
    accessToken: session.accessToken,
    user: session.user
  };
}catch (error){
  console.log("Here at ERROR: ",error);
} 
}

export const auth0Required = withApiAuthRequired;