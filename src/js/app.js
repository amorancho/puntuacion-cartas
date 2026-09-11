import { getGameMetadata } from "./games/index.js";
import { getGameResult as getPinacleResult } from "./games/pinacle.js";
import { escobaAwards, getGameResult as getEscobaResult } from "./games/escoba.js";
import {
  acknowledgeResult,
  addFrequentParticipant,
  addRound,
  abandonActiveGame,
  deleteRound,
  finishGame,
  getActiveGame,
  getGame,
  getState,
  startEscobaGame,
  startPinacleGame,
  subscribe,
  updateRound
} from "./state.js";
import { renderGame } from "./ui/game.js";
import { renderEscobaGame } from "./ui/game-escoba.js";
import { renderHome } from "./ui/home.js";
import { renderSetup } from "./ui/setup.js";
import { renderEscobaSetup } from "./ui/setup-escoba.js";

const root = document.querySelector("#app");
const toast = document.querySelector("#toast");

const ui = {
  setup: null,
  setupError: "",
  editingRoundId: null,
  installPrompt: null,
  toastTimer: null
};

function freshSetup(gameType = "pinacle") {
  return gameType === "escoba"
    ? {
        gameType,
        playerCount: 2,
        selectedParticipantIds: [],
        targetScore: 15,
        firstDealerId: null
      }
    : {
        gameType,
        playerCount: 2,
        selectedParticipantIds: [],
        targetScore: 1500,
        firstCutterId: null
      };
}

function gameResult(game) {
  return game.type === "escoba" ? getEscobaResult(game) : getPinacleResult(game);
}

