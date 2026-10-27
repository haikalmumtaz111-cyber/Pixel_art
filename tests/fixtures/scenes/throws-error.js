// Adegan uji yang SENGAJA rusak: melempar error JavaScript mulai frame 5.
// Hanya dipakai pengujian negatif untuk membuktikan error di browser tidak lolos diam-diam.
export function createScene({ film }) {
  return {
    render(ctx, { frame }) {
      ctx.fillStyle = '#203040';
      ctx.fillRect(0, 0, film.width, film.height);
      if (frame >= 5) throw new Error(`kesalahan uji di frame ${frame}`);
    }
  };
}
