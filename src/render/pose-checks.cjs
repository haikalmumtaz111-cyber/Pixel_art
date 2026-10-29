// Pemeriksaan pose karakter (T19) dari data poseProbe per frame (runtime inspect.poseProbes).
// Fungsi murni tanpa browser, jadi bisa diuji dengan data buatan (tests/engine/pose.test.js).
//
// Hanya pose gerak natural skala 1 (strict) yang diwajibkan. Gerak klasik Tahap 3 dibekukan dan tidak punya data
// pose, jadi pemeriksaan tanpa pose natural melapor TIDAK DIPERIKSA, bukan LULUS. Masalah yang sudah tercatat di
// BACKLOG (known-issues.cjs) dilaporkan sebagai KNOWN ISSUE selama tidak memburuk, hanya di proyek, pemeran, dan
// frame yang tercatat. Tanpa `project` tidak ada KNOWN ISSUE yang berlaku.
//
// - motion-joints : urutan kepala-bahu-pinggul-kaki, sendi di dalam kotak gambar, telapak menapak tepat di tanah
// - motion-limbs  : panjang tulang dari pemecah tepat sama dengan desain; ruas tergambar hanya selisih pembulatan
// - motion-contact: bagian yang harus bersentuhan (tangan dan gagang, sepatu dan pedal, bakul dan tangan, ...)
// - motion-seat   : baris badan terbawah duduk di soket "seat" (sadel induk, atau bangku di bawahnya)
// - motion-stable : tanpa getar satu frame di koordinat lokal tubuh, kecuali titik balik penggerak sendi itu sendiri
const { result, known, skipped } = require('./checks.cjs');
const KNOWN = require('./known-issues.cjs');

const TOL = {
  boneExact: 1e-6, // panjang tulang dari pemecah dua tulang, sebelum dibulatkan
  boneDrawn: Math.SQRT2 + 0.1, // ruas tergambar: kedua ujung dibulatkan, paling jauh sqrt(2) dari ruas mentah
  margin: 12, // sendi boleh keluar kotak gambar sejauh margin penyangga karakter (lighting.js)
  touch: 1, // jarak sel Chebyshev: 0 = bertumpuk, 1 = bersebelahan
  stillJump: 1 // gerak sendi per frame bila semua penggeraknya diam (napas dan turun pinggul 1 piksel)
};
// Regangan kaki: bila pergelangan lebih jauh dari panjang kaki, pemecah meluruskan tulang tetapi ruas tetap ditarik
// ke pergelangan. Batasnya dari jangkauan langkah terjauh walkCycle (45% panjang kaki) ditambah 1 piksel pembulatan.
const stretchBound = (span, legLen) => Math.hypot(span, 0.45 * legLen + 1) - span;

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
// kotak lokal (skala 1) -> kotak sel dunia { x0, x1, y0, y1 } (inklusif), cermin ikut
function worldBox(place, b) {
  const x0 = place.flip ? place.right - (b.x + b.w) : place.left + b.x;
  return { x0, x1: x0 + b.w - 1, y0: place.top + b.y, y1: place.top + b.y + b.h - 1 };
}
const worldCell = (place, q) => worldBox(place, { x: q.x, y: q.y, w: 1, h: 1 });
const gapX = (a, b) => Math.max(0, a.x0 - b.x1, b.x0 - a.x1);
const gapY = (a, b) => Math.max(0, a.y0 - b.y1, b.y0 - a.y1);
const gap = (a, b) => Math.max(gapX(a, b), gapY(a, b));
const fmt = (v) => Number(v.toFixed(3));
const sample = (list, n = 5) => list.slice(0, n).join(', ') + (list.length > n ? `, ... (${list.length})` : '');
const inRanges = (ranges, f) => ranges.some(([a, b]) => f >= a && f <= b);
const rangeText = (ranges) => ranges.map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join(', ');
// banyak kejadian tercatat di daftar occurrences KNOWN ISSUE gerak
const recorded = (k) => Object.values(k.occurrences).flatMap((o) => Object.values(o)).reduce((n, f) => n + f.length, 0);
const knownName = (k) => `KNOWN ISSUE ${k.id}${k.approval === 'usulan' ? ' (usulan, menunggu persetujuan pemilik)' : ''}: ${k.title}`;

