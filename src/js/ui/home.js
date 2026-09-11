import { calculateGameProgress as calculatePinacleProgress, getGameResult as getPinacleResult } from "../games/pinacle.js";
import { calculateGameProgress as calculateEscobaProgress, getGameResult as getEscobaResult } from "../games/escoba.js";
import { escapeHtml, formatDate, formatPoints } from "../utils.js";
import { cardSuit } from "./components.js";

function gameTile(game, suit, accent) {
  return `
    <button
      type="button"
      data-action="open-game"
      data-game-id="${game.id}"
      class="surface group relative min-h-32 overflow-hidden p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lift active:translate-y-0"
    >
      ${cardSuit(suit, `absolute -bottom-6 -right-2 text-8xl opacity-10 ${accent}`)}
      <span class="eyebrow">Juego</span>
      <span class="mt-2 block text-2xl font-black tracking-tight">${escapeHtml(game.name)}</span>
      <span class="mt-3 inline-flex items-center gap-1 text-sm font-bold text-felt-700">
        ${game.implemented ? "Jugar <span aria-hidden=\"true\">→</span>" : "Próximamente"}
      </span>
    </button>`;
}

function savedGameRow(game) {
  const isEscoba = game.type === "escoba";
  const { standings } = (isEscoba ? calculateEscobaProgress : calculatePinacleProgress)(game);
  const result = (isEscoba ? getEscobaResult : getPinacleResult)(game);
  const resultText = result?.type === "winner"
    ? `Ganó ${result.participant.name}`
    : result?.type === "tie"
      ? "Empate"
      : standings.length
        ? `Líder: ${standings[0].name} · ${formatPoints(standings[0].score)}`
        : "Sin turnos";

  return `
    <button type="button" data-action="view-saved-game" data-game-id="${escapeHtml(game.id)}" class="flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left transition hover:bg-felt-50">
      <span class="min-w-0">
        <span class="block truncate font-extrabold">${isEscoba ? "Escoba" : "Pinacle"} · ${game.participants.map(({ name }) => escapeHtml(name)).join(", ")}</span>
        <span class="block text-sm text-black/55">${formatDate(game.createdAt)} · ${game.rounds.length} turno${game.rounds.length === 1 ? "" : "s"} · ${escapeHtml(resultText)}</span>
      </span>
      <span class="shrink-0 text-xl text-felt-700" aria-hidden="true">›</span>
    </button>`;
}

export function renderHome({ games, activeGame, canInstall }) {
  const savedGames = [...games]
    .filter(({ id }) => id !== activeGame?.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return `
    <section class="pb-6 pt-5 sm:pt-10">
      <div class="mb-8 flex items-start justify-between gap-4">
        <div>
          <p class="eyebrow">En la mesa</p>
          <h1 class="mt-2 max-w-sm text-4xl font-black leading-none tracking-[-0.045em] sm:text-5xl">Marcador de cartas</h1>
          <p class="mt-3 max-w-md text-base font-medium leading-relaxed text-black/55">Puntuaciones claras, turnos rápidos y ninguna cuenta de cabeza.</p>
        </div>
        <div class="relative mt-1 h-20 w-16 shrink-0" aria-hidden="true">
          <span class="absolute left-0 top-2 block h-16 w-12 -rotate-6 rounded-xl bg-felt-200"></span>
          <span class="absolute right-0 top-0 flex h-16 w-12 rotate-6 items-center justify-center rounded-xl border-2 border-ink/10 bg-paper text-3xl text-exact shadow-sm">♥</span>
        </div>
      </div>

      ${activeGame ? `
        <button type="button" data-action="continue-game" data-game-id="${escapeHtml(activeGame.id)}" class="mb-7 flex min-h-24 w-full items-center justify-between gap-4 rounded-3xl bg-felt-800 p-5 text-left text-white shadow-lift transition hover:bg-felt-900 active:scale-[0.99]">
          <span>
            <span class="block text-xs font-black uppercase tracking-[0.18em] text-felt-200">Partida activa</span>
            <span class="mt-1 block text-xl font-black">Continuar partida</span>
            <span class="mt-1 block text-sm text-white/70">${activeGame.participants.map(({ name }) => escapeHtml(name)).join(" · ")} · Turno ${activeGame.rounds.length + 1}</span>
          </span>
          <span class="text-3xl" aria-hidden="true">→</span>
        </button>` : ""}

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        ${gameTile({ id: "pinacle", name: "Pinacle", implemented: true }, "♠", "text-ink")}
        ${gameTile({ id: "escoba", name: "Escoba", implemented: true }, "♦", "text-exact")}
        ${gameTile({ id: "brisca", name: "Brisca", implemented: false }, "♣", "text-felt-700")}
      </div>

      ${canInstall ? `
        <button type="button" data-action="install-app" class="btn-secondary mt-6 w-full gap-2">
          <span aria-hidden="true">↓</span> Instalar aplicación
        </button>` : ""}

      ${savedGames.length ? `
        <section class="surface mt-8 p-3" aria-labelledby="saved-title">
          <h2 id="saved-title" class="px-3 pb-2 pt-3 text-sm font-black uppercase tracking-[0.15em] text-black/45">Partidas guardadas</h2>
          <div class="divide-y divide-black/5">${savedGames.slice(0, 8).map(savedGameRow).join("")}</div>
        </section>` : ""}

      <p class="mt-8 text-center text-xs font-semibold text-black/40">Guardado automático · Disponible sin conexión</p>
    </section>`;
}
