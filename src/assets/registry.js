// Daftar aset bersama. Setiap aset dibuat sekali lalu dipakai oleh semua adegan,
// sehingga kereta di Scene 1 dan Scene 3 adalah kereta yang sama persis.
// Definisi aset ditulis di bagian "assets" pada file timeline.
import { createTrain } from './train.js';
import { createCountryside } from './countryside.js';
import { createCoachInterior } from './interior.js';
import { createCharacter, TRAVELER } from './characters/traveler.js';
import { createPaletteRamp, NIGHT, DAWN } from './palette.js';

const CHARACTERS = { traveler: TRAVELER };

const FACTORIES = {
  'steam-train': (film, def, registry) => createTrain({
    seed: film.seed,
    railY: def.railY,
    motion: def.motion,
    colors: def.colors,
    traveler: def.traveler ? { ...def.traveler, character: registry.get(def.traveler.character) } : null
  }),
  countryside: (film, def, registry) => createCountryside({
    width: film.width, height: film.height, seed: film.seed, railY: def.railY,
    rain: def.rain, smoke: def.smoke, train: registry.get(def.train), ramp: registry.ramp
  }),
  'coach-interior': (film, def, registry) => createCoachInterior({
    ...def, width: film.width, height: film.height, seed: film.seed, train: registry.get(def.train)
  }),
  character: (film, def) => {
    const definition = CHARACTERS[def.character];
    if (!definition) throw new Error(`Karakter tidak dikenal: ${def.character}`);
    return createCharacter(definition, def);
  }
};

export const ASSET_TYPES = Object.keys(FACTORIES);

export function createAssetRegistry(film) {
  const defs = film.assets || {};
  const cache = new Map();
  const registry = {
    ramp: createPaletteRamp(NIGHT, DAWN),
    get(key) {
      if (!cache.has(key)) {
        const def = defs[key];
        if (!def) throw new Error(`Aset "${key}" tidak ada di bagian assets timeline.`);
        const factory = FACTORIES[def.type];
        if (!factory) throw new Error(`Jenis aset tidak dikenal: ${def.type}`);
        cache.set(key, factory(film, def, registry));
      }
      return cache.get(key);
    },
    keys: () => Object.keys(defs),
    typeOf: (key) => defs[key]?.type,
    // Ambil aset pertama berjenis `type` dari daftar referensi aset sebuah adegan.
    pick(keys, type) {
      const key = keys.find((k) => defs[k]?.type === type);
      if (!key) throw new Error(`Adegan butuh aset berjenis "${type}", tetapi tidak ada di daftar assets adegan.`);
      return registry.get(key);
    }
  };
  return registry;
}
