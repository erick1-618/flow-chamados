import { useState } from 'react';
import type { Ticket } from '../types/ticket';
import { api } from '../services/api';
import { StatusBadge } from './StatusBadge';
import { TagBadge } from './TagBadge';
import { IconSearch, IconSend, IconRefresh } from './Icons';

interface TrackTicketViewProps {
  initialProtocolo?: string;
  initialEmail?: string;
  ticketAtual: Ticket | null;
  onTicketLoaded: (ticket: Ticket | null) => void;
  addToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const TrackTicketView = ({
  initialProtocolo = '',
  initialEmail = '',
  ticketAtual,
  onTicketLoaded,
  addToast,
}: TrackTicketViewProps) => {
  const [protocolo, setProtocolo] = useState(initialProtocolo);
  const [email, setEmail] = useState(initialEmail);
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [erroBusca, setErroBusca] = useState<string | null>(null);

  const [novaMensagem, setNovaMensagem] = useState('');
  const [enviandoMensagem, setEnviandoMensagem] = useState(false);

  const handleBuscar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const protoTrim = protocolo.trim().toUpperCase();
    const emailTrim = email.trim().toLowerCase();

    if (!protoTrim || !emailTrim) {
      setErroBusca('Informe o protocolo e o e-mail cadastrado.');
      return;
    }

    setLoadingBusca(true);
    setErroBusca(null);

    try {
      const ticket = await api.trackTicket({ protocolo: protoTrim, email: emailTrim });
      onTicketLoaded(ticket);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Chamado não encontrado.';
      setErroBusca(msg);
      onTicketLoaded(null);
    } finally {
      setLoadingBusca(false);
    }
  };

  const handleEnviarMensagem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketAtual || !novaMensagem.trim()) return;

    setEnviandoMensagem(true);
    try {
      const msg = await api.addClientMessage(ticketAtual.protocolo, {
        email: ticketAtual.solicitanteEmail,
        conteudo: novaMensagem.trim(),
      });

      onTicketLoaded({
        ...ticketAtual,
        messages: [...(ticketAtual.messages || []), msg],
      });

      setNovaMensagem('');
      addToast('Mensagem enviada!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao enviar mensagem.';
      addToast(msg, 'error');
    } finally {
      setEnviandoMensagem(false);
    }
  };

  const getStepState = (stepNumber: number) => {
    if (!ticketAtual) return '';
    const status = ticketAtual.status;

    switch (stepNumber) {
      case 1:
        return status === 'CRIADO' ? 'active' : 'completed';
      case 2:
        if (status === 'CRIADO') return '';
        if (status === 'EM_ANDAMENTO') return 'active';
        return 'completed';
      case 3:
        if (status === 'CRIADO' || status === 'EM_ANDAMENTO') return '';
        if (status === 'AGUARDANDO_ACAO') return 'active';
        return 'completed';
      case 4:
        return status === 'FINALIZADO' ? 'completed active' : '';
      default:
        return '';
    }
  };

  return (
    <div className="view-container">
      {/* Busca Rápida e Direta */}
      <div className="card">
        <h2 className="card-title" style={{ marginBottom: '1rem' }}>Consultar Chamado</h2>

        {erroBusca && (
          <div className="alert alert-error" role="alert">
            <span>{erroBusca}</span>
          </div>
        )}

        <form onSubmit={handleBuscar} className="form-inline-search">
          <input
            type="text"
            required
            placeholder="Protocolo (ex: FLOW-1042)"
            value={protocolo}
            onChange={(e) => setProtocolo(e.target.value)}
            className="input-proto"
          />

          <input
            type="email"
            required
            placeholder="E-mail informado"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-email"
          />

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loadingBusca}
          >
            <IconSearch size={15} />
            <span>{loadingBusca ? 'Buscando...' : 'Buscar'}</span>
          </button>
        </form>
      </div>

      {/* Detalhes do Chamado */}
      {ticketAtual && (
        <div className="card ticket-detail-card">
          {/* Stepper Linear Compacto */}
          <div className="pipeline-container">
            <div className="pipeline-track">
              <div className={`pipeline-step ${getStepState(1)}`}>
                <span className="step-circle">1</span>
                <span className="step-text">Criado</span>
              </div>
              <div className="step-line" />
              <div className={`pipeline-step ${getStepState(2)}`}>
                <span className="step-circle">2</span>
                <span className="step-text">Em Andamento</span>
              </div>
              <div className="step-line" />
              <div className={`pipeline-step ${getStepState(3)}`}>
                <span className="step-circle">3</span>
                <span className="step-text">Aguardando</span>
              </div>
              <div className="step-line" />
              <div className={`pipeline-step ${getStepState(4)}`}>
                <span className="step-circle">4</span>
                <span className="step-text">Finalizado</span>
              </div>
            </div>
          </div>

          {/* Cabeçalho */}
          <div className="ticket-meta-header">
            <div>
              <div className="ticket-protocol-row">
                <span className="protocol-chip">{ticketAtual.protocolo}</span>
                {ticketAtual.tag && <TagBadge tag={ticketAtual.tag} size="sm" />}
                <StatusBadge status={ticketAtual.status} size="sm" />
              </div>
              <h3 className="ticket-title-large">{ticketAtual.titulo}</h3>
              <p className="ticket-author-info">
                {ticketAtual.solicitanteNome} • {new Date(ticketAtual.createdAt).toLocaleString('pt-BR')}
              </p>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleBuscar()}
              title="Atualizar"
            >
              <IconRefresh size={13} />
              <span>Atualizar</span>
            </button>
          </div>

          {/* Descrição */}
          <div className="ticket-description-box">
            <p className="desc-box-content">{ticketAtual.descricao}</p>
          </div>

          {/* Conversa / Mensagens */}
          <div className="chat-section">
            <div className="chat-header">
              <span className="chat-title">Mensagens ({ticketAtual.messages?.length || 0})</span>
            </div>

            <div className="chat-messages-scroll">
              {!ticketAtual.messages || ticketAtual.messages.length === 0 ? (
                <div className="chat-empty">
                  <p>Nenhuma mensagem enviada ainda.</p>
                </div>
              ) : (
                ticketAtual.messages.map((m) => {
                  const isCliente = m.autor === 'CLIENTE';
                  return (
                    <div
                      key={m.id}
                      className={`chat-bubble-row ${isCliente ? 'chat-right' : 'chat-left'}`}
                    >
                      <div className={`chat-bubble ${isCliente ? 'bubble-client' : 'bubble-support'}`}>
                        <div className="bubble-author">
                          {isCliente ? 'Você' : 'Suporte'}
                        </div>
                        <div className="bubble-body">{m.conteudo}</div>
                        <div className="bubble-time">
                          {new Date(m.createdAt).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleEnviarMensagem} className="chat-input-form">
              <input
                type="text"
                placeholder="Enviar mensagem ou resposta ao suporte..."
                value={novaMensagem}
                onChange={(e) => setNovaMensagem(e.target.value)}
                maxLength={1000}
                required
              />
              <button
                type="submit"
                className="btn btn-primary btn-chat-send"
                disabled={enviandoMensagem || !novaMensagem.trim()}
              >
                <IconSend size={14} />
                <span>{enviandoMensagem ? '...' : 'Enviar'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
