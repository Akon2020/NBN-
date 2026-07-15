import { useCallback, useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

import { syncPendingMissions, type SyncSummary } from './syncEngine';
import { countPendingDrafts } from '../repository/missionRepository';

// Déclenche une synchronisation automatique au retour de connexion
// (transition hors-ligne → en ligne détectée par NetInfo), et expose un
// déclenchement manuel pour un bouton "Synchroniser maintenant".
export function useSyncOnReconnect() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const wasOffline = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    setPendingCount(await countPendingDrafts());
  }, []);

  const runSync = useCallback(async (): Promise<SyncSummary> => {
    setIsSyncing(true);
    try {
      const summary = await syncPendingMissions();
      await refreshPendingCount();
      return summary;
    } finally {
      setIsSyncing(false);
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    refreshPendingCount();

    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
      if (isOnline && wasOffline.current) {
        runSync();
      }
      wasOffline.current = !isOnline;
    });

    return unsubscribe;
  }, [refreshPendingCount, runSync]);

  return { pendingCount, isSyncing, runSync, refreshPendingCount };
}
