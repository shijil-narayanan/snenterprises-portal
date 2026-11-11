import { createContext } from 'react';

// undefined = still checking, null = signed out, object = signed-in user
export const AuthContext = createContext({ user: undefined });
