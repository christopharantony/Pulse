import { create } from 'zustand';

export type ToastVariant = 'default' | 'success' | 'destructive' | 'warning';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

export type ToastInput = Omit<ToastItem, 'id'>;

interface ToastStore {
  toasts: ToastItem[];
  addToast: (toast: ToastInput) => string;
  dismissToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = crypto.randomUUID();
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    return id;
  },
  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },
}));

export function toast(input: ToastInput) {
  return useToastStore.getState().addToast(input);
}
