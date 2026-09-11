import { loadAppState, saveAppState } from "./storage.js";
import { createId, cleanName, normalizeName } from "./utils.js";
import { validateRound as validatePinacleRound } from "./games/pinacle.js";
import { validateRound as validateEscobaRound } from "./games/escoba.js";
import { validateRound as validateBriscaRound } from "./games/brisca.js";

let state = loadAppState();
const listeners = new Set();

function commit(mutator) {
  mutator(state);
  saveAppState(state);
  for (const listener of listeners) listener(state);
}

export function getState() {
  return state;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getGame(gameId) {
  return state.games.find(({ id }) => id === gameId) ?? null;
}

export function getActiveGame() {
  return state.games.find(({ id, status }) => id === state.activeGameId && status === "active") ?? null;
}

export function addFrequentParticipant(rawName) {
  const name = cleanName(rawName);
  if (!name) return null;

  const existing = state.participants.find(
    (participant) => normalizeName(participant.name) === normalizeName(name)
  );
  if (existing) return existing;

  const participant = { id: createId("participant"), name };
  commit((draft) => draft.participants.push(participant));
  return participant;
}

export function startPinacleGame({ participantIds, targetScore, firstCutterId }) {
  const uniqueIds = [...new Set(participantIds)];
  if (![2, 3].includes(uniqueIds.length) || uniqueIds.length !== participantIds.length) {
    throw new Error("Selecciona 2 o 3 participantes distintos.");
  }

  const participants = participantIds.map((id) => state.participants.find((item) => item.id === id));
  if (participants.some((participant) => !participant)) {
    throw new Error("Algún participante ya no está disponible.");
  }

  const parsedTarget = Number(targetScore);
  if (!Number.isInteger(parsedTarget) || parsedTarget <= 0) {
    throw new Error("La puntuación objetivo debe ser un entero positivo.");
  }

  if (!uniqueIds.includes(firstCutterId)) {
    throw new Error("Indica quién empieza cortando.");
  }

  const now = new Date().toISOString();
  const game = {
    id: createId("game"),
    type: "pinacle",
    status: "active",
    createdAt: now,
    finishedAt: null,
    targetScore: parsedTarget,
    participants: participants.map(({ id, name }) => ({ id, name })),
    firstCutterId,
    rounds: [],
    resultAcknowledgedRoundCount: null
  };

  commit((draft) => {
    const active = draft.games.find(({ id }) => id === draft.activeGameId);
    if (active) {
      active.status = "abandoned";
      active.finishedAt = now;
    }
    draft.games.push(game);
    draft.activeGameId = game.id;
  });

  return game;
}

export function startEscobaGame({ participantIds, targetScore, firstDealerId }) {
  const uniqueIds = [...new Set(participantIds)];
  if (uniqueIds.length !== 2 || uniqueIds.length !== participantIds.length) {
    throw new Error("Selecciona exactamente 2 jugadores distintos.");
  }

  const participants = participantIds.map((id) => state.participants.find((item) => item.id === id));
  if (participants.some((participant) => !participant)) {
    throw new Error("Algún jugador ya no está disponible.");
  }

  const parsedTarget = Number(targetScore);
  if (!Number.isInteger(parsedTarget) || parsedTarget <= 0) {
    throw new Error("La puntuación objetivo debe ser un entero positivo.");
  }
  if (!uniqueIds.includes(firstDealerId)) throw new Error("Indica quién reparte primero.");

  const now = new Date().toISOString();
  const game = {
    id: createId("game"),
    type: "escoba",
    status: "active",
    createdAt: now,
    finishedAt: null,
    targetScore: parsedTarget,
    participants: participants.map(({ id, name }) => ({ id, name })),
    firstDealerId,
    rounds: [],
    resultAcknowledgedRoundCount: null
  };

  commit((draft) => {
    const active = draft.games.find(({ id }) => id === draft.activeGameId);
    if (active) {
      active.status = "abandoned";
      active.finishedAt = now;
    }
    draft.games.push(game);
    draft.activeGameId = game.id;
  });

  return game;
}

export function startBriscaGame({ participantIds, targetScore, firstDealerId }) {
  const uniqueIds = [...new Set(participantIds)];
  if (![2, 3, 4].includes(uniqueIds.length) || uniqueIds.length !== participantIds.length) {
    throw new Error("Selecciona 2, 3 o 4 jugadores distintos.");
  }

  const participants = participantIds.map((id) => state.participants.find((item) => item.id === id));
  if (participants.some((participant) => !participant)) {
    throw new Error("Algún jugador ya no está disponible.");
  }

  const parsedTarget = Number(targetScore);
  if (!Number.isInteger(parsedTarget) || parsedTarget <= 0) {
    throw new Error("La puntuación objetivo debe ser un entero positivo.");
  }
  if (!uniqueIds.includes(firstDealerId)) throw new Error("Indica quién reparte primero.");

  const now = new Date().toISOString();
  const game = {
    id: createId("game"),
    type: "brisca",
    status: "active",
    createdAt: now,
    finishedAt: null,
    targetScore: parsedTarget,
    participants: participants.map(({ id, name }) => ({ id, name })),
    firstDealerId,
    rounds: [],
    resultAcknowledgedRoundCount: null
  };

  commit((draft) => {
    const active = draft.games.find(({ id }) => id === draft.activeGameId);
    if (active) {
      active.status = "abandoned";
      active.finishedAt = now;
    }
    draft.games.push(game);
    draft.activeGameId = game.id;
  });

  return game;
}

export function abandonActiveGame() {
  const active = getActiveGame();
  if (!active) return;
  commit((draft) => {
    const game = draft.games.find(({ id }) => id === active.id);
    game.status = "abandoned";
    game.finishedAt = new Date().toISOString();
    draft.activeGameId = null;
  });
}

export function addRound(gameId, data) {
  const game = getGame(gameId);
  if (!game || game.status !== "active") throw new Error("La partida no está activa.");

  const validateRound = game.type === "escoba"
    ? validateEscobaRound
    : game.type === "brisca"
      ? validateBriscaRound
      : validatePinacleRound;
  const errors = validateRound(data, game);
  if (errors.length) throw new Error(errors[0]);

  let round;
  if (game.type === "escoba") {
    round = {
      id: createId("round"),
      brooms: { ...data.brooms },
      awards: { ...data.awards },
      createdAt: new Date().toISOString()
    };
  } else if (game.type === "brisca") {
    round = {
      id: createId("round"),
      scores: { ...data.scores },
      createdAt: new Date().toISOString()
    };
  } else {
    round = {
      id: createId("round"),
      scores: { ...data.scores },
      exactCut: Boolean(data.exactCut),
      electricParticipantId: data.electricParticipantId || null,
      createdAt: new Date().toISOString()
    };
  }

  commit((draft) => {
    const target = draft.games.find(({ id }) => id === gameId);
    target.rounds.push(round);
    target.resultAcknowledgedRoundCount = null;
  });
  return round;
}

export function updateRound(gameId, roundId, data) {
  const game = getGame(gameId);
  if (!game || game.status !== "active") throw new Error("La partida no está activa.");
  const validateRound = game.type === "escoba"
    ? validateEscobaRound
    : game.type === "brisca"
      ? validateBriscaRound
      : validatePinacleRound;
  const errors = validateRound(data, game);
  if (errors.length) throw new Error(errors[0]);

  commit((draft) => {
    const target = draft.games.find(({ id }) => id === gameId);
    const round = target.rounds.find(({ id }) => id === roundId);
    if (!round) throw new Error("No se ha encontrado el turno.");
    if (game.type === "escoba") {
      round.brooms = { ...data.brooms };
      round.awards = { ...data.awards };
    } else if (game.type === "brisca") {
      round.scores = { ...data.scores };
    } else {
      round.scores = { ...data.scores };
      round.exactCut = Boolean(data.exactCut);
      round.electricParticipantId = data.electricParticipantId || null;
    }
    round.updatedAt = new Date().toISOString();
    target.resultAcknowledgedRoundCount = null;
  });
}

export function deleteRound(gameId, roundId) {
  const game = getGame(gameId);
  if (!game || game.status !== "active") throw new Error("La partida no está activa.");

  commit((draft) => {
    const target = draft.games.find(({ id }) => id === gameId);
    target.rounds = target.rounds.filter(({ id }) => id !== roundId);
    target.resultAcknowledgedRoundCount = null;
  });
}

export function acknowledgeResult(gameId) {
  commit((draft) => {
    const game = draft.games.find(({ id }) => id === gameId);
    if (game) game.resultAcknowledgedRoundCount = game.rounds.length;
  });
}

export function finishGame(gameId) {
  commit((draft) => {
    const game = draft.games.find(({ id }) => id === gameId);
    if (!game) return;
    game.status = "finished";
    game.finishedAt = new Date().toISOString();
    if (draft.activeGameId === gameId) draft.activeGameId = null;
  });
}
