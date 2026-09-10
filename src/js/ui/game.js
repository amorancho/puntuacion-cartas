import { calculateGameProgress, getGameResult, getRoundRoles } from "../games/pinacle.js";
import { escapeHtml, formatPoints, formatSignedPoints } from "../utils.js";
import { emptyState, participantAvatar } from "./components.js";

function getName(game, participantId) {
  return game.participants.find(({ id }) => id === participantId)?.name ?? "—";
}

function renderScoreboard(game, progress) {
  const hasUniqueLeader = progress.standings.length > 1 && progress.standings[0].score !== progress.standings[1].score;
  return `
    <section class="surface overflow-hidden" aria-labelledby="scoreboard-title">
      <div class="flex items-center justify-between px-5 pb-3 pt-5">
        <h2 id="scoreboard-title" class="section-title">Marcador</h2>
        <span class="text-sm font-bold text-black/45">${game.rounds.length} turno${game.rounds.length === 1 ? "" : "s"}</span>
      </div>
      <ol class="divide-y divide-black/5">
        ${progress.standings.map((participant, index) => {
          const leader = index === 0 && hasUniqueLeader;
          return `
            <li class="relative flex min-h-20 items-center gap-3 px-4 py-3 ${leader ? "bg-gradient-to-r from-amber-50 to-paper" : ""}">
              <span class="flex size-9 shrink-0 items-center justify-center rounded-full ${leader ? "bg-amber-400 text-ink" : "bg-black/5 text-black/55"} font-black" aria-label="Posición ${participant.position}">${leader ? "♛" : participant.position}</span>
              <span class="min-w-0 flex-1">
                <span class="flex items-center gap-2">
                  <span class="truncate text-base font-black">${escapeHtml(participant.name)}</span>
                  ${leader ? '<span class="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">Líder</span>' : ""}
                </span>
                ${participant.difference === null ? '<span class="text-xs font-bold text-black/40">En cabeza</span>' : `<span class="text-xs font-bold text-black/45">· ${formatPoints(participant.difference)} pts del anterior</span>`}
              </span>
              <span class="shrink-0 text-right">
                <span class="block text-2xl font-black tabular-nums">${formatPoints(participant.score)}</span>
                <span class="block text-[11px] font-bold uppercase tracking-wide text-black/35">puntos</span>
              </span>
            </li>`;
        }).join("")}
      </ol>
    </section>`;
}

function renderRoles(game, roles, roundNumber) {
  return `
    <div class="grid grid-cols-3 gap-2" aria-label="Roles del turno ${roundNumber}">
      ${[
        ["Corta", roles.cutterId],
        ["Reparte", roles.dealerId],
        ["Empieza", roles.starterId]
      ].map(([label, id]) => `
        <div class="rounded-2xl bg-black/[0.035] px-2 py-3 text-center">
          <span class="block text-[10px] font-black uppercase tracking-wider text-black/40">${label}</span>
          <span class="mt-1 block truncate text-sm font-black">${escapeHtml(getName(game, id))}</span>
        </div>`).join("")}
    </div>`;
}

