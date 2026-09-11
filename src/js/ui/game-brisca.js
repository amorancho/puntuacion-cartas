import { BRISCA_ROUND_TOTAL, calculateGameProgress, getGameResult, getRoundDealer } from "../games/brisca.js";
import { escapeHtml, formatPoints, formatSignedPoints } from "../utils.js";
import { emptyState, participantAvatar } from "./components.js";

function getName(game, participantId) {
  return game.participants.find(({ id }) => id === participantId)?.name ?? "—";
}

function renderScoreboard(game, progress) {
  const uniqueLeader = progress.standings.length > 1 && progress.standings[0].score !== progress.standings[1].score;
  return `
    <section class="surface overflow-hidden" aria-labelledby="scoreboard-title">
      <div class="flex items-center justify-between px-5 pb-3 pt-5">
        <h2 id="scoreboard-title" class="section-title">Marcador</h2>
        <span class="text-sm font-bold text-black/45">${game.rounds.length} turno${game.rounds.length === 1 ? "" : "s"}</span>
      </div>
      <ol class="divide-y divide-black/5">
        ${progress.standings.map((participant, index) => {
          const leader = index === 0 && uniqueLeader;
          return `
            <li class="flex min-h-20 items-center gap-3 px-4 py-3 ${leader ? "bg-gradient-to-r from-amber-50 to-paper" : ""}">
              <span class="flex size-9 shrink-0 items-center justify-center rounded-full ${leader ? "bg-amber-400" : "bg-black/5 text-black/55"} font-black">${leader ? "♛" : participant.position}</span>
              <span class="min-w-0 flex-1 truncate font-black">${escapeHtml(participant.name)}</span>
              <span class="shrink-0 text-right"><span class="block text-2xl font-black tabular-nums">${formatPoints(participant.score)}</span><span class="block text-[11px] font-bold uppercase tracking-wide text-black/35">puntos</span></span>
            </li>`;
        }).join("")}
      </ol>
    </section>`;
}

