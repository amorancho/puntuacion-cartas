import { brisca } from "./brisca.js";
import { escoba } from "./escoba.js";
import { pinacle } from "./pinacle.js";

export const games = [pinacle, escoba, brisca];

export function getGameMetadata(gameId) {
  return games.find(({ id }) => id === gameId) ?? null;
}

