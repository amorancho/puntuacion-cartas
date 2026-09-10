import { escapeHtml } from "../utils.js";

export function backButton(label = "Volver") {
  return `
    <button type="button" data-action="go-home" class="btn-quiet -ml-3 gap-2" aria-label="${escapeHtml(label)}">
      <span aria-hidden="true">←</span>
      <span>${escapeHtml(label)}</span>
    </button>`;
}

export function cardSuit(suit, className = "") {
  return `<span class="${className}" aria-hidden="true">${escapeHtml(suit)}</span>`;
}

export function participantAvatar(name, className = "") {
  const initial = String(name || "?").trim().charAt(0).toLocaleUpperCase("es");
  return `<span class="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-felt-100 font-black text-felt-800 ${className}" aria-hidden="true">${escapeHtml(initial)}</span>`;
}

export function emptyState(message) {
  return `<p class="rounded-2xl border border-dashed border-black/15 px-4 py-6 text-center text-sm font-medium text-black/50">${escapeHtml(message)}</p>`;
}

