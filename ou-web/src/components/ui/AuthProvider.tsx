'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useFeatureStore } from '@/stores/featureStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore();
  const setUnlockedFeatures = useFeatureStore(s => s.setUnlockedFeatures);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
      // 해금 상태 hydrate
      if (user) {
        supabase
          .from('profiles')
          .select('features_unlocked')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data?.features_unlocked) {
              setUnlockedFeatures(data.features_unlocked);
            }
          });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [setUser, setLoading, setUnlockedFeatures]);

  return <>{children}</>;
}
