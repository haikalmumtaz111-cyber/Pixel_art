// Adegan uji yang SENGAJA salah: memakai Math.random(), sehingga hasilnya berubah setiap kali dirender.
// Hanya dipakai pengujian negatif untuk membuktikan validator bisa mendeteksi render yang tidak deterministik.
export function createScene({ film }) {
  return {
    render(ctx) {
      ctx.fillStyle = '#101830';
      ctx.fillRect(0, 0, film.width, film.height);
      for (let i = 0; i < 300; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#f0e0a0' : '#4060a0';
        ctx.fillRect(Math.floor(Math.random() * film.width), Math.floor(Math.random() * film.height), 3, 3);
      }
    }
  };
}
