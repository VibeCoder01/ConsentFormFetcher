'use client';

import { useEffect } from 'react';

/**
 * This component handles logging the user out when they close the browser tab.
 * It uses navigator.sendBeacon to reliably send a logout request on page dismissal.
 */
export function LogoutHandler() {
  useEffect(() => {
    const handlePageHide = () => {
      // Use sendBeacon to reliably fire off a POST request to the logout endpoint.
      // This is the modern standard for this task and works even when the page is closing.
      // The browser will automatically attempt to send this request.
      navigator.sendBeacon('/api/auth/logout');
    };

    // 'pagehide' is more reliable than 'unload' for modern browsers,
    // especially on mobile and with the back-forward cache.
    window.addEventListener('pagehide', handlePageHide);

    // Cleanup the event listener when the component unmounts.
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []); // Empty dependency array ensures this effect runs only once on mount.

  return null; // This component doesn't render any UI.
}
