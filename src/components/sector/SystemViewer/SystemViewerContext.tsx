import { createContext, useContext } from 'react';

interface SystemViewerContextType {
  systemId: string;
  orbitControlsRef: React.MutableRefObject<any>;
  onPlanetContextMenu?: (objectId: string, x: number, y: number, lat: number, lon: number) => void;
}

export const SystemViewerContext = createContext<SystemViewerContextType | null>(null);

export function useSystemViewerContext() {
  const ctx = useContext(SystemViewerContext);
  if (!ctx) throw new Error('useSystemViewerContext outside SystemViewerContext.Provider');
  return ctx;
}

export function useSafeSystemViewerContext() {
  return useContext(SystemViewerContext);
}
