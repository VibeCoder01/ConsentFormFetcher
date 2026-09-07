'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { SessionData } from '@/lib/types';

type Session = SessionData | { isLoggedIn: false };
export function useSession(): { session: Session; isLoading: boolean } {
  const [session, setSession] = useState<Session>({ isLoggedIn: false });
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    let active = true;
    setIsLoading(true);
    fetch('/api/auth/session').then(async response => {
      if (!response.ok) throw new Error('Session unavailable');
      const data = await response.json();
      if (!active) return;
      setSession(data);
      if (!data.isLoggedIn) router.replace(`/login?from=${encodeURIComponent(pathname)}`);
    }).catch(() => {
      if (active) { setSession({ isLoggedIn: false }); router.replace('/login'); }
    }).finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [pathname, router]);
  return { session, isLoading };
}
