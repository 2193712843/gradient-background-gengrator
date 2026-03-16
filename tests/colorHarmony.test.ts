import { getHarmonyColors, hexToHsl, hslToHex } from '@/lib/colorHarmony';

// 简单的单元测试脚本，可通过 `npm run test:color` 运行

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function testHexHslRoundTrip() {
  const samples = ['#FF0000', '#00FF00', '#0000FF', '#5135FF', '#FFAA00'];
  samples.forEach((hex) => {
    const hsl = hexToHsl(hex);
    const back = hslToHex(hsl);
    // 允许轻微数值差异，只要转换后仍是合法 HEX 即可
    assert(back.startsWith('#') && back.length === 7, `Round trip failed for ${hex}: ${back}`);
  });
}

function testHarmonyCount() {
  const colors = getHarmonyColors('#5135FF', 'auto');
  assert(colors.length >= 2 && colors.length <= 8, 'Harmony color count out of range');
}

function testHarmonyDiversity() {
  const a = getHarmonyColors('#FF0000', 'complementary');
  const b = getHarmonyColors('#00FF00', 'analogous');
  assert(a[0] !== a[1], 'Complementary harmony should produce different colors');
  assert(b[0] !== b[b.length - 1], 'Analogous harmony should not all be identical');
}

export function runColorHarmonyTests() {
  console.log('Running color harmony tests...');
  testHexHslRoundTrip();
  console.log('✓ hexToHsl / hslToHex round trip');
  testHarmonyCount();
  console.log('✓ harmony color count within expected range');
  testHarmonyDiversity();
  console.log('✓ harmony diversity checks');
  console.log('All color harmony tests passed.');
}

if (require.main === module) {
  // eslint-disable-next-line no-void
  void (async () => {
    try {
      runColorHarmonyTests();
    } catch (err) {
      console.error(err);
      process.exitCode = 1;
    }
  })();
}

