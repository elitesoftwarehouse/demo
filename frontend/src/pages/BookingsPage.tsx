import React, { useEffect, useState } from 'react';
import { apiGet } from '../api/client';
import { useAuth } from '../auth/auth';

export default function BookingsPage() {
  const { logout } = useAuth();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    apiGet('/bookings/me')
      .then((d) => mounted && setData(d))
      .catch((e) => {
        setError(`Errore: ${e.message}`);
        if (/401/.test(e.message)) logout();
      });
    return () => {
      mounted = false;
    };
  }, [logout]);

  return (
    <div style={{ padding: 16 }}>
      <h2>Le mie prenotazioni</h2>
      {error && <div style={{ color: 'crimson' }}>{error}</div>}
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
