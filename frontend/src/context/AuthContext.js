import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext(null);

/**
 * Custom hook to consume the AuthContext safely.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * AuthProvider component to wrap the application and manage login/logout state.
 */
export const AuthProvider = ({ children }) => {
  // Initialize state from localStorage to persist session across refreshes
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('jwt_token') || null);

  const [currentGardenId, setCurrentGardenId] = useState(() => {
    return localStorage.getItem('current_garden_id') || 'vuon-lan';
  });

  /**
   * Log the user in, updating state and persisting credentials.
   */
  const login = (userData, jwtToken) => {
    setUser(userData);
    setToken(jwtToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('jwt_token', jwtToken);

    if (userData && userData.gardenId) {
      setCurrentGardenId(userData.gardenId);
      localStorage.setItem('current_garden_id', userData.gardenId);
    } else {
      setCurrentGardenId('vuon-lan');
      localStorage.setItem('current_garden_id', 'vuon-lan');
    }
  };

  /**
   * Clear state and localStorage to log the user out.
   */
  const logout = () => {
    setUser(null);
    setToken(null);
    setCurrentGardenId('vuon-lan');
    localStorage.removeItem('user');
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('current_garden_id');
  };

  /**
   * Helper function to switch the active garden.
   */
  const updateGardenId = (gardenId) => {
    setCurrentGardenId(gardenId);
    localStorage.setItem('current_garden_id', gardenId);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        currentGardenId,
        setCurrentGardenId: updateGardenId,
        login,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
