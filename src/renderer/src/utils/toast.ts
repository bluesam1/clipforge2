export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

class ToastManager {
  private toasts: Toast[] = [];
  private listeners: ((toasts: Toast[]) => void)[] = [];

  subscribe(listener: (toasts: Toast[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener([...this.toasts]));
  }

  show(message: string, type: Toast['type'] = 'info', duration: number = 5000) {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: Toast = { id, message, type, duration };
    
    this.toasts.push(toast);
    this.notify();

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  dismiss(id: string) {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
    this.notify();
  }

  clear() {
    this.toasts = [];
    this.notify();
  }

  getToasts(): Toast[] {
    return [...this.toasts];
  }
}

export const toastManager = new ToastManager();

// Convenience functions
export const toast = {
  success: (message: string, duration?: number) => toastManager.show(message, 'success', duration),
  error: (message: string, duration?: number) => toastManager.show(message, 'error', duration),
  warning: (message: string, duration?: number) => toastManager.show(message, 'warning', duration),
  info: (message: string, duration?: number) => toastManager.show(message, 'info', duration),
};
