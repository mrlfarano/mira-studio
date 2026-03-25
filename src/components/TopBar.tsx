import React from 'react';
import { NotificationIndicator } from '@/components/NotificationIndicator';
import SceneSwitcher from '@/components/SceneSwitcher.tsx';

export interface TopBarProps {
  workspaceName: string;
}

const TopBar: React.FC<TopBarProps> = ({ workspaceName }) => {
  return (
    <header className="topbar">
      <div className="topbar__left">
        <span className="topbar__logo">Mira Studio</span>
        <span className="topbar__separator" />
        <span className="topbar__workspace">{workspaceName}</span>
        <span className="topbar__separator" />
        <SceneSwitcher />
      </div>

      <div className="topbar__right">
        <NotificationIndicator />
        <div className="topbar__profile" aria-label="Profile">
          <span className="topbar__avatar" />
        </div>
      </div>
    </header>
  );
};

export default React.memo(TopBar);
