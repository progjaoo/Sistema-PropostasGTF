import { toast, type ToastContent, type ToastOptions } from 'react-toastify';

const defaultOptions: ToastOptions = {
  closeButton: true,
};

export const feedback = {
  success: (message: ToastContent, options?: ToastOptions) =>
    toast.success(message, { ...defaultOptions, ...options }),
  created: (message: ToastContent, options?: ToastOptions) =>
    toast.success(message, { ...defaultOptions, ...options }),
  updated: (message: ToastContent, options?: ToastOptions) =>
    toast.success(message, { ...defaultOptions, ...options }),
  deleted: (message: ToastContent, options?: ToastOptions) =>
    toast.error(message, { ...defaultOptions, ...options }),
  destructive: (message: ToastContent, options?: ToastOptions) =>
    toast.error(message, { ...defaultOptions, ...options }),
  error: (message: ToastContent, options?: ToastOptions) =>
    toast.error(message, { ...defaultOptions, ...options }),
  warning: (message: ToastContent, options?: ToastOptions) =>
    toast.warning(message, { ...defaultOptions, ...options }),
  info: (message: ToastContent, options?: ToastOptions) =>
    toast.info(message, { ...defaultOptions, ...options }),
};
