export const pinacle = {
  id: "pinacle",
  name: "Pinacle",
  implemented: true,
  participantCounts: [2, 3],
  suggestedTargets: [1000, 1500, 2000],
  exactCutBonus: 50
};

function assertGameShape(game) {
  if (!game || game.type !== pinacle.id || !Array.isArray(game.participants)) {
    throw new TypeError("La partida de Pinacle no es válida.");
  }
}

export function getRoundRoles(participants, firstCutterId, roundNumber) {
  if (!Array.isArray(participants) || ![2, 3].includes(participants.length)) {
    throw new RangeError("Pinacle necesita 2 o 3 participantes.");
  }

  if (!Number.isInteger(roundNumber) || roundNumber < 1) {
    throw new RangeError("El número de turno debe ser un entero positivo.");
  }

  const firstIndex = participants.findIndex(({ id }) => id === firstCutterId);
  if (firstIndex < 0) {
    throw new RangeError("El primer participante que corta no existe.");
  }

  const cutterIndex = (firstIndex + roundNumber - 1) % participants.length;
  return {
    cutterId: participants[cutterIndex].id,
    dealerId: participants[(cutterIndex + 1) % participants.length].id,
    starterId: participants[(cutterIndex + 2) % participants.length].id
  };
}

export function calculateRoundScores(round, roles, participants) {
  return Object.fromEntries(
    participants.map(({ id }) => {
      const base = Number(round.scores[id]);
      const exactCutBonus = round.exactCut && roles.cutterId === id ? pinacle.exactCutBonus : 0;
      return [id, { base, exactCutBonus, total: base + exactCutBonus }];
    })
  );
}

export function getStandings(participants, totals) {
  const originalOrder = new Map(participants.map(({ id }, index) => [id, index]));
  const sorted = participants
    .map((participant) => ({ ...participant, score: totals[participant.id] ?? 0 }))
    .sort((a, b) => b.score - a.score || originalOrder.get(a.id) - originalOrder.get(b.id));

  return sorted.map((participant, index) => ({
    ...participant,
    position: index + 1,
    difference: index === 0 ? null : sorted[index - 1].score - participant.score
  }));
}

export function calculateGameProgress(game) {
  assertGameShape(game);
  const totals = Object.fromEntries(game.participants.map(({ id }) => [id, 0]));

  const rounds = game.rounds.map((round, index) => {
    const number = index + 1;
    const roles = getRoundRoles(game.participants, game.firstCutterId, number);
    const scores = calculateRoundScores(round, roles, game.participants);

    for (const participant of game.participants) {
      totals[participant.id] += scores[participant.id].total;
    }

    const accumulated = { ...totals };
    return {
      round,
      number,
      roles,
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

export function calculateGameTotals(game) {
  return calculateGameProgress(game).totals;
}

export function getScoreDifferences(game) {
  return calculateGameProgress(game).standings.map(({ id, difference }) => ({ id, difference }));
}

export function getLeader(game) {
  const standings = calculateGameProgress(game).standings;
  if (!standings.length) return null;
  const leaders = standings.filter(({ score }) => score === standings[0].score);
  return leaders.length === 1 ? leaders[0] : null;
}

export function getGameResult(game) {
  const { standings } = calculateGameProgress(game);
  const reachedTarget = standings.filter(({ score }) => score >= game.targetScore);
  if (!reachedTarget.length) return null;

  const topScore = reachedTarget[0].score;
  const tied = reachedTarget.filter(({ score }) => score === topScore);
  if (tied.length > 1) {
    return { type: "tie", participants: tied, score: topScore };
  }

  return { type: "winner", participant: reachedTarget[0], score: topScore };
}

export function hasWinner(game) {
  return getGameResult(game)?.type === "winner";
}

export function validateRound(round, game) {
  assertGameShape(game);
  const errors = [];

  for (const participant of game.participants) {
    if (!Number.isInteger(round.scores?.[participant.id])) {
      errors.push(`La puntuación de ${participant.name} debe ser un número entero.`);
    }
  }

  if (
    round.electricParticipantId !== null &&
    !game.participants.some(({ id }) => id === round.electricParticipantId)
  ) {
    errors.push("El participante del eléctrico no es válido.");
  }

  return errors;
}

