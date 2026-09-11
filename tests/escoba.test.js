import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateGameProgress,
  calculateRoundScores,
  getGameResult,
  getRoundDealer,
  validateRound
} from "../src/js/games/escoba.js";
import { normalizePersistedState } from "../src/js/storage.js";

const participants = [
  { id: "a", name: "Martí" },
  { id: "b", name: "Llorenç" }
];

function round(id, brooms, awards) {
  return { id, brooms, awards, createdAt: "2026-01-01T00:00:00.000Z" };
}

function game(overrides = {}) {
  return {
    id: "escoba-1",
    type: "escoba",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    finishedAt: null,
    targetScore: 15,
    participants,
    firstDealerId: "a",
    rounds: [],
    resultAcknowledgedRoundCount: null,
    ...overrides
  };
}

test("el reparto alterna entre los dos jugadores", () => {
  assert.equal(getRoundDealer(participants, "a", 1), "a");
  assert.equal(getRoundDealer(participants, "a", 2), "b");
  assert.equal(getRoundDealer(participants, "a", 3), "a");
});

test("suma escobas y un punto por cada concepto ganado", () => {
  const subject = round("r1", { a: 2, b: 1 }, {
    cards: "a",
    sevenOfGolds: "b",
    golds: "a",
    sevens: null
  });

  assert.deepEqual(calculateRoundScores(subject, participants), {
    a: { brooms: 2, concepts: 2, total: 4 },
    b: { brooms: 1, concepts: 1, total: 2 }
  });
});

test("acumula manos, recalcula el reparto y detecta el objetivo", () => {
  const subject = game({
    targetScore: 6,
    rounds: [
      round("r1", { a: 2, b: 0 }, { cards: "a", sevenOfGolds: "b", golds: "a", sevens: null }),
      round("r2", { a: 1, b: 1 }, { cards: "a", sevenOfGolds: "a", golds: null, sevens: "b" })
    ]
  });
  const progress = calculateGameProgress(subject);

  assert.deepEqual(progress.totals, { a: 7, b: 3 });
  assert.equal(progress.rounds[1].dealerId, "b");
  assert.equal(getGameResult(subject).participant.id, "a");
});

test("valida escobas, conceptos y que el 7 de oros no empate", () => {
  const errors = validateRound({
    brooms: { a: -1, b: 0 },
    awards: { cards: null, sevenOfGolds: null, golds: null, sevens: null }
  }, game());

  assert.ok(errors.some((error) => error.includes("Martí")));
  assert.ok(errors.some((error) => error.includes("7 de oros")));
});

test("la normalización conserva partidas de Escoba válidas", () => {
  const restored = normalizePersistedState({
    participants,
    games: [game({
      rounds: [round("r1", { a: 1, b: 0 }, { cards: "a", sevenOfGolds: "b", golds: null, sevens: "a" })]
    })],
    activeGameId: "escoba-1"
  });

  assert.equal(restored.games[0].type, "escoba");
  assert.equal(restored.games[0].rounds[0].awards.golds, null);
  assert.equal(restored.activeGameId, "escoba-1");
});
