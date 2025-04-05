"use client"
//context/TokenContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

interface TokenContextType {
  token: string | null;
  setToken: React.Dispatch<React.SetStateAction<string | null>>;
}

const TokenContext = createContext<TokenContextType | undefined>(undefined);

export const TokenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);

  // Fetch token on mount and update context state
  useEffect(() => {
    const fetchToken = async () => {
      try {
        console.log("Here at token provider")
        const res = await fetch('http://localhost:3000/api/get-api-access-token');
        const fetchedToken = await res.text();
        setToken(fetchedToken);  // Store token in context state
      } catch (error) {
        console.error('Failed to fetch token', error);
      }
    };

    fetchToken();
  }, []);

  return (
    <TokenContext.Provider value={{ token, setToken }}>
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
