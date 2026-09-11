import { calculateGameProgress, escobaAwards, getGameResult, getRoundDealer } from "../games/escoba.js";
import { escapeHtml, formatPoints, formatSignedPoints } from "../utils.js";
import { emptyState, participantAvatar } from "./components.js";

function getName(game, participantId) {
  return game.participants.find(({ id }) => id === participantId)?.name ?? "Empate";
}

function renderScoreboard(game, progress) {
  const uniqueLeader = progress.standings[0]?.score !== progress.standings[1]?.score;
  return `
    <section class="surface overflow-hidden" aria-labelledby="scoreboard-title">
      <div class="flex items-center justify-between px-5 pb-3 pt-5">
        <h2 id="scoreboard-title" class="section-title">Marcador</h2>
        <span class="text-sm font-bold text-black/45">${game.rounds.length} turno${game.rounds.length === 1 ? "" : "s"}</span>
      </div>
      <ol class="grid grid-cols-2 divide-x divide-black/5">
        ${progress.standings.map((participant, index) => {
          const leader = index === 0 && uniqueLeader;
          return `
            <li class="min-w-0 px-4 py-5 text-center ${leader ? "bg-amber-50" : ""}">
              <span class="mx-auto flex size-9 items-center justify-center rounded-full ${leader ? "bg-amber-400" : "bg-black/5 text-black/55"} font-black">${leader ? "♛" : participant.position}</span>
              <span class="mt-2 block truncate font-black">${escapeHtml(participant.name)}</span>
              <span class="mt-1 block text-3xl font-black tabular-nums">${formatPoints(participant.score)}</span>
              <span class="text-[11px] font-bold uppercase tracking-wide text-black/35">puntos</span>
            </li>`;
        }).join("")}
      </ol>
    </section>`;
}

function renderBrooms(game, round) {
  return `
    <fieldset>
      <legend class="mb-3 text-lg font-black">Escobas</legend>
      <div class="grid grid-cols-2 gap-2">
        ${game.participants.map((participant) => {
          const inputId = `brooms-${participant.id}`;
          return `
            <div class="min-w-0 rounded-2xl border border-black/5 bg-white p-3 text-center">
              <label for="${escapeHtml(inputId)}" class="block truncate font-extrabold">${escapeHtml(participant.name)}</label>
              <div class="mt-3 flex items-center justify-center gap-1">
                <button type="button" data-action="adjust-brooms" data-input-id="${escapeHtml(inputId)}" data-delta="-1" class="btn-secondary size-11 shrink-0 p-0 text-xl" aria-label="Quitar una escoba a ${escapeHtml(participant.name)}">−</button>
                <input id="${escapeHtml(inputId)}" data-brooms-for="${escapeHtml(participant.id)}" class="h-12 w-14 rounded-xl border-2 border-black/10 text-center text-2xl font-black tabular-nums focus:border-felt-600 focus:outline-none focus:ring-4 focus:ring-felt-100" type="number" min="0" step="1" inputmode="numeric" value="${round ? escapeHtml(round.brooms[participant.id]) : "0"}" required aria-label="Escobas de ${escapeHtml(participant.name)}" />
                <button type="button" data-action="adjust-brooms" data-input-id="${escapeHtml(inputId)}" data-delta="1" class="btn-secondary size-11 shrink-0 p-0 text-xl" aria-label="Añadir una escoba a ${escapeHtml(participant.name)}">+</button>
              </div>
            </div>`;
        }).join("")}
      </div>
    </fieldset>`;
}

