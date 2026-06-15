import { useEffect, useState } from 'react';
import PrototypeRoutesAuthFlow from './PrototypeRoutesAuthFlow';
import PrototypeRoutesKeyActivitiesDashboard from './PrototypeRoutesKeyActivitiesDashboard';

const authRoutes = ['/login', '/signup', '/forgot-password'];
const getRoute = () => window.location.hash.replace(/^#/, '').split('?')[0] || '/';

export default function PrototypeRoutesEnterpriseAuthFlow() {
  const [route, setRoute] = useState(() => getRoute());

  useEffect(() => {
    const handleHashChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (authRoutes.includes(route)) return <PrototypeRoutesAuthFlow />;
  return <PrototypeRoutesKeyActivitiesDashboard />;
}
