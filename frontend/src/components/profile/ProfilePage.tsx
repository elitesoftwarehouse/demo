import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../lib/authContext';
import { getProfile, updateProfile, type UserProfile, type UpdateProfileInput } from '../../lib/profileService';

// Minimal design tokens; replace with your design system if available
const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 640, margin: '0 auto', padding: 16 },
  card: { background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 20 },
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
  avatar: { width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', background: '#f0f0f0' },
  title: { fontSize: 20, fontWeight: 600, margin: 0 },
  formRow: { display: 'flex', gap: 12, marginBottom: 12 },
  field: { flex: 1 },
  label: { display: 'block', fontSize: 12, color: '#555', marginBottom: 6 },
  input: { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd' },
  actions: { display: 'flex', gap: 8, marginTop: 16 },
  button: { padding: '10px 14px', borderRadius: 6, border: '1px solid #ccc', background: '#0d6efd', color: '#fff', cursor: 'pointer' },
  buttonSecondary: { padding: '10px 14px', borderRadius: 6, border: '1px solid #ccc', background: '#f8f9fa', color: '#333', cursor: 'pointer' },
  help: { fontSize: 12, color: '#777', marginTop: 8 },
  error: { color: '#d32f2f', fontSize: 13, marginTop: 8 },
  success: { color: '#2e7d32', fontSize: 13, marginTop: 8 },
};

// Simple i18n shim
const t = (s: string) => s;

export interface ProfilePageProps {
  apiBaseUrl?: string;
}

export function ProfilePage({ apiBaseUrl = '' }: ProfilePageProps) {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const fullName = useMemo(() => {
    const parts = [firstName, lastName].filter(Boolean);
    return parts.length ? parts.join(' ') : profile?.email || '';
  }, [firstName, lastName, profile?.email]);

  useEffect(() => {
    let ignore = false;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getProfile(apiBaseUrl);
        if (ignore) return;
        setProfile(data);
        setFirstName(data.firstName || '');
        setLastName(data.lastName || '');
        setAvatarUrl(data.avatarUrl || '');
      } catch (e: any) {
        if (!ignore) setError(e?.message || t('Unable to load profile'));
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [apiBaseUrl, isAuthenticated]);

  function validate(input: UpdateProfileInput): string[] {
    const errs: string[] = [];
    if (input.firstName && input.firstName.length > 80) errs.push(t('First name too long'));
    if (input.lastName && input.lastName.length > 80) errs.push(t('Last name too long'));
    if (input.avatarUrl && !/^https?:\/\//.test(input.avatarUrl)) errs.push(t('Avatar must be a valid URL (http/https)'));
    return errs;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload: UpdateProfileInput = {
      firstName: firstName.trim() || null,
      lastName: lastName.trim() || null,
      avatarUrl: avatarUrl.trim() || null,
    };
    const errs = validate(payload);
    if (errs.length) {
      setSaving(false);
      setError(errs.join('\n'));
      return;
    }

    try {
      const updated = await updateProfile(payload, apiBaseUrl);
      setProfile(updated);
      setSuccess(t('Profile updated successfully'));
    } catch (e: any) {
      setError(e?.message || t('Failed to update profile'));
    } finally {
      setSaving(false);
    }
  }

  function onReset() {
    setFirstName(profile?.firstName || '');
    setLastName(profile?.lastName || '');
    setAvatarUrl(profile?.avatarUrl || '');
    setError(null);
    setSuccess(null);
  }

  if (!isAuthenticated) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p>{t('You must be logged in to view your profile.')}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <img
            src={avatarUrl || 'https://via.placeholder.com/128?text=Avatar'}
            alt={t('Avatar')}
            style={styles.avatar}
            onError={(ev) => {
              const el = ev.currentTarget as HTMLImageElement;
              el.src = 'https://via.placeholder.com/128?text=Avatar';
            }}
          />
          <h1 style={styles.title}>{t('Your Profile')}</h1>
        </div>

        {loading ? (
          <p>{t('Loading profile...')}</p>
        ) : (
          <form onSubmit={onSubmit}>
            <div style={styles.formRow}>
              <div style={styles.field}>
                <label style={styles.label}>{t('First name')}</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t('Enter your first name')}
                  style={styles.input}
                  maxLength={80}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>{t('Last name')}</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t('Enter your last name')}
                  style={styles.input}
                  maxLength={80}
                />
              </div>
            </div>

            <div style={styles.formRow}>
              <div style={styles.field}>
                <label style={styles.label}>{t('Avatar URL')}</label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder={t('https://example.com/avatar.png')}
                  style={styles.input}
                />
                <div style={styles.help}>{t('Provide a link to your avatar image (PNG/JPG).')}</div>
              </div>
            </div>

            <div style={styles.formRow}>
              <div style={{ ...styles.field }}>
                <label style={styles.label}>{t('Preview')}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img
                    src={avatarUrl || 'https://via.placeholder.com/128?text=Avatar'}
                    alt={t('Avatar preview')}
                    style={{ ...styles.avatar, width: 80, height: 80 }}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>{fullName}</div>
                    <div style={{ color: '#666', fontSize: 13 }}>{profile?.email}</div>
                  </div>
                </div>
              </div>
            </div>

            {error && <div style={styles.error}>{error}</div>}
            {success && <div style={styles.success}>{success}</div>}

            <div style={styles.actions}>
              <button type="submit" style={styles.button} disabled={saving}>
                {saving ? t('Saving...') : t('Save changes')}
              </button>
              <button type="button" style={styles.buttonSecondary} onClick={onReset} disabled={saving}>
                {t('Reset')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;
