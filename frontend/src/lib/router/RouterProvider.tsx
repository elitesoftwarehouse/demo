import React, { AnchorHTMLAttributes, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface RouterContextValue {
  path: string; // current pathname (no query)
  currentPath: string; // alias for convenience
  navigate: (href: string) => void;
}

const RouterContext = createContext<RouterContextValue | undefined>(undefined);

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getPath = () => (typeof window !== 'undefined' ? window.location.pathname : '/');
  const [path, setPath] = useState<string>(getPath);

  useEffect(() => {
    const onPop = () => setPath(getPath());
    window.addEventListener('popstate', onPop);
    window.addEventListener('pushstate', onPop as any);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('pushstate', onPop as any);
    };
  }, []);

  const navigate = useCallback((href: string) => {
    if (typeof window === 'undefined') return;
    const prev = window.location.pathname + window.location.search + window.location.hash;
    window.history.pushState({}, '', href);
    const event = new PopStateEvent('popstate', { state: {} });
    window.dispatchEvent(event);
    const now = window.location.pathname + window.location.search + window.location.hash;
    if (prev === now) {
      window.location.href = href;
    }
  }, []);

  const value = useMemo<RouterContextValue>(() => ({ path, currentPath: path, navigate }), [path, navigate]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
};

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}

export function useCurrentPath(): string {
  return useRouter().path;
}

export type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export const Link: React.FC<LinkProps> = ({ href, onClick, target, rel, children, ...rest }) => {
  const { navigate } = useRouter();
  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    if (onClick) onClick(e);
    if (e.defaultPrevented) return;
    // Allow default for new tab/window or external links
    const isModified = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || target === '_blank';
    const isExternal = typeof href === 'string' && /^(https?:)?\/\//i.test(href);
    if (isModified || isExternal) return;
    e.preventDefault();
    navigate(href);
  };

  return (
    <a href={href} onClick={handleClick} target={target} rel={rel} {...rest}>
      {children}
    </a>
  );
};
