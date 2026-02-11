import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getProfile, updateProfile, type PublicUserProfile } from '../../api/profileClient';

export type ProfilePageProps = {
  baseUrl?: string;
  i18n?: (key: string) => string;
};

function isNonEmpty(s: any): boolean {
  return typeof s === 'string' ? s.trim().length > 0 : false;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ baseUrl = '/api', i18n }) => {
  const { state } = useAuth(baseUrl);
  const accessToken = state?.accessToken as any; // StoredAuthState from context

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const t = useMemo(() => {
    const F = i18n || ((k: string) => k);
    return (k: string) => F(k);
  }, [i18n]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const p = await getProfile({ baseUrl, accessToken });
        if (!mounted) return;
        setProfile(p);
        setFirstName(p.firstName || '');
        setLastName(p.lastName || '');
        setAvatarUrl(p.avatarUrl || '');
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'profile.load_failed');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [baseUrl, accessToken]);

  const clientErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (isNonEmpty(firstName) && firstName.length < 2) errs.firstName = t('profile.firstName_too_short');
    if (isNonEmpty(lastName) && lastName.length < 2) errs.lastName = t('profile.lastName_too_short');
    if (isNonEmpty(avatarUrl)) {
      try {
        // simple URL validation
        const u = new URL(avatarUrl);
        if (!u.protocol.startsWith('http')) throw new Error('invalid');
      } catch {
        errs.avatarUrl = t('profile.avatar_invalid_url');
      }
    }
    return errs;
  }, [firstName, lastName, avatarUrl, t]);

  const canSubmit = Object.keys(clientErrors).length === 0 && !saving;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ firstName: true, lastName: true, avatarUrl: true });
    setSuccess(null);
    setError(null);
    if (!canSubmit) return;
    setSaving(true);
    try {
      const updated = await updateProfile(
        {
          firstName: isNonEmpty(firstName) ? firstName.trim() : null,
          lastName: isNonEmpty(lastName) ? lastName.trim() : null,
          avatarUrl: isNonEmpty(avatarUrl) ? avatarUrl.trim() : null,
        },
        { baseUrl, accessToken },
      );
      setProfile(updated);
      setSuccess(t('profile.update_success'));
    } catch (e: any) {
      setError(e?.message || 'profile.update_failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div>{t('profile.loading')}</div>;
  }

  if (error && !profile) {
    return (
      <div>
        <div role="alert">{t(`error.${error}`)}</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form} aria-label="profile-form">
        <div style={styles.row}>
          <label style={styles.label}>
            <span>{t('profile.firstName')}</span>
            <input
              aria-label="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onBlur={() => setTouched((s) => ({ ...s, firstName: true }))}
              placeholder={t('profile.firstName_placeholder')}
              style={styles.input}
            />
            {touched.firstName && clientErrors.firstName && (
              <span style={styles.error}>{clientErrors.firstName}</span>
            )}
          </label>

          <label style={styles.label}>
            <span>{t('profile.lastName')}</span>
            <input
              aria-label="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onBlur={() => setTouched((s) => ({ ...s, lastName: true }))}
              placeholder={t('profile.lastName_placeholder')}
              style={styles.input}
            />
            {touched.lastName && clientErrors.lastName && (
              <span style={styles.error}>{clientErrors.lastName}</span>
            )}
          </label>
        </div>

        <label style={styles.label}>
          <span>{t('profile.avatarUrl')}</span>
          <input
            aria-label="avatarUrl"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            onBlur={() => setTouched((s) => ({ ...s, avatarUrl: true }))}
            placeholder={t('profile.avatar_placeholder')}
            style={styles.input}
          />
          {touched.avatarUrl && clientErrors.avatarUrl && (
            <span style={styles.error}>{clientErrors.avatarUrl}</span>
          )}
        </label>

        {error && (
          <div role="alert" style={styles.backendError}>
            {t(`error.${error}`)}
          </div>
        )}

        {success && (
          <div role="status" style={styles.successMsg}>
            {t(success)}
          </div>
        )}

        <button type="submit" disabled={!canSubmit} style={styles.submit}>
          {saving ? t('profile.saving') : t('profile.save')}
        </button>
      </form>

      <div style={styles.preview}>
        <div style={styles.avatarBox}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="avatar" style={styles.avatar} />
          ) : (
            <div style={styles.placeholder}>{t('profile.no_avatar')}</div>
          )}
        </div>
        <div style={styles.meta}>
          <div>
            <strong>{t('profile.email')}</strong>: {profile?.email}
          </div>
          <div>
            <strong>{t('profile.name')}</strong>: {[firstName, lastName].filter(Boolean).join(' ').trim() || t('profile.no_name')}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
    alignItems: 'start',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  input: {
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid #d9dde3',
  },
  error: { color: '#c92a2a', fontSize: 12 },
  backendError: { color: '#c92a2a', background: '#fff5f5', border: '1px solid #ffc9c9', padding: 8, borderRadius: 6 },
  successMsg: { color: '#2b8a3e', background: '#ebfbee', border: '1px solid #c3fae8', padding: 8, borderRadius: 6 },
  submit: {
    marginTop: 4,
    padding: '10px 12px',
    background: '#2c7be5',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600,
  },
  preview: { display: 'flex', flexDirection: 'column', gap: 12 },
  avatarBox: { width: 160, height: 160, borderRadius: 8, overflow: 'hidden', border: '1px solid #d9dde3', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  avatar: { width: '100%', height: '100%', objectFit: 'cover' },
  placeholder: { color: '#868e96', fontSize: 12 },
  meta: { fontSize: 14 },
};

export default ProfilePage;
