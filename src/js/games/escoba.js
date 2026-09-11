import { getStandings } from "./pinacle.js";

export const escoba = {
  id: "escoba",
  name: "Escoba",
  implemented: true,
  participantCounts: [2],
  suggestedTargets: [10, 15, 20]
};

export const escobaAwards = [
  { id: "cards", label: "Más cartas" },
  { id: "sevenOfGolds", label: "7 de oros", noTie: true },
  { id: "golds", label: "Más oros" },
  { id: "sevens", label: "Más sietes" }
];

function assertGameShape(game) {
  if (!game || game.type !== escoba.id || !Array.isArray(game.participants) || game.participants.length !== 2) {
    throw new TypeError("La partida de Escoba no es válida.");
  }
}

export function getRoundDealer(participants, firstDealerId, roundNumber) {
  if (!Array.isArray(participants) || participants.length !== 2) {
    throw new RangeError("Escoba necesita exactamente 2 jugadores.");
  }
  if (!Number.isInteger(roundNumber) || roundNumber < 1) {
    throw new RangeError("El número de turno debe ser un entero positivo.");
  }

  const firstIndex = participants.findIndex(({ id }) => id === firstDealerId);
  if (firstIndex < 0) throw new RangeError("El primer jugador que reparte no existe.");
  return participants[(firstIndex + roundNumber - 1) % participants.length].id;
}

export function calculateRoundScores(round, participants) {
  return Object.fromEntries(
    participants.map(({ id }) => {
      const brooms = Number(round.brooms[id]);
      const concepts = escobaAwards.filter(({ id: awardId }) => round.awards[awardId] === id).length;
      return [id, { brooms, concepts, total: brooms + concepts }];
    })
  );
}

export function calculateGameProgress(game) {
  assertGameShape(game);
  const totals = Object.fromEntries(game.participants.map(({ id }) => [id, 0]));

  const rounds = game.rounds.map((round, index) => {
    const number = index + 1;
    const dealerId = getRoundDealer(game.participants, game.firstDealerId, number);
    const scores = calculateRoundScores(round, game.participants);
    for (const { id } of game.participants) totals[id] += scores[id].total;

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
  const participantIds = new Set(game.participants.map(({ id }) => id));

  for (const participant of game.participants) {
    if (!Number.isInteger(round.brooms?.[participant.id]) || round.brooms[participant.id] < 0) {
      errors.push(`Las escobas de ${participant.name} deben ser un número entero positivo o cero.`);
    }
  }

  for (const award of escobaAwards) {
    if (!Object.hasOwn(round.awards ?? {}, award.id)) {
      errors.push(`Indica quién consigue «${award.label}».`);
      continue;
    }
    const winnerId = round.awards[award.id];
    if (winnerId !== null && !participantIds.has(winnerId)) {
      errors.push(`El jugador de «${award.label}» no es válido.`);
    }
    if (award.noTie && winnerId === null) {
      errors.push(`Indica quién tiene el ${award.label}.`);
    }
  }

  return errors;
}
