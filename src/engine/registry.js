// Registry aset generik. Mesin tidak tahu apa itu kereta, rumah, atau karakter:
// ia hanya membaca katalog (daftar jenis aset dan modulnya), memuat modul yang dipakai proyek,
// lalu membuat setiap aset sekali dan membagikannya ke semua adegan.
//
// Kontrak modul aset: export const assetTypes = { '<jenis>': { create(def, ctx) { return aset; } } }
// ctx = { film, key, registry, seed, width, height }

// Kunci aset lain yang disebut di dalam definisi (misalnya "train": "kereta-utama").
function referencedKeys(value, keys, found = new Set()) {
  if (typeof value === 'string') {
    if (keys.has(value)) found.add(value);
  } else if (Array.isArray(value)) {
    value.forEach((v) => referencedKeys(v, keys, found));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([k, v]) => k !== 'type' && referencedKeys(v, keys, found));
  }
  return found;
}

export async function createAssetRegistry(film) {
  const catalog = film.engine?.catalog?.types || {};
  const defs = film.assets || {};
  const keySet = new Set(Object.keys(defs));
  const modules = new Map();

  // muat hanya modul yang benar-benar dipakai proyek ini
  for (const [key, def] of Object.entries(defs)) {
    const type = catalog[def.type];
    if (!type) throw new Error(`Aset "${key}": jenis "${def.type}" tidak ada di katalog aset.`);
    if (!modules.has(type.module)) modules.set(type.module, await import(type.module));
    if (!modules.get(type.module).assetTypes?.[def.type]) {
      throw new Error(`Modul ${type.module} tidak menyediakan jenis aset "${def.type}".`);
    }
  }

  const cache = new Map();
  const registry = {
    get(key) {
      if (!cache.has(key)) {
        const def = defs[key];
        if (!def) throw new Error(`Aset "${key}" tidak ada di bagian assets proyek.`);
        const factory = modules.get(catalog[def.type].module).assetTypes[def.type];
        cache.set(key, factory.create(def, { film, key, registry, seed: film.seed, width: film.width, height: film.height }));
      }
      return cache.get(key);
    },
    keys: () => Object.keys(defs),
    typeOf: (key) => defs[key]?.type,
    definition: (key) => defs[key],
    // Ambil aset pertama berjenis `type` dari daftar referensi aset sebuah adegan.
    pick(keys, type) {
      const key = keys.find((k) => defs[k]?.type === type);
      if (!key) throw new Error(`Adegan butuh aset berjenis "${type}", tetapi tidak ada di daftar assets adegan.`);
      return registry.get(key);
    },
    // Semua aset yang dipakai sebuah aset, langsung maupun tidak langsung.
    dependencies(key, seen = new Set()) {
      for (const dep of referencedKeys(defs[key], keySet)) {
        if (dep !== key && !seen.has(dep)) {
          seen.add(dep);
          registry.dependencies(dep, seen);
        }
      }
      return seen;
    },
    loadedModules: () => [...modules.keys()]
  };
  return registry;
}
