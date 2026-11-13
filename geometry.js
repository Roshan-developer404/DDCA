/* ITM_GL.Builder — procedural geometry with per-vertex material (colour, metalness, roughness, emission).
 * Vertex layout (14 floats): pos3 nrm3 uv2 col3 mat3(metal, rough, emissive). Zero dependencies, Node-testable.
 * Convention: box/cyl/lathe `pos` is the BOTTOM-CENTRE of the part (so parts "sit" on a surface); sphere pos = centre. */
(function (global) {
  'use strict';
  const M = (typeof require !== 'undefined' && typeof module !== 'undefined') ? require('./math.js') : global.ITM_GL.math;
  const m4 = M.m4;
  const STRIDE = 14;

  function toLinear(c) {
    if (c == null) return [0.5, 0.5, 0.5];
    if (typeof c === 'number') return M.lin(c);
    return c; // already linear [r,g,b]
  }

  class Builder {
    constructor() {
      this.v = []; this.i = []; this.count = 0;
      this.mat = m4.create(); this.stack = [];
      this.min = [Infinity, Infinity, Infinity]; this.max = [-Infinity, -Infinity, -Infinity];
      this._tmp = m4.create(); this._loc = m4.create();
    }
    /** Run fn with an extra local transform {pos, rot, scale} applied to everything it adds. */
    group(o, fn) {
      this.stack.push(this.mat.slice());
      const l = m4.fromTRS(this._loc, o.pos, o.rot, o.scale);
      this.mat = m4.multiply(new Float32Array(16), this.mat, l);
      fn(this);
      this.mat = this.stack.pop();
      return this;
    }
    _local(o) { return m4.multiply(this._tmp, this.mat, m4.fromTRS(this._loc, o.pos, o.rot, o.scale)); }

    /** Low-level: add already-built local geometry {p,n,uv,i} with material opts. */
    add(g, o) {
      o = o || {};
      const m = this._local(o);
      const col = toLinear(o.col), metal = o.metal == null ? 0 : o.metal, rough = o.rough == null ? 0.5 : o.rough, em = o.emis || 0;
      const eCol = o.emisCol ? toLinear(o.emisCol) : null;
      const su = o.uvs ? o.uvs[0] : 1, sv = o.uvs ? o.uvs[1] : 1;
      const base = this.count, n = g.p.length / 3;
      const nx = m[0], ny = m[1], nz = m[2], mx = m[4], my = m[5], mz = m[6], ox = m[8], oy = m[9], oz = m[10];
      const sx = Math.hypot(nx, ny, nz) || 1, sy = Math.hypot(mx, my, mz) || 1, sz = Math.hypot(ox, oy, oz) || 1;
      for (let k = 0; k < n; k++) {
        const x = g.p[k * 3], y = g.p[k * 3 + 1], z = g.p[k * 3 + 2];
        const X = m[0] * x + m[4] * y + m[8] * z + m[12], Y = m[1] * x + m[5] * y + m[9] * z + m[13], Z = m[2] * x + m[6] * y + m[10] * z + m[14];
        const a = g.n[k * 3], b = g.n[k * 3 + 1], c = g.n[k * 3 + 2];
        let NX = (m[0] / sx) * a + (m[4] / sy) * b + (m[8] / sz) * c, NY = (m[1] / sx) * a + (m[5] / sy) * b + (m[9] / sz) * c, NZ = (m[2] / sx) * a + (m[6] / sy) * b + (m[10] / sz) * c;
        const l = Math.hypot(NX, NY, NZ) || 1; NX /= l; NY /= l; NZ /= l;
        const vc = eCol && em > 0 ? eCol : col;
        this.v.push(X, Y, Z, NX, NY, NZ, g.uv[k * 2] * su, g.uv[k * 2 + 1] * sv, vc[0], vc[1], vc[2], metal, rough, em);
        if (X < this.min[0]) this.min[0] = X; if (Y < this.min[1]) this.min[1] = Y; if (Z < this.min[2]) this.min[2] = Z;
        if (X > this.max[0]) this.max[0] = X; if (Y > this.max[1]) this.max[1] = Y; if (Z > this.max[2]) this.max[2] = Z;
      }
      // det < 0 (mirror) flips winding
      const det = m[0] * (m[5] * m[10] - m[6] * m[9]) - m[1] * (m[4] * m[10] - m[6] * m[8]) + m[2] * (m[4] * m[9] - m[5] * m[8]);
      for (let k = 0; k < g.i.length; k += 3) {
        if (det < 0) this.i.push(base + g.i[k], base + g.i[k + 2], base + g.i[k + 1]);
        else this.i.push(base + g.i[k], base + g.i[k + 1], base + g.i[k + 2]);
      }
      this.count += n;
      return this;
    }

    box(w, h, d, o) {
      o = o || {};
      const g = roundedBoxGeo(w, h, d, o.r || 0, o.seg || 3);
      return this.add(shiftY(g, h / 2), o);
    }
    cyl(radius, height, o) {
      o = o || {};
      const s = o.seg || 24, b = o.bevel || 0;
      const R = radius;
      const prof = b > 0 ? [[0, 0], [R - b, 0], [R, b], [R, height - b], [R - b, height], [0, height]] : [[0, 0], [R, 0], [R, height], [0, height]];
      return this.add(latheGeo(prof, s, o.smooth == null ? 50 : o.smooth), o);
    }
    lathe(profile, o) { o = o || {}; return this.add(latheGeo(profile, o.seg || 24, o.smooth == null ? 50 : o.smooth), o); }
    sphere(r, o) {
      o = o || {};
      const st = o.stacks || 10, prof = [];
      for (let k = 0; k <= st; k++) { const a = -Math.PI / 2 + Math.PI * k / st; prof.push([Math.max(0, Math.cos(a) * r), Math.sin(a) * r]); }
      return this.add(latheGeo(prof, o.seg || 14, 80), o);
    }
    /** tube along polyline path (local coords), Catmull-Rom smoothed. radius number or fn(t). */
    tube(points, radius, o) {
      o = o || {};
      return this.add(tubeGeo(points, radius, o.seg || 10, o.sub == null ? 6 : o.sub, o.cap !== false, o.smoothPath !== false), o);
    }
    plane(w, d, o) { o = o || {}; return this.add(planeGeo(w, d), o); }

    build() {
      return {
        data: new Float32Array(this.v), idx: new Uint32Array(this.i), stride: STRIDE,
        vertexCount: this.count, bounds: { min: this.min.slice(), max: this.max.slice() }
      };
    }
  }

  function shiftY(g, dy) { const p = new Float32Array(g.p); for (let k = 1; k < p.length; k += 3) p[k] += dy; return { p, n: g.n, uv: g.uv, i: g.i }; }

  function planeGeo(w, d) {
    return { p: new Float32Array([-w / 2, 0, -d / 2, w / 2, 0, -d / 2, w / 2, 0, d / 2, -w / 2, 0, d / 2]), n: new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]), uv: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), i: new Uint32Array([0, 2, 1, 0, 3, 2]) };
  }

  function coords(h, r, seg) {
    if (r <= 0) return [-h, h];
    const out = [];
    for (let j = 0; j <= seg; j++) out.push(-(h - r) - r * Math.tan(Math.PI / 4 * (1 - j / seg)));
    for (let j = 0; j <= seg; j++) out.push((h - r) + r * Math.tan(Math.PI / 4 * (j / seg)));
    return out;
  }

  /** Box centred on origin with optionally rounded edges; box-projected UVs per face. */
  function roundedBoxGeo(w, h, d, r, seg) {
    const hx = w / 2, hy = h / 2, hz = d / 2, rr = Math.min(r, hx, hy, hz);
    const H = [hx, hy, hz];
    const P = [], N = [], UV = [], I = [];
    // faces: [normalAxis, sign, uAxis, vAxis]
    const faces = [[1, 1, 0, 2], [1, -1, 0, 2], [2, 1, 0, 1], [2, -1, 0, 1], [0, 1, 2, 1], [0, -1, 2, 1]];
    for (const [a, s, ua, va] of faces) {
      const cu = coords(H[ua], rr, seg), cv = coords(H[va], rr, seg);
      const base = P.length / 3;
      for (let j = 0; j < cv.length; j++) for (let i = 0; i < cu.length; i++) {
        const q = [0, 0, 0]; q[a] = s * H[a]; q[ua] = cu[i]; q[va] = cv[j];
        const inner = [0, 1, 2].map(k => Math.max(-(H[k] - rr), Math.min(H[k] - rr, q[k])));
        let n = [q[0] - inner[0], q[1] - inner[1], q[2] - inner[2]];
        let l = Math.hypot(n[0], n[1], n[2]);
        if (l < 1e-9) { n = [0, 0, 0]; n[a] = s; l = 1; }
        n = n.map(x => x / l);
        const p = rr > 0 ? inner.map((x, k) => x + n[k] * rr) : q;
        P.push(p[0], p[1], p[2]); N.push(n[0], n[1], n[2]);
        // UVs oriented so canvas textures read correctly when the face is viewed from outside (v grows downward in canvases)
        let u = q[ua] / (2 * H[ua]) + 0.5, v = q[va] / (2 * H[va]) + 0.5;
        if ((a === 0 && s > 0) || (a === 2 && s < 0) || (a === 1 && s < 0)) u = 1 - u;
        if (va === 1) v = 1 - v;
        UV.push(u, v);
      }
      // winding: test first quad against normal
      const W = cu.length;
      const idx = (i, j) => base + j * W + i;
      const quad = (i, j) => [idx(i, j), idx(i + 1, j), idx(i + 1, j + 1), idx(i, j + 1)];
      const q0 = quad(0, 0);
      const pa = q0.map(k => [P[k * 3], P[k * 3 + 1], P[k * 3 + 2]]);
      const e1 = [pa[1][0] - pa[0][0], pa[1][1] - pa[0][1], pa[1][2] - pa[0][2]], e2 = [pa[2][0] - pa[0][0], pa[2][1] - pa[0][1], pa[2][2] - pa[0][2]];
      const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      const flip = (cr[a] * s) < 0;
      for (let j = 0; j < cv.length - 1; j++) for (let i = 0; i < cu.length - 1; i++) {
        const [A, B, C, D] = quad(i, j);
        if (flip) I.push(A, C, B, A, D, C); else I.push(A, B, C, A, C, D);
      }
    }
    return { p: new Float32Array(P), n: new Float32Array(N), uv: new Float32Array(UV), i: new Uint32Array(I) };
  }

  /** Surface of revolution about Y. profile: [[r,y],...] ordered so the outward normal is (dy,-dr). */
  function latheGeo(profile, seg, smoothDeg) {
    const P = [], N = [], UV = [], I = [];
    const S = profile.length - 1;
    const segN = [];
    let total = 0; const lens = [0];
    for (let k = 0; k < S; k++) {
      const dr = profile[k + 1][0] - profile[k][0], dy = profile[k + 1][1] - profile[k][1];
      const l = Math.hypot(dr, dy) || 1e-9; segN.push([dy / l, -dr / l]); total += l; lens.push(total);
    }
    const cosT = Math.cos((smoothDeg || 0) * Math.PI / 180);
    const nAt = (k, side) => { // side 0 = start vertex of segment k, 1 = end
      const own = segN[k];
      const nb = side === 0 ? segN[k - 1] : segN[k + 1];
      if (!nb) return own;
      if (own[0] * nb[0] + own[1] * nb[1] < cosT) return own;
      const x = own[0] + nb[0], y = own[1] + nb[1], l = Math.hypot(x, y) || 1; return [x / l, y / l];
    };
    const rmax = Math.max(1e-6, ...profile.map(p => p[0]));
    for (let k = 0; k < S; k++) {
      const [r0, y0] = profile[k], [r1, y1] = profile[k + 1];
      if (Math.abs(r1 - r0) < 1e-9 && Math.abs(y1 - y0) < 1e-9) continue;
      const n0 = nAt(k, 0), n1 = nAt(k, 1);
      const flat = Math.abs(segN[k][1]) > 0.999;
      const base = P.length / 3;
      for (let j = 0; j <= seg; j++) {
        const a = j / seg * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        for (let e = 0; e < 2; e++) {
          const r = e ? r1 : r0, y = e ? y1 : y0, n = e ? n1 : n0;
          P.push(r * ca, y, r * sa); N.push(n[0] * ca, n[1], n[0] * sa);
          if (flat) UV.push(0.5 + (r * ca) / (2 * rmax), 0.5 + (r * sa) / (2 * rmax));
          else UV.push(j / seg, (e ? lens[k + 1] : lens[k]) / total);
        }
      }
      for (let j = 0; j < seg; j++) {
        const a = base + j * 2, b = a + 1, c = a + 2, d = a + 3;
        // vertices: a=(j,start) b=(j,end) c=(j+1,start) d=(j+1,end). Angle increases +x→+z, so CCW-from-outside is a,b,d / a,d,c reversed
        I.push(a, b, d, a, d, c);
      }
    }
    return { p: new Float32Array(P), n: new Float32Array(N), uv: new Float32Array(UV), i: new Uint32Array(I) };
  }

  function catmull(pts, sub) {
    if (sub < 1 || pts.length < 3) return pts.map(p => p.slice());
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let s = 0; s < sub; s++) {
        const t = s / sub, t2 = t * t, t3 = t2 * t;
        out.push([0, 1, 2].map(k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
      }
    }
    out.push(pts[pts.length - 1].slice());
    return out;
  }

  /** Tube with parallel-transport frames; uv.x = distance along path (world units), uv.y = angle 0..1. */
  function tubeGeo(points, radius, seg, sub, cap, smoothPath) {
    const path = smoothPath ? catmull(points, sub) : points;
    const n = path.length, rad = typeof radius === 'function' ? radius : () => radius;
    const P = [], N = [], UV = [], I = [];
    let T = [0, 0, 0], prevN = null, dist = 0;
    const tangent = i => {
      const a = path[Math.max(0, i - 1)], b = path[Math.min(n - 1, i + 1)];
      const t = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const l = Math.hypot(...t) || 1; return t.map(x => x / l);
    };
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const norm = a => { const l = Math.hypot(...a) || 1; return a.map(x => x / l); };
    for (let i = 0; i < n; i++) {
      T = tangent(i);
      if (!prevN) { const ref = Math.abs(T[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]; prevN = norm(cross(cross(T, ref), T)); }
      else { prevN = norm(cross(cross(T, prevN), T)); } // re-orthogonalise
      const B = cross(T, prevN);
      if (i > 0) dist += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1], path[i][2] - path[i - 1][2]);
      const r = rad(i / (n - 1));
      for (let j = 0; j <= seg; j++) {
        const a = j / seg * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
        const nn = [prevN[0] * c + B[0] * s, prevN[1] * c + B[1] * s, prevN[2] * c + B[2] * s];
        P.push(path[i][0] + nn[0] * r, path[i][1] + nn[1] * r, path[i][2] + nn[2] * r); N.push(...nn); UV.push(dist, j / seg);
      }
    }
    const W = seg + 1;
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) {
      const a = i * W + j, b = a + 1, c = a + W, d = c + 1;
      I.push(a, b, c, b, d, c);
    }
    if (cap) for (const end of [0, n - 1]) {
      const ci = P.length / 3, t = tangent(end), sg = end === 0 ? -1 : 1;
      P.push(...path[end]); N.push(t[0] * sg, t[1] * sg, t[2] * sg); UV.push(end ? dist : 0, 0.5);
      const ring = P.length / 3;
      for (let j = 0; j <= seg; j++) { const k = end * W + j; P.push(P[k * 3], P[k * 3 + 1], P[k * 3 + 2]); N.push(t[0] * sg, t[1] * sg, t[2] * sg); UV.push(end ? dist : 0, j / seg); }
      for (let j = 0; j < seg; j++) { if (end === 0) I.push(ci, ring + j + 1, ring + j); else I.push(ci, ring + j, ring + j + 1); }
    }
    return { p: new Float32Array(P), n: new Float32Array(N), uv: new Float32Array(UV), i: new Uint32Array(I) };
  }

  const api = { Builder, roundedBoxGeo, latheGeo, tubeGeo, planeGeo, STRIDE };
  global.ITM_GL = global.ITM_GL || {};
  global.ITM_GL.geometry = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
