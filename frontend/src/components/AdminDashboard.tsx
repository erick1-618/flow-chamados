import { useState, useEffect } from 'react';
import type { CreateTicketInput, Ticket, TicketStatus } from '../types/ticket';
import { api } from '../services/api';
import { StatusBadge } from './StatusBadge';
import { TagBadge, ComplexityBadge, CORPORATE_TAGS } from './TagBadge';
import {
  IconClose,
  IconExternalLink,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSend,
  IconShield,
  IconTrash,
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
  targetTicketProto?: string | null;
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
  targetTicketProto,
}: AdminDashboardProps) => {

  const [filtroStatus, setFiltroStatus] = useState<TicketStatus | ''>('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('');
  const [filtroComplexidade, setFiltroComplexidade] = useState<string>('');
  const [ordenacao, setOrdenacao] = useState<'recentes' | 'conclusao_asc' | 'conclusao_desc' | 'complexidade_desc' | 'complexidade_asc'>('recentes');
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
  const [manualTag, setManualTag] = useState<string>('Suporte TI');
  const [manualComplexidade, setManualComplexidade] = useState<string>('Baixa');
  const [manualDataCard, setManualDataCard] = useState<string>(() => new Date().toISOString().split('T')[0]);
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

  // Auto-selecionar chamado vindo do link direto do Trello
  useEffect(() => {
    if (targetTicketProto && tickets.length > 0 && !selectedTicket) {
      const match = tickets.find(
        (t) => t.protocolo.toLowerCase() === targetTicketProto.trim().toLowerCase()
      );
      if (match) {
        handleOpenDetail(match);
      }
    }
  }, [targetTicketProto, tickets]);


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
        complexidade: manualComplexidade,
        dataCard: manualDataCard || undefined,
      };
      const created = await api.createAdminTicket(adminKey, input);
      setShowManualModal(false);
      setManualNome('');
      setManualEmail('');
      setManualTitulo('');
      setManualDescricao('');
      setManualTag('Suporte TI');
      setManualComplexidade('Baixa');
      addToast(`Chamado manual ${created.protocolo} criado e sincronizado no Trello!`, 'success');
      onReloadTickets();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao criar chamado manual.';
      addToast(msg, 'error');
    } finally {
      setSalvandoManual(false);
    }
  };

  // Exclusão de chamado (apaga DB + move para lista Excluido no Trello)
  const handleDeleteTicket = async (id: number, protocolo: string) => {
    const confirmDelete = window.confirm(
      `Deseja realmente excluir o chamado ${protocolo}? Esta ação apagará todas as mensagens e moverá o cartão para 'Excluído' no Trello.`
    );
    if (!confirmDelete) return;

    try {
      await api.deleteAdminTicket(adminKey, id);
      addToast(`Chamado ${protocolo} excluído com sucesso.`, 'info');
      if (selectedTicket?.id === id) {
        setSelectedTicket(null);
      }
      onReloadTickets();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao excluir chamado.';
      addToast(msg, 'error');
    }
  };

  const getComplexityWeight = (comp?: string): number => {
    if (!comp) return 0;
    const lower = comp.toLowerCase();
    if (lower.includes('alt') || lower.includes('moderado')) return 3;
    if (lower.includes('méd') || lower.includes('med')) return 2;
    if (lower.includes('baix')) return 1;
    return 0;
  };

  const categoriasDisponiveis = Array.from(
    new Set([
      ...CORPORATE_TAGS.map((t) => t.name),
      ...tickets.map((t) => t.tag).filter(Boolean) as string[],
    ])
  );

  // Filtragem e ordenação no client-side
  const ticketsFiltrados = tickets
    .filter((t) => {
      if (filtroStatus && t.status !== filtroStatus) return false;
      if (filtroCategoria && t.tag?.toLowerCase() !== filtroCategoria.toLowerCase()) return false;
      if (filtroComplexidade && t.complexidade?.toLowerCase() !== filtroComplexidade.toLowerCase()) return false;
      if (filtroBusca.trim()) {
        const q = filtroBusca.toLowerCase().trim();
        const matchProto = t.protocolo.toLowerCase().includes(q);
        const matchTitulo = t.titulo.toLowerCase().includes(q);
        const matchNome = t.solicitanteNome.toLowerCase().includes(q);
        const matchEmail = t.solicitanteEmail.toLowerCase().includes(q);
        const matchTag = t.tag?.toLowerCase().includes(q);
        return matchProto || matchTitulo || matchNome || matchEmail || matchTag;
      }
      return true;
    })
    .sort((a, b) => {
      if (ordenacao === 'conclusao_asc') {
        if (!a.dataCard && !b.dataCard) return 0;
        if (!a.dataCard) return 1;
        if (!b.dataCard) return -1;
        return a.dataCard.localeCompare(b.dataCard);
      }
      if (ordenacao === 'conclusao_desc') {
        if (!a.dataCard && !b.dataCard) return 0;
        if (!a.dataCard) return 1;
        if (!b.dataCard) return -1;
        return b.dataCard.localeCompare(a.dataCard);
      }
      if (ordenacao === 'complexidade_desc') {
        const diff = getComplexityWeight(b.complexidade) - getComplexityWeight(a.complexidade);
        if (diff !== 0) return diff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (ordenacao === 'complexidade_asc') {
        const diff = getComplexityWeight(a.complexidade) - getComplexityWeight(b.complexidade);
        if (diff !== 0) return diff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      // Padrão: mais recentes primeiro
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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
            <h2 className="card-title">Acesso Restrito</h2>
            <p className="card-subtitle">
              Insira a chave de segurança administrativa para gerenciar a fila de suporte técnico.
            </p>
          </div>

          {targetTicketProto && (
            <div className="alert alert-info" role="alert" style={{ marginBottom: '1rem' }}>
              <span>
                Chamado <strong>{targetTicketProto}</strong> acessado via Trello. Autentique-se para abrir a conversa diretamente.
              </span>
            </div>
          )}

          {authError && (
            <div className="alert alert-error" role="alert">
              <span>{authError}</span>
            </div>
          )}


          <form onSubmit={handleLogin} className="form-corp">
            <div className="form-field">
              <label htmlFor="admin-key-input">Chave de Acesso</label>
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
      {/* Resumo compacto de métricas */}
      <div className="admin-stats-bar">
        <div className="admin-stat-item">
          <span className="stat-label">Total</span>
          <span className="stat-val">{countTotal}</span>
        </div>
        <div className="admin-stat-item">
          <span className="stat-label">Criados</span>
          <span className="stat-val stat-criado">{countCriado}</span>
        </div>
        <div className="admin-stat-item">
          <span className="stat-label">Em Andamento</span>
          <span className="stat-val stat-andamento">{countAndamento}</span>
        </div>
        <div className="admin-stat-item">
          <span className="stat-label">Aguardando</span>
          <span className="stat-val stat-aguardando">{countAguardando}</span>
        </div>
        <div className="admin-stat-item">
          <span className="stat-label">Finalizados</span>
          <span className="stat-val stat-finalizado">{countFinalizado}</span>
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
            title="Filtrar por Status"
          >
            <option value="">Todos os Status</option>
            <option value="CRIADO">Criado</option>
            <option value="EM_ANDAMENTO">Em Andamento</option>
            <option value="AGUARDANDO_ACAO">Aguardando Ação</option>
            <option value="FINALIZADO">Finalizado</option>
          </select>

          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="select-status"
            title="Filtrar por Categoria / Classe"
          >
            <option value="">Todas as Categorias</option>
            {categoriasDisponiveis.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={ordenacao}
            onChange={(e) =>
              setOrdenacao(
                e.target.value as
                  | 'recentes'
                  | 'conclusao_asc'
                  | 'conclusao_desc'
                  | 'complexidade_desc'
                  | 'complexidade_asc'
              )
            }
            className="select-status"
            title="Ordenar registros"
          >
            <option value="recentes">Mais recentes</option>
            <option value="conclusao_asc">Conclusão requerida (Mais próxima)</option>
            <option value="conclusao_desc">Conclusão requerida (Mais distante)</option>
            <option value="complexidade_desc">Ordem de Complexidade (Alta ➔ Baixa)</option>
            <option value="complexidade_asc">Ordem de Complexidade (Baixa ➔ Alta)</option>
          </select>

          <select
            value={filtroComplexidade}
            onChange={(e) => setFiltroComplexidade(e.target.value)}
            className="select-status"
            title="Filtrar por Complexidade"
          >
            <option value="">Todas as Complexidades</option>
            <option value="Baixa">Baixa</option>
            <option value="Média">Média</option>
            <option value="Alta">Alta</option>
          </select>

          {(filtroStatus || filtroCategoria || filtroComplexidade || filtroBusca || ordenacao !== 'recentes') && (
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={() => {
                setFiltroStatus('');
                setFiltroCategoria('');
                setFiltroComplexidade('');
                setFiltroBusca('');
                setOrdenacao('recentes');
              }}
              title="Limpar todos os filtros"
            >
              <span>Limpar filtros</span>
            </button>
          )}

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
                <th style={{ width: 140 }}>Protocolo</th>
                <th>Assunto do Chamado</th>
                <th style={{ width: 220 }}>Solicitante</th>
                <th style={{ width: 160 }}>Status (Trello)</th>
                <th style={{ width: 150 }}>Data de Entrega</th>
                <th style={{ width: 190, textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="table-empty-row">
                    Carregando registros de chamados...
                  </td>
                </tr>
              ) : ticketsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-empty-row">
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
                      <div className="table-ticket-tags">
                        {t.tag && <TagBadge tag={t.tag} size="sm" />}
                        {t.complexidade && <ComplexityBadge complexidade={t.complexidade} size="sm" />}
                      </div>
                    </td>
                    <td>
                      <div className="table-user-name">{t.solicitanteNome}</div>
                      <div className="table-user-email">{t.solicitanteEmail}</div>
                    </td>
                    <td>
                      <StatusBadge status={t.status} size="sm" />
                    </td>
                    <td className="table-date">
                      {t.dataCard ? (
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {new Date(t.dataCard + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Sem prazo
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions-group">
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={() => handleOpenDetail(t)}
                        >
                          Detalhes
                        </button>
                        {t.trelloCardUrl && (
                          <a
                            href={t.trelloCardUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-trello-link btn-xs"
                            title="Abrir cartão no Trello"
                          >
                            <span>Trello</span>
                            <IconExternalLink size={12} />
                          </a>
                        )}
                        <button
                          type="button"
                          className="btn btn-danger-outline btn-xs"
                          onClick={() => handleDeleteTicket(t.id, t.protocolo)}
                          title="Excluir chamado"
                        >
                          <IconTrash size={12} />
                          <span>Excluir</span>
                        </button>
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
                  <StatusBadge status={selectedTicket.status} />
                  {selectedTicket.tag && <TagBadge tag={selectedTicket.tag} size="sm" />}
                  {selectedTicket.complexidade && <ComplexityBadge complexidade={selectedTicket.complexidade} size="sm" />}
                  {selectedTicket.trelloCardUrl && (
                    <a
                      href={selectedTicket.trelloCardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-trello-link btn-xs"
                      title="Abrir no Trello"
                    >
                      <span>Quadro Trello</span>
                      <IconExternalLink size={12} />
                    </a>
                  )}
                </div>
                <h3 className="modal-title">{selectedTicket.titulo}</h3>
                <span className="modal-subtitle">
                  Solicitante: <strong>{selectedTicket.solicitanteNome}</strong> ({selectedTicket.solicitanteEmail})
                  {selectedTicket.dataCard && (
                    <> • Data de Entrega: <strong>{new Date(selectedTicket.dataCard + 'T00:00:00').toLocaleDateString('pt-BR')}</strong></>
                  )}
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

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-danger-outline btn-sm"
                onClick={() => handleDeleteTicket(selectedTicket.id, selectedTicket.protocolo)}
              >
                <IconTrash size={14} />
                <span>Excluir Chamado</span>
              </button>
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
                <label>Descrição Detalhada <span className="req">*</span></label>
                <textarea
                  rows={4}
                  required
                  placeholder="Instruções ou informações do chamado"
                  value={manualDescricao}
                  onChange={(e) => setManualDescricao(e.target.value)}
                />
              </div>

              <div className="form-row-2">
                <div className="form-field">
                  <label>Classe / Categoria</label>
                  <select
                    value={manualTag}
                    onChange={(e) => setManualTag(e.target.value)}
                    className="select-status"
                    style={{ width: '100%', height: '38px' }}
                  >
                    {CORPORATE_TAGS.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Complexidade</label>
                  <select
                    value={manualComplexidade}
                    onChange={(e) => setManualComplexidade(e.target.value)}
                    className="select-status"
                    style={{ width: '100%', height: '38px' }}
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label>Data de Entrega <span className="req">*</span></label>
                <input
                  type="date"
                  required
                  value={manualDataCard}
                  onChange={(e) => setManualDataCard(e.target.value)}
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
