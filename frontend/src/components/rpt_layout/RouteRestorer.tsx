import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const RouteRestorer = () => {
  const location = useLocation();

  useEffect(() => {
    // Don't save login page or root
    if (location.pathname !== '/login' && location.pathname !== '/') {
      localStorage.setItem('last_visited_path', location.pathname + location.search);
    }
  }, [location]);

  return null;
};

export default RouteRestorer;
