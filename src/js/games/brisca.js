import { getStandings } from "./pinacle.js";

export const BRISCA_ROUND_TOTAL = 120;

export const brisca = {
  id: "brisca",
  name: "Brisca",
  implemented: true,
  participantCounts: [2, 3, 4],
  suggestedTargets: [120, 240, 360]
};

function assertGameShape(game) {
  if (!game || game.type !== brisca.id || !Array.isArray(game.participants) || !brisca.participantCounts.includes(game.participants.length)) {
    throw new TypeError("La partida de Brisca no es válida.");
  }
}

export function getRoundDealer(participants, firstDealerId, roundNumber) {
  if (!Array.isArray(participants) || !brisca.participantCounts.includes(participants.length)) {
    throw new RangeError("Brisca necesita 2, 3 o 4 jugadores.");
  }
  if (!Number.isInteger(roundNumber) || roundNumber < 1) {
    throw new RangeError("El número de turno debe ser un entero positivo.");
  }

  const firstIndex = participants.findIndex(({ id }) => id === firstDealerId);
  if (firstIndex < 0) throw new RangeError("El primer jugador que reparte no existe.");
  return participants[(firstIndex + roundNumber - 1) % participants.length].id;
}

export function calculateGameProgress(game) {
  assertGameShape(game);
  const totals = Object.fromEntries(game.participants.map(({ id }) => [id, 0]));

  const rounds = game.rounds.map((round, index) => {
    const number = index + 1;
    const dealerId = getRoundDealer(game.participants, game.firstDealerId, number);
    const scores = Object.fromEntries(
      game.participants.map(({ id }) => [id, Number(round.scores[id])])
    );
    for (const { id } of game.participants) totals[id] += scores[id];

    const accumulated = { ...totals };
    return {
      round,
      number,
      dealerId,
      scores,
      accumulated,
      standings: getStandings(game.participants, accumulated)
    };
  });

  return {
    totals: { ...totals },
    standings: getStandings(game.participants, totals),
    rounds
  };
}

export function getGameResult(game) {
  const { standings } = calculateGameProgress(game);
  const reachedTarget = standings.filter(({ score }) => score >= game.targetScore);
  if (!reachedTarget.length) return null;

  const topScore = reachedTarget[0].score;
  const tied = reachedTarget.filter(({ score }) => score === topScore);
  if (tied.length > 1) return { type: "tie", participants: tied, score: topScore };
  return { type: "winner", participant: reachedTarget[0], score: topScore };
}

export function validateRound(round, game) {
  assertGameShape(game);
  const errors = [];

  for (const participant of game.participants) {
    const score = round.scores?.[participant.id];
    if (!Number.isInteger(score) || score < 0 || score > BRISCA_ROUND_TOTAL) {
      errors.push(`La puntuación de ${participant.name} debe ser un entero entre 0 y ${BRISCA_ROUND_TOTAL}.`);
    }
  }

  if (!errors.length) {
    const total = game.participants.reduce((sum, { id }) => sum + round.scores[id], 0);
    if (total !== BRISCA_ROUND_TOTAL) {
      errors.push(`Las puntuaciones del turno deben sumar ${BRISCA_ROUND_TOTAL}; ahora suman ${total}.`);
    }
  }

  return errors;
}
