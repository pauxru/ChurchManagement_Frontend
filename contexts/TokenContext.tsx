"use client"
// context/TokenContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

interface TokenContextType {
  token: string | null;
  setToken: React.Dispatch<React.SetStateAction<string | null>>;
  fetchToken: () => Promise<void>; // Add a function to fetch token after login
}

const TokenContext = createContext<TokenContextType | undefined>(undefined);

export const TokenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);

  // Fetch token only when needed (e.g., after login)
  const fetchToken = async () => {
    try {
      console.log("Fetching token after login...");
      const res = await fetch(`/api/get-api-access-token`);
      const fetchedToken = await res.text();
      setToken(fetchedToken);  // Store token in context state
    } catch (error) {
      console.error('Failed to fetch token', error);
    }
  };

  return (
    <TokenContext.Provider value={{ token, setToken, fetchToken }}>
      {children}
    </TokenContext.Provider>
  );
};

export const useToken = (): TokenContextType => {
  const context = useContext(TokenContext);
  if (!context) {
    throw new Error('useToken must be used within a TokenProvider');
  }
  return context;
};
