import React, { createContext, useState, useContext } from 'react';

// Create the application context
const AppContext = createContext(null);

/**
 * Custom hook to consume the AppContext easily.
 * Throws an error if used outside of AppContextProvider.
 */
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppContextProvider');
  }
  return context;
};

/**
 * AppContextProvider component that wraps the application
 * and provides state and actions related to user authentication and garden context.
 */
export const AppContextProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [currentGardenId, setCurrentGardenId] = useState(null);

  /**
   * Helper function to handle user login.
   * Sets user information and updates authentication state.
   * @param {Object} userData - Information about the logged-in user.
   */
  const login = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    // If the user has a preferred garden, set it as active
    if (userData && userData.gardenId) {
      setCurrentGardenId(userData.gardenId);
    }
  };

  /**
   * Helper function to handle user logout.
   * Resets authentication state, user, and current garden ID.
   */
  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setCurrentGardenId(null);
  };

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        setIsAuthenticated,
        user,
        setUser,
        currentGardenId,
        setCurrentGardenId,
        login,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