function currentRoute() {
  const value = window.location.hash.replace(/^#\/?/, "");
  const [view = "home", rawId] = value.split("/");
  return { view, id: rawId ? decodeURIComponent(rawId) : null };
}

function navigate(path) {
  const nextHash = `#/${path}`;
  if (window.location.hash === nextHash) renderRoute();
  else window.location.hash = nextHash;
}

function currentRouteGame() {
  const route = currentRoute();
  return route.view === "game" ? getGame(route.id) : null;
}

function renderRoute() {
  const route = currentRoute();
  const state = getState();

  if (route.view === "setup") {
    const gameType = route.id === "escoba" ? "escoba" : "pinacle";
    if (ui.setup?.gameType !== gameType) ui.setup = freshSetup(gameType);
    const setupRenderer = gameType === "escoba" ? renderEscobaSetup : renderSetup;
    root.innerHTML = setupRenderer({
      participants: state.participants,
      setup: ui.setup,
      error: ui.setupError
    });
    return;
  }

  if (route.view === "game") {
    const game = getGame(route.id);
    if (game) {
      if (!game.rounds.some(({ id }) => id === ui.editingRoundId)) ui.editingRoundId = null;
      root.innerHTML = game.type === "escoba"
        ? renderEscobaGame({ game, editingRoundId: ui.editingRoundId })
        : renderGame({ game, editingRoundId: ui.editingRoundId });
      return;
    }
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#/home`);
  }

  root.innerHTML = renderHome({
    games: state.games,
    activeGame: getActiveGame(),
    canInstall: Boolean(ui.installPrompt)
  });
}

function showToast(message) {
  window.clearTimeout(ui.toastTimer);
  toast.textContent = message;
  toast.classList.add("toast-visible");
  ui.toastTimer = window.setTimeout(() => toast.classList.remove("toast-visible"), 2600);
}

function showInlineError(elementId, message) {
  const error = document.getElementById(elementId);
  if (!error) return;
  error.textContent = message;
  error.classList.remove("hidden");
  error.focus?.();
}

function ensureFirstRoleIsSelected() {
  const roleKey = ui.setup.gameType === "escoba" ? "firstDealerId" : "firstCutterId";
  if (!ui.setup.selectedParticipantIds.includes(ui.setup[roleKey])) {
    ui.setup[roleKey] = ui.setup.selectedParticipantIds[0] ?? null;
  }
}

function openSetup(gameType = "pinacle") {
  ui.setup = freshSetup(gameType);
  ui.setupError = "";
  ui.editingRoundId = null;
  navigate(`setup/${gameType}`);
}

function focusRoundForm() {
  window.requestAnimationFrame(() => {
    document.querySelector("#round-entry")?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.querySelector("#round-form [data-score-for], #round-form [data-brooms-for]")?.focus({ preventScroll: true });
  });
}

function focusResultOrRound(gameId) {
  const game = getGame(gameId);
  const shouldAnnounceResult = game && gameResult(game) && game.resultAcknowledgedRoundCount !== game.rounds.length;
  if (!shouldAnnounceResult) {
    focusRoundForm();
    return;
  }

  window.requestAnimationFrame(() => {
    const result = document.querySelector("#game-result");
    result?.scrollIntoView({ behavior: "smooth", block: "center" });
    result?.focus({ preventScroll: true });
  });
}

root.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;

  if (action === "go-home") {
    ui.editingRoundId = null;
    navigate("home");
    return;
  }

  if (action === "open-game") {
    const game = getGameMetadata(button.dataset.gameId);
    if (!game?.implemented) {
      showToast("Próximamente");
      return;
    }
    openSetup(game.id);
    return;
  }

  if (action === "continue-game" || action === "view-saved-game") {
    ui.editingRoundId = null;
    navigate(`game/${encodeURIComponent(button.dataset.gameId)}`);
    return;
  }

  if (action === "set-player-count") {
    ui.setup.playerCount = Number(button.dataset.count);
    ui.setup.selectedParticipantIds = ui.setup.selectedParticipantIds.slice(0, ui.setup.playerCount);
    ensureFirstRoleIsSelected();
    ui.setupError = "";
    renderRoute();
    return;
  }

  if (action === "toggle-participant") {
    const id = button.dataset.participantId;
    const index = ui.setup.selectedParticipantIds.indexOf(id);
    if (index >= 0) ui.setup.selectedParticipantIds.splice(index, 1);
    else if (ui.setup.selectedParticipantIds.length < ui.setup.playerCount) ui.setup.selectedParticipantIds.push(id);
    ensureFirstRoleIsSelected();
    ui.setupError = "";
    renderRoute();
    return;
  }

  if (action === "add-custom-participant") {
    const input = document.querySelector("#custom-participant");
    const participant = addFrequentParticipant(input?.value);
    if (!participant) {
      ui.setupError = "Escribe un nombre para añadirlo.";
      renderRoute();
      document.querySelector("#custom-participant")?.focus();
      return;
    }

    if (
      !ui.setup.selectedParticipantIds.includes(participant.id) &&
      ui.setup.selectedParticipantIds.length < ui.setup.playerCount
    ) {
      ui.setup.selectedParticipantIds.push(participant.id);
    } else if (!ui.setup.selectedParticipantIds.includes(participant.id)) {
      ui.setupError = `Ya has seleccionado ${ui.setup.playerCount} participantes.`;
    }
    ensureFirstRoleIsSelected();
    renderRoute();
    return;
  }

  if (action === "set-target") {
    ui.setup.targetScore = Number(button.dataset.target);
    ui.setupError = "";
    renderRoute();
    return;
  }

  if (action === "adjust-brooms") {
    const input = document.getElementById(button.dataset.inputId);
    if (!input) return;
    const current = /^\d+$/.test(input.value) ? Number(input.value) : 0;
    input.value = String(Math.max(0, current + Number(button.dataset.delta)));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  if (action === "edit-round") {
    ui.editingRoundId = button.dataset.roundId;
    renderRoute();
    focusRoundForm();
    return;
  }

  if (action === "cancel-edit") {
    ui.editingRoundId = null;
    renderRoute();
    focusRoundForm();
    return;
  }

  if (action === "delete-round") {
    const game = currentRouteGame();
    if (!game) return;
    const index = game.rounds.findIndex(({ id }) => id === button.dataset.roundId);
    if (index < 0 || !window.confirm(`¿Eliminar el turno ${index + 1}? Los turnos posteriores se recalcularán.`)) return;
    deleteRound(game.id, button.dataset.roundId);
    ui.editingRoundId = null;
    showToast("Turno eliminado y puntuaciones recalculadas");
    return;
  }

  if (action === "new-game") {
    const game = currentRouteGame();
    if (game?.status === "active") {
      const confirmed = window.confirm("La partida actual se archivará. ¿Quieres preparar una nueva?");
      if (!confirmed) return;
      abandonActiveGame();
    }
    openSetup(game?.type ?? "pinacle");
    return;
  }

  if (action === "continue-playing") {
    const game = currentRouteGame();
    if (!game) return;
    acknowledgeResult(game.id);
    showToast("La partida continúa");
    focusRoundForm();
    return;
  }

  if (action === "finish-game") {
    const game = currentRouteGame();
    if (!game) return;
    finishGame(game.id);
    ui.editingRoundId = null;
    showToast("Partida finalizada y guardada");
    return;
  }

  if (action === "install-app" && ui.installPrompt) {
    ui.installPrompt.prompt();
    await ui.installPrompt.userChoice;
    ui.installPrompt = null;
    renderRoute();
  }
});

