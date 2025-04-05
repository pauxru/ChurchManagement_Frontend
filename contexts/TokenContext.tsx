"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { HOME_URL } from '../public/contants/global-variables';

interface TokenContextType {
  token: string | null;
  setToken: React.Dispatch<React.SetStateAction<string | null>>;
}

const TokenContext = createContext<TokenContextType | undefined>(undefined);

export const TokenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        console.log("Here at token provider");

        const res = await fetch(`/api/get-api-access-token`);
        
        if (!res.ok) {
          // Token verification failed on server
          const errorText = await res.text();
          console.error('Token verification failed:', errorText);
          alert('Failed to verify API access token');
          return;
        }

        const fetchedToken = await res.text();
        setToken(fetchedToken); // Only store valid token
        console.log("Token fetched and stored successfully");
      } catch (error) {
        console.error('Failed to fetch token:', error);
        alert('An error occurred while fetching API token');
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
