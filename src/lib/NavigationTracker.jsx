import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function NavigationTracker() {
  const location = useLocation();

  useEffect(() => {
    // Tracking locale senza backend
    console.log('Navigazione:', location.pathname);
  }, [location]);

  return null;
}
