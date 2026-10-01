import { useState, useRef, useEffect } from 'react';
import type { CreateTicketInput, Ticket } from '../types/ticket';
import { api } from '../services/api';
import { IconCheck, IconCopy, IconSend } from './Icons';
import { CORPORATE_TAGS, TagBadge, COMPLEXITY_OPTIONS, ComplexityBadge } from './TagBadge';

const getTodayLocalDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  const [selectedTag, setSelectedTag] = useState<string>('Acadêmico');
  const [selectedComplexidade, setSelectedComplexidade] = useState<string>('Baixa');
  const [dataCard, setDataCard] = useState<string>(() => getTodayLocalDateString());
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ticketRecente, setTicketRecente] = useState<Ticket | null>(null);
  const [copiado, setCopiado] = useState(false);

  const descricaoRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (descricaoRef.current) {
      descricaoRef.current.style.height = 'auto';
      descricaoRef.current.style.height = `${Math.max(descricaoRef.current.scrollHeight, 110)}px`;
    }
  }, [descricao]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const nomeTrim = nome.trim();
    const emailTrim = email.trim();
    const tituloTrim = titulo.trim();
    const descTrim = descricao.trim();

    // Validações no frontend
    if (!nomeTrim) {
      setErro('O nome do solicitante é obrigatório.');
      return;
    }
    if (nomeTrim.length < 2) {
      setErro('O nome deve conter pelo menos 2 caracteres.');
      return;
    }
    if (!emailTrim) {
      setErro('O e-mail é obrigatório.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrim)) {
      setErro('Informe um endereço de e-mail válido (ex: seu.email@empresa.com).');
      return;
    }
    if (!tituloTrim) {
      setErro('O assunto do chamado é obrigatório.');
      return;
    }
    if (tituloTrim.length < 3) {
      setErro('O assunto deve conter pelo menos 3 caracteres.');
      return;
    }
    if (!descTrim) {
      setErro('A descrição do chamado é obrigatória.');
      return;
    }
    if (descTrim.length < 10) {
      setErro(`A descrição deve conter no mínimo 10 caracteres (atualmente com ${descTrim.length}).`);
      return;
    }
    if (!dataCard) {
      setErro('A data do chamado é obrigatória.');
      return;
    }
    if (dataCard < getTodayLocalDateString()) {
      setErro('A data de entrega não pode ser anterior à data de hoje.');
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
        complexidade: selectedComplexidade,
        dataCard: dataCard || undefined,
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
            <div className="voucher-tag-pill" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <TagBadge tag={ticketRecente.tag || selectedTag} />
              <ComplexityBadge complexidade={ticketRecente.complexidade || selectedComplexidade} />
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
            {ticketRecente.dataCard && (
              <span className="voucher-hint" style={{ fontWeight: 600 }}>
                Data de entrega: {new Date(ticketRecente.dataCard + 'T00:00:00').toLocaleDateString('pt-BR')}
              </span>
            )}
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
            {/* Seletor de Classe / Tag sem emojis */}
            <div className="form-field">
              <label>Classe do Chamado</label>
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
                      <span>{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Seletor de Complexidade (Baixa, Média, Alta) e Data do Card */}
            <div className="form-row-2">
              <div className="form-field">
                <label>Complexidade do Chamado</label>
                <div className="tag-pills-row">
                  {COMPLEXITY_OPTIONS.map((c) => {
                    const isSelected = selectedComplexidade === c.label;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={`complexity-pill complexity-${c.id} ${isSelected ? 'active' : ''}`}
                        onClick={() => setSelectedComplexidade(c.label)}
                      >
                        <span className="complexity-dot" />
                        <span>{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="input-data-card">Data de Entrega <span className="req">*</span></label>
                <input
                  id="input-data-card"
                  type="date"
                  required
                  min={getTodayLocalDateString()}
                  value={dataCard}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDataCard(val);
                    if (val && val < getTodayLocalDateString()) {
                      setErro('A data de entrega não pode ser anterior à data de hoje.');
                    } else if (erro === 'A data de entrega não pode ser anterior à data de hoje.') {
                      setErro(null);
                    }
                  }}
                />
              </div>
            </div>


            <div className="form-row-2">
              <div className="form-field">
                <label htmlFor="input-nome">Seu Nome <span className="req">*</span></label>
                <input
                  id="input-nome"
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="Nome completo (mínimo 2 caracteres)"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="input-email">Seu E-mail <span className="req">*</span></label>
                <input
                  id="input-email"
                  type="email"
                  required
                  maxLength={150}
                  placeholder="seu.email@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="input-titulo">Assunto <span className="req">*</span></label>
              <input
                id="input-titulo"
                type="text"
                required
                minLength={3}
                maxLength={150}
                placeholder="Resumo do problema (mínimo 3 caracteres)"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </div>

            <div className="form-field">
              <div className="field-label-group">
                <label htmlFor="input-descricao">Descrição <span className="req">*</span></label>
                <span className={`char-count ${descricao.length > 0 && descricao.length < 10 ? 'char-count-warning' : ''}`}>
                  {descricao.length}/2000 {descricao.length > 0 && descricao.length < 10 ? '(mínimo 10 caracteres)' : ''}
                </span>
              </div>
              <textarea
                id="input-descricao"
                ref={descricaoRef}
                rows={4}
                required
                minLength={10}
                maxLength={2000}
                placeholder="Descreva o que está acontecendo com detalhes (mínimo 10 caracteres)..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
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
