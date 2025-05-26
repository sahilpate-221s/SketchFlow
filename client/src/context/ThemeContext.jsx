import React, { createContext } from 'react';

const ThemeContext = createContext('default-theme');

export const ThemeProvider = ({ children }) => {
  const theme = 'default-theme';

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