root.addEventListener("input", (event) => {
  if (event.target.id !== "target-score" || !ui.setup) return;
  const value = event.target.value.trim();
  ui.setup.targetScore = /^\d+$/.test(value) ? Number(value) : Number.NaN;
  ui.setupError = "";
});

root.addEventListener("change", (event) => {
  if (event.target.name === "firstCutter" && ui.setup) {
    ui.setup.firstCutterId = event.target.value;
    ui.setupError = "";
  }

  if (event.target.name === "firstDealer" && ui.setup) {
    ui.setup.firstDealerId = event.target.value;
    ui.setupError = "";
  }

  if (event.target.name === "electricParticipant") {
    const fieldset = event.target.closest("fieldset");
    fieldset?.querySelectorAll("label.choice").forEach((label) => label.classList.remove("choice-selected"));
    event.target.closest("label")?.classList.add("choice-selected");
  }
  if (event.target.name?.startsWith("award-")) {
    const group = event.target.closest("[data-award-group]");
    group?.querySelectorAll("label.choice").forEach((label) => label.classList.remove("choice-selected"));
    event.target.closest("label")?.classList.add("choice-selected");
  }
});

root.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.id === "custom-participant") {
    event.preventDefault();
    document.querySelector('[data-action="add-custom-participant"]')?.click();
  }
});

