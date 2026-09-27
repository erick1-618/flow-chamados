import type { HealthCheckResponse } from '../types/ticket';
import { IconTicket, IconSearch, IconShield } from './Icons';

interface HeaderProps {
  activeTab: 'abrir' | 'acompanhar' | 'admin';
  onTabChange: (tab: 'abrir' | 'acompanhar' | 'admin') => void;
  backendHealth: HealthCheckResponse | null;
}

export const Header = ({ activeTab, onTabChange, backendHealth }: HeaderProps) => {
  return (
    <header className="corp-header">
      <div className="corp-header-inner">
        <div className="brand-group">
          <div className="brand-badge">
            <span className="brand-logo-text">FLOW</span>
            <span className="brand-subtext">Enterprise Support</span>
          </div>

          <div className="system-status-indicator">
            <span
              className={`status-indicator-dot ${backendHealth ? 'active' : 'inactive'}`}
              title={backendHealth ? 'API & Trello Sync Operacionais' : 'Conectando ao serviço...'}
            />
            <span className="status-indicator-label">
              {backendHealth ? 'Operacional' : 'Conectando'}
            </span>
          </div>
        </div>

        <nav className="tab-pill-group" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'abrir'}
            className={`tab-pill ${activeTab === 'abrir' ? 'active' : ''}`}
            onClick={() => onTabChange('abrir')}
          >
            <IconTicket size={16} />
            <span>Abrir Chamado</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'acompanhar'}
            className={`tab-pill ${activeTab === 'acompanhar' ? 'active' : ''}`}
            onClick={() => onTabChange('acompanhar')}
          >
            <IconSearch size={16} />
            <span>Acompanhar & Chat</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'admin'}
            className={`tab-pill ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => onTabChange('admin')}
          >
            <IconShield size={16} />
            <span>Painel da Equipe</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
