// app/contexts/AppWrapper.tsx
import { UserProvider } from "@auth0/nextjs-auth0/client";

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  console.log("Auth0 UserProvider Initialized"); // Debugging log
  return <UserProvider>{children}</UserProvider>;
}