root.addEventListener("submit", (event) => {
  event.preventDefault();

  if (event.target.id === "setup-form") {
    const targetInput = event.target.elements.targetScore;
    const targetValue = targetInput.value.trim();
    ui.setup.targetScore = /^\d+$/.test(targetValue) ? Number(targetValue) : Number.NaN;
    if (ui.setup.gameType === "escoba") {
      ui.setup.firstDealerId = event.target.elements.firstDealer?.value ?? ui.setup.firstDealerId;
    } else {
      ui.setup.firstCutterId = event.target.elements.firstCutter?.value ?? ui.setup.firstCutterId;
    }

    if (ui.setup.selectedParticipantIds.length !== ui.setup.playerCount) {
      ui.setupError = `Selecciona exactamente ${ui.setup.playerCount} participantes.`;
      renderRoute();
      return;
    }
    if (!Number.isInteger(ui.setup.targetScore) || ui.setup.targetScore <= 0) {
      ui.setupError = "La puntuación objetivo debe ser un entero positivo.";
      renderRoute();
      return;
    }
    const firstRoleId = ui.setup.gameType === "escoba" ? ui.setup.firstDealerId : ui.setup.firstCutterId;
    if (!firstRoleId) {
      ui.setupError = ui.setup.gameType === "escoba" ? "Indica quién reparte primero." : "Indica quién empieza cortando.";
      renderRoute();
      return;
    }

    if (getActiveGame() && !window.confirm("Ya hay una partida en curso. Se archivará al iniciar la nueva. ¿Continuar?")) return;

    try {
      const game = ui.setup.gameType === "escoba"
        ? startEscobaGame({
            participantIds: ui.setup.selectedParticipantIds,
            targetScore: ui.setup.targetScore,
            firstDealerId: ui.setup.firstDealerId
          })
        : startPinacleGame({
            participantIds: ui.setup.selectedParticipantIds,
            targetScore: ui.setup.targetScore,
            firstCutterId: ui.setup.firstCutterId
          });
      ui.setup = null;
      ui.setupError = "";
      navigate(`game/${encodeURIComponent(game.id)}`);
    } catch (error) {
      ui.setupError = error.message;
      renderRoute();
    }
    return;
  }

  if (event.target.id === "round-form") {
    const game = currentRouteGame();
    if (!game) return;
    if (game.type === "escoba") {
      const brooms = {};
      for (const input of event.target.querySelectorAll("[data-brooms-for]")) {
        const value = input.value.trim();
        if (!/^\d+$/.test(value)) {
          showInlineError("round-error", `Introduce un número de escobas válido para ${game.participants.find(({ id }) => id === input.dataset.broomsFor)?.name}.`);
          input.focus();
          return;
        }
        brooms[input.dataset.broomsFor] = Number(value);
      }

      const awards = {};
      for (const award of escobaAwards) {
        const selected = event.target.elements[`award-${award.id}`]?.value;
        if (selected === undefined || selected === "") {
          showInlineError("round-error", `Indica quién consigue «${award.label}».`);
          return;
        }
        awards[award.id] = selected === "__tie__" ? null : selected;
      }

      try {
        const roundId = event.target.dataset.roundId;
        if (roundId) {
          updateRound(game.id, roundId, { brooms, awards });
          ui.editingRoundId = null;
          renderRoute();
          showToast("Turno actualizado y partida recalculada");
        } else {
          addRound(game.id, { brooms, awards });
          showToast("Turno guardado");
        }
        focusResultOrRound(game.id);
      } catch (error) {
        showInlineError("round-error", error.message);
      }
      return;
    }

    const scores = {};

    for (const input of event.target.querySelectorAll("[data-score-for]")) {
      const value = input.value.trim();
      if (!/^-?\d+$/.test(value)) {
        showInlineError("round-error", `Introduce una puntuación entera para ${game.participants.find(({ id }) => id === input.dataset.scoreFor)?.name}.`);
        input.focus();
        return;
      }
      scores[input.dataset.scoreFor] = Number(value);
    }

    const data = {
      scores,
      exactCut: event.target.elements.exactCut.checked,
      electricParticipantId: event.target.elements.electricParticipant.value || null
    };

    try {
      const roundId = event.target.dataset.roundId;
      if (roundId) {
        updateRound(game.id, roundId, data);
        ui.editingRoundId = null;
        renderRoute();
        showToast("Turno actualizado y partida recalculada");
      } else {
        addRound(game.id, data);
        showToast("Turno guardado");
      }
      focusResultOrRound(game.id);
    } catch (error) {
      showInlineError("round-error", error.message);
    }
  }
});

window.addEventListener("hashchange", renderRoute);
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  ui.installPrompt = event;
  renderRoute();
});
window.addEventListener("appinstalled", () => {
  ui.installPrompt = null;
  showToast("Aplicación instalada");
  renderRoute();
});

subscribe(renderRoute);
renderRoute();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const appBaseUrl = new URL("./", document.baseURI);
    const serviceWorkerUrl = new URL("service-worker.js", appBaseUrl);
    navigator.serviceWorker.register(serviceWorkerUrl, { scope: appBaseUrl.pathname }).catch(() => {
      // La aplicación sigue funcionando online si el navegador bloquea el Service Worker.
    });
  });
}
