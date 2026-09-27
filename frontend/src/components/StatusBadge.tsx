import type { TicketStatus } from '../types/ticket';

interface StatusBadgeProps {
  status: TicketStatus;
  size?: 'sm' | 'md';
}

export const getStatusConfig = (status: TicketStatus) => {
  switch (status) {
    case 'CRIADO':
      return {
        label: 'Criado',
        colorClass: 'status-criado',
        dotColor: '#0284c7',
      };
    case 'EM_ANDAMENTO':
      return {
        label: 'Em Andamento',
        colorClass: 'status-andamento',
        dotColor: '#f59e0b',
      };
    case 'AGUARDANDO_ACAO':
      return {
        label: 'Aguardando Ação',
        colorClass: 'status-aguardando',
        dotColor: '#8b5cf6',
      };
    case 'FINALIZADO':
      return {
        label: 'Finalizado',
        colorClass: 'status-finalizado',
        dotColor: '#10b981',
      };
    default:
      return {
        label: status,
        colorClass: 'status-default',
        dotColor: '#64748b',
      };
  }
};

export const StatusBadge = ({ status, size = 'md' }: StatusBadgeProps) => {
  const config = getStatusConfig(status);

  return (
    <span className={`status-pill ${config.colorClass} ${size === 'sm' ? 'status-pill-sm' : ''}`}>
      <span className="status-pill-dot" style={{ backgroundColor: config.dotColor }} />
      {config.label}
    </span>
  );
};
