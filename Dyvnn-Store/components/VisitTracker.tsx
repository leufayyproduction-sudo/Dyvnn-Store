'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function VisitTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname !== '/' && !/^\/games\/[a-z0-9-]+$/.test(pathname)) return;
    try {
      let sessionId = sessionStorage.getItem('dyvnn-visit-session');
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem('dyvnn-visit-session', sessionId);
      }
      void fetch('/api/visits', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, route: pathname }), keepalive: true,
      }).catch(() => undefined);
    } catch {
      // Visitors who block local storage or UUID generation are not tracked.
    }
  }, [pathname]);
  return null;
}
