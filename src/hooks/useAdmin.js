import { useEffect, useState, useCallback } from 'react';
import { getAdminStats } from '../firebase/firestore';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export function useAdmin() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const data = await getAdminStats();
      setStats(data);
    } catch (err) {
      console.error('Error fetching admin stats:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refresh: fetchStats };
}
