import { escapeHtml, formatPoints } from "../utils.js";
import { backButton, participantAvatar } from "./components.js";

const SUGGESTED_NAMES = new Set(["Martí", "Llorenç", "Papá", "Mamá", "Mama"]);

export function renderBriscaSetup({ participants, setup, error = "" }) {
  const selected = setup.selectedParticipantIds
    .map((id) => participants.find((participant) => participant.id === id))
    .filter(Boolean);
  const suggestions = participants.filter(({ name }) => SUGGESTED_NAMES.has(name));
  const complete = selected.length === setup.playerCount;
  const canStart = complete && setup.firstDealerId && Number.isInteger(setup.targetScore) && setup.targetScore > 0;

  return `
    <section class="pb-8">
      <header class="flex items-center justify-between py-2">
        ${backButton("Volver al inicio")}
        <span class="tag"><span class="text-felt-700">♣</span> Brisca</span>
      </header>

      <div class="mb-7 mt-5">
        <p class="eyebrow">Nueva partida</p>
        <h1 class="mt-1 text-3xl font-black tracking-tight">Preparar la mesa</h1>
      </div>

      <form id="setup-form" novalidate class="space-y-5">
        <fieldset class="surface p-5">
          <legend class="section-title px-1">¿Cuántos jugáis?</legend>
          <div class="mt-4 grid grid-cols-3 gap-2">
            ${[2, 3, 4].map((count) => `
              <button type="button" data-action="set-player-count" data-count="${count}" class="choice text-center text-lg ${setup.playerCount === count ? "choice-selected" : ""}" aria-pressed="${setup.playerCount === count}">${count}</button>`).join("")}
          </div>
        </fieldset>

        <fieldset class="surface p-5">
          <legend class="section-title px-1">Jugadores</legend>
          <p class="mt-1 text-sm font-medium text-black/50">El orden de selección marca la rotación del reparto.</p>

          <ol class="mt-4 space-y-2" aria-label="Jugadores seleccionados">
            ${selected.map((participant, index) => `
              <li class="flex min-h-14 items-center gap-3 rounded-2xl bg-felt-50 px-3 py-2">
                <span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-felt-800 text-sm font-black text-white">${index + 1}</span>
                ${participantAvatar(participant.name)}
                <span class="min-w-0 flex-1 truncate font-extrabold">${escapeHtml(participant.name)}</span>
                <button type="button" data-action="toggle-participant" data-participant-id="${escapeHtml(participant.id)}" class="btn-quiet min-h-10 text-sm text-exact" aria-label="Quitar a ${escapeHtml(participant.name)}">Quitar</button>
              </li>`).join("")}
            ${Array.from({ length: Math.max(0, setup.playerCount - selected.length) }, (_, index) => `
              <li class="flex min-h-14 items-center gap-3 rounded-2xl border border-dashed border-black/15 px-3 text-sm font-bold text-black/35">
                <span class="flex size-7 items-center justify-center rounded-full bg-black/5">${selected.length + index + 1}</span>
                Selecciona un jugador
              </li>`).join("")}
          </ol>

          <div class="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            ${suggestions.map((participant) => {
              const isSelected = setup.selectedParticipantIds.includes(participant.id);
              const disabled = !isSelected && selected.length >= setup.playerCount;
              return `
                <button type="button" data-action="toggle-participant" data-participant-id="${escapeHtml(participant.id)}" class="choice min-w-0 truncate text-center ${isSelected ? "choice-selected" : ""}" ${disabled ? "disabled" : ""} aria-pressed="${isSelected}">${escapeHtml(participant.name)}</button>`;
            }).join("")}
          </div>

          <div class="mt-5 border-t border-black/5 pt-5">
            <label for="custom-participant" class="mb-2 block text-sm font-bold">Otro nombre</label>
            <div class="flex gap-2">
              <input id="custom-participant" name="customParticipant" class="field min-w-0 flex-1" type="text" maxlength="60" autocomplete="off" placeholder="Escribe un nombre" />
              <button type="button" data-action="add-custom-participant" class="btn-secondary shrink-0">Añadir</button>
            </div>
          </div>
        </fieldset>

        <fieldset class="surface p-5">
          <legend class="section-title px-1">Objetivo</legend>
          <div class="mt-4 grid grid-cols-3 gap-2">
            ${[120, 240, 360].map((target) => `
              <button type="button" data-action="set-target" data-target="${target}" class="choice text-center tabular-nums ${setup.targetScore === target ? "choice-selected" : ""}" aria-pressed="${setup.targetScore === target}">${formatPoints(target)}</button>`).join("")}
          </div>
          <label for="target-score" class="mb-2 mt-4 block text-sm font-bold">Otro objetivo</label>
          <input id="target-score" name="targetScore" class="field tabular-nums" type="number" min="1" step="1" inputmode="numeric" value="${escapeHtml(setup.targetScore)}" required />
        </fieldset>

        <fieldset class="surface p-5 ${complete ? "" : "opacity-60"}" ${complete ? "" : "disabled"}>
          <legend class="section-title px-1">¿Quién reparte primero?</legend>
          <div class="mt-4 grid grid-cols-2 gap-2">
            ${selected.map((participant) => `
              <label class="choice flex min-w-0 cursor-pointer items-center justify-center gap-2 text-center ${setup.firstDealerId === participant.id ? "choice-selected" : ""}">
                <input type="radio" name="firstDealer" value="${escapeHtml(participant.id)}" class="sr-only" ${setup.firstDealerId === participant.id ? "checked" : ""} />
                <span class="truncate font-extrabold">${escapeHtml(participant.name)}</span>
              </label>`).join("")}
          </div>
        </fieldset>

        <p id="setup-error" class="${error ? "" : "hidden"} rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800" role="alert">${escapeHtml(error)}</p>
        <button type="submit" class="btn-primary min-h-16 w-full text-lg" ${canStart ? "" : "disabled"}>Empezar partida</button>
      </form>
    </section>`;
}
