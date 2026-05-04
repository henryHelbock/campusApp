import { useState, useCallback, useRef, useEffect } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { Issue, LostFoundItem } from '@campusapp/shared';
import { issuesApi, lostFoundApi, NetworkError } from '../services/api';

const DEMO_ISSUES: Issue[] = [
  { id:1, category:'Road',     severity:'Severe', description:'Icy walkway near Milne Library',    latitude:42.468010,  longitude:-75.062851, reportCount:3, status:'active', reporterId:2, createdAt:'', updatedAt:'' },
  { id:2, category:'Water',    severity:'Mild',   description:'Drinking fountain not working IRC', latitude:42.469277, longitude:-75.063021, reportCount:1, status:'active', reporterId:2, createdAt:'', updatedAt:'' },
  { id:3, category:'Building', severity:'Large',  description:'Heating issue in Fitzelle Hall',    latitude:42.469995, longitude:-75.062918, reportCount:2, status:'active', reporterId:2, createdAt:'', updatedAt:'' },
];

const DEMO_LOST: LostFoundItem[] = [
  { id:1, type:'lost', title:'Black AirPods Case', description:'Lost near Milne Library entrance', category:'Electronics', latitude:42.4685, longitude:-75.0630, imageUrls:[], status:'active', reporterId:2, createdAt:'' },
];

export function useCampusMapData() {
  const [issues,     setIssues]     = useState<Issue[]>([]);
  const [lostItems,  setLostItems]  = useState<LostFoundItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [issueData, lfData] = await Promise.all([
        issuesApi.getAll(),
        lostFoundApi.getAll(),
      ]);
      setIssues(issueData);
      setLostItems(lfData);
      setFetchError(null);
    } catch (err) {
      if (err instanceof NetworkError) {
        setIssues(DEMO_ISSUES);
        setLostItems(DEMO_LOST);
        setFetchError(null);
      } else {
        setFetchError(err instanceof Error ? err.message : 'Failed to load map data');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
      intervalRef.current = setInterval(() => fetchData({ silent: true }), 60000);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }, [fetchData])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active') fetchData({ silent: true });
    });
    return () => sub.remove();
  }, [fetchData]);

  const onManualRefresh = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    fetchData();
    intervalRef.current = setInterval(() => fetchData({ silent: true }), 60000);
  }, [fetchData]);

  return { issues, lostItems, loading, fetchError, onManualRefresh };
}
