import React from 'react';
import TopBar from '@/components/TopBar';
import Sidebar from '@/components/Sidebar';
import StatusBar from '@/components/StatusBar';
import LayoutEngine from '@/components/LayoutEngine';
import { QuickPromptBar } from '@/components/QuickPromptBar';
import { useToggleStore } from '@/store/toggle-store';

const AppShell: React.FC = () => {
  const activeWorkspace = useToggleStore((s) => s.activeWorkspace);
  const workspaceName = activeWorkspace || 'default';

  return (
    <div className="app-shell">
      <TopBar workspaceName={workspaceName} />
      <div className="app-shell__body">
        <Sidebar workspaceName={workspaceName} />
        <main className="app-shell__content">
          <LayoutEngine />
        </main>
      </div>
      <StatusBar />
      <QuickPromptBar />
    </div>
  );
};

export default React.memo(AppShell);
