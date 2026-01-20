'use client';

import { useEffect } from 'react';

/**
 * This component handles logging the user out when they close the browser tab.
 * It uses navigator.sendBeacon to reliably send a logout request.
 */
export function LogoutHandler() {
  useEffect(() => {
    const handleUnload = () => {
      // Use sendBeacon to reliably fire off a request to the logout endpoint
      // as the page is being unloaded. This is the modern standard for this task.
      navigator.sendBeacon('/api/auth/logout');
    };

    window.addEventListener('unload', handleUnload);

    // Cleanup the event listener when the component unmounts
    return () => {
      window.removeEventListener('unload', handleUnload);
    };
  }, []); // Empty dependency array ensures this effect runs only once on mount.

  return null; // This component doesn't render any UI
}
