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
        <div 
          className="brand-group" 
          onClick={() => onTabChange('abrir')} 
          role="button" 
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onTabChange('abrir'); }}
          title="Flow Chamados - Início"
        >
          <div className="brand-badge-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="3" />
              <path d="M3 10h18" />
              <path d="M8 15h4" />
              <circle cx="16" cy="15" r="1" fill="currentColor" />
            </svg>
          </div>
          <div className="brand-text-block">
            <div className="brand-title-wrap">
              <span className="brand-title-primary">Flow</span>
              <span className="brand-title-secondary">Chamados</span>
            </div>
            <span className="brand-caption">Central de Atendimento Corporativo</span>
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
            <span>Novo Chamado</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'acompanhar'}
            className={`tab-pill ${activeTab === 'acompanhar' ? 'active' : ''}`}
            onClick={() => onTabChange('acompanhar')}
          >
            <IconSearch size={16} />
            <span>Consultar</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'admin'}
            className={`tab-pill ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => onTabChange('admin')}
          >
            <IconShield size={16} />
            <span>Painel Admin</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
