// app/contexts/AppWrapper.tsx
//import { UserProvider } from "@auth0/nextjs-auth0/";
import { Auth0Provider } from '@auth0/nextjs-auth0';

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  console.log("Auth0 UserProvider Initialized"); // Debugging log
  return <Auth0Provider>{children}</Auth0Provider>;
}