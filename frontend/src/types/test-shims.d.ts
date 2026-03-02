// Test shims to avoid frontend compile errors during backend CI/test runs
// These are loose declarations and do not affect runtime; used only by TS type-checker.

declare module 'react' {
  const ReactDefault: any;
  export default ReactDefault;
  export const useState: any;
  export const useEffect: any;
  export const useMemo: any;
  export const useCallback: any;
  export const createContext: any;
  export const useContext: any;
  export type FC<P = any> = any;
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare module 'react-dom/client' {
  export function createRoot(el: any): { render: (n: any) => void };
}

declare module 'react-router-dom' {
  export const BrowserRouter: any;
  export const Routes: any;
  export const Route: any;
  export const Navigate: any;
  export function useNavigate(): (path: string) => void;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

declare interface ImportMetaEnv {
  VITE_API_BASE?: string;
}
interface ImportMeta {
  env: ImportMetaEnv;
}
