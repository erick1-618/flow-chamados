import { useState } from 'react';
import type { CreateTicketInput, Ticket, TicketStatus } from '../types/ticket';
import { api } from '../services/api';
import { StatusBadge } from './StatusBadge';
import { TagBadge, CORPORATE_TAGS } from './TagBadge';
import {
  IconClose,
  IconExternalLink,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSend,
  IconShield,
} from './Icons';

interface AdminDashboardProps {
  adminKey: string;
  setAdminKey: (key: string) => void;
  isAdminAuth: boolean;
  setIsAdminAuth: (auth: boolean) => void;
  tickets: Ticket[];
  onReloadTickets: () => void;
  loading: boolean;
  addToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminDashboard = ({
  adminKey,
  setAdminKey,
  isAdminAuth,
  setIsAdminAuth,
  tickets,
  onReloadTickets,
  loading,
  addToast,
}: AdminDashboardProps) => {
  const [filtroStatus, setFiltroStatus] = useState<TicketStatus | ''>('');
  const [filtroTag, setFiltroTag] = useState<string>('');
  const [filtroBusca, setFiltroBusca] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [adminReply, setAdminReply] = useState('');
  const [enviandoReply, setEnviandoReply] = useState(false);

  const [showManualModal, setShowManualModal] = useState(false);
  const [manualNome, setManualNome] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualTitulo, setManualTitulo] = useState('');
  const [manualDescricao, setManualDescricao] = useState('');
  const [manualTag, setManualTag] = useState('TI & Sistemas');
  const [salvandoManual, setSalvandoManual] = useState(false);

  // Autenticação simples com a chave corporativa
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const keyTrim = adminKey.trim();
    if (!keyTrim) return;