function renderRoundForm(game, editingRoundId) {
  const editIndex = game.rounds.findIndex(({ id }) => id === editingRoundId);
  const isEditing = editIndex >= 0;
  const roundNumber = isEditing ? editIndex + 1 : game.rounds.length + 1;
  const round = isEditing ? game.rounds[editIndex] : null;
  const roles = getRoundRoles(game.participants, game.firstCutterId, roundNumber);

  return `
    <section id="round-entry" class="surface p-5" aria-labelledby="round-form-title">
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <p class="eyebrow">${isEditing ? "Corrigiendo" : "Siguiente mano"}</p>
          <h2 id="round-form-title" class="mt-1 text-2xl font-black">${isEditing ? `Editar turno ${roundNumber}` : `Turno ${roundNumber}`}</h2>
        </div>
        ${isEditing ? '<button type="button" data-action="cancel-edit" class="btn-quiet text-sm">Cancelar</button>' : ""}
      </div>

      ${renderRoles(game, roles, roundNumber)}

      <form id="round-form" class="mt-5 space-y-5" data-round-id="${isEditing ? escapeHtml(round.id) : ""}" novalidate>
        <div class="space-y-2">
          ${game.participants.map((participant) => `
            <label class="flex min-h-20 items-center gap-3 rounded-2xl border border-black/5 bg-white px-3 py-2" for="score-${escapeHtml(participant.id)}">
              ${participantAvatar(participant.name)}
              <span class="min-w-0 flex-1 truncate font-extrabold">${escapeHtml(participant.name)}</span>
              <input id="score-${escapeHtml(participant.id)}" name="score-${escapeHtml(participant.id)}" data-score-for="${escapeHtml(participant.id)}" class="score-field" type="number" step="1" inputmode="numeric" placeholder="0" value="${round ? escapeHtml(round.scores[participant.id]) : ""}" required aria-label="Puntos de ${escapeHtml(participant.name)}" />
            </label>`).join("")}
        </div>

        <label class="flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border-2 border-exact/15 bg-red-50/60 px-4 py-3">
          <input type="checkbox" name="exactCut" class="size-6 rounded accent-exact" ${round?.exactCut ? "checked" : ""} />
          <span class="flex-1">
            <span class="block font-black text-exact">✦ Corte exacto</span>
            <span class="block text-sm font-semibold text-black/50">+50 para ${escapeHtml(getName(game, roles.cutterId))}</span>
          </span>
        </label>

        <fieldset>
          <legend class="mb-2 font-black">⚡ Eléctrico</legend>
          <div class="grid grid-cols-2 gap-2 sm:grid-flow-col sm:auto-cols-fr">
            ${[{ id: "", name: "Nadie" }, ...game.participants].map((participant) => `
              <label class="choice flex cursor-pointer items-center justify-center gap-2 px-2 text-center text-sm ${(round?.electricParticipantId ?? "") === participant.id ? "choice-selected" : ""}">
                <input type="radio" name="electricParticipant" value="${escapeHtml(participant.id)}" class="sr-only" ${(round?.electricParticipantId ?? "") === participant.id ? "checked" : ""} />
                ${escapeHtml(participant.name)}
              </label>`).join("")}
          </div>
          <p class="mt-2 text-xs font-semibold text-black/40">Se registra en el historial; no modifica los puntos.</p>
        </fieldset>

        <p id="round-error" class="hidden rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800" role="alert"></p>
        <button type="submit" class="btn-primary min-h-16 w-full text-lg">${isEditing ? "Guardar cambios" : "Guardar turno"}</button>
      </form>
    </section>`;
}

function renderClassification(standings) {
  return `
    <ol class="mt-3 space-y-1.5 rounded-2xl bg-black/[0.035] p-3">
      ${standings.map((participant) => `
        <li class="flex items-baseline gap-2 text-sm">
          <span class="w-5 shrink-0 font-black text-black/45">${participant.position}.</span>
          <span class="min-w-0 flex-1 truncate font-extrabold">${escapeHtml(participant.name)}</span>
          <span class="shrink-0 font-black tabular-nums">${formatPoints(participant.score)}</span>
          ${participant.difference === null ? "" : `<span class="shrink-0 text-xs font-bold text-black/40">· ${formatPoints(participant.difference)} pts</span>`}
        </li>`).join("")}
    </ol>`;
}

function renderHistoryCard(game, snapshot, editable) {
  const { round, number, roles, scores, accumulated, standings } = snapshot;
  return `
    <article class="surface p-5" aria-labelledby="history-round-${number}">
      <header class="flex items-center justify-between gap-3">
        <h3 id="history-round-${number}" class="text-xl font-black">Turno ${number}</h3>
        ${editable ? `
          <span class="flex gap-1">
            <button type="button" data-action="edit-round" data-round-id="${escapeHtml(round.id)}" class="btn-quiet min-h-10 text-sm">Editar</button>
            <button type="button" data-action="delete-round" data-round-id="${escapeHtml(round.id)}" class="btn-quiet min-h-10 text-sm text-exact">Eliminar</button>
          </span>` : ""}
      </header>
      <div class="mt-3">${renderRoles(game, roles, number)}</div>
      ${round.electricParticipantId ? `<p class="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-black text-amber-900">⚡ Eléctrico: ${escapeHtml(getName(game, round.electricParticipantId))}</p>` : ""}

      <div class="mt-4 divide-y divide-black/5 rounded-2xl border border-black/5 bg-white px-3">
        ${game.participants.map((participant) => {
          const detail = scores[participant.id];
          const receivedBonus = detail.exactCutBonus > 0;
          return `
            <div class="py-3">
              <div class="flex items-center justify-between gap-3">
                <span class="font-black">${escapeHtml(participant.name)}</span>
                <span class="text-right">
                  <span class="block text-lg font-black tabular-nums">${formatSignedPoints(detail.total)}</span>
                  <span class="block text-xs font-bold text-black/40">Total: ${formatPoints(accumulated[participant.id])}</span>
                </span>
              </div>
              <p class="mt-1 text-xs font-semibold text-black/50">
                Base: ${formatSignedPoints(detail.base)}
                ${receivedBonus ? '<span class="ml-2 font-black text-exact">✦ Corte exacto: +50</span>' : ""}
              </p>
            </div>`;
        }).join("")}
      </div>

      <div class="mt-4">
        <p class="text-xs font-black uppercase tracking-[0.14em] text-black/40">Clasificación tras el turno</p>
        ${renderClassification(standings)}
      </div>
    </article>`;
}

