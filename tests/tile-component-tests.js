import assert from 'node:assert/strict';
import {createTile} from '../src/components/tile.js';

assert.throws(
  ()=>createTile('1m'),
  error=>error instanceof TypeError&&/牌データ/.test(error.message)&&/ctx\.tileByCode\.get/.test(error.message),
  '文字列の牌コードは共通牌部品へ直接渡せないこと'
);
assert.throws(
  ()=>createTile(null),
  error=>error instanceof TypeError&&/牌データ/.test(error.message),
  'nullは共通牌部品へ渡せないこと'
);

console.log('2 tile component defensive tests passed.');
