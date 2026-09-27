import { useEffect, useState } from 'react';
import { api } from './services/api';
import type { HealthCheckResponse, Ticket } from './types/ticket';
import { Header } from './components/Header';
import { CreateTicketView } from './components/CreateTicketView';
import { TrackTicketView } from './components/TrackTicketView';
import { AdminDashboard } from './components/AdminDashboard';
import { ToastContainer, type ToastMessage } from './components/Toast';
import './App.css';

export function App() {
  const [activeTab, setActiveTab] = useState<'abrir' | 'acompanhar' | 'admin'>('abrir');
  const [backendHealth, setBackendHealth] = useState<HealthCheckResponse | null>(null);

  // Parâmetros de link direto (ex: link do card no Trello para atender no Admin)
  const [targetTicketProto, setTargetTicketProto] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('ticket');
    } catch {
      return null;
    }
  });

  // Estado compartilhado para rastreamento
  const [trackProtocolo, setTrackProtocolo] = useState('');
  const [trackEmail, setTrackEmail] = useState('');
  const [ticketAtual, setTicketAtual] = useState<Ticket | null>(null);

  // Estado do Admin
  const [adminKey, setAdminKey] = useState<string>(
    () => sessionStorage.getItem('flow_admin_key') || ''
  );
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [adminTickets, setAdminTickets] = useState<Ticket[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  // Notificações Toast
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev, { id, text, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Checar saúde da API e detectar parâmetros na URL
  useEffect(() => {
    api.getHealth()
      .then(setBackendHealth)
      .catch(() => setBackendHealth(null));

    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const ticketParam = params.get('ticket');

    if (ticketParam) {
      setTargetTicketProto(ticketParam);
      setActiveTab('admin');
    } else if (tabParam === 'admin' || tabParam === 'acompanhar' || tabParam === 'abrir') {
      setActiveTab(tabParam);
    }

    // Se já havia chave na sessão, autentica e carrega chamados
    const savedKey = sessionStorage.getItem('flow_admin_key');
    if (savedKey) {
      api.listAdminTickets(savedKey)
        .then((list) => {
          setIsAdminAuth(true);
          setAdminTickets(list);
        })
        .catch(() => {
          sessionStorage.removeItem('flow_admin_key');
        });
    }
  }, []);


  // Carregar chamados administrativos
  const handleReloadAdminTickets = async () => {
    if (!adminKey) return;
    setLoadingAdmin(true);
    try {
      const list = await api.listAdminTickets(adminKey);
      setAdminTickets(list);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar lista de chamados.';
      addToast(msg, 'error');
    } finally {
      setLoadingAdmin(false);
    }
  };

  // Navegar direto para o acompanhamento a partir da abertura
  const handleNavigateToTrack = (protocolo: string, email: string) => {
    setTrackProtocolo(protocolo);
    setTrackEmail(email);
    setActiveTab('acompanhar');
    api.trackTicket({ protocolo, email })
      .then(setTicketAtual)
      .catch(() => setTicketAtual(null));
  };

  return (
    <div className="corp-app-wrapper">
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'admin' && isAdminAuth) {
            handleReloadAdminTickets();
          }
        }}
        backendHealth={backendHealth}
      />

      <main className="main-content">
        {activeTab === 'abrir' && (
          <CreateTicketView
            onTicketCreated={(ticket) => {
              setTrackProtocolo(ticket.protocolo);
              setTrackEmail(ticket.solicitanteEmail);
            }}
            onNavigateToTrack={handleNavigateToTrack}
            addToast={addToast}
          />
        )}

        {activeTab === 'acompanhar' && (
          <TrackTicketView
            initialProtocolo={trackProtocolo}
            initialEmail={trackEmail}
            ticketAtual={ticketAtual}
            onTicketLoaded={setTicketAtual}
            addToast={addToast}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDashboard
            adminKey={adminKey}
            setAdminKey={setAdminKey}
            isAdminAuth={isAdminAuth}
            setIsAdminAuth={setIsAdminAuth}
            tickets={adminTickets}
            onReloadTickets={handleReloadAdminTickets}
            loading={loadingAdmin}
            addToast={addToast}
            targetTicketProto={targetTicketProto}
          />
        )}

      </main>

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}

export default App;
