import { IconTicket, IconSearch, IconShield } from './Icons';
import type { HealthCheckResponse } from '../types/ticket';

interface HeaderProps {
  activeTab: 'abrir' | 'acompanhar' | 'admin';
  onTabChange: (tab: 'abrir' | 'acompanhar' | 'admin') => void;
  backendHealth?: HealthCheckResponse | null;
}

export const Header = ({ activeTab, onTabChange }: HeaderProps) => {

  return (
    <header className="corp-header">
      <div className="corp-header-inner">
        <div className="brand-group">
          <span className="brand-logo-text">Flow</span>
          <span className="brand-subtext">Chamados</span>
        </div>

        <nav className="tab-pill-group" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'abrir'}
            className={`tab-pill ${activeTab === 'abrir' ? 'active' : ''}`}
            onClick={() => onTabChange('abrir')}
          >
            <IconTicket size={15} />
            <span>Novo Chamado</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'acompanhar'}
            className={`tab-pill ${activeTab === 'acompanhar' ? 'active' : ''}`}
            onClick={() => onTabChange('acompanhar')}
          >
            <IconSearch size={15} />
            <span>Consultar</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'admin'}
            className={`tab-pill ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => onTabChange('admin')}
          >
            <IconShield size={15} />
            <span>Admin</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
