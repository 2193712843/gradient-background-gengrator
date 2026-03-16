// 色彩和谐推荐算法（基于 HSL 色轮）
// 结合互补色、类似色和三分配色，为渐变背景推荐颜色组合

export type HarmonyMode = 'auto' | 'analogous' | 'complementary' | 'triadic';

export interface HSL {
  h: number;
  s: number;
  l: number;
}

function clampHue(h: number): number {
  const mod = h % 360;
  return mod < 0 ? mod + 360 : mod;
}

export function hexToHsl(hex: string): HSL {
  let value = hex.trim();
  if (value.startsWith('#')) value = value.slice(1);

  if (value.length === 3) {
    value = value.split('').map((c) => c + c).join('');
  }

  const num = parseInt(value, 16);
  if (Number.isNaN(num)) {
    return { h: 0, s: 0.8, l: 0.5 };
  }

  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  const l = (max + min) / 2;
  let s = 0;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));

    switch (max) {
      case r:
        h = ((g - b) / delta) % 6;
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      case b:
        h = (r - g) / delta + 4;
        break;
    }

    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s: Number.isFinite(s) ? s : 0, l };
}

export function hslToHex({ h, s, l }: HSL): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
  } else if (h >= 120 && h < 180) {
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const to255 = (v: number) => Math.round((v + m) * 255);
  const toHex = (v: number) => v.toString(16).padStart(2, '0').toUpperCase();

  const R = to255(r);
  const G = to255(g);
  const B = to255(b);

  return `#${toHex(R)}${toHex(G)}${toHex(B)}`;
}

// 根据 HSL 生成一组和谐色
export function getHarmonyColors(baseHex: string, mode: HarmonyMode = 'auto'): string[] {
  const base = hexToHsl(baseHex);

  // 适当限制饱和度和亮度，保证渐变的可用性
  const s = Math.min(0.9, Math.max(0.4, base.s));
  const l = Math.min(0.75, Math.max(0.35, base.l));
  const normalizedBase: HSL = { h: base.h, s, l };

  const colors = new Set<string>();
  colors.add(hslToHex(normalizedBase));

  const pushHue = (delta: number, lightnessAdjust = 0) => {
    const h = clampHue(normalizedBase.h + delta);
    const candidate: HSL = {
      h,
      s: normalizedBase.s,
      l: Math.min(0.85, Math.max(0.25, normalizedBase.l + lightnessAdjust)),
    };
    colors.add(hslToHex(candidate));
  };

  const effectiveMode: HarmonyMode =
    mode === 'auto'
      ? // 自动模式：冷色偏使用类似色，暖色偏加入互补/三分
        normalizedBase.h >= 40 && normalizedBase.h <= 200
        ? 'analogous'
        : 'complementary'
      : mode;

  switch (effectiveMode) {
    case 'analogous':
      pushHue(-30, -0.05);
      pushHue(30, 0.05);
      pushHue(-15, 0.08);
      pushHue(15, -0.08);
      break;
    case 'complementary':
      pushHue(180, 0.02);
      pushHue(150, -0.05);
      pushHue(-150, 0.05);
      pushHue(30, 0.08);
      break;
    case 'triadic':
      pushHue(120, 0.04);
      pushHue(-120, -0.04);
      pushHue(60, 0.08);
      pushHue(-60, -0.08);
      break;
    default:
      break;
  }

  // 最多返回 8 个颜色，保证与现有上限一致
  return Array.from(colors).slice(0, 8);
}

