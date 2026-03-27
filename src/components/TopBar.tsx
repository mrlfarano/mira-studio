import React from 'react';
import { NotificationIndicator } from '@/components/NotificationIndicator';
import SceneSwitcher from '@/components/SceneSwitcher.tsx';
import { useCommandStore } from '@/store/command-store.ts';

export interface TopBarProps {
  workspaceName: string;
}

const TopBar: React.FC<TopBarProps> = ({ workspaceName }) => {
  const toggle = useCommandStore((s) => s.toggle);
  return (
    <header className="topbar" data-testid="topbar">
      <div className="topbar__left">
        <span className="topbar__logo" data-testid="topbar-title">Mira Studio</span>
        <span className="topbar__separator" />
        <span className="topbar__workspace">{workspaceName}</span>
        <span className="topbar__separator" />
        <SceneSwitcher />
      </div>

      <div className="topbar__right">
        <NotificationIndicator />
        {/* Hidden trigger used by E2E tests to open the command palette */}
        <button
          data-testid="command-palette-trigger"
          onClick={toggle}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' }}
          aria-hidden="true"
          tabIndex={-1}
        />
        <div className="topbar__profile" aria-label="Profile">
          <span className="topbar__avatar" />
        </div>
      </div>
    </header>
  );
};

export default React.memo(TopBar);
