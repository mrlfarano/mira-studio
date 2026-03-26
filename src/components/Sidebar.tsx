import React, { useState, useCallback } from 'react';
import { useTerminalManager } from '@/hooks/useTerminalManager';

const MODULE_LIST = [
  { id: 'terminal', label: 'Terminal', icon: '>' },
  { id: 'companion', label: 'Companion', icon: 'C' },
  { id: 'kanban', label: 'Kanban', icon: 'K' },
  { id: 'journal', label: 'Journal', icon: 'J' },
] as const;

const QUICK_ACTIONS = [
  { id: 'new-terminal', label: 'New Terminal' },
  { id: 'new-scene', label: 'New Scene' },
  { id: 'add-panel', label: 'Add Panel' },
] as const;

export interface SidebarProps {
  workspaceName: string;
}

const Sidebar: React.FC<SidebarProps> = ({ workspaceName }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { createTerminal } = useTerminalManager();

  const toggle = useCallback(() => setCollapsed((c) => !c), []);

  const handleQuickAction = useCallback(
    (id: string) => {
      if (id === 'new-terminal') {
        createTerminal();
      }
    },
    [createTerminal],
  );

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <button
        className="sidebar__toggle"
        onClick={toggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? '\u25B6' : '\u25C0'}
      </button>

      {!collapsed && (
        <>
          {/* Workspace / Scene Switcher */}
          <section className="sidebar__section">
            <h3 className="sidebar__heading">Workspace</h3>
            <div className="sidebar__scene-switcher">
              <span className="sidebar__scene-name">{workspaceName}</span>
            </div>
          </section>

          {/* Module List */}
          <section className="sidebar__section">
            <h3 className="sidebar__heading">Modules</h3>
            <ul className="sidebar__list">
              {MODULE_LIST.map((m) => (
                <li key={m.id} className="sidebar__item">
                  <span className="sidebar__icon">{m.icon}</span>
                  <span>{m.label}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Quick Actions */}
          <section className="sidebar__section">
            <h3 className="sidebar__heading">Quick Actions</h3>
            <ul className="sidebar__list">
              {QUICK_ACTIONS.map((a) => (
                <li
                  key={a.id}
                  className="sidebar__item sidebar__item--action"
                  role="button"
                  tabIndex={0}
                  onClick={() => handleQuickAction(a.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleQuickAction(a.id);
                    }
                  }}
                >
                  {a.label}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </aside>
  );
};

export default React.memo(Sidebar);
