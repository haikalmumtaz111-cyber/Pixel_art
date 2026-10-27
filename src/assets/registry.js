// Pustaka aset klasik (dipakai film kereta Tahap 1-2): kereta uap, set pedesaan, interior gerbong,
// dan karakter penumpang. Modul ini mengikuti kontrak aset standar mesin:
// export const assetTypes = { '<jenis>': { create(def, ctx) } }. Jenisnya terdaftar di src/assets/catalog.json.
import { createTrain } from './train.js';
import { createCountryside } from './countryside.js';
import { createCoachInterior } from './interior.js';
import { createCharacter, TRAVELER } from './characters/traveler.js';
import { createPaletteRamp, NIGHT, DAWN } from './palette.js';

const CHARACTERS = { traveler: TRAVELER };

export const assetTypes = {
  'steam-train': {
    create: (def, { seed, registry }) => createTrain({
      seed,
      railY: def.railY,
      motion: def.motion,
      colors: def.colors,
      traveler: def.traveler ? { ...def.traveler, character: registry.get(def.traveler.character) } : null
    })
  },
  countryside: {
    create: (def, { seed, width, height, registry }) => createCountryside({
      width, height, seed, railY: def.railY,
      rain: def.rain, smoke: def.smoke, train: registry.get(def.train), ramp: createPaletteRamp(NIGHT, DAWN)
    })
  },
  'coach-interior': {
    create: (def, { seed, width, height, registry }) => createCoachInterior({ ...def, width, height, seed, train: registry.get(def.train) })
  },
  character: {
    create: (def) => {
      const definition = CHARACTERS[def.character];
      if (!definition) throw new Error(`Karakter tidak dikenal: ${def.character}`);
      return createCharacter(definition, def);
    }
  }
};
