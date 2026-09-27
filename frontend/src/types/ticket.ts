export type TicketStatus = 'CRIADO' | 'EM_ANDAMENTO' | 'AGUARDANDO_ACAO' | 'FINALIZADO';

export type MessageAuthor = 'CLIENTE' | 'ADMIN';

export interface Message {
  id: number;
  autor: MessageAuthor;
  conteudo: string;
  createdAt: string;
}

export interface Ticket {
  id: number;
  protocolo: string;
  titulo: string;
  descricao: string;
  solicitanteNome: string;
  solicitanteEmail: string;
  status: TicketStatus;
  trelloCardId?: string;
  trelloListId?: string;
  trelloCardUrl?: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export interface CreateTicketInput {
  nome: string;
  email: string;
  titulo: string;
  descricao: string;
}

export interface TrackTicketInput {
  protocolo: string;
  email: string;
}

export interface CreateMessageInput {
  email?: string;
  conteudo: string;
}

export interface HealthCheckResponse {
  status: string;
  service: string;
  message: string;
  timestamp: string;
}
