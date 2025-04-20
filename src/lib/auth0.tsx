
import { Auth0Client } from "@auth0/nextjs-auth0/server";

// Initialize the Auth0 client 
export const auth0 = new Auth0Client({
  // Options are loaded from environment variables by default
  // Ensure necessary environment variables are properly set
  domain: "dev-gzvq12kbzcc6n8au.us.auth0.com",
  clientId: "iKc7bpU4Wl7jkxrX438f3ldUk1p4a8VK",
  clientSecret: "dcYMowARH9H7AAP_fT3elUWkCKhv7yvdwZ4LJp2HcbkzvE4MQbr_QlKE7QR5eUg1",
  appBaseUrl: "https://www.pawadtech.com",
  secret: "grytrye45ytryytyty65ytythstyry5434trrts",
  authorizationParameters: {
    // In v4, the AUTH0_SCOPE and AUTH0_AUDIENCE environment variables are no longer automatically picked up by the SDK.
    // Instead, we need to provide the values explicitly.
    audience: 'https://localhost:5000/Churches/diocese', // 👈 your API identifier
    scope: 'openid profile email read:profile', // 👈 required scopes
  }
});
