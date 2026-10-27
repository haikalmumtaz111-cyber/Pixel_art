// Unit test registry aset generik dan ramp palet.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { createAssetRegistry } from '../../src/engine/registry.js';
import { createPaletteRamp } from '../../src/engine/palette.js';

const dummyModule = pathToFileURL(path.resolve('tests/fixtures/assets/dummy.js')).href;
const film = (assets) => ({
  seed: 1, width: 480, height: 270, assets,
  engine: { catalog: { types: { dummy: { module: dummyModule } } } }
});

test('registry memuat modul dari katalog dan membuat setiap aset sekali saja', async () => {
  const mod = await import(dummyModule);
  const before = mod.created;
  const registry = await createAssetRegistry(film({ rumah: { type: 'dummy', w: 30 }, gudang: { type: 'dummy', parent: 'rumah' } }));
  assert.equal(registry.get('rumah'), registry.get('rumah'));
  assert.equal(registry.get('rumah').def.w, 30);
  assert.equal(registry.get('rumah').key, 'rumah');
  registry.get('gudang');
  assert.equal(mod.created - before, 2);
  assert.deepEqual(registry.keys(), ['rumah', 'gudang']);
  assert.equal(registry.typeOf('gudang'), 'dummy');
  assert.deepEqual([...registry.dependencies('gudang')], ['rumah']);
  assert.deepEqual(registry.loadedModules(), [dummyModule]);
});

test('registry menolak jenis aset yang tidak ada di katalog', async () => {
  await assert.rejects(createAssetRegistry(film({ x: { type: 'naga' } })), /tidak ada di katalog/);
});

test('registry menolak kunci aset yang tidak terdaftar', async () => {
  const registry = await createAssetRegistry(film({ a: { type: 'dummy' } }));
  assert.throws(() => registry.get('b'), /tidak ada di bagian assets/);
  assert.throws(() => registry.pick(['a'], 'kereta'), /butuh aset berjenis "kereta"/);
});

test('ramp palet: langkah terkuantisasi dari palet awal ke palet akhir', () => {
  const ramp = createPaletteRamp({ sky: ['#000000'], wall: '#000000' }, { sky: ['#ffffff'], wall: '#ffffff' }, 4);
  assert.equal(ramp.at(ramp.index(0)).wall, '#000000');
  assert.equal(ramp.at(ramp.index(1)).wall, '#ffffff');
  assert.equal(ramp.at(ramp.index(0.5)).sky.length, 1);
  // nilai yang sama selalu memberi objek palet yang sama (bisa dipakai sebagai kunci cache)
  assert.equal(ramp.at(ramp.index(0.5)), ramp.at(ramp.index(0.5)));
});
