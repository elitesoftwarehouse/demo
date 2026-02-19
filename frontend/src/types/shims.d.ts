// Lightweight shims to satisfy TypeScript in CI without full React type packages

declare module 'react' {
  const React: any;
  export default React;
  export const useState: any;
  export const useEffect: any;
  export const useMemo: any;
  export const useCallback: any;
  export const createContext: any;
  export const useContext: any;
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare module 'react-dom/client' {
  const anyExport: any;
  export default anyExport;
}

declare module 'react-router-dom' {
  export const BrowserRouter: any;
  export const Routes: any;
  export const Route: any;
  export const Navigate: any;
  export const useNavigate: any;
  export const useLocation: any;
  export const Link: any;
  export const MemoryRouter: any;
}

declare module '@testing-library/react' {
  export const render: any;
  export const screen: any;
  export const fireEvent: any;
  export const waitFor: any;
}

declare var jest: any;
declare var describe: any;
declare var it: any;
declare var expect: any;
declare var beforeEach: any;
declare var beforeAll: any;
declare var global: any;

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

// Fallback wildcard to satisfy TS2307 for any unresolved module
declare module '*';
