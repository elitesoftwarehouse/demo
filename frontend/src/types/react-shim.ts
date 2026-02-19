// Minimal runtime stub for React to satisfy ts-jest in CI
const React: any = {};
export default React;
export const useState: any = () => {};
export const useEffect: any = () => {};
export const useMemo: any = () => {};
export const useCallback: any = () => {};
export const createContext: any = () => ({ Provider: ({ children }: any) => children });
export const useContext: any = () => ({}) as any;
