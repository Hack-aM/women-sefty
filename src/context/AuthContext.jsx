import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthChange, getUserProfile } from '../firebase/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const prof = await getUserProfile(firebaseUser.uid);
          setProfile(prof);
          setIsAdmin(prof?.isAdmin === true);

          // Retrieve and save FCM token lazily
          import('../firebase/messaging').then(({ getFCMToken }) => {
            getFCMToken().then((token) => {
              if (token) {
                import('../firebase/firestore').then(({ saveFCMToken }) => {
                  saveFCMToken(firebaseUser.uid, token);
                });
              }
            });
          });
        } catch {
          setProfile(null);
          setIsAdmin(false);
        }
      } else {
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const refreshProfile = async () => {
    if (user) {
      const prof = await getUserProfile(user.uid);
      setProfile(prof);
      setIsAdmin(prof?.isAdmin === true);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile, setProfile, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

