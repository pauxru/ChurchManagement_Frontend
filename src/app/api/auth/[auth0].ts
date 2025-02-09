// // pages/api/auth/[auth0].js
// import { handleAuth, handleLogin } from '@auth0/nextjs-auth0';

// export default handleAuth({
//   login: handleLogin({
//     authorizationParams: {
//       audience: 'https://localhost:5000/Churches/diocese', // or AUTH0_AUDIENCE
//       // Add the `offline_access` scope to also get a Refresh Token
//       scope: 'openid profile ' // or AUTH0_SCOPE
//     }
//   })
// });