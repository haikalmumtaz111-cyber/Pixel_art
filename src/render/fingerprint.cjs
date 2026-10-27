// Sidik jari hasil render: dipakai untuk membuat baseline resmi dan untuk uji regresi.
// Isinya hash piksel tiap frame PNG (setelah di-decode, jadi tidak bergantung pada cara PNG dikompres),
// hash tiap frame video setelah di-decode, SHA-256 file MP4, dan metadata FFprobe.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { FFMPEG, FFPROBE, run } = require('./pipeline.cjs');

function md5List(args) {
  const r = run(FFMPEG, ['-v', 'error', ...args, '-f', 'framemd5', '-']);
  if (r.status !== 0) throw new Error(`FFmpeg gagal menghitung hash frame: ${r.stderr.slice(0, 300)}`);
  return r.stdout.split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim());
}

function probe(video) {
  const r = run(FFPROBE, ['-v', 'error', '-count_frames', '-select_streams', 'v:0',
    '-show_entries', 'stream=codec_name,profile,level,width,height,r_frame_rate,nb_read_frames,pix_fmt:format=duration', '-of', 'json', video]);
  const info = JSON.parse(r.stdout || '{}');
  const s = (info.streams || [])[0] || {};
  return {
    codec: s.codec_name, profile: s.profile, level: s.level, width: s.width, height: s.height,
    fps: s.r_frame_rate, frames: Number(s.nb_read_frames), pixelFormat: s.pix_fmt, duration: Number(info.format?.duration)
  };
}

// framesDir berisi frame_0000.png ... (berurutan). count = jumlah frame.
function fingerprint({ framesDir, count, video }) {
  const pattern = path.join(framesDir, 'frame_%04d.png');
  const pixels = md5List(['-start_number', '0', '-i', pattern, '-frames:v', String(count), '-pix_fmt', 'rgb24']);
  const first = fs.readFileSync(path.join(framesDir, 'frame_0000.png'));
  const result = {
    frameCount: pixels.length,
    frameSize: { width: first.readUInt32BE(16), height: first.readUInt32BE(20) },
    pixelMd5: pixels
  };
  if (video && fs.existsSync(video)) {
    result.video = probe(video);
    result.video.sha256 = crypto.createHash('sha256').update(fs.readFileSync(video)).digest('hex');
    result.video.decodedMd5 = md5List(['-i', video]);
  }
  return result;
}

module.exports = { fingerprint, probe, md5List };
