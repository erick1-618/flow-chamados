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
      addToast(`Chamado ${ticket.protocolo} localizado!`, 'info');
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
      addToast('Mensagem enviada à equipe!', 'success');
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
      case 1: // Criado
        return status === 'CRIADO' ? 'active' : 'completed';
      case 2: // Em Andamento
        if (status === 'CRIADO') return '';
        if (status === 'EM_ANDAMENTO') return 'active';
        return 'completed';
      case 3: // Aguardando Ação
        if (status === 'CRIADO' || status === 'EM_ANDAMENTO') return '';
        if (status === 'AGUARDANDO_ACAO') return 'active';
        return 'completed';
      case 4: // Finalizado
        return status === 'FINALIZADO' ? 'completed active' : '';
      default:
        return '';
    }
  };

  return (
    <div className="view-container">
      {/* Barra de Consulta */}
      <div className="card">
        <div className="card-header-styled">
          <div className="card-header-icon">
            <IconSearch size={20} />
          </div>
          <div>
            <h2 className="card-title">Consultar Andamento do Chamado</h2>
            <p className="card-subtitle">
              Insira o número do protocolo gerado e o e-mail utilizado na abertura.
            </p>
          </div>
        </div>

        {erroBusca && (
          <div className="alert alert-error" role="alert">
            <span>{erroBusca}</span>
          </div>
        )}

        <form onSubmit={handleBuscar} className="form-corp">
          <div className="form-row-2">
            <div className="form-field">
              <label htmlFor="track-protocolo">Número do Protocolo</label>
              <input
                id="track-protocolo"
                type="text"
                required
                placeholder="Ex: FLOW-1042"
                value={protocolo}
                onChange={(e) => setProtocolo(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="track-email">E-mail do Solicitante</label>
              <input
                id="track-email"
                type="email"
                required
                placeholder="Ex: seu-email@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-footer-action">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loadingBusca}
            >
              <IconSearch size={16} />
              <span>{loadingBusca ? 'Consultando Base...' : 'Consultar Chamado'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Detalhes do Chamado Localizado */}
      {ticketAtual && (
        <div className="card ticket-detail-card">
          {/* Pipeline Visual de Status */}
          <div className="pipeline-container">
            <div className="pipeline-track">
              <div className={`pipeline-step ${getStepState(1)}`}>
                <div className="step-circle">1</div>
                <div className="step-text">Criado</div>
              </div>
              <div className="step-line" />
              <div className={`pipeline-step ${getStepState(2)}`}>
                <div className="step-circle">2</div>
                <div className="step-text">Em Andamento</div>
              </div>
              <div className="step-line" />
              <div className={`pipeline-step ${getStepState(3)}`}>
                <div className="step-circle">3</div>
                <div className="step-text">Aguardando Ação</div>
              </div>
              <div className="step-line" />
              <div className={`pipeline-step ${getStepState(4)}`}>
                <div className="step-circle">4</div>
                <div className="step-text">Finalizado</div>
              </div>
            </div>
          </div>

          {/* Cabeçalho do Chamado */}
          <div className="ticket-meta-header">
            <div>
              <div className="ticket-protocol-row">
                <span className="protocol-chip">{ticketAtual.protocolo}</span>
                {ticketAtual.tag && <TagBadge tag={ticketAtual.tag} />}
                <StatusBadge status={ticketAtual.status} />
              </div>
              <h3 className="ticket-title-large">{ticketAtual.titulo}</h3>
              <p className="ticket-author-info">
                Aberto por <strong>{ticketAtual.solicitanteNome}</strong> em{' '}
                {new Date(ticketAtual.createdAt).toLocaleString('pt-BR')}
              </p>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleBuscar()}
              title="Recarregar dados"
            >
              <IconRefresh size={14} />
              <span>Atualizar</span>
            </button>
          </div>

          {/* Descrição Original */}
          <div className="ticket-description-box">
            <span className="desc-box-label">DESCRIÇÃO INICIAL DA SOLICITAÇÃO</span>
            <p className="desc-box-content">{ticketAtual.descricao}</p>
          </div>

          {/* Histórico de Mensagens / Chat */}
          <div className="chat-section">
            <div className="chat-header">
              <h4 className="chat-title">
                Histórico de Mensagens ({ticketAtual.messages?.length || 0})
              </h4>
              <span className="chat-sync-hint">Sincronizado com a equipe</span>
            </div>

            <div className="chat-messages-scroll">
              {!ticketAtual.messages || ticketAtual.messages.length === 0 ? (
                <div className="chat-empty">
                  <p>Nenhuma mensagem adicional trocada até o momento.</p>
                  <span>Envie uma mensagem abaixo caso precise complementar informações.</span>
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
                          {isCliente ? 'Você' : 'Suporte Técnico (Equipe)'}
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

            {/* Input de Resposta */}
            <form onSubmit={handleEnviarMensagem} className="chat-input-form">
              <input
                type="text"
                placeholder="Escreva uma mensagem ou resposta para a equipe de suporte..."
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
                <IconSend size={16} />
                <span>{enviandoMensagem ? 'Enviando...' : 'Enviar'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
