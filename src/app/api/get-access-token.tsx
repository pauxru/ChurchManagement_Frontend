// lib/getAccessToken.js
import axios from 'axios';
//import jwtDecode from 'jwt-decode'; // Install using `npm install jwt-decode`

// Original function to get access token using Client Credentials Flow
export async function getAccessToken() {
  console.log('Here at getAccessToken');
  const options = {
    method: 'POST',
    url: 'https://dev-gzvq12kbzcc6n8au.us.auth0.com/oauth/token',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    data: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: 'iKc7bpU4Wl7jkxrX438f3ldUk1p4a8VK',
      client_secret: 'dcYMowARH9H7AAP_fT3elUWkCKhv7yvdwZ4LJp2HcbkzvE4MQbr_QlKE7QR5eUg1',
      audience: 'https://localhost:5000/Churches/diocese',
    }),
  };

  try {
    const response = await axios.request(options);
    console.log(`TOKEN: ${response.data.access_token}`);
    return response.data.access_token;
  } catch (error) {
    console.error('Error fetching access token:', error);
    throw new Error('Failed to fetch access token');
  }
}

// New function to get ID token using Authorization Code Flow
// export async function getIdToken(code) {
//   const auth0Domain = 'dev-gzvq12kbzcc6n8au.us.auth0.com';
//   const clientId = 'iKc7bpU4Wl7jkxrX438f3ldUk1p4a8VK';
//   const clientSecret = 'dcYMowARH9H7AAP_fT3elUWkCKhv7yvdwZ4LJp2HcbkzvE4MQbr_QlKE7QR5eUg1';
//   const redirectUri = 'http://localhost:3000/callback'; // Must match the redirect URI used in the authorization request

//   const options = {
//     method: 'POST',
//     url: `https://${auth0Domain}/oauth/token`,
//     headers: { 'content-type': 'application/x-www-form-urlencoded' },
//     data: new URLSearchParams({
//       grant_type: 'authorization_code',
//       client_id: clientId,
//       client_secret: clientSecret,
//       code: code,
//       redirect_uri: redirectUri,
//     }),
//   };

//   try {
//     const response = await axios.request(options);
//     console.log('ID Token:', response.data.id_token);
//     return response.data.id_token; // The ID token
//   } catch (error) {
//     console.error('Error exchanging code for ID token:', error);
//     throw new Error('Failed to exchange code for ID token');
//   }
// }

// // Helper function to decode the ID token
// export function decodeIdToken(idToken) {
//   try {
//     const decoded = jwtDecode(idToken);
//     console.log('Decoded ID Token:', decoded);
//     return decoded;
//   } catch (error) {
//     console.error('Error decoding ID token:', error);
//     throw new Error('Failed to decode ID token');
//   }
// }