    setAuthError(null);
    try {
      await api.listAdminTickets(keyTrim);
      setIsAdminAuth(true);
      sessionStorage.setItem('flow_admin_key', keyTrim);
      localStorage.removeItem('flow_admin_key'); // limpa chave antiga de versoes anteriores
      addToast('Acesso administrativo autenticado!', 'success');
      onReloadTickets();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na autenticação administrativa.';
      setAuthError(msg);
      addToast(msg, 'error');
    }
  };

  const handleLogout = () => {
    setIsAdminAuth(false);
    setAdminKey('');
    sessionStorage.removeItem('flow_admin_key');
    localStorage.removeItem('flow_admin_key');
    setSelectedTicket(null);
    addToast('Sessão administrativa encerrada.', 'info');
  };

  // Abrir detalhes com mensagens atualizadas
  const handleOpenDetail = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setLoadingDetail(true);
    try {
      const fullTicket = await api.getAdminTicket(adminKey, ticket.id);
      setSelectedTicket(fullTicket);
    } catch (err) {
      console.error('Falha ao obter detalhes completos:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Enviar resposta administrativa
  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !adminReply.trim()) return;

    setEnviandoReply(true);
    try {
      const msg = await api.addAdminMessage(adminKey, selectedTicket.id, adminReply.trim());
      setSelectedTicket((prev) => (prev ? { ...prev, messages: [...(prev.messages || []), msg] } : null));
      setAdminReply('');
      addToast('Resposta enviada ao solicitante e espelhada no Trello!', 'success');
      onReloadTickets();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao registrar resposta.';
      addToast(msg, 'error');
    } finally {
      setEnviandoReply(false);
    }
  };

  // Criação manual de chamado pelo admin
  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualNome.trim() || !manualEmail.trim() || !manualTitulo.trim() || !manualDescricao.trim()) return;

    setSalvandoManual(true);
    try {
      const input: CreateTicketInput = {
        nome: manualNome.trim(),
        email: manualEmail.trim(),
        titulo: manualTitulo.trim(),
        descricao: manualDescricao.trim(),
        tag: manualTag,
      };
      const created = await api.createAdminTicket(adminKey, input);
      setShowManualModal(false);
      setManualNome('');
      setManualEmail('');
      setManualTitulo('');
      setManualDescricao('');
      addToast(`Chamado manual ${created.protocolo} criado e sincronizado no Trello!`, 'success');
      onReloadTickets();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao criar chamado manual.';
      addToast(msg, 'error');
    } finally {
      setSalvandoManual(false);
    }
  };

  // Filtragem em memória no client-side para busca instantânea
  const ticketsFiltrados = tickets.filter((t) => {
    if (filtroStatus && t.status !== filtroStatus) return false;
    if (filtroTag && t.tag !== filtroTag) return false;
    if (filtroBusca.trim()) {
      const q = filtroBusca.toLowerCase();
      const matchProto = t.protocolo.toLowerCase().includes(q);
      const matchTitulo = t.titulo.toLowerCase().includes(q);
      const matchNome = t.solicitanteNome.toLowerCase().includes(q);
      const matchEmail = t.solicitanteEmail.toLowerCase().includes(q);
      const matchTag = t.tag ? t.tag.toLowerCase().includes(q) : false;
      return matchProto || matchTitulo || matchNome || matchEmail || matchTag;
    }
    return true;
  });

  const countTotal = tickets.length;
  const countCriado = tickets.filter((t) => t.status === 'CRIADO').length;
  const countAndamento = tickets.filter((t) => t.status === 'EM_ANDAMENTO').length;
  const countAguardando = tickets.filter((t) => t.status === 'AGUARDANDO_ACAO').length;
  const countFinalizado = tickets.filter((t) => t.status === 'FINALIZADO').length;

  if (!isAdminAuth) {
    return (
      <div className="view-container">
        <div className="card auth-card">
          <div className="card-header-styled text-center">
            <div className="card-header-icon mx-auto">
              <IconShield size={24} />
            </div>
            <h2 className="card-title">Acesso Restrito da Equipe</h2>
            <p className="card-subtitle">
              Insira a chave de segurança administrativa para gerenciar a fila de suporte técnico.
            </p>
          </div>

          {authError && (
            <div className="alert alert-error" role="alert">
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="form-corp">
            <div className="form-field">
              <label htmlFor="admin-key-input">Chave de Acesso (X-Admin-Key)</label>
              <input
                id="admin-key-input"
                type="password"
                required
                placeholder="Insira sua chave de acesso"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Autenticar e Acessar Painel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="view-container-full">
      {/* Grade de Métricas Corporativas */}
      <div className="metrics-grid">
        <div className="metric-tile">
          <span className="metric-label">Total de Chamados</span>
          <span className="metric-number">{countTotal}</span>
        </div>
        <div className="metric-tile tile-criado">
          <span className="metric-label">Criados</span>
          <span className="metric-number">{countCriado}</span>
        </div>
        <div className="metric-tile tile-andamento">
          <span className="metric-label">Em Andamento</span>
          <span className="metric-number">{countAndamento}</span>
        </div>
        <div className="metric-tile tile-aguardando">
          <span className="metric-label">Aguardando Ação</span>
          <span className="metric-number">{countAguardando}</span>
        </div>
        <div className="metric-tile tile-finalizado">
          <span className="metric-label">Finalizados</span>
          <span className="metric-number">{countFinalizado}</span>
        </div>
      </div>

      {/* Barra de Ferramentas / Filtros */}
      <div className="toolbar-card">
        <div className="toolbar-filters">
          <div className="search-input-wrapper">
            <IconSearch size={16} className="search-input-icon" />
            <input
              type="text"
              placeholder="Buscar por protocolo, título, solicitante ou e-mail..."
              value={filtroBusca}
              onChange={(e) => setFiltroBusca(e.target.value)}
            />
          </div>

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as TicketStatus | '')}
            className="select-status"
          >
            <option value="">Todos os Status</option>
            <option value="CRIADO">Criado</option>
            <option value="EM_ANDAMENTO">Em Andamento</option>
            <option value="AGUARDANDO_ACAO">Aguardando Ação</option>
            <option value="FINALIZADO">Finalizado</option>
          </select>

          <select
            value={filtroTag}
            onChange={(e) => setFiltroTag(e.target.value)}
            className="select-status"
          >
            <option value="">Todas as Áreas (Tags)</option>
            {CORPORATE_TAGS.map((tag) => (
              <option key={tag.id} value={tag.name}>
                {tag.icon} {tag.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onReloadTickets}
            disabled={loading}
            title="Recarregar chamados"
          >
            <IconRefresh size={14} />
            <span>Atualizar</span>
          </button>
        </div>

        <div className="toolbar-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowManualModal(true)}
          >
            <IconPlus size={14} />
            <span>Novo Chamado</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleLogout}
          >
            <span>Sair</span>
          </button>
        </div>
      </div>

      {/* Tabela de Chamados Corporativa */}
      <div className="table-card">
        <div className="table-wrapper">
          <table className="corp-table">
            <thead>
              <tr>
                <th style={{ width: 130 }}>Protocolo</th>
                <th>Assunto do Chamado</th>
                <th style={{ width: 160 }}>Departamento</th>
                <th style={{ width: 200 }}>Solicitante</th>
                <th style={{ width: 150 }}>Status (Trello)</th>
                <th style={{ width: 120 }}>Abertura</th>
                <th style={{ width: 180, textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="table-empty-row">
                    Carregando registros de chamados...
                  </td>
                </tr>
              ) : ticketsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="table-empty-row">
                    Nenhum chamado encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                ticketsFiltrados.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <span className="table-protocol">{t.protocolo}</span>
                    </td>
                    <td>
                      <div className="table-ticket-title" title={t.titulo}>
                        {t.titulo}
                      </div>
                    </td>
                    <td>
                      {t.tag ? (
                        <TagBadge tag={t.tag} size="sm" />
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Geral</span>
                      )}
                    </td>
                    <td>
                      <div className="table-user-name">{t.solicitanteNome}</div>
                      <div className="table-user-email">{t.solicitanteEmail}</div>
                    </td>
                    <td>
                      <StatusBadge status={t.status} size="sm" />
                    </td>
                    <td className="table-date">
                      {new Date(t.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions-group">
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={() => handleOpenDetail(t)}
                        >
                          Ver Detalhes
                        </button>
                        {t.trelloCardUrl && (
                          <a
                            href={t.trelloCardUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-trello-link btn-xs"
                            title="Abrir cartão correspondente no Trello"
                          >
                            <span>Trello</span>
                            <IconExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Gaveta de Detalhes do Chamado */}
      {selectedTicket && (
        <div className="modal-backdrop" onClick={() => setSelectedTicket(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-info">
                <div className="ticket-protocol-row">
                  <span className="protocol-chip">{selectedTicket.protocolo}</span>
                  {selectedTicket.tag && <TagBadge tag={selectedTicket.tag} />}
                  <StatusBadge status={selectedTicket.status} />
                </div>
                <h3 className="modal-title">{selectedTicket.titulo}</h3>
                <span className="modal-subtitle">
                  Solicitante: <strong>{selectedTicket.solicitanteNome}</strong> ({selectedTicket.solicitanteEmail}) • Criado em{' '}
                  {new Date(selectedTicket.createdAt).toLocaleString('pt-BR')}
                </span>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setSelectedTicket(null)}
                aria-label="Fechar detalhes"
              >
                <IconClose size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Aviso Estrito do Trello */}
              <div className="trello-status-banner">
                <div className="trello-banner-text">
                  <strong>Fluxo de Status Sincronizado via Trello</strong>
                  <p>
                    A transição de status deste chamado é controlada movendo o cartão entre as colunas do seu quadro no Trello.
                  </p>
                </div>
                {selectedTicket.trelloCardUrl && (
                  <a
                    href={selectedTicket.trelloCardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-trello-link"
                  >
                    <span>Abrir Card no Trello</span>
                    <IconExternalLink size={14} />
                  </a>
                )}
              </div>

              {/* Descrição Original */}
              <div className="ticket-description-box">
                <span className="desc-box-label">DESCRIÇÃO INICIAL</span>
                <p className="desc-box-content">{selectedTicket.descricao}</p>
              </div>

              {/* Histórico da Thread */}
              <div className="modal-chat-section">
                <div className="chat-header">
                  <h4 className="chat-title">
                    Histórico de Mensagens ({selectedTicket.messages?.length || 0})
                  </h4>
                  {loadingDetail && <span className="chat-loading-hint">Carregando mensagens...</span>}
                </div>

                <div className="modal-chat-messages">
                  {!selectedTicket.messages || selectedTicket.messages.length === 0 ? (
                    <div className="chat-empty">
                      <p>Nenhuma mensagem enviada nesta thread até agora.</p>
                    </div>
                  ) : (
                    selectedTicket.messages.map((m) => {
                      const isEquipe = m.autor === 'ADMIN';
                      return (
                        <div
                          key={m.id}
                          className={`chat-bubble-row ${isEquipe ? 'chat-right' : 'chat-left'}`}
                        >
                          <div className={`chat-bubble ${isEquipe ? 'bubble-support' : 'bubble-client'}`}>
                            <div className="bubble-author">
                              {isEquipe ? 'Você (Suporte Flow)' : selectedTicket.solicitanteNome}
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

                {/* Formulário de Resposta da Equipe */}
                <form onSubmit={handleSendAdminReply} className="modal-chat-reply-form">
                  <input
                    type="text"
                    placeholder="Escreva uma resposta oficial ao solicitante..."
                    value={adminReply}
                    onChange={(e) => setAdminReply(e.target.value)}
                    maxLength={1000}
                    required
                  />
                  <button
                    type="submit"
                    className="btn btn-primary btn-chat-send"
                    disabled={enviandoReply || !adminReply.trim()}
                  >
                    <IconSend size={16} />
                    <span>{enviandoReply ? 'Enviando...' : 'Responder'}</span>
                  </button>
                </form>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedTicket(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação Manual de Chamado */}
      {showManualModal && (
        <div className="modal-backdrop" onClick={() => setShowManualModal(false)}>
          <div className="modal-dialog modal-dialog-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Novo Chamado Manual (Equipe)</h3>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setShowManualModal(false)}
              >
                <IconClose size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateManual} className="form-corp modal-body">
              <div className="form-field">
                <label>Nome do Solicitante <span className="req">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Nome do cliente/usuário"
                  value={manualNome}
                  onChange={(e) => setManualNome(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label>E-mail do Solicitante <span className="req">*</span></label>
                <input
                  type="email"
                  required
                  placeholder="email@empresa.com"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label>Título do Chamado <span className="req">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Resumo do problema"
                  value={manualTitulo}
                  onChange={(e) => setManualTitulo(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label>Área / Departamento (Tag Trello) <span className="req">*</span></label>
                <select
                  value={manualTag}
                  onChange={(e) => setManualTag(e.target.value)}
                  className="select-status"
                >
                  {CORPORATE_TAGS.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.icon} {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Descrição Detalhada <span className="req">*</span></label>
                <textarea
                  rows={4}
                  required
                  placeholder="Instruções ou informações do chamado"
                  value={manualDescricao}
                  onChange={(e) => setManualDescricao(e.target.value)}
                />
              </div>

              <div className="modal-footer" style={{ padding: '0.5rem 0 0 0' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowManualModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={salvandoManual}
                >
                  {salvandoManual ? 'Gravando e Sincronizando...' : 'Criar Chamado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
