import { cleanName, normalizeName } from "./utils.js";

export const STORAGE_KEY = "card-score-state";
export const STORAGE_VERSION = 1;

const DEFAULT_PARTICIPANT_NAMES = [
  "Martí",
  "Llorenç",
  "Mamá",
  "Papá",
  "Martí + Llorenç",
  "Martí + Mamá",
  "Martí + Papá",
  "Llorenç + Mamá",
  "Llorenç + Papá",
  "Mamá + Papá"
];

function defaultParticipant(name, index) {
  return { id: `frequent-${index + 1}`, name };
}

export function createDefaultState() {
  return {
    version: STORAGE_VERSION,
    participants: DEFAULT_PARTICIPANT_NAMES.map(defaultParticipant),
    games: [],
    activeGameId: null
  };
}

function sanitizeParticipants(value, includeDefaults = true) {
  const result = [];
  const seen = new Set();
  const seenIds = new Set();
  const source = Array.isArray(value) ? value : [];

  for (const candidate of source) {
    const name = cleanName(candidate?.name);
    const normalized = normalizeName(name);
    if (!name || seen.has(normalized)) continue;
    let id = String(candidate?.id || `frequent-restored-${result.length + 1}`);
    while (seenIds.has(id)) id = `frequent-restored-${result.length + 1}-${seenIds.size + 1}`;
    seen.add(normalized);
    seenIds.add(id);
    result.push({ id, name });
  }

  if (!includeDefaults) return result;

  for (const participant of createDefaultState().participants) {
    const normalized = normalizeName(participant.name);
    if (seen.has(normalized)) continue;
    let id = participant.id;
    while (seenIds.has(id)) id = `${participant.id}-restored-${seenIds.size + 1}`;
    seen.add(normalized);
    seenIds.add(id);
    result.push({ id, name: participant.name });
  }

  return result;
}

function sanitizeGame(candidate, index) {
  if (!candidate || candidate.type !== "pinacle" || !Array.isArray(candidate.participants)) return null;

  const participants = sanitizeParticipants(candidate.participants, false);
  if (![2, 3].includes(participants.length)) return null;

  const participantIds = new Set(participants.map(({ id }) => id));
  if (!participantIds.has(candidate.firstCutterId)) return null;

  const targetScore = Number(candidate.targetScore);
  if (!Number.isInteger(targetScore) || targetScore <= 0) return null;

  const rounds = (Array.isArray(candidate.rounds) ? candidate.rounds : [])
    .map((round, index) => {
      const scores = {};
      for (const { id } of participants) {
        const score = Number(round?.scores?.[id]);
        if (!Number.isInteger(score)) return null;
        scores[id] = score;
      }

      const electricParticipantId = participantIds.has(round?.electricParticipantId)
        ? round.electricParticipantId
        : null;

      return {
        id: String(round?.id || `round-restored-${index + 1}`),
        scores,
        exactCut: Boolean(round?.exactCut),
        electricParticipantId,
        createdAt: round?.createdAt || candidate.createdAt || new Date(0).toISOString(),
        ...(round?.updatedAt ? { updatedAt: round.updatedAt } : {})
      };
    })
    .filter(Boolean);

  const validStatuses = new Set(["active", "finished", "abandoned"]);
  return {
    id: String(candidate.id || `game-restored-${index + 1}`),
    type: "pinacle",
    status: validStatuses.has(candidate.status) ? candidate.status : "abandoned",
    createdAt: candidate.createdAt || new Date(0).toISOString(),
    finishedAt: candidate.finishedAt || null,
    targetScore,
    participants,
    firstCutterId: candidate.firstCutterId,
    rounds,
    resultAcknowledgedRoundCount: Number.isInteger(candidate.resultAcknowledgedRoundCount)
      ? candidate.resultAcknowledgedRoundCount
      : null
  };
}

export function normalizePersistedState(value) {
  const defaults = createDefaultState();
  if (!value || typeof value !== "object") return defaults;

  const games = (Array.isArray(value.games) ? value.games : []).map(sanitizeGame).filter(Boolean);
  const requestedActiveId = typeof value.activeGameId === "string" ? value.activeGameId : null;
  const activeGame = games.find(({ id, status }) => id === requestedActiveId && status === "active");
  const normalizedGames = games.map((game) =>
    game.status === "active" && game.id !== activeGame?.id
      ? { ...game, status: "abandoned", finishedAt: game.finishedAt || new Date(0).toISOString() }
      : game
  );

  return {
    version: STORAGE_VERSION,
    participants: sanitizeParticipants(value.participants),
    games: normalizedGames,
    activeGameId: activeGame?.id ?? null
  };
}

export function loadAppState() {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    return normalizePersistedState(JSON.parse(raw));
  } catch {
    return createDefaultState();
  }
}

export function saveAppState(state) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
