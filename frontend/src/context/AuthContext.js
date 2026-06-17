import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [userRole, setUserRole] = useState(() => {
    return localStorage.getItem('user_role') || null;
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('jwt_token') || null;
  });

  const [gardens, setGardens] = useState(() => {
    try {
      const saved = localStorage.getItem('user_gardens');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [currentGardenId, setCurrentGardenId] = useState(() => {
    return localStorage.getItem('current_garden_id') || '';
  });

  // Session integrity check
  useEffect(() => {
    if (token && !userRole) {
      console.warn('[AuthContext] Corrupted session detected. Clearing...');
      logout();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isAuthenticated = !!token && !!userRole;

  // Refresh gardens list from server dynamically on load/refresh
  useEffect(() => {
    if (isAuthenticated && user?.email) {
      const refreshGardens = async () => {
        try {
          const endpoint = userRole === 'ADMIN' 
            ? 'http://localhost:8080/api/admin/devices'
            : `http://localhost:8080/api/garden/my-gardens?email=${user.email}`;
          
          const response = await fetch(endpoint, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          if (response.ok) {
            const data = await response.json();
            setGardens(data);
            localStorage.setItem('user_gardens', JSON.stringify(data));
            
            if (data.length > 0) {
              const ids = data.map(g => (g.deviceId || g.id).toString());
              if (!currentGardenId || !ids.includes(currentGardenId.toString())) {
                const firstId = (data[0].deviceId || data[0].id).toString();
                setCurrentGardenId(firstId);
                localStorage.setItem('current_garden_id', firstId);
              }
            } else {
              setCurrentGardenId('');
              localStorage.removeItem('current_garden_id');
            }
          }
        } catch (err) {
          console.error("Failed to refresh user gardens list from server:", err);
        }
      };
      refreshGardens();
    }
  }, [isAuthenticated, user?.email, userRole, currentGardenId, token]);

  // LOGIN — authenticates via Spring Boot backend Auth API
  const login = async (email, password) => {
    try {
      const response = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Email hoặc mật khẩu không chính xác!');
      }

      const data = await response.json();
      
      const userData = {
        email: data.email,
        name: data.name,
        role: data.role,
      };

      // Retrieve device lists right away to configure initial layout
      let userGardens = [];
      let defaultGardenId = '';
      try {
        const endpoint = data.role === 'ADMIN' 
          ? 'http://localhost:8080/api/admin/devices'
          : `http://localhost:8080/api/garden/my-gardens?email=${data.email}`;
        
        const gardensRes = await fetch(endpoint, {
          headers: { 'Authorization': `Bearer ${data.token}` }
        });
        if (gardensRes.ok) {
          userGardens = await gardensRes.json();
          if (userGardens.length > 0) {
            defaultGardenId = (userGardens[0].deviceId || userGardens[0].id).toString();
          }
        }
      } catch (err) {
        console.error("Failed to fetch user gardens list during login process:", err);
      }

      // Persist to state
      setUser(userData);
      setUserRole(data.role);
      setToken(data.token);
      setGardens(userGardens);
      setCurrentGardenId(defaultGardenId);

      // Persist to localStorage
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('user_role', data.role);
      localStorage.setItem('jwt_token', data.token);
      localStorage.setItem('user_gardens', JSON.stringify(userGardens));
      if (defaultGardenId) {
        localStorage.setItem('current_garden_id', defaultGardenId);
      } else {
        localStorage.removeItem('current_garden_id');
      }

      return data.role;
    } catch (error) {
      console.error('[AuthContext] Login error details:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setUserRole(null);
    setToken(null);
    setGardens([]);
    setCurrentGardenId('');

    localStorage.removeItem('user');
    localStorage.removeItem('user_role');
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_gardens');
    localStorage.removeItem('current_garden_id');
  };

  const updateGardenId = (gardenId) => {
    const idStr = gardenId ? gardenId.toString() : '';
    setCurrentGardenId(idStr);
    localStorage.setItem('current_garden_id', idStr);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        token,
        gardens,
        isAuthenticated,
        currentGardenId,
        login,
        logout,
        setCurrentGardenId: updateGardenId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
