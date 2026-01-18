import React, { useState } from 'react';
import { LoginForm } from '../forms/LoginForm';
import { SignupForm } from '../forms/SignupForm';

export interface AuthPageProps {
  apiBaseUrl?: string;
}

export function AuthPage({ apiBaseUrl = '' }: AuthPageProps) {
  const [tab, setTab] = useState<'login' | 'signup'>('login');

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setTab('login')} disabled={tab === 'login'}>
          Login
        </button>
        <button onClick={() => setTab('signup')} disabled={tab === 'signup'}>
          Signup
        </button>
      </div>
      {tab === 'login' ? <LoginForm apiBaseUrl={apiBaseUrl} /> : <SignupForm apiBaseUrl={apiBaseUrl} onSuccess={() => setTab('login')} />}
    </div>
  );
}

export default AuthPage;