// Soket entitas lain: "parent" = induk entitas ini; "below" = benda dengan soket itu yang sekolom dengan kotak `near`
// (selisih kolom paling banyak 1), dipilih yang barisnya paling dekat. Hasil: kotak dunia atau null.
function findSocket(entries, self, spec, near) {
  if (spec.from === 'parent') {
    const parent = self.parent ? entries[self.parent] : null;
    const s = parent && parent.sockets && parent.sockets[spec.socket];
    return s ? worldBox(parent.place, s) : null;
  }
  let best = null;
  for (const other of Object.values(entries)) {
    if (other === self || !other.sockets || !other.sockets[spec.socket]) continue;
    const b = worldBox(other.place, other.sockets[spec.socket]);
    if (gapX(b, near) > 1) continue;
    const d = Math.abs(b.y0 - near.y1);
    if (!best || d < best.d) best = { d, b };
  }
  return best ? best.b : null;
}

// Penggerak d berbalik arah dengan mulus di frame b: naik (atau turun) dua frame berturut-turut lalu berbalik dua frame.
// Penggerak yang hanya meloncat satu frame (berkedip) bukan titik balik, jadi tidak bisa menutupi getar.
function turnsAt(series, b, d) {
  const v = [-2, -1, 0, 1, 2].map((k) => series.get(b + k)?.drivers[d]);
  if (v.some((x) => typeof x !== 'number')) return false;
  const s = [v[1] - v[0], v[2] - v[1], v[3] - v[2], v[4] - v[3]].map(Math.sign);
  return s[1] !== 0 && s[2] === -s[1] && s[0] === s[1] && s[3] === s[2];
}