function renderAwards(game, round, isEditing) {
  return `
    <fieldset>
      <legend class="text-lg font-black">Puntos de la mano</legend>
      <p class="mb-3 mt-1 text-sm font-medium text-black/45">Toca quién gana cada punto.</p>
      <div class="space-y-3">
        ${escobaAwards.map((award) => {
          const selected = isEditing ? round.awards[award.id] : undefined;
          const choices = [
            ...game.participants.map(({ id, name }) => ({ value: id, name })),
            ...(award.noTie ? [] : [{ value: "__tie__", name: "Empate" }])
          ];
          return `
            <div>
              <p class="mb-1.5 text-sm font-black">${escapeHtml(award.label)}</p>
              <div class="grid ${award.noTie ? "grid-cols-2" : "grid-cols-3"} gap-1.5" data-award-group>
                ${choices.map((choice) => {
                  const checked = selected === (choice.value === "__tie__" ? null : choice.value);
                  return `
                    <label class="choice flex min-h-11 min-w-0 cursor-pointer items-center justify-center px-2 py-2 text-center text-sm ${checked ? "choice-selected" : ""}">
                      <input type="radio" name="award-${escapeHtml(award.id)}" value="${escapeHtml(choice.value)}" class="sr-only" ${checked ? "checked" : ""} required />
                      <span class="truncate">${escapeHtml(choice.name)}</span>
                    </label>`;
                }).join("")}
              </div>
            </div>`;
        }).join("")}
      </div>
    </fieldset>`;
}

function renderRoundForm(game, editingRoundId) {
  const editIndex = game.rounds.findIndex(({ id }) => id === editingRoundId);
  const isEditing = editIndex >= 0;
  const number = isEditing ? editIndex + 1 : game.rounds.length + 1;
  const round = isEditing ? game.rounds[editIndex] : null;
  const dealerId = getRoundDealer(game.participants, game.firstDealerId, number);

  return `
    <section id="round-entry" class="surface p-5" aria-labelledby="round-form-title">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="eyebrow">${isEditing ? "Corrigiendo" : "Siguiente mano"}</p>
          <h2 id="round-form-title" class="mt-1 text-2xl font-black">${isEditing ? `Editar turno ${number}` : `Turno ${number}`}</h2>
          <p class="mt-2 text-sm font-semibold text-black/50">Reparte <strong class="text-ink">${escapeHtml(getName(game, dealerId))}</strong></p>
        </div>
        ${isEditing ? '<button type="button" data-action="cancel-edit" class="btn-quiet text-sm">Cancelar</button>' : ""}
      </div>

      <form id="round-form" class="mt-5 space-y-6" data-round-id="${isEditing ? escapeHtml(round.id) : ""}" novalidate>
        ${renderBrooms(game, round)}
        ${renderAwards(game, round, isEditing)}
        <p id="round-error" class="hidden rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800" role="alert" tabindex="-1"></p>
        <button type="submit" class="btn-primary min-h-16 w-full text-lg">${isEditing ? "Guardar cambios" : "Guardar turno"}</button>
      </form>
    </section>`;
}

function renderHistoryCard(game, snapshot, editable) {
  const { round, number, dealerId, scores, accumulated } = snapshot;
  return `
    <article class="surface p-5" aria-labelledby="history-round-${number}">
      <header class="flex items-center justify-between gap-3">
        <span>
          <h3 id="history-round-${number}" class="text-xl font-black">Turno ${number}</h3>
          <span class="text-xs font-bold text-black/45">Reparte ${escapeHtml(getName(game, dealerId))}</span>
        </span>
        ${editable ? `<span class="flex gap-1"><button type="button" data-action="edit-round" data-round-id="${escapeHtml(round.id)}" class="btn-quiet min-h-10 text-sm">Editar</button><button type="button" data-action="delete-round" data-round-id="${escapeHtml(round.id)}" class="btn-quiet min-h-10 text-sm text-exact">Eliminar</button></span>` : ""}
      </header>

      <div class="mt-4 grid grid-cols-2 gap-2">
        ${game.participants.map((participant) => {
          const score = scores[participant.id];
          return `
            <div class="rounded-2xl bg-black/[0.035] p-3 text-center">
              <span class="block truncate text-sm font-black">${escapeHtml(participant.name)}</span>
              <span class="mt-1 block text-xl font-black tabular-nums">${formatSignedPoints(score.total)}</span>
              <span class="block text-xs font-semibold text-black/45">${score.brooms} escoba${score.brooms === 1 ? "" : "s"} + ${score.concepts} concepto${score.concepts === 1 ? "" : "s"}</span>
              <span class="mt-1 block text-xs font-bold text-black/40">Total: ${formatPoints(accumulated[participant.id])}</span>
            </div>`;
        }).join("")}
      </div>

      <ul class="mt-3 divide-y divide-black/5 rounded-2xl border border-black/5 bg-white px-3 text-sm">
        ${escobaAwards.map((award) => `<li class="flex justify-between gap-3 py-2"><span class="font-semibold text-black/55">${escapeHtml(award.label)}</span><strong>${escapeHtml(getName(game, round.awards[award.id]))}</strong></li>`).join("")}
      </ul>
    </article>`;
}

