"use client";
import React, { createContext, useContext, useState } from "react";
import { Toaster } from "react-hot-toast";

export interface SimplifiedUser {
  username: string;
  name: string;
  email: string;
  isVerified: boolean;
  isAdmin: boolean;
}

interface UserContextType {
  user: SimplifiedUser | undefined;
  setUser: React.Dispatch<React.SetStateAction<SimplifiedUser | undefined>>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{
  children: React.ReactNode;
  initialUser?: SimplifiedUser | undefined;
}> = ({ children, initialUser }) => {
  const [user, setUser] = useState<SimplifiedUser | undefined>(initialUser);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <Toaster position="top-left" />
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return context;
};