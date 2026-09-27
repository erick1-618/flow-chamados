import type {
  CreateMessageInput,
  CreateTicketInput,
  HealthCheckResponse,
  Message,
  Ticket,
  TicketStatus,
  TrackTicketInput,
} from '../types/ticket';

// Em produção na Vercel: usa VITE_API_URL (ex: https://api.seudominio.com). Em dev: usa o proxy local /api
const BASE_URL = import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).replace(/\/+$/, '') : '';
const API_BASE = BASE_URL ? `${BASE_URL}/api` : '/api';

function sanitizeErrorMessage(rawMessage: unknown, fallback: string): string {
  if (typeof rawMessage !== 'string' || !rawMessage.trim()) return fallback;
  // Oculta eventuais vazamentos de SQL, JDBC ou drivers
  const lower = rawMessage.toLowerCase();
  if (
    lower.includes('jdbc') ||
    lower.includes('sql') ||
    lower.includes('hibernate') ||
    lower.includes('bytea') ||
    lower.includes('postgresql') ||
    lower.includes('org.') ||
    lower.includes('exception')
  ) {
    return 'Falha no processamento interno dos dados. Por favor, tente novamente em instantes.';
  }
  return rawMessage;
}

export const api = {
  async getHealth(): Promise<HealthCheckResponse> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`Falha ao conectar ao backend: ${res.statusText}`);
    return res.json();
  },

  async createTicket(input: CreateTicketInput): Promise<Ticket> {
    const res = await fetch(`${API_BASE}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(sanitizeErrorMessage(err?.message, 'Erro ao abrir chamado.'));
    }
    return res.json();
  },

  async trackTicket(input: TrackTicketInput): Promise<Ticket> {
    const res = await fetch(`${API_BASE}/tickets/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(sanitizeErrorMessage(err?.message, 'Chamado não encontrado com o protocolo e e-mail informados.'));
    }
    return res.json();
  },

  async addClientMessage(protocolo: string, input: CreateMessageInput): Promise<Message> {
    const res = await fetch(`${API_BASE}/tickets/${encodeURIComponent(protocolo)}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(sanitizeErrorMessage(err?.message, 'Erro ao enviar mensagem.'));
    }
    return res.json();
  },

  async listAdminTickets(
    adminKey: string,
    filters?: { status?: TicketStatus | ''; search?: string }
  ): Promise<Ticket[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const res = await fetch(`${API_BASE}/admin/tickets?${params.toString()}`, {
      headers: { 'X-Admin-Key': adminKey },
    });
    if (!res.ok) {
      if (res.status === 401) throw new Error('Chave de acesso administrativo inválida.');
      const err = await res.json().catch(() => null);
      throw new Error(sanitizeErrorMessage(err?.message, `Erro ao listar chamados: ${res.statusText}`));
    }
    return res.json();
  },

  async getAdminTicket(adminKey: string, id: number): Promise<Ticket> {
    const res = await fetch(`${API_BASE}/admin/tickets/${id}`, {
      headers: { 'X-Admin-Key': adminKey },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(sanitizeErrorMessage(err?.message, `Erro ao buscar detalhes do chamado #${id}`));
    }
    return res.json();
  },

  async createAdminTicket(adminKey: string, input: CreateTicketInput): Promise<Ticket> {
    const res = await fetch(`${API_BASE}/admin/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': adminKey,
      },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(sanitizeErrorMessage(err?.message, 'Erro ao criar chamado administrativo.'));
    }
    return res.json();
  },

  async addAdminMessage(adminKey: string, ticketId: number, conteudo: string): Promise<Message> {
    const res = await fetch(`${API_BASE}/admin/tickets/${ticketId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': adminKey,
      },
      body: JSON.stringify({ conteudo }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(sanitizeErrorMessage(err?.message, 'Erro ao enviar resposta como administrador.'));
    }
    return res.json();
  },

  async setupTrelloWebhook(adminKey: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/admin/tickets/setup-trello-webhook`, {
      method: 'POST',
      headers: { 'X-Admin-Key': adminKey },
    });
    if (!res.ok) throw new Error('Erro ao configurar webhook do Trello.');
    return res.json();
  },
};
