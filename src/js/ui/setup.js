import { escapeHtml, formatPoints } from "../utils.js";
import { backButton, participantAvatar } from "./components.js";

export function renderSetup({ participants, setup, error = "" }) {
  const selected = setup.selectedParticipantIds
    .map((id) => participants.find((participant) => participant.id === id))
    .filter(Boolean);
  const complete = selected.length === setup.playerCount;
  const canStart = complete && setup.firstCutterId && Number.isInteger(setup.targetScore) && setup.targetScore > 0;

  return `
    <section class="pb-8">
      <header class="flex items-center justify-between py-2">
        ${backButton("Volver al inicio")}
        <span class="tag">♠ Pinacle</span>
      </header>

      <div class="mb-7 mt-5">
        <p class="eyebrow">Nueva partida</p>
        <h1 class="mt-1 text-3xl font-black tracking-tight">Preparar la mesa</h1>
      </div>

      <form id="setup-form" novalidate class="space-y-5">
        <fieldset class="surface p-5">
          <legend class="section-title px-1">¿Cuántos jugáis?</legend>
          <div class="mt-4 grid grid-cols-2 gap-3">
            ${[2, 3].map((count) => `
              <button type="button" data-action="set-player-count" data-count="${count}" class="choice text-center text-lg ${setup.playerCount === count ? "choice-selected" : ""}" aria-pressed="${setup.playerCount === count}">
                ${count} participantes
              </button>`).join("")}
          </div>
        </fieldset>

        <fieldset class="surface p-5">
          <legend class="section-title px-1">Participantes</legend>
          <p class="mt-1 text-sm font-medium text-black/50">El orden de selección marca la rotación.</p>

          <ol class="mt-4 space-y-2" aria-label="Participantes seleccionados">
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
                Selecciona un participante
              </li>`).join("")}
          </ol>

          <div class="mt-5 flex flex-wrap gap-2">
            ${participants.map((participant) => {
              const isSelected = setup.selectedParticipantIds.includes(participant.id);
              const disabled = !isSelected && selected.length >= setup.playerCount;
              return `
                <button type="button" data-action="toggle-participant" data-participant-id="${escapeHtml(participant.id)}" class="rounded-full border px-3.5 py-2.5 text-sm font-bold transition active:scale-95 ${isSelected ? "border-felt-700 bg-felt-700 text-white" : "border-black/10 bg-white text-ink hover:border-felt-500"} disabled:cursor-not-allowed disabled:opacity-35" ${disabled ? "disabled" : ""} aria-pressed="${isSelected}">
                  ${escapeHtml(participant.name)}
                </button>`;
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
            ${[1000, 1500, 2000].map((target) => `
              <button type="button" data-action="set-target" data-target="${target}" class="choice text-center tabular-nums ${setup.targetScore === target ? "choice-selected" : ""}" aria-pressed="${setup.targetScore === target}">${formatPoints(target)}</button>`).join("")}
          </div>
          <label for="target-score" class="mb-2 mt-4 block text-sm font-bold">Otro objetivo</label>
          <input id="target-score" name="targetScore" class="field tabular-nums" type="number" min="1" step="1" inputmode="numeric" value="${escapeHtml(setup.targetScore)}" required />
        </fieldset>

        <fieldset class="surface p-5 ${complete ? "" : "opacity-60"}" ${complete ? "" : "disabled"}>
          <legend class="section-title px-1">¿Quién corta primero?</legend>
          <div class="mt-4 grid gap-2">
            ${selected.map((participant) => `
              <label class="choice flex cursor-pointer items-center gap-3 ${setup.firstCutterId === participant.id ? "choice-selected" : ""}">
                <input type="radio" name="firstCutter" value="${escapeHtml(participant.id)}" class="size-5 accent-felt-700" ${setup.firstCutterId === participant.id ? "checked" : ""} />
                <span class="font-extrabold">${escapeHtml(participant.name)}</span>
              </label>`).join("")}
          </div>
        </fieldset>

        <p id="setup-error" class="${error ? "" : "hidden"} rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800" role="alert">${escapeHtml(error)}</p>
        <button type="submit" class="btn-primary min-h-16 w-full text-lg" ${canStart ? "" : "disabled"}>Empezar partida</button>
      </form>
    </section>`;
}

