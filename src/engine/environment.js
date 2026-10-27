// Lingkungan film: track angka bebas yang ditulis proyek di bagian "environment"
// (misalnya cahaya pagi, intensitas hujan, kabut). Mesin tidak tahu arti setiap nilai;
// aset yang membacanya menentukan maknanya dan nilai bawaannya sendiri.
import { createTrack } from './tracks.js';

export function createEnvironment(definition = {}, fps = 30) {
  const tracks = {};
  for (const [key, keys] of Object.entries(definition)) tracks[key] = createTrack(keys, 0);
  // nilai sebuah track pada waktu tertentu (detik), dipakai aset yang butuh nilai di masa lalu
  const trackAt = (key, time, fallback = 0) => (tracks[key] ? tracks[key](time * fps) : fallback);
  return {
    keys: Object.keys(tracks),
    trackAt,
    at(frame) {
      const env = { trackAt };
      for (const key of Object.keys(tracks)) env[key] = tracks[key](frame);
      return env;
    }
  };
}
