import { useEffect } from 'react';
import { IconCheck, IconClose } from './Icons';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer = ({ toasts, onDismiss }: ToastProps) => {
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem = ({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div className={`toast-item toast-${toast.type}`}>
      <div className="toast-icon">
        {toast.type === 'success' && <IconCheck size={16} />}
        {toast.type === 'error' && <span style={{ fontWeight: 'bold' }}>!</span>}
        {toast.type === 'info' && <span style={{ fontWeight: 'bold' }}>i</span>}
      </div>
      <div className="toast-content">{toast.text}</div>
      <button className="toast-close" onClick={() => onDismiss(toast.id)} aria-label="Fechar notificação">
        <IconClose size={14} />
      </button>
    </div>
  );
};