function renderResult(game, result, acknowledged) {
  if (!result || (game.status === "active" && acknowledged)) return "";
  const winner = result.type === "winner";
  const names = winner ? result.participant.name : result.participants.map(({ name }) => name).join(" y ");
  return `
    <section id="game-result" tabindex="-1" class="rounded-3xl border-2 border-amber-300 bg-amber-50 p-5 shadow-lift" aria-live="polite">
      <p class="text-xs font-black uppercase tracking-[0.18em] text-amber-800">${game.status === "active" ? "Objetivo alcanzado" : game.status === "finished" ? "Partida finalizada" : "Partida archivada"}</p>
      <h2 class="mt-1 text-3xl font-black tracking-tight">${winner ? "🏆 Ganador" : "Empate en cabeza"}</h2>
      <p class="mt-2 font-semibold text-black/65">${escapeHtml(winner ? `${names} ha alcanzado ${result.score} puntos.` : `${names} tienen ${result.score} puntos. Podéis seguir para desempatar.`)}</p>
      ${game.status === "active" ? `<div class="mt-5 grid gap-2 ${winner ? "grid-cols-2" : "grid-cols-1"}">${winner ? '<button type="button" data-action="finish-game" class="btn-primary">Finalizar partida</button>' : ""}<button type="button" data-action="continue-playing" class="btn-secondary">Seguir jugando</button></div>` : ""}
    </section>`;
}

export function renderEscobaGame({ game, editingRoundId }) {
  const progress = calculateGameProgress(game);
  const result = getGameResult(game);
  const acknowledged = game.resultAcknowledgedRoundCount === game.rounds.length;
  const readonly = game.status !== "active";

  return `
    <section class="space-y-5 pb-8">
      <header class="flex items-center justify-between gap-2 py-2">
        <button type="button" data-action="go-home" class="btn-quiet -ml-3 gap-2"><span aria-hidden="true">←</span> Inicio</button>
        <button type="button" data-action="new-game" class="btn-quiet -mr-3">Nueva partida</button>
      </header>
      <div class="flex items-end justify-between gap-4 pb-1">
        <div><p class="eyebrow">Partida ${game.status === "active" ? "en curso" : game.status === "finished" ? "finalizada" : "archivada"}</p><h1 class="mt-1 text-4xl font-black tracking-[-0.04em]">Escoba</h1></div>
        <p class="rounded-2xl bg-felt-800 px-4 py-2 text-right text-white"><span class="block text-[10px] font-black uppercase tracking-wider text-felt-200">Objetivo</span><span class="block text-xl font-black tabular-nums">${formatPoints(game.targetScore)}</span></p>
      </div>
      ${renderResult(game, result, acknowledged)}
      ${readonly && !result ? '<p class="rounded-2xl bg-black/5 px-4 py-3 text-center text-sm font-bold text-black/55">Esta partida está archivada y se muestra en modo consulta.</p>' : ""}
      ${renderScoreboard(game, progress)}
      ${readonly ? "" : renderRoundForm(game, editingRoundId)}
      <section aria-labelledby="history-title">
        <div class="mb-3 flex items-end justify-between gap-3 px-1"><div><p class="eyebrow">Comprobación</p><h2 id="history-title" class="section-title mt-1">Historial</h2></div></div>
        <div class="space-y-4">${progress.rounds.length ? [...progress.rounds].reverse().map((snapshot) => renderHistoryCard(game, snapshot, !readonly)).join("") : emptyState("Todavía no hay turnos. Añade el resultado de la primera mano arriba.")}</div>
      </section>
    </section>`;
}
