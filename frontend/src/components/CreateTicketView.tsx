import { useState } from 'react';
import type { CreateTicketInput, Ticket } from '../types/ticket';
import { api } from '../services/api';
import { IconCheck, IconCopy, IconSend, IconTicket } from './Icons';

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

          <h2 className="card-title text-center">Chamado Registrado com Sucesso</h2>
          <p className="card-subtitle text-center">
            Seu chamado foi registrado na central de atendimento e sincronizado com o fluxo da equipe técnica.
          </p>

          <div className="protocol-voucher">
            <span className="voucher-label">NÚMERO DO PROTOCOLO</span>
            <div className="voucher-code-wrapper">
              <span className="voucher-code">{ticketRecente.protocolo}</span>
              <button
                type="button"
                className="btn-icon"
                onClick={handleCopyProtocol}
                title="Copiar protocolo"
              >
                {copiado ? <IconCheck size={18} /> : <IconCopy size={18} />}
              </button>
            </div>
            <span className="voucher-hint">
              Utilize este protocolo junto ao seu e-mail ({ticketRecente.solicitanteEmail}) para consultar atualizações.
            </span>
          </div>

          <div className="btn-actions-center">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onNavigateToTrack(ticketRecente.protocolo, ticketRecente.solicitanteEmail)}
            >
              Acompanhar Atendimento Agora
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setTicketRecente(null)}
            >
              Abrir Outro Chamado
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header-styled">
            <div className="card-header-icon">
              <IconTicket size={20} />
            </div>
            <div>
              <h2 className="card-title">Novo Chamado Técnico</h2>
              <p className="card-subtitle">
                Descreva sua solicitação com clareza. Você poderá acompanhar o status e trocar mensagens sem necessidade de senha.
              </p>
            </div>
          </div>

          {erro && (
            <div className="alert alert-error" role="alert">
              <span>{erro}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="form-corp">
            <div className="form-row-2">
              <div className="form-field">
                <label htmlFor="input-nome">
                  Nome Completo <span className="req">*</span>
                </label>
                <input
                  id="input-nome"
                  type="text"
                  required
                  placeholder="Ex: Ana Clara Ribeiro"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="form-field">
                <label htmlFor="input-email">
                  E-mail Corporativo ou Pessoal <span className="req">*</span>
                </label>
                <input
                  id="input-email"
                  type="email"
                  required
                  placeholder="ana.ribeiro@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={150}
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="input-titulo">
                Assunto / Resumo do Problema <span className="req">*</span>
              </label>
              <input
                id="input-titulo"
                type="text"
                required
                placeholder="Ex: Falha ao exportar relatório financeiro em PDF"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                maxLength={150}
              />
            </div>

            <div className="form-field">
              <div className="field-label-group">
                <label htmlFor="input-descricao">
                  Detalhamento da Solicitação <span className="req">*</span>
                </label>
                <span className="char-count">{descricao.length}/2000</span>
              </div>
              <textarea
                id="input-descricao"
                rows={5}
                required
                placeholder="Informe detalhes relevantes: mensagens de erro recebidas, passos para reproduzir o problema e o impacto na rotina."
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
                <span>{loading ? 'Registrando Chamado...' : 'Registrar Chamado'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
