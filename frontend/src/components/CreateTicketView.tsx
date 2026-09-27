import { useState } from 'react';
import type { CreateTicketInput, Ticket } from '../types/ticket';
import { api } from '../services/api';
import { IconCheck, IconCopy, IconSend } from './Icons';
import { CORPORATE_TAGS, TagBadge } from './TagBadge';

interface CreateTicketViewProps {
  onTicketCreated: (ticket: Ticket) => void;
  onNavigateToTrack: (protocolo: string, email: string) => void;
  addToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const CreateTicketView = ({
  onTicketCreated,
  onNavigateToTrack,
  addToast,
}: CreateTicketViewProps) => {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('TI & Sistemas');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ticketRecente, setTicketRecente] = useState<Ticket | null>(null);
  const [copiado, setCopiado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const nomeTrim = nome.trim();
    const emailTrim = email.trim();
    const tituloTrim = titulo.trim();
    const descTrim = descricao.trim();

    if (!nomeTrim || !emailTrim || !tituloTrim || !descTrim) {
      setErro('Preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);

    try {
      const input: CreateTicketInput = {
        nome: nomeTrim,
        email: emailTrim,
        titulo: tituloTrim,
        descricao: descTrim,
        tag: selectedTag,
      };

      const result = await api.createTicket(input);
      setTicketRecente(result);
      onTicketCreated(result);
      addToast(`Chamado ${result.protocolo} aberto com sucesso!`, 'success');

      setNome('');
      setEmail('');
      setTitulo('');
      setDescricao('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao registrar chamado.';
      setErro(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyProtocol = () => {
    if (!ticketRecente) return;
    navigator.clipboard.writeText(ticketRecente.protocolo);
    setCopiado(true);
    addToast('Protocolo copiado!', 'info');
    setTimeout(() => setCopiado(false), 3000);
  };

  return (
    <div className="view-container">
      {ticketRecente ? (
        <div className="card success-card">
          <div className="success-icon-badge">
            <IconCheck size={24} />
          </div>

          <h2 className="card-title text-center">Chamado Criado</h2>
          <p className="card-subtitle text-center">
            Seu chamado foi registrado e já está na fila de atendimento da equipe.
          </p>

          <div className="protocol-voucher">
            <div className="voucher-tag-pill">
              <TagBadge tag={ticketRecente.tag || selectedTag} />
            </div>
            <span className="voucher-label">PROTOCOLO</span>
            <div className="voucher-code-wrapper">
              <span className="voucher-code">{ticketRecente.protocolo}</span>
              <button
                type="button"
                className="btn-icon"
                onClick={handleCopyProtocol}
                title="Copiar protocolo"
              >
                {copiado ? <IconCheck size={16} /> : <IconCopy size={16} />}
              </button>
            </div>
            <span className="voucher-hint">
              Guarde este protocolo e seu e-mail ({ticketRecente.solicitanteEmail}) para consultar atualizações.
            </span>
          </div>

          <div className="btn-actions-center">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onNavigateToTrack(ticketRecente.protocolo, ticketRecente.solicitanteEmail)}
            >
              Acompanhar Chamado
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setTicketRecente(null)}
            >
              Novo Chamado
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header-styled">
            <div>
              <h2 className="card-title">Novo Chamado</h2>
              <p className="card-subtitle">
                Preencha os dados abaixo para abrir uma solicitação.
              </p>
            </div>
          </div>

          {erro && (
            <div className="alert alert-error" role="alert">
              <span>{erro}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="form-corp">
            {/* Seletor de Categoria em Pills Minimalistas */}
            <div className="form-field">
              <label>Departamento / Categoria</label>
              <div className="tag-pills-row">
                {CORPORATE_TAGS.map((t) => {
                  const isSelected = selectedTag === t.name;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`tag-filter-pill ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedTag(t.name)}
                    >
                      <span>{t.icon}</span>
                      <span>{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-field">
                <label htmlFor="input-nome">Seu Nome</label>
                <input
                  id="input-nome"
                  type="text"
                  required
                  placeholder="Nome completo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="form-field">
                <label htmlFor="input-email">Seu E-mail</label>
                <input
                  id="input-email"
                  type="email"
                  required
                  placeholder="seu.email@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={150}
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="input-titulo">Assunto</label>
              <input
                id="input-titulo"
                type="text"
                required
                placeholder="Ex: Falha ao emitir nota fiscal"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                maxLength={150}
              />
            </div>

            <div className="form-field">
              <div className="field-label-group">
                <label htmlFor="input-descricao">Descrição</label>
                <span className="char-count">{descricao.length}/2000</span>
              </div>
              <textarea
                id="input-descricao"
                rows={4}
                required
                placeholder="Descreva o que está acontecendo e informações que possam ajudar a resolver..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                maxLength={2000}
              />
            </div>

            <div className="form-footer-action">
              <button
                type="submit"
                className="btn btn-primary btn-submit"
                disabled={loading}
              >
                <IconSend size={15} />
                <span>{loading ? 'Enviando...' : 'Enviar Chamado'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
