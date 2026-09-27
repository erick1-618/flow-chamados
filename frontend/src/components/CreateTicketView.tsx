import { useState } from 'react';
import type { CreateTicketInput, Ticket } from '../types/ticket';
import { api } from '../services/api';
import { IconCheck, IconCopy, IconSend, IconTicket } from './Icons';
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
      setErro('Por favor, preencha todos os campos obrigatórios.');
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
      addToast(`Chamado ${result.protocolo} registrado com sucesso!`, 'success');

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
    addToast('Número de protocolo copiado!', 'info');
    setTimeout(() => setCopiado(false), 3000);
  };

  return (
    <div className="view-container">
      {ticketRecente ? (
        <div className="card success-card">
          <div className="success-icon-badge">
            <IconCheck size={28} />
          </div>

          <h2 className="card-title text-center">Chamado Registrado no Sistema</h2>
          <p className="card-subtitle text-center">
            Sua solicitação foi indexada pelo serviço de atendimento e encaminhada para o fluxo do Trello.
          </p>

          <div className="protocol-voucher">
            <div className="voucher-tag-pill">
              <TagBadge tag={ticketRecente.tag || selectedTag} />
            </div>
            <span className="voucher-label">NÚMERO DE PROTOCOLO CORPORATIVO</span>
            <div className="voucher-code-wrapper">
              <span className="voucher-code">{ticketRecente.protocolo}</span>
              <button
                type="button"
                className="btn-icon"
                onClick={handleCopyProtocol}
                title="Copiar protocolo para a área de transferência"
              >
                {copiado ? <IconCheck size={18} /> : <IconCopy size={18} />}
              </button>
            </div>
            <span className="voucher-hint">
              Utilize este protocolo junto ao e-mail <strong>{ticketRecente.solicitanteEmail}</strong> para consultar o status e responder ao suporte.
            </span>
          </div>

          <div className="btn-actions-center">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onNavigateToTrack(ticketRecente.protocolo, ticketRecente.solicitanteEmail)}
            >
              Acompanhar Andamento
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setTicketRecente(null)}
            >
              Registrar Outro Chamado
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header-styled">
            <div className="card-header-icon">
              <IconTicket size={22} />
            </div>
            <div>
              <h2 className="card-title">Abertura de Chamado Corporativo</h2>
              <p className="card-subtitle">
                Central de Atendimento ao Colaborador e Cliente. Selecione a área responsável e detalhe sua solicitação.
              </p>
            </div>
          </div>

          {erro && (
            <div className="alert alert-error" role="alert">
              <span>{erro}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="form-corp">
            {/* Seletor de Categoria / Tag Corporativa */}
            <div className="form-field">
              <label>
                Área de Atendimento / Departamento <span className="req">*</span>
              </label>
              <span className="field-hint">
                A categoria selecionada é sincronizada automaticamente como uma etiqueta colorida no cartão do Trello da equipe.
              </span>

              <div className="tag-selector-grid">
                {CORPORATE_TAGS.map((t) => {
                  const isSelected = selectedTag === t.name;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`tag-option-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedTag(t.name)}
                    >
                      <div className="tag-option-header">
                        <span className="tag-option-icon">{t.icon}</span>
                        <span className="tag-option-name">{t.name}</span>
                        {isSelected && <span className="tag-selected-check">✓</span>}
                      </div>
                      <span className="tag-option-desc">{t.desc}</span>
                      <div className="tag-trello-hint">
                        <span className={`tag-dot-small dot-${t.colorName}`} />
                        <span>Etiqueta {t.colorName.toUpperCase()} no Trello</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-field">
                <label htmlFor="input-nome">
                  Nome Completo <span className="req">*</span>
                </label>
                <input
                  id="input-nome"
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo Mendes"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="form-field">
                <label htmlFor="input-email">
                  E-mail de Contato <span className="req">*</span>
                </label>
                <input
                  id="input-email"
                  type="email"
                  required
                  placeholder="carlos.mendes@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={150}
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="input-titulo">
                Assunto do Chamado <span className="req">*</span>
              </label>
              <input
                id="input-titulo"
                type="text"
                required
                placeholder="Ex: Inconsistência na conciliação bancária do fechamento mensal"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                maxLength={150}
              />
            </div>

            <div className="form-field">
              <div className="field-label-group">
                <label htmlFor="input-descricao">
                  Descrição Detalhada do Problema ou Solicitação <span className="req">*</span>
                </label>
                <span className="char-count">{descricao.length}/2000</span>
              </div>
              <textarea
                id="input-descricao"
                rows={5}
                required
                placeholder="Forneça detalhes como: onde o problema ocorre, mensagens de erro apresentadas e prazos ou impacto no trabalho."
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
                <IconSend size={16} />
                <span>{loading ? 'Transmitindo Chamado...' : 'Registrar Solicitação'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