function renderResult(game, result, acknowledged) {
  if (!result) return "";
  const isActive = game.status === "active";
  const isFinished = game.status === "finished";
  if (isActive && acknowledged) return "";

  const title = result.type === "winner" ? "🏆 Ganador" : "Empate en cabeza";
  const names = result.type === "winner"
    ? result.participant.name
    : result.participants.map(({ name }) => name).join(" y ");
  const message = result.type === "winner"
    ? `${names} ha alcanzado ${formatPoints(result.score)} puntos.`
    : `${names} tienen ${formatPoints(result.score)} puntos. Podéis seguir para desempatar.`;

  return `
    <section id="game-result" tabindex="-1" class="rounded-3xl border-2 border-amber-300 bg-amber-50 p-5 shadow-lift" aria-live="polite">
      <p class="text-xs font-black uppercase tracking-[0.18em] text-amber-800">${isFinished ? "Partida finalizada" : isActive ? "Objetivo alcanzado" : "Partida archivada"}</p>
      <h2 class="mt-1 text-3xl font-black tracking-tight">${title}</h2>
      <p class="mt-2 font-semibold text-black/65">${escapeHtml(message)}</p>
      ${isActive ? `
        <div class="mt-5 grid gap-2 ${result.type === "winner" ? "grid-cols-2" : "grid-cols-1"}">
          ${result.type === "winner" ? '<button type="button" data-action="finish-game" class="btn-primary">Finalizar partida</button>' : ""}
          <button type="button" data-action="continue-playing" class="btn-secondary">Seguir jugando</button>
        </div>` : ""}
    </section>`;
}

export function renderGame({ game, editingRoundId }) {
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
        <div>
          <p class="eyebrow">Partida ${game.status === "active" ? "en curso" : game.status === "finished" ? "finalizada" : "archivada"}</p>
          <h1 class="mt-1 text-4xl font-black tracking-[-0.04em]">Pinacle</h1>
        </div>
        <p class="rounded-2xl bg-felt-800 px-4 py-2 text-right text-white">
          <span class="block text-[10px] font-black uppercase tracking-wider text-felt-200">Objetivo</span>
          <span class="block text-xl font-black tabular-nums">${formatPoints(game.targetScore)}</span>
        </p>
      </div>

      ${renderResult(game, result, acknowledged)}
      ${readonly && !result ? '<p class="rounded-2xl bg-black/5 px-4 py-3 text-center text-sm font-bold text-black/55">Esta partida está archivada y se muestra en modo consulta.</p>' : ""}
      ${renderScoreboard(game, progress)}
      ${readonly ? "" : renderRoundForm(game, editingRoundId)}

      <section aria-labelledby="history-title">
        <div class="mb-3 flex items-end justify-between gap-3 px-1">
          <div>
            <p class="eyebrow">Comprobación</p>
            <h2 id="history-title" class="section-title mt-1">Historial</h2>
          </div>
          ${game.rounds.length ? `<span class="text-sm font-bold text-black/40">${game.rounds.length} turno${game.rounds.length === 1 ? "" : "s"}</span>` : ""}
        </div>
        <div class="space-y-4">
          ${progress.rounds.length ? [...progress.rounds].reverse().map((snapshot) => renderHistoryCard(game, snapshot, !readonly)).join("") : emptyState("Todavía no hay turnos. Añade las primeras puntuaciones arriba.")}
        </div>
      </section>
    </section>`;
}
