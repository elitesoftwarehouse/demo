import React, { useState } from 'react';
import { saveTokens, clearTokens } from '../../lib/authToken';

// Minimal i18n shim; if a real i18n system exists, this can be replaced
function t(key: string): string {
  const map: Record<string, string> = {
    'auth.title': 'Welcome',
    'auth.login': 'Login',
    'auth.signup': 'Signup',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.password.confirm': 'Confirm password',
    'auth.remember': 'Remember me',
    'auth.submit': 'Submit',
    'auth.logout': 'Logout',
    'auth.haveAccount': 'Already have an account? Login',
    'auth.noAccount': "Don't have an account? Signup",
    'auth.error.generic': 'Something went wrong. Please try again.',
  };
  return map[key] ?? key;
}

interface ApiResponse<T> { success: boolean; data?: T; error?: { message: string; details?: any; code?: string } }
interface LoginResponse { accessToken: string; tokenType: 'Bearer'; expiresIn: number; refreshToken?: string; user: { id: string; email: string; status: string } }
interface SignupResponse { id: string; email: string; status: string; createdAt: string; updatedAt: string }

async function apiPost<T>(url: string, body: any): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return json as ApiResponse<T>;
  } catch (e) {
    return { success: false, error: { message: 'network_error' } } as any;
  }
}

function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return re.test((email || '').trim().toLowerCase());
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <div style={{ color: '#b00020', fontSize: 12, marginTop: 4 }}>{message}</div>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid #ccc', width: '100%', boxSizing: 'border-box' }} />;
}

function Button({ children, loading, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={loading || rest.disabled}
      style={{
        padding: '10px 14px',
        borderRadius: 6,
        border: 'none',
        background: loading ? '#888' : '#1976d2',
        color: '#fff',
        cursor: loading ? 'not-allowed' : 'pointer',
        width: '100%',
      }}
    >
      {loading ? '...' : children}
    </button>
  );
}

export type AuthMode = 'login' | 'signup';

export interface AuthPageProps {
  mode?: AuthMode;
  onAuthenticated?: (tokens: { accessToken: string; refreshToken?: string; expiresIn?: number; user: { id: string; email: string } }) => void;
  apiBaseUrl?: string; // e.g. '' or '/'
}

export const AuthPage: React.FC<AuthPageProps> = ({ mode = 'login', onAuthenticated, apiBaseUrl = '' }) => {
  const [current, setCurrent] = useState<AuthMode>(mode);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', marginBottom: 16 }}>
          <button onClick={() => setCurrent('login')} style={{ flex: 1, padding: 12, background: current === 'login' ? '#1976d2' : '#f5f5f5', color: current === 'login' ? '#fff' : '#333', border: 'none', borderRadius: 6, cursor: 'pointer' }}>{t('auth.login')}</button>
          <button onClick={() => setCurrent('signup')} style={{ flex: 1, padding: 12, background: current === 'signup' ? '#1976d2' : '#f5f5f5', color: current === 'signup' ? '#fff' : '#333', border: 'none', borderRadius: 6, marginLeft: 8, cursor: 'pointer' }}>{t('auth.signup')}</button>
        </div>
        {current === 'login' ? (
          <LoginForm onSuccess={(r) => onAuthenticated?.(r)} apiBaseUrl={apiBaseUrl} />
        ) : (
          <SignupForm onSuccess={() => setCurrent('login')} apiBaseUrl={apiBaseUrl} />
        )}
      </div>
    </div>
  );
};