function renderRoundForm(game, editingRoundId) {
  const editIndex = game.rounds.findIndex(({ id }) => id === editingRoundId);
  const isEditing = editIndex >= 0;
  const number = isEditing ? editIndex + 1 : game.rounds.length + 1;
  const round = isEditing ? game.rounds[editIndex] : null;
  const dealerId = getRoundDealer(game.participants, game.firstDealerId, number);
  const initialTotal = round
    ? game.participants.reduce((sum, { id }) => sum + round.scores[id], 0)
    : 0;

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

      <form id="round-form" class="mt-5 space-y-4" data-round-id="${isEditing ? escapeHtml(round.id) : ""}" novalidate>
        <div class="space-y-2">
          ${game.participants.map((participant) => `
            <label class="flex min-h-20 items-center gap-3 rounded-2xl border border-black/5 bg-white px-3 py-2" for="score-${escapeHtml(participant.id)}">
              ${participantAvatar(participant.name)}
              <span class="min-w-0 flex-1 truncate font-extrabold">${escapeHtml(participant.name)}</span>
              <input id="score-${escapeHtml(participant.id)}" data-score-for="${escapeHtml(participant.id)}" class="score-field w-28" type="number" min="0" max="${BRISCA_ROUND_TOTAL}" step="1" inputmode="numeric" placeholder="0" value="${round ? escapeHtml(round.scores[participant.id]) : ""}" required aria-label="Puntos de ${escapeHtml(participant.name)}" />
            </label>`).join("")}
        </div>

        <div id="round-total" class="flex items-center justify-between rounded-2xl px-4 py-3 ${initialTotal === BRISCA_ROUND_TOTAL ? "bg-green-50 text-felt-800" : "bg-amber-50 text-amber-900"}" aria-live="polite">
          <span class="font-bold">Total de la mano</span>
          <strong class="text-lg tabular-nums"><span id="round-score-total">${initialTotal}</span> / ${BRISCA_ROUND_TOTAL}</strong>
        </div>

        <p id="round-error" class="hidden rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800" role="alert" tabindex="-1"></p>
        <button type="submit" class="btn-primary min-h-16 w-full text-lg">${isEditing ? "Guardar cambios" : "Guardar turno"}</button>
      </form>
    </section>`;
}

function renderHistoryCard(game, snapshot, editable) {
  const { round, number, dealerId, scores, accumulated, standings } = snapshot;
  return `
    <article class="surface p-5" aria-labelledby="history-round-${number}">
      <header class="flex items-center justify-between gap-3">
        <span><h3 id="history-round-${number}" class="text-xl font-black">Turno ${number}</h3><span class="text-xs font-bold text-black/45">Reparte ${escapeHtml(getName(game, dealerId))}</span></span>
        ${editable ? `<span class="flex gap-1"><button type="button" data-action="edit-round" data-round-id="${escapeHtml(round.id)}" class="btn-quiet min-h-10 text-sm">Editar</button><button type="button" data-action="delete-round" data-round-id="${escapeHtml(round.id)}" class="btn-quiet min-h-10 text-sm text-exact">Eliminar</button></span>` : ""}
      </header>

      <div class="mt-4 divide-y divide-black/5 rounded-2xl border border-black/5 bg-white px-3">
        ${standings.map((participant) => `
          <div class="flex items-center gap-3 py-3">
            <span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-black/5 text-xs font-black text-black/50">${participant.position}</span>
            <span class="min-w-0 flex-1 truncate font-black">${escapeHtml(participant.name)}</span>
            <span class="text-right"><span class="block text-lg font-black tabular-nums">${formatSignedPoints(scores[participant.id])}</span><span class="block text-xs font-bold text-black/40">Total: ${formatPoints(accumulated[participant.id])}</span></span>
          </div>`).join("")}
      </div>
    </article>`;
}

function renderResult(game, result, acknowledged) {
  if (!result || (game.status === "active" && acknowledged)) return "";
  const winner = result.type === "winner";
  const names = winner ? result.participant.name : result.participants.map(({ name }) => name).join(" y ");
  const message = winner
    ? `${names} ha alcanzado ${formatPoints(result.score)} puntos.`
    : `${names} tienen ${formatPoints(result.score)} puntos. Podéis seguir para desempatar.`;

  return `
    <section id="game-result" tabindex="-1" class="rounded-3xl border-2 border-amber-300 bg-amber-50 p-5 shadow-lift" aria-live="polite">
      <p class="text-xs font-black uppercase tracking-[0.18em] text-amber-800">${game.status === "active" ? "Objetivo alcanzado" : game.status === "finished" ? "Partida finalizada" : "Partida archivada"}</p>
      <h2 class="mt-1 text-3xl font-black tracking-tight">${winner ? "🏆 Ganador" : "Empate en cabeza"}</h2>
      <p class="mt-2 font-semibold text-black/65">${escapeHtml(message)}</p>
      ${game.status === "active" ? `<div class="mt-5 grid gap-2 ${winner ? "grid-cols-2" : "grid-cols-1"}">${winner ? '<button type="button" data-action="finish-game" class="btn-primary">Finalizar partida</button>' : ""}<button type="button" data-action="continue-playing" class="btn-secondary">Seguir jugando</button></div>` : ""}
    </section>`;
}

export function renderBriscaGame({ game, editingRoundId }) {
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
        <div><p class="eyebrow">Partida ${game.status === "active" ? "en curso" : game.status === "finished" ? "finalizada" : "archivada"}</p><h1 class="mt-1 text-4xl font-black tracking-[-0.04em]">Brisca</h1></div>
        <p class="rounded-2xl bg-felt-800 px-4 py-2 text-right text-white"><span class="block text-[10px] font-black uppercase tracking-wider text-felt-200">Objetivo</span><span class="block text-xl font-black tabular-nums">${formatPoints(game.targetScore)}</span></p>
      </div>
      ${renderResult(game, result, acknowledged)}
      ${readonly && !result ? '<p class="rounded-2xl bg-black/5 px-4 py-3 text-center text-sm font-bold text-black/55">Esta partida está archivada y se muestra en modo consulta.</p>' : ""}
      ${renderScoreboard(game, progress)}
      ${readonly ? "" : renderRoundForm(game, editingRoundId)}
      <section aria-labelledby="history-title">
        <div class="mb-3 px-1"><p class="eyebrow">Comprobación</p><h2 id="history-title" class="section-title mt-1">Historial</h2></div>
        <div class="space-y-4">${progress.rounds.length ? [...progress.rounds].reverse().map((snapshot) => renderHistoryCard(game, snapshot, !readonly)).join("") : emptyState(`Todavía no hay turnos. Añade una mano que sume ${BRISCA_ROUND_TOTAL} puntos.`)}</div>
      </section>
    </section>`;
}
