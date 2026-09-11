import test from "node:test";
import assert from "node:assert/strict";

import {
  BRISCA_ROUND_TOTAL,
  brisca,
  calculateGameProgress,
  getGameResult,
  getRoundDealer,
  validateRound
} from "../src/js/games/brisca.js";
import { normalizePersistedState } from "../src/js/storage.js";
import { renderBriscaGame } from "../src/js/ui/game-brisca.js";
import { renderBriscaSetup } from "../src/js/ui/setup-brisca.js";

const participants = [
  { id: "a", name: "Martí" },
  { id: "b", name: "Llorenç" },
  { id: "c", name: "Mamá" },
  { id: "d", name: "Papá" }
];

function round(id, scores) {
  return { id, scores, createdAt: "2026-01-01T00:00:00.000Z" };
}

function game(overrides = {}) {
  return {
    id: "brisca-1",
    type: "brisca",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    finishedAt: null,
    targetScore: 240,
    participants,
    firstDealerId: "b",
    rounds: [],
    resultAcknowledgedRoundCount: null,
    ...overrides
  };
}

test("cada mano de Brisca reparte exactamente 120 puntos", () => {
  assert.equal(BRISCA_ROUND_TOTAL, 120);
  assert.deepEqual(validateRound({ scores: { a: 50, b: 30, c: 25, d: 15 } }, game()), []);

  const errors = validateRound({ scores: { a: 50, b: 30, c: 25, d: 14 } }, game());
  assert.equal(errors.length, 1);
  assert.match(errors[0], /suman 119/);
});

test("Brisca está disponible y sus pantallas ofrecen jugadores, objetivo y total de mano", () => {
  assert.equal(brisca.implemented, true);
  const setup = renderBriscaSetup({
    participants,
    setup: { playerCount: 4, selectedParticipantIds: participants.map(({ id }) => id), targetScore: 240, firstDealerId: "a" }
  });
  const playing = renderBriscaGame({ game: game(), editingRoundId: null });

  assert.match(setup, /data-count="4"/);
  assert.match(setup, /Quién reparte primero/);
  assert.match(playing, /id="round-score-total">0<\/span> \/ 120/);
});

test("rechaza valores negativos, decimales o superiores a 120", () => {
  assert.ok(validateRound({ scores: { a: -1, b: 30, c: 30, d: 61 } }, game()).length);
  assert.ok(validateRound({ scores: { a: 30.5, b: 30, c: 30, d: 29.5 } }, game()).length);
  assert.ok(validateRound({ scores: { a: 121, b: 0, c: 0, d: 0 } }, game()).length);
});

test("el reparto rota respetando quién empieza", () => {
  assert.equal(getRoundDealer(participants, "b", 1), "b");
  assert.equal(getRoundDealer(participants, "b", 2), "c");
  assert.equal(getRoundDealer(participants, "b", 4), "a");
  assert.equal(getRoundDealer(participants, "b", 5), "b");
});

test("acumula las manos y resuelve ganador al alcanzar el objetivo", () => {
  const subject = game({
    targetScore: 100,
    rounds: [
      round("r1", { a: 60, b: 30, c: 20, d: 10 }),
      round("r2", { a: 45, b: 35, c: 25, d: 15 })
    ]
  });
  const progress = calculateGameProgress(subject);

  assert.deepEqual(progress.totals, { a: 105, b: 65, c: 45, d: 25 });
  assert.equal(progress.rounds[1].dealerId, "c");
  assert.equal(getGameResult(subject).participant.id, "a");
});

test("la normalización conserva partidas de Brisca válidas y descarta manos que no suman 120", () => {
  const restored = normalizePersistedState({
    participants,
    games: [game({
      rounds: [
        round("valid", { a: 60, b: 30, c: 20, d: 10 }),
        round("invalid", { a: 60, b: 30, c: 20, d: 9 })
      ]
    })],
    activeGameId: "brisca-1"
  });

  assert.equal(restored.games[0].type, "brisca");
  assert.deepEqual(restored.games[0].rounds.map(({ id }) => id), ["valid"]);
  assert.equal(restored.activeGameId, "brisca-1");
});
