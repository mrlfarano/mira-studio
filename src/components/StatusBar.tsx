import React from 'react';
import { useConnectionStore } from '@/store/connection-store';
import { useSessionStore } from '@/store/session-store';
import { useConfigStore } from '@/store/config-store';

const StatusBar: React.FC = () => {
  const connections = useConnectionStore((s) => s.connections);
  const sessions = useSessionStore((s) => s.sessions);
  const isSyncing = useConfigStore((s) => s.isSyncing);
  const syncError = useConfigStore((s) => s.syncError);

  // Derive connection status
  const connEntries = Array.from(connections.values());
  const connectedCount = connEntries.filter((c) => c.state === 'connected').length;
  const totalConns = connEntries.length;
  const connectionLabel =
    totalConns === 0
      ? 'No connections'
      : `${connectedCount}/${totalConns} connected`;

  // Derive active agent count
  const activeSessions = Object.values(sessions).filter(
    (s) => s.status === 'running' || s.status === 'paused',
  );
  const agentLabel = `${activeSessions.length} agent${activeSessions.length !== 1 ? 's' : ''} active`;

  // Git sync status
  let syncLabel = 'Synced';
  let syncClass = 'statusbar__indicator--ok';
  if (isSyncing) {
    syncLabel = 'Syncing...';
    syncClass = 'statusbar__indicator--syncing';
  } else if (syncError) {
    syncLabel = 'Sync error';
    syncClass = 'statusbar__indicator--error';
  }

  return (
    <footer className="statusbar">
      <div className="statusbar__left">
        <span className="statusbar__indicator statusbar__indicator--connection">
          <span
            className={`statusbar__dot ${connectedCount > 0 ? 'statusbar__dot--connected' : 'statusbar__dot--disconnected'}`}
          />
          {connectionLabel}
        </span>
        <span className="statusbar__indicator">{agentLabel}</span>
      </div>
      <div className="statusbar__right">
        <span className={`statusbar__indicator ${syncClass}`}>{syncLabel}</span>
      </div>
    </footer>
  );
};

export default React.memo(StatusBar);
