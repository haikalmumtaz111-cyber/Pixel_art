// Jadwal timeline: menentukan apakah sebuah frame milik satu adegan atau sebuah transisi.
// Semua interval memakai aturan setengah terbuka [startFrame, endFrame): awal ikut, akhir tidak.
// Contoh: adegan 0-120 berisi frame 0 sampai 119, adegan berikutnya mulai tepat di frame 120.
export function createSchedule(timeline) {
  const { scenes, transitions } = timeline;
  return {
    segmentAt(frame) {
      const transition = transitions.find((t) => frame >= t.startFrame && frame < t.endFrame);
      if (transition) {
        // p = 0 di frame pertama transisi, p = 1 di frame terakhirnya
        const span = Math.max(1, transition.endFrame - 1 - transition.startFrame);
        return { kind: 'transition', transition, p: (frame - transition.startFrame) / span };
      }
      const scene = scenes.find((s) => frame >= s.startFrame && frame < s.endFrame);
      if (!scene) throw new Error(`Frame ${frame} tidak berada di adegan mana pun.`);
      return { kind: 'scene', id: scene.id };
    }
  };
}
