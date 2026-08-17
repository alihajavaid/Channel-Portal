"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ConfirmOptions = {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmState = {
  message: string;
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
};

type ConfirmContextValue = (message: string, options?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback<ConfirmContextValue>((message, options = {}) => {
    return new Promise<boolean>((resolve) => {
      setState({ message, options, resolve });
    });
  }, []);

  function close(result: boolean) {
    state?.resolve(result);
    setState(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
          onClick={() => close(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl dark:bg-slate-900"
          >
            {state.options.title && (
              <h2 className="mb-1 font-medium text-slate-900 dark:text-slate-100">{state.options.title}</h2>
            )}
            <p className="text-sm text-slate-600 dark:text-slate-400">{state.message}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => close(false)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {state.options.cancelLabel ?? "Cancel"}
              </button>
              <button
                onClick={() => close(true)}
                autoFocus
                className={`rounded-md px-3 py-1.5 text-sm font-medium text-white ${
                  state.options.danger === false ? "bg-brand hover:bg-brand/90" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {state.options.confirmLabel ?? "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