export const LoginForm: React.FC<{ onSuccess?: (data: { accessToken: string; refreshToken?: string; expiresIn?: number; user: { id: string; email: string } }) => void; apiBaseUrl?: string }>
  = ({ onSuccess, apiBaseUrl = '' }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailErr, setEmailErr] = useState<string | undefined>();
  const [pwdErr, setPwdErr] = useState<string | undefined>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    // Validate
    let valid = true;
    if (!validateEmail(email)) {
      setEmailErr('Invalid email');
      valid = false;
    } else setEmailErr(undefined);

    if (!password) {
      setPwdErr('Password is required');
      valid = false;
    } else setPwdErr(undefined);
    if (!valid) return;

    setLoading(true);
    const res = await apiPost<LoginResponse>(`${apiBaseUrl}/api/auth/login`, { email, password });
    setLoading(false);

    if (!res.success || !res.data) {
      const code = res.error?.code;
      if (code === 'UNAUTHORIZED') setError('Invalid credentials');
      else setError(res.error?.message || t('auth.error.generic'));
      return;
    }

    const data = res.data;
    saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken, expiresIn: data.expiresIn });
    onSuccess?.({ accessToken: data.accessToken, refreshToken: data.refreshToken, expiresIn: data.expiresIn, user: data.user });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>{t('auth.email')}</label>
          <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <FieldError message={emailErr} />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>{t('auth.password')}</label>
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          <FieldError message={pwdErr} />
        </div>
        {error && <div role="alert" style={{ background: '#fdecea', color: '#b71c1c', padding: 10, borderRadius: 6 }}>{error}</div>}
        <Button type="submit" loading={loading}>{t('auth.login')}</Button>
      </div>
    </form>
  );
};

export const SignupForm: React.FC<{ onSuccess?: (data: SignupResponse) => void; apiBaseUrl?: string }>
  = ({ onSuccess, apiBaseUrl = '' }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailErr, setEmailErr] = useState<string | undefined>();
  const [pwdErr, setPwdErr] = useState<string | undefined>();
  const [confirmErr, setConfirmErr] = useState<string | undefined>();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const validatePassword = (pwd: string): string[] => {
    const errs: string[] = [];
    if (!pwd) errs.push('Password is required');
    if (pwd.length < 8) errs.push('Password must be at least 8 characters');
    if (!/[A-Z]/.test(pwd)) errs.push('Must include an uppercase letter');
    if (!/[a-z]/.test(pwd)) errs.push('Must include a lowercase letter');
    if (!/[0-9]/.test(pwd)) errs.push('Must include a number');
    if (!/[!@#$%^&*(),.?":{}|<>\-_\[\];'`~]/.test(pwd)) errs.push('Must include a symbol');
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    let valid = true;

    if (!validateEmail(email)) {
      setEmailErr('Invalid email');
      valid = false;
    } else setEmailErr(undefined);

    const pwdErrors = validatePassword(password);
    if (pwdErrors.length > 0) {
      setPwdErr(pwdErrors.join('. '));
      valid = false;
    } else setPwdErr(undefined);

    if (confirm !== password) {
      setConfirmErr('Passwords do not match');
      valid = false;
    } else setConfirmErr(undefined);

    if (!valid) return;

    setLoading(true);
    const res = await apiPost<SignupResponse>(`${apiBaseUrl}/api/auth/signup`, { email, password });
    setLoading(false);

    if (!res.success || !res.data) {
      const code = res.error?.code;
      if (code === 'CONFLICT') setError('Email already exists');
      else setError(res.error?.message || t('auth.error.generic'));
      return;
    }

    setSuccessMsg('Signup successful. You can now login.');
    onSuccess?.(res.data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>{t('auth.email')}</label>
          <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <FieldError message={emailErr} />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>{t('auth.password')}</label>
          <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          <FieldError message={pwdErr} />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>{t('auth.password.confirm')}</label>
          <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
          <FieldError message={confirmErr} />
        </div>
        {error && <div role="alert" style={{ background: '#fdecea', color: '#b71c1c', padding: 10, borderRadius: 6 }}>{error}</div>}
        {successMsg && <div role="status" style={{ background: '#e8f5e9', color: '#1b5e20', padding: 10, borderRadius: 6 }}>{successMsg}</div>}
        <Button type="submit" loading={loading}>{t('auth.signup')}</Button>
      </div>
    </form>
  );
};

export default AuthPage;
