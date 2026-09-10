import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateGameProgress,
  getGameResult,
  getRoundRoles,
  getStandings
} from "../src/js/games/pinacle.js";
import {
  createDefaultState,
  loadAppState,
  normalizePersistedState,
  STORAGE_KEY
} from "../src/js/storage.js";

const participants = [
  { id: "a", name: "A" },
  { id: "b", name: "B" },
  { id: "c", name: "C" }
];

function game(overrides = {}) {
  return {
    id: "game-1",
    type: "pinacle",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    finishedAt: null,
    targetScore: 1000,
    participants,
    firstCutterId: "a",
    rounds: [],
    resultAcknowledgedRoundCount: null,
    ...overrides
  };
}

function round(id, scores, options = {}) {
  return {
    id,
    scores,
    exactCut: false,
    electricParticipantId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...options
  };
}

test("rota corta, reparte y empieza circularmente con tres participantes", () => {
  assert.deepEqual(getRoundRoles(participants, "a", 1), {
    cutterId: "a",
    dealerId: "b",
    starterId: "c"
  });
  assert.deepEqual(getRoundRoles(participants, "a", 2), {
    cutterId: "b",
    dealerId: "c",
    starterId: "a"
  });
  assert.deepEqual(getRoundRoles(participants, "a", 4), {
    cutterId: "a",
    dealerId: "b",
    starterId: "c"
  });
});

test("con dos participantes quien corta también empieza", () => {
  const pair = participants.slice(0, 2);
  assert.deepEqual(getRoundRoles(pair, "a", 1), {
    cutterId: "a",
    dealerId: "b",
    starterId: "a"
  });
  assert.deepEqual(getRoundRoles(pair, "a", 2), {
    cutterId: "b",
    dealerId: "a",
    starterId: "b"
  });
});

test("el corte exacto suma 50 solamente a quien corta y conserva la base", () => {
  const subject = game({
    rounds: [round("r1", { a: 120, b: -30, c: 240 }, { exactCut: true })]
  });
  const progress = calculateGameProgress(subject);

  assert.deepEqual(progress.rounds[0].scores.a, { base: 120, exactCutBonus: 50, total: 170 });
  assert.deepEqual(progress.rounds[0].scores.b, { base: -30, exactCutBonus: 0, total: -30 });
  assert.deepEqual(progress.totals, { a: 170, b: -30, c: 240 });
});

test("editar o eliminar se recalcula desde las rondas restantes y renueva la rotación", () => {
  const original = game({
    rounds: [
      round("r1", { a: 100, b: 20, c: 30 }),
      round("r2", { a: 10, b: 200, c: 40 }, { exactCut: true }),
      round("r3", { a: 5, b: 6, c: 300 })
    ]
  });
  const edited = game({
    rounds: [
      round("r1", { a: 150, b: 20, c: 30 }),
      original.rounds[1],
      original.rounds[2]
    ]
  });
  const afterDeletion = game({ rounds: [original.rounds[0], original.rounds[2]] });

  assert.deepEqual(calculateGameProgress(edited).totals, { a: 165, b: 276, c: 370 });
  assert.deepEqual(calculateGameProgress(afterDeletion).totals, { a: 105, b: 26, c: 330 });
  assert.equal(calculateGameProgress(afterDeletion).rounds[1].roles.cutterId, "b");
});

test("clasifica y calcula la diferencia contra la posición anterior", () => {
  assert.deepEqual(
    getStandings(participants, { a: 1320, b: 980, c: 1170 }).map(({ id, difference }) => ({ id, difference })),
    [
      { id: "a", difference: null },
      { id: "c", difference: 150 },
      { id: "b", difference: 190 }
    ]
  );
});

test("resuelve ganador por mayor total y conserva un empate exacto", () => {
  const winner = game({ rounds: [round("r1", { a: 1100, b: 1000, c: 900 })] });
  const tie = game({ rounds: [round("r1", { a: 1100, b: 1100, c: 900 })] });

  assert.equal(getGameResult(winner).participant.id, "a");
  assert.equal(getGameResult(tie).type, "tie");
  assert.deepEqual(getGameResult(tie).participants.map(({ id }) => id), ["a", "b"]);
});

test("el estado inicial contiene personas y las seis parejas como participantes planos", () => {
  const state = createDefaultState();
  assert.equal(state.version, 1);
  assert.equal(state.participants.length, 10);
  assert.equal(state.participants.find(({ name }) => name === "Martí + Papá")?.name, "Martí + Papá");
  assert.equal("members" in state.participants[0], false);
});

test("la normalización repara propiedades ausentes y elimina participantes duplicados", () => {
  const state = normalizePersistedState({
    version: 0,
    participants: [
      { id: "one", name: " Martí " },
      { id: "two", name: "MARTÍ" },
      { id: "custom", name: " Invitada " }
    ]
  });

  assert.equal(state.version, 1);
  assert.equal(state.participants.filter(({ name }) => name.toLocaleLowerCase("es") === "martí").length, 1);
  assert.ok(state.participants.some(({ name }) => name === "Invitada"));
  assert.ok(state.participants.some(({ name }) => name === "Llorenç + Papá"));
});

test("un JSON corrupto en localStorage no impide iniciar la aplicación", () => {
  const previous = globalThis.localStorage;
  globalThis.localStorage = {
    getItem(key) {
      assert.equal(key, STORAGE_KEY);
      return "{esto no es json";
    }
  };

  try {
    const state = loadAppState();
    assert.equal(state.version, 1);
    assert.equal(state.participants.length, 10);
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
});

