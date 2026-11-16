import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../lib/api';
import type { IndexStatus, SourceInfo, TestRecord } from '../lib/types';

type CatalogState = {
  experiments: TestRecord[];
  sources: SourceInfo[];
  index: IndexStatus | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const CatalogContext = createContext<CatalogState | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [experiments, setExperiments] = useState<TestRecord[]>([]);
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [index, setIndex] = useState<IndexStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [records, src, status] = await Promise.all([
        api.experiments(), api.sources(), api.indexStatus(),
      ]);
      if (!Array.isArray(records) || !Array.isArray(src) || typeof status.indexed_record_count !== 'number') {
        throw new Error('The backend returned an unexpected catalog response.');
      }
      setExperiments(records);
      setSources(src);
      setIndex(status);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load NASA catalog');
      setIndex(null);
      setExperiments([]);
      setSources([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const value = useMemo(() => ({ experiments, sources, index, loading, error, reload }),
    [experiments, sources, index, loading, error, reload]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogState {
  const state = useContext(CatalogContext);
  if (!state) throw new Error('useCatalog must be used inside CatalogProvider');
  return state;
}
