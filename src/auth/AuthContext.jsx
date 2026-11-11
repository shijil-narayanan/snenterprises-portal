import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { AuthContext } from './context';

/** Keeps track of the signed-in Firebase user for the whole app. */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(auth ? undefined : null);

  useEffect(() => {
    if (!auth) return undefined;
    return onAuthStateChanged(auth, (u) => setUser(u || null));
  }, []);

  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
}
