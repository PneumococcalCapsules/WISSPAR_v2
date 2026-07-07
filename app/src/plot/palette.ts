// Color palettes matching the original ggplot2 output.
// - Vaccines use ggplot2's default discrete hue palette (evenly spaced HCL).
// - Serotypes in the ratio plots use ggsci's Lancet palette (scale_color_lancet()).

// ---- ggplot2 gg_color_hue: hcl(h = seq(15, 375, length = n+1)[1:n], c=100, l=65)
function luvToRgb(L: number, U: number, V: number): [number, number, number] {
  if (L <= 0) return [0, 0, 0];
  // D65 white point
  const Xn = 95.047, Yn = 100.0, Zn = 108.883;
  const un = (4 * Xn) / (Xn + 15 * Yn + 3 * Zn);
  const vn = (9 * Yn) / (Xn + 15 * Yn + 3 * Zn);
  const uP = U / (13 * L) + un;
  const vP = V / (13 * L) + vn;
  const Y = L > 8 ? Yn * Math.pow((L + 16) / 116, 3) : Yn * L * Math.pow(3 / 29, 3);
  const X = Y * ((9 * uP) / (4 * vP));
  const Z = Y * ((12 - 3 * uP - 20 * vP) / (4 * vP));
  // XYZ (0..100) -> linear sRGB
  const x = X / 100, y = Y / 100, z = Z / 100;
  let r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
  let g = x * -0.969266 + y * 1.8760108 + z * 0.041556;
  let b = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;
  const gamma = (c: number) => {
    c = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, Math.round(c * 255)));
  };
  return [gamma(r), gamma(g), gamma(b)];
}

function hcl(h: number, c: number, l: number): string {
  const hr = (h * Math.PI) / 180;
  const U = c * Math.cos(hr);
  const V = c * Math.sin(hr);
  const [r, g, b] = luvToRgb(l, U, V);
  return `rgb(${r},${g},${b})`;
}

export function ggColorHue(n: number): string[] {
  if (n <= 0) return [];
  const out: string[] = [];
  const span = 375 - 15;
  for (let i = 0; i < n; i++) {
    const h = 15 + (span / (n + 1)) * i; // seq(15,375,length=n+1)[1:n]
    out.push(hcl(h % 360, 100, 65));
  }
  return out;
}

export function buildColorMap(categories: string[]): Record<string, string> {
  const colors = ggColorHue(categories.length);
  const map: Record<string, string> = {};
  categories.forEach((c, i) => (map[c] = colors[i]));
  return map;
}

// ggsci Lancet ("lanonc") palette.
export const LANCET = [
  "#00468B", "#ED0000", "#42B540", "#0099B4", "#925E9F",
  "#FDAF91", "#AD002A", "#ADB6B6", "#1B1919",
];

export function lancetColorMap(categories: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  categories.forEach((c, i) => (map[c] = LANCET[i % LANCET.length]));
  return map;
}

// Marker symbols for dose_description (ggplot geom_point(aes(shape=...))).
const SYMBOLS = ["circle", "square", "diamond", "triangle-up", "cross", "x", "star", "triangle-down"];
export function symbolMap(categories: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  categories.forEach((c, i) => (map[c] = SYMBOLS[i % SYMBOLS.length]));
  return map;
}