function poseChecks(frames, { knownIssues = KNOWN, project = null } = {}) {
  // KNOWN ISSUE proyek lain tidak pernah berlaku di sini
  const listed = knownIssues.filter((k) => project && k.project === project);
  const subjects = [];
  const classic = new Set();
  const loose = new Set();
  frames.forEach((entries, frame) => {
    for (const [id, e] of Object.entries(entries)) {
      if (!e.pose) continue;
      if (e.pose.mode !== 'natural') classic.add(id);
      else if (!e.pose.strict || e.place.scale !== 1) loose.add(id);
      else subjects.push({ frame, id, e, entries, state: e.pose.state, items: e.pose.items, box: e.pose.box });
    }
  });
  const ids = {
    joints: ['motion-joints', 'Pose karakter: urutan tubuh, sendi di dalam kotak, telapak menapak di tanah'],
    limbs: ['motion-limbs', 'Pose karakter: panjang lengan dan kaki tetap'],
    contact: ['motion-contact', 'Pose karakter: tangan, kaki, dan benda yang dipegang bersentuhan'],
    seat: ['motion-seat', 'Pose karakter: posisi duduk di sadel atau bangku'],
    stable: ['motion-stable', 'Pose karakter: stabil antar-frame (tanpa getar sendi)']
  };
  const why = [
    classic.size ? `${classic.size} karakter gerak klasik tidak punya data pose (gerak klasik dibekukan)` : '',
    loose.size ? `${loose.size} karakter natural berskala lebih dari 1 tidak diwajibkan` : ''
  ].filter(Boolean).join('; ');
  if (!subjects.length) {
    const reason = `tidak ada pose gerak natural skala 1 yang bisa diperiksa${why ? `: ${why}` : (classic.size || loose.size ? '' : ': tidak ada karakter rig')}`;
    // KNOWN ISSUE proyek ini ikut tidak diperiksa, tidak hilang diam-diam
    return [...Object.values(ids), ...listed.map((k) => [`known:${k.id}`, knownName(k)])].map(([id, name]) => skipped(id, name, reason));
  }
  const of = (s, kind) => s.items.filter((i) => i.kind === kind);
  const entitiesIn = (list) => new Set(list.map((s) => s.id)).size;
  const note = why ? ` | ${why}` : '';
  const out = [];

  // ---------- motion-joints ----------
  {
    const bad = [];
    let planted = 0;
    let joints = 0;
    for (const s of subjects) {
      const where = `${s.id} frame ${s.frame}`;
      const body = of(s, 'body')[0];
      if (!body) bad.push(`${where}: data badan tidak ada`);
      else if (!(body.headTop < body.shoulderY && body.shoulderY < body.hipY && body.hipY < body.footY)) bad.push(`${where}: urutan kepala-bahu-pinggul-kaki salah`);
      const pts = [
        ...of(s, 'arm').flatMap((a) => [a.shoulder, a.elbow, a.hand]),
        ...of(s, 'leg').flatMap((l) => [l.hip, l.knee, l.ankle])
      ];
      for (const q of pts) {
        joints++;
        if (q.x < -TOL.margin || q.y < -TOL.margin || q.x >= s.box.w + TOL.margin || q.y >= s.box.h + TOL.margin) bad.push(`${where}: sendi di luar kotak (${q.x}, ${q.y})`);
      }
      for (const feet of of(s, 'feet')) {
        for (const f of feet.feet) {
          if (f.lift < 0) bad.push(`${where}: telapak ${f.foot} di bawah tanah (${-f.lift} px)`);
          if (f.planted) {
            planted++;
            if (f.lift !== 0) bad.push(`${where}: telapak ${f.foot} menapak tetapi melayang ${f.lift} px`);
          }
        }
      }
    }
    out.push(result(ids.joints[0], ids.joints[1], bad.length === 0, bad.length
      ? `${bad.length} pelanggaran: ${sample(bad)}`
      : `${subjects.length} pose dari ${entitiesIn(subjects)} karakter natural: urutan tubuh benar, ${joints} titik sendi di dalam kotak gambar, ${planted} telapak menapak tepat di garis tanah${note}`));
  }

  // ---------- motion-limbs ----------
  {
    const bad = [];
    let arms = 0;
    let legs = 0;
    let worstDrawn = 0;
    let worstStretch = 0;
    let sarong = 0;
    let seatedLegs = 0;
    for (const s of subjects) {
      const where = `${s.id} frame ${s.frame}`;
      for (const a of of(s, 'arm')) {
        arms++;
        const side = a.front ? 'dekat' : 'jauh';
        const rawU = dist(a.rawShoulder, a.rawElbow);
        const rawL = dist(a.rawElbow, a.rawHand);
        if (Math.abs(rawU - a.upper) > TOL.boneExact) bad.push(`${where}: lengan atas ${side} ${fmt(rawU)} bukan ${a.upper}`);
        if (Math.abs(rawL - a.lower) > TOL.boneExact) bad.push(`${where}: lengan bawah ${side} ${fmt(rawL)} bukan ${a.lower}`);
        for (const [drawn, raw, part] of [[dist(a.shoulder, a.elbow), rawU, 'atas'], [dist(a.elbow, a.hand), rawL, 'bawah']]) {
          worstDrawn = Math.max(worstDrawn, Math.abs(drawn - raw));
          if (Math.abs(drawn - raw) > TOL.boneDrawn) bad.push(`${where}: lengan ${part} ${side} tergambar ${fmt(drawn)} px, tulangnya ${fmt(raw)} px`);
        }
      }
      for (const l of of(s, 'leg')) {
        legs++;
        const side = l.front ? 'dekat' : 'jauh';
        const span = l.half * 2;
        const thigh = dist(l.hip, l.rawKnee);
        const shin = dist(l.rawKnee, l.ankle);
        if (Math.abs(thigh - l.half) > TOL.boneExact) bad.push(`${where}: paha ${side} ${fmt(thigh)} bukan ${l.half}`);
        if (dist(l.hip, l.ankle) <= span + TOL.boneExact) {
          if (Math.abs(shin - l.half) > TOL.boneExact) bad.push(`${where}: betis ${side} ${fmt(shin)} bukan ${l.half}`);
        } else {
          const stretch = shin - l.half;
          worstStretch = Math.max(worstStretch, stretch);
          if (stretch > stretchBound(span, l.legLen)) bad.push(`${where}: betis ${side} teregang ${fmt(stretch)} px, batas ${fmt(stretchBound(span, l.legLen))}`);
        }
        for (const [drawn, raw, part] of [[dist(l.hip, l.knee), thigh, 'paha'], [dist(l.knee, l.ankle), shin, 'betis']]) {
          worstDrawn = Math.max(worstDrawn, Math.abs(drawn - raw));
          if (Math.abs(drawn - raw) > TOL.boneDrawn) bad.push(`${where}: ${part} ${side} tergambar ${fmt(drawn)} px, tulangnya ${fmt(raw)} px`);
        }
      }
      if (of(s, 'feet').some((f) => f.sarong)) sarong++;
      const body = of(s, 'body')[0];
      if (body && (body.pose === 'seated' || body.pose === 'cycle')) seatedLegs++;
    }
    const limits = [
      seatedLegs ? `kaki duduk dan mengayuh bentuk Tahap 3 tidak diukur di ${seatedLegs} pose (keterbatasan, V19)` : '',
      sarong ? `kaki bersarung bentuk Tahap 3 tidak diukur di ${sarong} pose (keterbatasan, V27)` : ''
    ].filter(Boolean).join('; ');
    out.push(result(ids.limbs[0], ids.limbs[1], bad.length === 0 && arms > 0, bad.length
      ? `${bad.length} pelanggaran: ${sample(bad)}`
      : `${arms} lengan dan ${legs} kaki: panjang tulang tepat sama dengan desain, ruas tergambar paling jauh ${fmt(worstDrawn)} px dari tulangnya (batas ${fmt(TOL.boneDrawn)}), regangan betis terbesar ${fmt(worstStretch)} px (di dalam batas jangkauan langkah)${limits ? ` | ${limits}` : ''}${note}`));
  }

  // ---------- motion-contact dan KNOWN ISSUE ----------
  {
    const bad = [];
    const checked = new Map();
    const contactKnown = listed.filter((k) => k.check === 'motion-contact');
    const knownHits = new Map(contactKnown.map((k) => [k.id, []]));
    for (const s of subjects) {
      for (const t of of(s, 'touch')) {
        const a = worldBox(s.e.place, t.a);
        let g;
        if (t.b.cells) g = t.b.cells.length ? Math.min(...t.b.cells.map((q) => gap(a, worldCell(s.e.place, q)))) : Infinity;
        else if (t.b.socket) {
          const b = findSocket(s.entries, s.e, t.b, a);
          g = b ? gap(a, b) : Infinity;
        } else g = gap(a, worldBox(s.e.place, t.b));
        // hanya pemeran, status, sentuhan, dan frame yang tercatat; selain itu toleransi normal
        const k = contactKnown.find((x) => x.entity === s.id && x.state === s.state && x.touch === t.name && inRanges(x.frames, s.frame));
        const where = `${s.id} frame ${s.frame}`;
        if (k) {
          knownHits.get(k.id).push({ g, where, frame: s.frame });
          continue;
        }
        const key = `${s.state}:${t.name}`;
        checked.set(key, (checked.get(key) || 0) + 1);
        if (!Number.isFinite(g)) bad.push(`${where}: ${t.name} tidak menemukan ${t.b.socket ? `soket "${t.b.socket}"` : 'pasangannya'}`);
        else if (g > TOL.touch) bad.push(`${where}: ${t.name} berjarak ${g} px`);
      }
    }
    const kinds = [...checked].map(([k, n]) => `${k} ${n}`).join(', ');
    if (!checked.size) out.push(skipped(ids.contact[0], ids.contact[1], `tidak ada sentuhan yang diperiksa selain KNOWN ISSUE${note}`));
    else out.push(result(ids.contact[0], ids.contact[1], bad.length === 0, bad.length
      ? `${bad.length} pelanggaran: ${sample(bad)}`
      : `semua bersentuhan (jarak sel paling banyak ${TOL.touch}): ${kinds}${contactKnown.some((k) => knownHits.get(k.id).length) ? ` | di luar KNOWN ISSUE yang dilaporkan terpisah: ${contactKnown.filter((k) => knownHits.get(k.id).length).map((k) => k.id).join(', ')}` : ''}${note}`));
    for (const k of contactKnown) {
      const hits = knownHits.get(k.id);
      const id = `known:${k.id}`;
      const where = `pemeran ${k.entity}, status ${k.state}, sentuhan ${k.touch}, frame ${rangeText(k.frames)}`;
      if (!hits.length) {
        out.push(result(id, knownName(k), false, `TIDAK LAGI TERJADI: tidak ada sentuhan yang cocok (${where}). Perbarui src/render/known-issues.cjs dan docs/BACKLOG.md ${k.id}`));
        continue;
      }
      const worst = Math.max(...hits.map((h) => h.g));
      const span = `${hits.length} sentuhan di ${new Set(hits.map((h) => h.frame)).size} frame, terburuk ${worst} px`;
      if (worst > k.worst) out.push(result(id, knownName(k), false, `MEMBURUK: ${span}, melebihi batas tercatat ${k.worst} px (${where}). Contoh: ${sample(hits.filter((h) => h.g > k.worst).map((h) => `${h.where} (${h.g} px)`))}`));
      else if (worst <= TOL.touch) out.push(result(id, knownName(k), false, `TIDAK LAGI TERJADI: ${span} (${where}). Perbarui src/render/known-issues.cjs dan docs/BACKLOG.md ${k.id}`));
      else out.push(known(id, knownName(k), `${span}, tidak lebih buruk dari batas tercatat ${k.worst} px (${where}; lihat docs/BACKLOG.md ${k.id})`, { approval: k.approval, count: hits.length }));
    }
  }

  // ---------- motion-seat ----------
  {
    const bad = [];
    let sits = 0;
    for (const s of subjects) {
      for (const st of of(s, 'sit')) {
        sits++;
        const row = s.e.place.top + st.row;
        const hip = worldCell(s.e.place, { x: st.x, y: st.row });
        const seat = findSocket(s.entries, s.e, st, hip);
        const where = `${s.id} frame ${s.frame}`;
        if (!seat) bad.push(`${where}: tidak ada soket "${st.socket}" (${st.from === 'parent' ? 'induk' : 'di bawah pinggul'})`);
        else if (row < seat.y0 - 1 || row > seat.y1) bad.push(`${where}: badan bawah di baris ${row}, tempat duduk ${seat.y0}-${seat.y1}`);
        else if (hip.x0 < seat.x0 - 1 || hip.x0 > seat.x1 + 1) bad.push(`${where}: pinggul di kolom ${hip.x0}, tempat duduk ${seat.x0}-${seat.x1}`);
      }
    }
    if (!sits) out.push(skipped(ids.seat[0], ids.seat[1], `tidak ada karakter natural yang duduk${note}`));
    else out.push(result(ids.seat[0], ids.seat[1], bad.length === 0, bad.length
      ? `${bad.length} pelanggaran: ${sample(bad)}`
      : `${sits} pose duduk: badan bawah tepat di tempat duduk (sadel induk atau bangku di bawahnya)${note}`));
  }

  // ---------- motion-stable ----------
  {
    const series = new Map();
    for (const s of subjects) {
      if (!series.has(s.id)) series.set(s.id, new Map());
      const drivers = Object.assign({}, ...of(s, 'driver').map(({ kind, ...d }) => d));
      // q = titik tergambar, raw = titik sebelum dibulatkan (sama dengan q bila titiknya memang bilangan bulat)
      const joints = new Map();
      for (const a of of(s, 'arm')) {
        const side = a.front ? 'dekat' : 'jauh';
        for (const [part, q, raw] of [['bahu', a.shoulder, a.rawShoulder], ['siku', a.elbow, a.rawElbow], ['tangan', a.hand, a.rawHand]]) joints.set(`lengan ${side} ${part}`, { q, raw, drivers: a.drivers || [] });
      }
      for (const l of of(s, 'leg')) {
        const side = l.front ? 'dekat' : 'jauh';
        for (const [part, q, raw] of [['lutut', l.knee, l.rawKnee], ['pergelangan', l.ankle, l.ankle]]) joints.set(`kaki ${side} ${part}`, { q, raw, drivers: l.drivers || [] });
      }
      const body = of(s, 'body')[0];
      if (body) for (const [part, y] of [['kepala', body.headTop], ['bahu', body.shoulderY], ['pinggul', body.hipY]]) joints.set(`badan ${part}`, { q: { x: 0, y }, raw: { x: 0, y }, drivers: [] });
      series.get(s.id).set(s.frame, { state: s.state, drivers, joints });
    }
    const stableKnown = listed.filter((k) => k.check === 'motion-stable');
    const knownHits = new Map(stableKnown.map((k) => [k.id, []]));
    const bad = [];
    const exempt = [];
    let triples = 0;
    let pairs = 0;
    const moving = {};
    // Pola a, b, a pada sumbu `axis` sendi `name` di frame b. Sah hanya bila salah satu penggerak sendi itu sendiri
    // (daftar drivers dari rig.js, misalnya gesture untuk lengan dekat) berbalik mulus tepat di frame b: titik balik
    // keyframe isyarat atau ujung ayunan lengan. Penggerak sendi lain tidak berlaku. Selain itu pelanggaran:
    // "kedip pembulatan" bila posisi mentah bergerak kurang dari 0,5 piksel ke salah satu frame tetangga (lompatan
    // tergambar berasal dari pembulatan), atau "getar" bila posisi mentahnya sendiri bolak-balik.
    const classify = (byFrame, b, name, j, axis) => {
      const driver = j.drivers.find((d) => turnsAt(byFrame, b, d));
      if (driver) return { kind: 'gerak', driver };
      const rawAt = (k) => byFrame.get(b + k)?.joints.get(name)?.raw?.[axis];
      const excursion = Math.min(Math.abs(rawAt(0) - rawAt(-1)), Math.abs(rawAt(0) - rawAt(1)));
      return { kind: excursion < 0.5 ? 'pembulatan' : 'getar', excursion };
    };
    for (const [id, byFrame] of series) {
      for (const [b, mid] of byFrame) {
        const prev = byFrame.get(b - 1);
        if (prev && prev.state === mid.state) {
          for (const [name, j] of mid.joints) {
            const p = prev.joints.get(name);
            if (!p) continue;
            pairs++;
            const move = cheb(p.q, j.q);
            const still = j.drivers.every((d) => prev.drivers[d] === mid.drivers[d]);
            if (still && move > TOL.stillJump) bad.push(`${id} frame ${b}: ${name} melompat ${move} px tanpa penggerak`);
            if (!still) moving[mid.state] = Math.max(moving[mid.state] || 0, move);
          }
        }
        const next = byFrame.get(b + 1);
        if (!prev || !next || prev.state !== mid.state || next.state !== mid.state) continue;
        for (const [name, j] of mid.joints) {
          const a = prev.joints.get(name);
          const c = next.joints.get(name);
          if (!a || !c) continue;
          triples++;
          if (!(a.q.x === c.q.x && a.q.y === c.q.y && (j.q.x !== a.q.x || j.q.y !== a.q.y))) continue;
          const where = `${id} frame ${b}`;
          for (const axis of ['x', 'y']) {
            if (j.q[axis] === a.q[axis]) continue;
            const mag = Math.abs(j.q[axis] - a.q[axis]);
            const v = classify(byFrame, b, name, j, axis);
            if (v.kind === 'gerak') {
              exempt.push(`${where} ${name} ${axis} (titik balik ${v.driver})`);
              continue;
            }
            // hanya kejadian yang tercatat persis (pemeran, frame, sendi, sumbu, jenis); selain itu pelanggaran
            const k = stableKnown.find((x) => x.state === mid.state && x.kind === v.kind && x.occurrences[id]?.[`${name} ${axis}`]?.includes(b));
            if (k) knownHits.get(k.id).push({ g: mag, where: `${where} ${name} ${axis}`, id });
            else bad.push(`${where}: ${name} bolak-balik ${mag} px dalam 1 frame (sumbu ${axis}, ${v.kind}, gerak mentah ${fmt(v.excursion)} px)`);
          }
        }
      }
    }
    const movingInfo = Object.entries(moving).map(([st, m]) => `${st} ${m} px`).join(', ');
    const knownCount = [...knownHits.values()].reduce((n, h) => n + h.length, 0);
    out.push(result(ids.stable[0], ids.stable[1], bad.length === 0 && triples > 0, bad.length
      ? `${bad.length} pelanggaran: ${sample(bad)}`
      : `${triples} titik sendi x 3 frame diperiksa, tanpa getar 1 frame${knownCount ? ` di luar KNOWN ISSUE (${knownCount} kejadian dilaporkan terpisah: ${stableKnown.filter((k) => knownHits.get(k.id).length).map((k) => k.id).join(', ')})` : ''}; ${pairs} langkah frame: sendi yang penggeraknya diam bergerak paling banyak ${TOL.stillJump} px${exempt.length ? `; ${exempt.length} dikecualikan karena penggerak sendi itu sendiri berbalik arah dengan mulus di frame itu: ${sample(exempt, 6)}` : ''}${movingInfo ? ` | lompatan terbesar saat penggerak bergerak (informasi): ${movingInfo}` : ''}${note}`));
    for (const k of stableKnown) {
      const hits = knownHits.get(k.id);
      const id = `known:${k.id}`;
      const where = `status ${k.state}, pemeran ${Object.keys(k.occurrences).join(', ')}`;
      if (!hits.length) {
        out.push(result(id, knownName(k), false, `TIDAK LAGI TERJADI: tidak ada dari ${recorded(k)} kejadian tercatat (${k.kind}; ${where}). Perbarui src/render/known-issues.cjs dan docs/BACKLOG.md ${k.id}`));
        continue;
      }
      const worst = Math.max(...hits.map((h) => h.g));
      const span = `${hits.length} dari ${recorded(k)} kejadian tercatat (${k.kind}) di ${new Set(hits.map((h) => h.id)).size} pemeran, terbesar ${worst} px`;
      if (worst > k.worst) out.push(result(id, knownName(k), false, `MEMBURUK: ${span}, melebihi batas tercatat ${k.worst} px. Contoh: ${sample(hits.filter((h) => h.g > k.worst).map((h) => h.where))}`));
      else out.push(known(id, knownName(k), `${span}, tidak lebih buruk dari batas tercatat ${k.worst} px (${where}); contoh ${sample(hits.map((h) => h.where), 3)}; lihat docs/BACKLOG.md ${k.id}`, { approval: k.approval, count: hits.length }));
    }
  }
  return out;
}

module.exports = { poseChecks, TOL, stretchBound, worldBox, gap, turnsAt };
