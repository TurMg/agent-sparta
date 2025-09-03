import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthState } from '@/types';
import { authAPI } from '@/utils/api';
import { getStoredAuth, setStoredAuth, clearStoredAuth, isTokenExpired } from '@/utils/auth';
import toast from 'react-hot-toast';

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { token, user } = getStoredAuth();
        
        if (token && user) {
          // Check if token is expired
          if (isTokenExpired(token)) {
            console.log('Token expired, clearing auth');
            clearStoredAuth();
            setAuthState({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
            return;
          }

          // Verify token with server with timeout
          try {
            console.log('Verifying token with server...');
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Token verification timeout')), 5000)
            );
            
            const response: any = await Promise.race([
              authAPI.getMe(),
              timeoutPromise
            ]);
            
            if (response?.data?.success) {
              console.log('Token verified successfully');
              setAuthState({
                user: response.data.data.user,
                token,
                isAuthenticated: true,
                isLoading: false,
              });
            } else {
              console.log('Token verification failed');
              clearStoredAuth();
              setAuthState({
                user: null,
                token: null,
                isAuthenticated: false,
                isLoading: false,
              });
            }
          } catch (error) {
            console.error('Token verification error:', error);
            clearStoredAuth();
            setAuthState({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } else {
          console.log('No stored auth found');
          setAuthState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setAuthState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    // Add timeout for auth initialization
    const timeoutId = setTimeout(() => {
      console.log('Auth initialization timeout, setting loading to false');
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }, 10000); // 10 seconds timeout

    initAuth();
    
    return () => clearTimeout(timeoutId);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const response = await authAPI.login({ username, password });
      
      if (response.data.success) {
        const { user, token } = response.data.data;
        
        setStoredAuth(token, user);
        setAuthState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
        
        toast.success(`Selamat datang, ${user.username}!`);
        return true;
      } else {
        toast.error(response.data.error || 'Login gagal');
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return false;
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Login gagal';
      toast.error(errorMessage);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const response = await authAPI.register({ username, email, password });
      
      if (response.data.success) {
        const { user, token } = response.data.data;
        
        setStoredAuth(token, user);
        setAuthState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
        
        toast.success(`Akun berhasil dibuat. Selamat datang, ${user.username}!`);
        return true;
      } else {
        toast.error(response.data.error || 'Registrasi gagal');
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return false;
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Registrasi gagal';
      toast.error(errorMessage);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  const logout = () => {
    clearStoredAuth();
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
    toast.success('Berhasil logout');
  };

  const contextValue: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
