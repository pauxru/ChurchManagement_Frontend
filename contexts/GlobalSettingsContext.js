// context/GlobalSettingsContext.js
import { createContext, useContext, useState } from 'react';

const GlobalSettingsContext = createContext();

export const GlobalSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    theme: 'light',
    language: 'en',
  });

  return (
    <GlobalSettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </GlobalSettingsContext.Provider>
  );
};

export const useGlobalSettings = () => useContext(GlobalSettingsContext);