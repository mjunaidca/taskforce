/**
 * Toast Utility
 * Simple wrapper for toast notifications
 */

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

/**
 * Show a toast notification
 */
function showToast(options: ToastOptions) {
  const type = options.variant === "destructive" ? "error" : "success";
  console.log(`[Toast ${type}]`, options.title, options.description || "");

  if (typeof window !== "undefined") {
    const toastEl = document.createElement("div");
    const bgColor = options.variant === "destructive" ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200";
    const textColor = options.variant === "destructive" ? "text-red-900" : "text-green-900";

    toastEl.className = `fixed bottom-6 right-6 z-[9999] ${bgColor} border rounded-lg shadow-lg p-4 min-w-[300px] max-w-md animate-in slide-in-from-bottom-4`;
    toastEl.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="flex-1">
          <div class="font-semibold ${textColor}">${options.title}</div>
          ${options.description ? `<div class="text-sm ${textColor} opacity-80 mt-1">${options.description}</div>` : ""}
        </div>
        <button class="text-slate-400 hover:text-slate-600" onclick="this.parentElement.parentElement.remove()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    `;

    document.body.appendChild(toastEl);

    setTimeout(() => {
      toastEl.remove();
    }, 5000);
  }
}

// Type definition for toast with helper methods
type ToastFunction = {
  (options: ToastOptions): void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
};

/**
 * Toast notification with helper methods
 */
export const toast: ToastFunction = Object.assign(showToast, {
  success: (title: string, description?: string) =>
    showToast({ title, description, variant: "default" }),
  error: (title: string, description?: string) =>
    showToast({ title, description, variant: "destructive" }),
  info: (title: string, description?: string) =>
    showToast({ title, description, variant: "default" }),
});
