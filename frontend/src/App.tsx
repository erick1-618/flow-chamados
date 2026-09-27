import React, { useEffect, useState } from 'react';
import { api } from './services/api';
import type {
  CreateTicketInput,
  HealthCheckResponse,
  Ticket,
  TicketStatus,
  TrackTicketInput,
} from './types/ticket';
import './App.css';

export function App() {
  const [activeTab, setActiveTab] = useState<'abrir' | 'acompanhar' | 'admin'>('abrir');
  const [backendHealth, setBackendHealth] = useState<HealthCheckResponse | null>(null);

  // --- TAB: ABRIR CHAMADO ---
  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [ticketCriado, setTicketCriado] = useState<Ticket | null>(null);
  const [loadingCriacao, setLoadingCriacao] = useState(false);
  const [erroCriacao, setErroCriacao] = useState<string | null>(null);

  // --- TAB: ACOMPANHAR / CHAT CLIENTE ---
  const [buscaProtocolo, setBuscaProtocolo] = useState('');
  const [buscaEmail, setBuscaEmail] = useState('');
  const [ticketAtual, setTicketAtual] = useState<Ticket | null>(null);
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [erroBusca, setErroBusca] = useState<string | null>(null);
  const [novaMensagemCliente, setNovaMensagemCliente] = useState('');
  const [enviandoMensagem, setEnviandoMensagem] = useState(false);

  // --- TAB: ADMIN ---
  const [adminKey, setAdminKey] = useState<string>(() => localStorage.getItem('flow_admin_key') || 'flow-admin-secret-2026');
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [adminTickets, setAdminTickets] = useState<Ticket[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<TicketStatus | ''>('');
  const [filtroBusca, setFiltroBusca] = useState('');
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [erroAdmin, setErroAdmin] = useState<string | null>(null);
  const [selectedAdminTicket, setSelectedAdminTicket] = useState<Ticket | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [enviandoAdminReply, setEnviandoAdminReply] = useState(false);
  const [showNovoManualModal, setShowNovoManualModal] = useState(false);

  // Health check inicial
  useEffect(() => {
    api.getHealth()
      .then(setBackendHealth)
      .catch(() => setBackendHealth(null));
  }, []);

  // Handlers do Cliente: Abertura
  const handleCriarTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroCriacao(null);
    setLoadingCriacao(true);

    try {
      const input: CreateTicketInput = {
        nome: novoNome.trim(),
        email: novoEmail.trim(),
        titulo: novoTitulo.trim(),
        descricao: novaDescricao.trim(),
      };
      const result = await api.createTicket(input);
      setTicketCriado(result);
      setNovoNome('');
      setNovoEmail('');
      setNovoTitulo('');
      setNovaDescricao('');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErroCriacao(err.message);
      }
    } finally {
      setLoadingCriacao(false);
    }
  };

  // Handlers do Cliente: Acompanhamento & Chat
  const handleBuscarTicket = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!buscaProtocolo.trim() || !buscaEmail.trim()) return;

    setErroBusca(null);
    setLoadingBusca(true);

    try {
      const input: TrackTicketInput = {
        protocolo: buscaProtocolo.trim().toUpperCase(),
        email: buscaEmail.trim().toLowerCase(),
      };
      const result = await api.trackTicket(input);
      setTicketAtual(result);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErroBusca(err.message);
      }
      setTicketAtual(null);
    } finally {
      setLoadingBusca(false);
    }
  };

  const handleEnviarMensagemCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketAtual || !novaMensagemCliente.trim()) return;

    setEnviandoMensagem(true);
    try {
      const msg = await api.addClientMessage(ticketAtual.protocolo, {
        email: ticketAtual.solicitanteEmail,
        conteudo: novaMensagemCliente.trim(),
      });
      setTicketAtual((prev) => prev ? { ...prev, messages: [...prev.messages, msg] } : null);
      setNovaMensagemCliente('');
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      }
    } finally {
      setEnviandoMensagem(false);
    }
  };

  // Handlers Admin
  const handleCarregarTicketsAdmin = async () => {
    if (!adminKey) return;
    setLoadingAdmin(true);
    setErroAdmin(null);

    try {
      const data = await api.listAdminTickets(adminKey, {
        status: filtroStatus,
        search: filtroBusca,
      });
      setAdminTickets(data);
      setIsAdminAuth(true);
      localStorage.setItem('flow_admin_key', adminKey);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErroAdmin(err.message);
      }
      setIsAdminAuth(false);
    } finally {
      setLoadingAdmin(false);
    }
  };

  const handleEnviarAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdminTicket || !adminReplyText.trim()) return;

    setEnviandoAdminReply(true);
    try {
      const msg = await api.addAdminMessage(adminKey, selectedAdminTicket.id, adminReplyText.trim());
      setSelectedAdminTicket((prev) => prev ? { ...prev, messages: [...prev.messages, msg] } : null);
      setAdminTickets((prev) =>
        prev.map((t) => t.id === selectedAdminTicket.id ? { ...t, messages: [...t.messages, msg] } : t)
      );
      setAdminReplyText('');
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      }
    } finally {
      setEnviandoAdminReply(false);
    }
  };

  const irParaAcompanhamento = (protocolo: string, email: string) => {
    setBuscaProtocolo(protocolo);
    setBuscaEmail(email);
    setActiveTab('acompanhar');
    setTicketCriado(null);
    setTimeout(() => {
      api.trackTicket({ protocolo, email })
        .then(setTicketAtual)
        .catch(() => {});
    }, 50);
  };

  const statusLabel = (s: TicketStatus) => {
    switch (s) {
      case 'CRIADO': return 'Criado';
      case 'EM_ANDAMENTO': return 'Em Andamento';
      case 'AGUARDANDO_ACAO': return 'Aguardando Ação';
      case 'FINALIZADO': return 'Finalizado';
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="logo-area">
          <h1>Flow Chamados</h1>
          <p>Plataforma de Suporte com Sincronização Estrita via Trello</p>
          {backendHealth && (
            <span style={{ fontSize: '0.75rem', color: '#34d399', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', display: 'inline-block' }}></span>
              API Backend Conectada
            </span>
          )}
        </div>

        <nav className="nav-tabs">
          <button
            className={`tab-btn ${activeTab === 'abrir' ? 'active' : ''}`}
            onClick={() => setActiveTab('abrir')}
          >
            Abrir Chamado
          </button>
          <button
            className={`tab-btn ${activeTab === 'acompanhar' ? 'active' : ''}`}
            onClick={() => setActiveTab('acompanhar')}
          >
            Acompanhar & Chat
          </button>
          <button
            className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('admin');
              if (adminKey) handleCarregarTicketsAdmin();
            }}
          >
            Painel da Equipe
          </button>
        </nav>
      </header>

      {/* TAB 1: ABRIR CHAMADO */}
      {activeTab === 'abrir' && (
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          {ticketCriado ? (
            <div className="success-banner">
              <h2>Chamado Registrado com Sucesso!</h2>
              <p>Guarde o número do seu protocolo para consultas futuras:</p>
              <div className="protocol-code">{ticketCriado.protocolo}</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Um card já foi gerado na lista <strong>"Criado"</strong> no quadro de suporte da equipe.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => irParaAcompanhamento(ticketCriado.protocolo, ticketCriado.solicitanteEmail)}
                >
                  Acompanhar Chamado Agora
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setTicketCriado(null)}
                >
                  Novo Chamado
                </button>
              </div>
            </div>
          ) : (
            <div className="card">
              <h2>Abertura de Chamado</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Preencha os dados abaixo. Não é necessário criar senha; o acesso será feito via e-mail e protocolo.
              </p>

              {erroCriacao && (
                <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '0.5rem', marginBottom: '1rem', color: '#fca5a5' }}>
                  {erroCriacao}
                </div>
              )}

              <form onSubmit={handleCriarTicket}>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Seu Nome *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Carlos Oliveira"
                      value={novoNome}
                      onChange={(e) => setNovoNome(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Seu E-mail *</label>
                    <input
                      type="email"
                      required
                      placeholder="carlos@empresa.com"
                      value={novoEmail}
                      onChange={(e) => setNovoEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Título do Chamado *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Erro ao emitir relatório financeiro"
                    value={novoTitulo}
                    onChange={(e) => setNovoTitulo(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Descrição do Problema *</label>
                  <textarea
                    rows={5}
                    required
                    placeholder="Descreva o passo a passo do problema, mensagens de erro, etc."
                    value={novaDescricao}
                    onChange={(e) => setNovaDescricao(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loadingCriacao}>
                  {loadingCriacao ? 'Criando Card e Registrando...' : 'Enviar Chamado'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ACOMPANHAR & CHAT */}
      {activeTab === 'acompanhar' && (
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          <div className="card">
            <h2>Consultar Chamado</h2>
            <form onSubmit={handleBuscarTicket} className="form-grid-2">
              <div className="form-group">
                <label>Número do Protocolo</label>
                <input
                  type="text"
                  placeholder="Ex: FLOW-1042"
                  value={buscaProtocolo}
                  onChange={(e) => setBuscaProtocolo(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>E-mail do Solicitante</label>
                <input
                  type="email"
                  placeholder="Seu e-mail informado"
                  value={buscaEmail}
                  onChange={(e) => setBuscaEmail(e.target.value)}
                  required
                />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loadingBusca}>
                  {loadingBusca ? 'Buscando...' : 'Buscar e Abrir Conversa'}
                </button>
              </div>
            </form>

            {erroBusca && (
              <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '0.5rem', marginTop: '1rem', color: '#fca5a5' }}>
                {erroBusca}
              </div>
            )}
          </div>

          {ticketAtual && (
            <div className="card">
              {/* Stepper do Status sincronizado pelo Trello */}
              <div className="status-pipeline">
                <div className={`pipeline-step ${ticketAtual.status === 'CRIADO' ? 'active' : 'completed'}`}>
                  1. Criado
                </div>
                <div className={`pipeline-step ${ticketAtual.status === 'EM_ANDAMENTO' ? 'active' : ticketAtual.status === 'AGUARDANDO_ACAO' || ticketAtual.status === 'FINALIZADO' ? 'completed' : ''}`}>
                  2. Em Andamento
                </div>
                <div className={`pipeline-step ${ticketAtual.status === 'AGUARDANDO_ACAO' ? 'active' : ticketAtual.status === 'FINALIZADO' ? 'completed' : ''}`}>
                  3. Aguardando Ação
                </div>
                <div className={`pipeline-step ${ticketAtual.status === 'FINALIZADO' ? 'completed' : ''}`}>
                  4. Finalizado
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>[{ticketAtual.protocolo}] - {ticketAtual.titulo}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                    Solicitado por <strong>{ticketAtual.solicitanteNome}</strong> ({ticketAtual.solicitanteEmail}) em {new Date(ticketAtual.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                <span className={`badge badge-${ticketAtual.status}`}>{statusLabel(ticketAtual.status)}</span>
              </div>

              <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px solid var(--card-border)' }}>
                <strong style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>DESCRIÇÃO ORIGINAL:</strong>
                <p style={{ fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>{ticketAtual.descricao}</p>
              </div>

              {/* Thread de Mensagens */}
              <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#fff' }}>
                Histórico de Mensagens ({ticketAtual.messages.length})
              </h4>

              <div className="thread-container">
                {ticketAtual.messages.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem' }}>
                    Nenhuma mensagem complementar adicionada ainda.
                  </p>
                ) : (
                  ticketAtual.messages.map((m) => (
                    <div key={m.id} className={`message-item ${m.autor.toLowerCase()}`}>
                      <div className="message-bubble">{m.conteudo}</div>
                      <div className="message-meta">
                        <span>{m.autor === 'CLIENTE' ? 'Você' : 'Equipe Flow (Suporte)'}</span>
                        <span>•</span>
                        <span>{new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Envio de nova mensagem pelo cliente */}
              <form onSubmit={handleEnviarMensagemCliente} style={{ display: 'flex', gap: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Escreva uma resposta ou complemento..."
                  value={novaMensagemCliente}
                  onChange={(e) => setNovaMensagemCliente(e.target.value)}
                  style={{ flex: 1, padding: '0.75rem 1rem', background: '#0f172a', border: '1px solid var(--card-border)', borderRadius: '0.5rem', color: '#fff' }}
                  required
                />
                <button type="submit" className="btn btn-primary" disabled={enviandoMensagem}>
                  {enviandoMensagem ? 'Enviando...' : 'Enviar Mensagem'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PAINEL DA EQUIPE (ADMIN) */}
      {activeTab === 'admin' && (
        <div>
          {!isAdminAuth ? (
            <div className="card" style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
              <h2>Acesso da Equipe</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Informe a chave de segurança administrativa para visualizar e gerenciar os chamados.
              </p>
              <div className="form-group">
                <input
                  type="password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="Chave administrativa"
                />
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleCarregarTicketsAdmin}>
                Entrar no Painel
              </button>
              {erroAdmin && <p style={{ color: '#f87171', fontSize: '0.85rem', marginTop: '0.75rem' }}>{erroAdmin}</p>}
            </div>
          ) : (
            <div>
              {/* Metricas */}
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="label">Criado</div>
                  <div className="value" style={{ color: '#38bdf8' }}>
                    {adminTickets.filter((t) => t.status === 'CRIADO').length}
                  </div>
                </div>
                <div className="metric-card">
                  <div className="label">Em Andamento</div>
                  <div className="value" style={{ color: '#fbbf24' }}>
                    {adminTickets.filter((t) => t.status === 'EM_ANDAMENTO').length}
                  </div>
                </div>
                <div className="metric-card">
                  <div className="label">Aguardando Ação</div>
                  <div className="value" style={{ color: '#c084fc' }}>
                    {adminTickets.filter((t) => t.status === 'AGUARDANDO_ACAO').length}
                  </div>
                </div>
                <div className="metric-card">
                  <div className="label">Finalizado</div>
                  <div className="value" style={{ color: '#34d399' }}>
                    {adminTickets.filter((t) => t.status === 'FINALIZADO').length}
                  </div>
                </div>
              </div>

              {/* Barra de Filtro e Ações */}
              <div className="card" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', flex: 1, flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Buscar por protocolo, título ou solicitante..."
                    value={filtroBusca}
                    onChange={(e) => setFiltroBusca(e.target.value)}
                    style={{ flex: 1, minWidth: 220, padding: '0.5rem 0.75rem', background: '#0f172a', border: '1px solid var(--card-border)', borderRadius: '0.4rem', color: '#fff' }}
                  />
                  <select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value as TicketStatus | '')}
                    style={{ padding: '0.5rem 0.75rem', background: '#0f172a', border: '1px solid var(--card-border)', borderRadius: '0.4rem', color: '#fff' }}
                  >
                    <option value="">Todos os Status</option>
                    <option value="CRIADO">Criado</option>
                    <option value="EM_ANDAMENTO">Em Andamento</option>
                    <option value="AGUARDANDO_ACAO">Aguardando Ação</option>
                    <option value="FINALIZADO">Finalizado</option>
                  </select>
                  <button className="btn btn-secondary btn-sm" onClick={handleCarregarTicketsAdmin}>
                    Filtrar
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowNovoManualModal(true)}>
                    + Novo Chamado Manual
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setIsAdminAuth(false)}>
                    Sair
                  </button>
                </div>
              </div>

              {/* Tabela de Chamados */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Protocolo</th>
                      <th>Título</th>
                      <th>Solicitante</th>
                      <th>Status (via Trello)</th>
                      <th>Data</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingAdmin ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Carregando dados...</td>
                      </tr>
                    ) : adminTickets.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          Nenhum chamado encontrado com os filtros atuais.
                        </td>
                      </tr>
                    ) : (
                      adminTickets.map((t) => (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 600, color: '#38bdf8' }}>{t.protocolo}</td>
                          <td>{t.titulo}</td>
                          <td>
                            <div>{t.solicitanteNome}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.solicitanteEmail}</div>
                          </td>
                          <td>
                            <span className={`badge badge-${t.status}`}>{statusLabel(t.status)}</span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {new Date(t.createdAt).toLocaleDateString('pt-BR')}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setSelectedAdminTicket(t)}
                              >
                                Detalhes / Chat
                              </button>
                              {t.trelloCardUrl && (
                                <a
                                  href={t.trelloCardUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-trello btn-sm"
                                  title="Movimentar card no Trello para alterar o status"
                                >
                                  Trello ↗
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
          )}

          {/* Modal de Detalhes do Admin */}
          {selectedAdminTicket && (
            <div className="modal-overlay" onClick={() => setSelectedAdminTicket(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.35rem', color: '#fff' }}>[{selectedAdminTicket.protocolo}] - {selectedAdminTicket.titulo}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Solicitante: <strong>{selectedAdminTicket.solicitanteNome}</strong> ({selectedAdminTicket.solicitanteEmail})
                    </p>
                  </div>
                  <span className={`badge badge-${selectedAdminTicket.status}`}>{statusLabel(selectedAdminTicket.status)}</span>
                </div>

                {/* Banner Trello com Regra Operacional Estrita */}
                <div className="trello-banner-notice">
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.9rem', color: '#fff' }}>
                      Controle Exclusivo via Trello
                    </strong>
                    <span style={{ fontSize: '0.8rem', color: '#bae6fd' }}>
                      Por regra arquitetural, a transição de status deste chamado é realizada exclusivamente movendo o card entre as listas do Trello.
                    </span>
                  </div>
                  {selectedAdminTicket.trelloCardUrl && (
                    <a
                      href={selectedAdminTicket.trelloCardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-trello"
                    >
                      Abrir no Trello ↗
                    </a>
                  )}
                </div>

                <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid var(--card-border)' }}>
                  <strong style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>DESCRIÇÃO:</strong>
                  <p style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{selectedAdminTicket.descricao}</p>
                </div>

                <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem', color: '#fff' }}>
                  Thread de Mensagens com o Solicitante
                </h4>

                <div className="thread-container" style={{ maxHeight: 280 }}>
                  {selectedAdminTicket.messages.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem' }}>
                      Nenhuma mensagem na thread.
                    </p>
                  ) : (
                    selectedAdminTicket.messages.map((m) => (
                      <div key={m.id} className={`message-item ${m.autor === 'ADMIN' ? 'cliente' : 'admin'}`}>
                        <div className="message-bubble">{m.conteudo}</div>
                        <div className="message-meta">
                          <span>{m.autor === 'ADMIN' ? 'Você (Equipe Flow)' : selectedAdminTicket.solicitanteNome}</span>
                          <span>•</span>
                          <span>{new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Formulário de resposta do Admin */}
                <form onSubmit={handleEnviarAdminReply} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input
                    type="text"
                    placeholder="Escreva uma resposta oficial ao cliente..."
                    value={adminReplyText}
                    onChange={(e) => setAdminReplyText(e.target.value)}
                    style={{ flex: 1, padding: '0.65rem 0.9rem', background: '#0f172a', border: '1px solid var(--card-border)', borderRadius: '0.4rem', color: '#fff' }}
                    required
                  />
                  <button type="submit" className="btn btn-primary btn-sm" disabled={enviandoAdminReply}>
                    {enviandoAdminReply ? 'Enviando...' : 'Responder'}
                  </button>
                </form>

                <div style={{ textAlign: 'right' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setSelectedAdminTicket(null)}>
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Criação Manual pelo Admin */}
          {showNovoManualModal && (
            <div className="modal-overlay" onClick={() => setShowNovoManualModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
                <h2>Novo Chamado Manual (Admin)</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                  Este chamado será criado no banco e sincronizado na lista "Criado" do Trello.
                </p>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      const input: CreateTicketInput = {
                        nome: novoNome.trim(),
                        email: novoEmail.trim(),
                        titulo: novoTitulo.trim(),
                        descricao: novaDescricao.trim(),
                      };
                      await api.createAdminTicket(adminKey, input);
                      setShowNovoManualModal(false);
                      setNovoNome('');
                      setNovoEmail('');
                      setNovoTitulo('');
                      setNovaDescricao('');
                      handleCarregarTicketsAdmin();
                    } catch (err: unknown) {
                      if (err instanceof Error) alert(err.message);
                    }
                  }}
                >
                  <div className="form-group">
                    <label>Nome do Solicitante</label>
                    <input
                      type="text"
                      required
                      value={novoNome}
                      onChange={(e) => setNovoNome(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>E-mail do Solicitante</label>
                    <input
                      type="email"
                      required
                      value={novoEmail}
                      onChange={(e) => setNovoEmail(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Título</label>
                    <input
                      type="text"
                      required
                      value={novoTitulo}
                      onChange={(e) => setNovoTitulo(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Descrição</label>
                    <textarea
                      rows={4}
                      required
                      value={novaDescricao}
                      onChange={(e) => setNovaDescricao(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowNovoManualModal(false)}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary btn-sm">
                      Criar Chamado
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
