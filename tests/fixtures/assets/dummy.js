// Modul aset palsu untuk unit test registry: tidak menggambar apa pun, hanya mencatat pembuatan.
export let created = 0;

export const assetTypes = {
  dummy: {
    create(def, ctx) {
      created++;
      return { def, key: ctx.key, size: () => ({ w: def.w || 10, h: def.h || 20 }), draw() {} };
    }
  }
};
