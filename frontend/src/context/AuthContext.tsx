import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import api from '@/services/api';

interface User {
  id: string;
  name?: string;
  fullName?: string;
  email: string;
  role: string;
  avatar?: string;
  position?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  isMockMode: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isMockMode, setIsMockMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const clearSidebarPermissionCache = () => {
    try {
      localStorage.removeItem('sidebarDbItemsCache');
    } catch {
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    const authMode = localStorage.getItem('auth_mode');
    
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    
    if (authMode === 'mock') {
        setIsMockMode(true);
        setIsLoading(false);
    } else if (storedToken) {
        // Validate token and refresh user data
        api.get('/users/me')
          .then(response => {
             if (response.data.status === 'success') {
                const previousRole = (() => {
                  try {
                    const raw = localStorage.getItem('user');
                    const parsed = raw ? JSON.parse(raw) : null;
                    return parsed?.role;
                  } catch {
                    return null;
                  }
                })();
                const userData = response.data.data.user;
                const resolvedFullName =
                  userData.fullName || userData.displayName || userData.name || undefined;
                const resolvedName =
                  resolvedFullName || (userData.email ? userData.email.split('@')[0] : undefined);
                const updatedUser: User = {
                    id: userData.id,
                    email: userData.email,
                    role: userData.role || 'user',
                    name: resolvedName,
                    fullName: resolvedFullName,
                    avatar: userData.avatarUrl 
                };
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));

                if (previousRole && updatedUser.role && previousRole !== updatedUser.role) {
                  clearSidebarPermissionCache();
                  window.dispatchEvent(new Event('auth:role_changed'));
                }
             }
          })
          .catch(err => {
             console.error('Failed to validate session:', err);
             // If 401, clear session
             if (err.response && err.response.status === 401) {
                 logout();
             }
          })
          .finally(() => {
              setIsLoading(false);
          });
    } else {
        setIsLoading(false);
    }

    // Listen for unauthorized events
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      // Attempt real login
      // Note: Auth routes are at /api/auth, not /api/v1/auth, so we need to be careful with the baseURL
      // Since API_URL defaults to /api/v1, we might need to adjust this call or the baseURL
      // Let's assume the API_URL is /api/v1, then /auth/login would be /api/v1/auth/login which is WRONG
      // It should be /api/auth/login. 
      // So we need to use a custom axios instance or absolute path if possible, 
      // OR we can change the backend route to be consistent.
      // But looking at server.js: app.use('/api/auth', authRoutes);
      // So it IS /api/auth.
      
      // If API_URL is http://localhost:3000/api/v1
      // Then axios.post('/auth/login') -> http://localhost:3000/api/v1/auth/login -> 404
      
      // We should use the full path to avoid baseURL issues for this specific endpoint
      // or fix the baseURL in api.ts to be just /api and prefix other calls with v1.
      
      // Since I changed api.ts back to /api/v1, I need to hack this here or change api.ts again.
      // Actually, standardizing on /api/v1 for resources and /api/auth for auth is common but tricky with one axios instance.
      
      // Let's try to use the `api` instance but override the baseURL for this call? 
      // No, that's messy. 
      
      // Let's use a relative path that goes up one level if possible? No.
      
      // Simplest fix: The backend defines app.use('/api/auth', authRoutes).
      // My previous api.ts change to /api was actually better for this, but broke the other calls which expect /v1.
      
      // Let's check server.js again:
      // app.use('/api/v1/items', itemRoutes);
      // app.use('/api/v1/audit', auditRoutes);
      // app.use('/api/auth', authRoutes);
      
      // So resources are v1, auth is not.
      
      // I will use `api.post` but with a path that traverses up if axios supports it, 
      // or better, I will just create a one-off request for login or use the full URL.
      
      const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/v1', '') : 'http://localhost:3000/api';
      const response = await api.post(`${API_BASE}/auth/login`, { email, password });
      
      if (response.data.status === 'success') {
        const userData = response.data.data.user;
        const token = response.data.token; // Get token from response
        const resolvedFullName =
          userData.fullName || userData.displayName || userData.name || undefined;
        const resolvedName =
          resolvedFullName || (userData.email ? userData.email.split('@')[0] : undefined);

        const user: User = {
            id: userData.id,
            email: userData.email,
            role: userData.role || 'user',
            name: resolvedName, // Display name
            fullName: resolvedFullName,
        };
        
        setUser(user);
        localStorage.setItem('user', JSON.stringify(user));
        if (token) {
          localStorage.setItem('token', token); // Store token
        }
        localStorage.removeItem('auth_mode'); // Clear mock mode if successful
        setIsMockMode(false);
        
        // Notify sidebar to refresh on login
        window.dispatchEvent(new Event('auth:login'));
        
        return { success: true };
      }
      return { success: false, message: response.data.message || 'Login failed' };
      
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Check for connection error or server unavailable to trigger fallback
      if (!error.response || error.code === 'ERR_NETWORK' || error.response.status >= 500) {
          console.warn('Backend unavailable, falling back to mock authentication');
          return loginMock(email, password);
      }
      
      return { 
          success: false, 
          message: error.response?.data?.message || 'Invalid email or password' 
      };
    }
  };

  const loginMock = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
      // Mock authentication fallback
      if (email === 'admin@tax.gov' && password === 'admin123') {
        const mockUser: User = {
          id: 'mock-1',
          name: 'Admin User (Offline)',
          email: 'admin@tax.gov',
          role: 'Administrator',
        };
        setUser(mockUser);
        localStorage.setItem('user', JSON.stringify(mockUser));
        localStorage.setItem('auth_mode', 'mock');
        setIsMockMode(true);
        return { success: true, message: 'Logged in (Offline Mode)' };
      }
      if (email === 'treasurer@tax.gov' && password === 'treasurer123') {
        const mockUser: User = {
          id: 'mock-2',
          name: 'Treasurer (Offline)',
          email: 'treasurer@tax.gov',
          role: 'treasurer',
        };
        setUser(mockUser);
        localStorage.setItem('user', JSON.stringify(mockUser));
        localStorage.setItem('auth_mode', 'mock');
        setIsMockMode(true);
        return { success: true, message: 'Logged in (Offline Mode)' };
      }
      return { success: false, message: 'Invalid credentials (Offline Mode)' };
  };

  const logout = () => {
    setUser(null);
    setIsMockMode(false);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('auth_mode');
    clearSidebarPermissionCache();
    window.dispatchEvent(new Event('auth:logout'));
    
    // Optional: Call logout endpoint
    // api.post('/auth/logout').catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isMockMode, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
