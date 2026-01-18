import React, { useState } from 'react';
import { signup } from '../../../lib/authService';

export interface SignupFormProps {
  apiBaseUrl?: string;
  onSuccess?: () => void;
}

export function SignupForm({ apiBaseUrl = '', onSuccess }: SignupFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await signup({ email, password }, apiBaseUrl);
      setSuccess('Signup successful. You can now login.');
      onSuccess?.();
    } catch (e: any) {
      setError(e?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 12 }}>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 12 }}>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      {error && <div style={{ color: '#d32f2f', marginBottom: 8 }}>{error}</div>}
      {success && <div style={{ color: '#2e7d32', marginBottom: 8 }}>{success}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Creating account...' : 'Create account'}
      </button>
    </form>
  );
}

export default SignupForm;
