'use client'

import React, {useContext, createContext, useState, useEffect, useMemo} from 'react'
import axios from 'axios'
import user from '@/types/user'

interface UserContextType {
    user: user | undefined
    loading: boolean
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [preloadedUser, setUser] = useState<user | undefined>();
    const [loading, setLoading] = useState<boolean>(true)
  
  
    useEffect(() => {
      const fetchUser = async () => {
        setLoading(true)
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const response = await axios.get('/api/auth/me', {
              headers: { Authorization: `Bearer ${token}` }
            });
            setLoading(false)
            setUser(response.data as unknown as user);
          } catch (error) {
            setLoading(false)
          }
        }else{
          setLoading(false)
        }
      };
  
      fetchUser();
    }, []); // This effect runs once on mount
  
    // Memoize user data to prevent unnecessary re-renders
    const user= useMemo(() => preloadedUser, [preloadedUser]);
  
    return (
      <UserContext.Provider value={{ user, loading}}>
        {children}
      </UserContext.Provider>
    );
  };
  
  export const useUserContext = () => {
    const context = useContext(UserContext);
    if (!context) {
      throw new Error('useUserContext must be used within a UserProvider');
    }
    return context;
  };