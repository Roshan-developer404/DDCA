/* ITM_GL.Engine — a compact, dependency-free WebGL2 renderer built for "Inside the Machine".
 *  - Physically-based shading (GGX, Schlick Fresnel, analytic studio IBL, thin-film iridescence)
 *  - Fitted PCF shadow map, 4x MSAA HDR target, SSAO, bloom, ACES tone mapping
 *  - ID-buffer picking, orbit camera with fly-to, scene graph with explode offsets
 */
(function (global) {
  'use strict';
  const { m4, clamp, lerp, easeInOut } = global.ITM_GL.math;
  const STRIDE = 14 * 4;

  /* ───────────────────────────── shaders ───────────────────────────── */
  const VS = `#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec2 aUV;
layout(location=3) in vec3 aCol; layout(location=4) in vec3 aMat;
uniform mat4 uModel; uniform mat3 uNormalMat; uniform mat4 uVP;
out vec3 vWorld; out vec3 vN; out vec2 vUV; out vec3 vCol; out vec3 vMat;
void main(){
  vec4 w = uModel * vec4(aPos,1.0);
  vWorld = w.xyz; vN = normalize(uNormalMat * aNrm); vUV = aUV; vCol = aCol; vMat = aMat;
  gl_Position = uVP * w;
}`;

  const FS = `#version 300 es
precision highp float; precision highp sampler2DShadow;
in vec3 vWorld; in vec3 vN; in vec2 vUV; in vec3 vCol; in vec3 vMat;
layout(location=0) out vec4 outColor;
uniform vec3 uCam; uniform float uTime;
uniform sampler2D uTex; uniform sampler2D uTex2; uniform sampler2DShadow uShadow;
uniform int uHasTex; uniform int uHasTex2; uniform vec2 uTexScale; uniform float uBump;
uniform int uProc; uniform float uIrid; uniform int uEmisAnim; uniform float uEmisScale;
uniform float uHL; uniform vec3 uHLCol; uniform float uPulse; uniform float uDim; uniform float uAlpha;
uniform mat4 uLightVP; uniform float uShadowTexel; uniform float uShadowUV; uniform float uShadowOn; uniform float uTex2Emis;
uniform vec3 uKeyDir; uniform vec3 uKeyCol; uniform vec3 uFillDir; uniform vec3 uFillCol; uniform vec3 uRimDir; uniform vec3 uRimCol;
uniform vec3 uSky; uniform vec3 uGround; uniform float uFogDen; uniform vec3 uFogCol; uniform float uBoardY;
const float PI = 3.14159265;

float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash12(i),hash12(i+vec2(1,0)),f.x), mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),f.x), f.y); }
vec3 hsv2rgb(vec3 c){ vec3 p = abs(fract(c.xxx + vec3(0.,2./3.,1./3.)) * 6. - 3.); return c.z * mix(vec3(1.), clamp(p - 1., 0., 1.), c.y); }

// Procedural studio environment (what glossy parts reflect)
vec3 envMap(vec3 d, float rough){
  float r2 = rough*rough;
  vec3 c = mix(uGround, uSky, smoothstep(-0.35, 0.9, d.y));
  // big softbox, upper front-left
  vec3 K = normalize(uKeyDir);
  float kd = dot(d, K), w = mix(0.965, 0.55, rough);
  c += uKeyCol * 1.5 * smoothstep(w, w + (1.0-w)*0.45 + 1e-3, kd) * (0.06 / (0.06 + (1.0-w)));
  // long strip light, camera-left horizon-ish
  float az = atan(d.z, d.x);
  float band = 1.0 - smoothstep(0.03 + r2*0.9, 0.09 + r2*1.2, abs(d.y - 0.32));
  float side = smoothstep(2.1, 2.5, abs(az));
  c += vec3(0.35,0.55,0.9) * 2.0 * band * side * (1.0/(1.0+4.0*r2));
  // cyan rim behind, magenta accent right
  c += uRimCol * 3.2 * smoothstep(0.80 - r2*0.5, 0.97, dot(d, normalize(uRimDir))) / (1.0+3.0*r2);
  c += vec3(0.9,0.2,0.55) * 0.7 * smoothstep(0.86 - r2*0.4, 0.98, dot(d, normalize(vec3(0.95,0.18,0.2)))) / (1.0+3.0*r2);
  return c;
}
float D_GGX(float nh, float a){ float a2=a*a; float d = nh*nh*(a2-1.)+1.; return a2/(PI*d*d + 1e-6); }
float V_Smith(float nv, float nl, float a){ float k=a*0.5; return 0.25/((nv*(1.-k)+k)*(nl*(1.-k)+k)+1e-5); }
vec3 F_Schlick(vec3 f0, float c){ return f0 + (1.-f0)*pow(1.-c, 5.); }

float shadowAt(vec3 wp, vec3 n){
  if (uShadowOn < 0.5) return 1.0;
  vec4 sc = uLightVP * vec4(wp + n * uShadowTexel * 2.0, 1.0);
  vec3 p = sc.xyz / sc.w * 0.5 + 0.5;
  if (p.x<0.||p.x>1.||p.y<0.||p.y>1.||p.z>1.) return 1.0;
  float ang = hash12(gl_FragCoord.xy) * 6.2831;
  mat2 R = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  float s = 0.0;
  const vec2 pd[8] = vec2[8](vec2(-.94,-.4), vec2(.95,-.19), vec2(-.09,-.93), vec2(.34,.29), vec2(-.92,.24), vec2(.44,-.78), vec2(.1,.9), vec2(.85,.5));
  for(int i=0;i<8;i++){ vec2 o = R*pd[i]*uShadowUV*1.8; s += texture(uShadow, vec3(p.xy+o, p.z-0.0012)); }
  return s/8.0;
}

void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(uCam - vWorld);
  if (dot(N,V) < -0.0 && gl_FrontFacing == false) N = -N;
  vec3 albedo = vCol; float metal = vMat.x, rough = vMat.y, emis = vMat.z; vec3 emisCol = vCol;
  float height = 0.0; vec2 uv = vUV * uTexScale;
  if (uHasTex == 1){ vec4 t = texture(uTex, uv); albedo = pow(t.rgb, vec3(2.2)) * vCol; emisCol = albedo; height = dot(t.rgb, vec3(0.3333)); }
  if (uHasTex2 == 1){ vec4 t2 = texture(uTex2, uv); metal = t2.r; rough = t2.g; emis = t2.b * uTex2Emis; emisCol = albedo; }
  float groundGlow = 0.0;
  if (uProc == 1){ // brushed metal along u
    height = vnoise(vec2(uv.x*6.0, uv.y*260.0))*0.7 + vnoise(vec2(uv.x*14.0, uv.y*700.0))*0.3;
    albedo *= 0.88 + 0.22*height;
  } else if (uProc == 2){ // blueprint floor grid in world space
    vec2 g = vWorld.xz / 2.0; vec2 f = abs(fract(g - 0.5) - 0.5) / fwidth(g);
    float line = 1.0 - min(min(f.x, f.y), 1.0);
    float fade = exp(-length(vWorld.xz - uCam.xz) * 0.018);
    groundGlow = line * 0.55 * fade;
    float big = 1.0 - min(min(abs(fract(vWorld.x/10.0-0.5)-0.5)/fwidth(vWorld.x/10.0), abs(fract(vWorld.z/10.0-0.5)-0.5)/fwidth(vWorld.z/10.0)), 1.0);
    groundGlow += big * 0.9 * fade;
  } else if (uProc == 3){ // anodised blasted metal: fine stipple
    height = vnoise(uv*900.0); albedo *= 0.92 + 0.14*height;
  }
  if (uBump > 0.0){
    float hx = dFdx(height), hy = dFdy(height);
    vec3 dpx = dFdx(vWorld), dpy = dFdy(vWorld);
    vec3 r1 = cross(dpy, N), r2 = cross(N, dpx);
    float det = dot(dpx, r1);
    vec3 grad = sign(det) * (hx * r1 + hy * r2);
    N = normalize(abs(det) * N - uBump * grad);
  }
  if (uEmisAnim > 0) albedo *= 0.06;
  albedo = mix(albedo, albedo*0.25 + vec3(0.02,0.03,0.04), uDim);
  rough = clamp(rough, 0.04, 1.0);
  float a = rough*rough;
  float NV = max(dot(N,V), 1e-3);
  vec3 f0 = mix(vec3(0.04), albedo, metal);
  if (uIrid > 0.0){
    vec3 film = 0.5 + 0.5*cos(6.2831*(NV*1.3 + vec3(0.0,0.33,0.67)));
    f0 = mix(f0, film, uIrid*0.8); albedo = mix(albedo, albedo*(0.6+film), uIrid*0.4);
  }
  vec3 diffC = albedo * (1.0 - metal);

  vec3 col = vec3(0.0);
  // key light (shadowed)
  vec3 Lk = normalize(uKeyDir); float shadow = shadowAt(vWorld, normalize(vN));
  vec3 Ls[3] = vec3[3](Lk, normalize(uFillDir), normalize(uRimDir));
  vec3 Cs[3] = vec3[3](uKeyCol, uFillCol, uRimCol);
  for(int i=0;i<3;i++){
    vec3 L = Ls[i]; float NL = max(dot(N,L), 0.0); if (NL <= 0.0) continue;
    vec3 H = normalize(V + L); float NH = max(dot(N,H),0.), VH = max(dot(V,H),0.);
    vec3 F = F_Schlick(f0, VH);
    vec3 spec = D_GGX(NH, max(a, 0.085)) * V_Smith(NV, NL, a) * F;
    float vis = i == 0 ? shadow : 1.0;
    col += (diffC * (1.0 - F) / PI + spec) * Cs[i] * NL * vis * PI;
  }
  // ambient / IBL
  float hemi = N.y * 0.5 + 0.5;
  vec3 irr = mix(uGround, uSky, hemi) * 1.6 + uFillCol*0.12*max(dot(N, normalize(uFillDir)),0.) + uRimCol*0.10*max(dot(N, normalize(uRimDir)),0.);
  vec3 R = reflect(-V, N);
  vec2 ab = vec2(1.0 - rough*0.6, 0.0) ; // cheap split-sum fit
  vec3 Fe = f0 + (max(vec3(1.0 - rough), f0) - f0) * pow(1.0 - NV, 5.0);
  float horizonOcc = clamp(1.0 + 1.0*dot(R, N), 0.0, 1.0);
  vec3 specIBL = envMap(R, rough) * Fe * horizonOcc * mix(0.35, 1.0, shadow);
  col += diffC * irr * (0.55 + 0.45*shadow) + specIBL;
  // emission
  vec3 e = emisCol * emis;
  if (uEmisAnim == 1){ e = hsv2rgb(vec3(fract(vUV.x*0.9 + uTime*0.12), 0.85, 1.0)) * emis; }
  else if (uEmisAnim == 2){ e *= 0.65 + 0.35*sin(uTime*2.2 + vUV.x*6.0); }
  else if (uEmisAnim == 3){ float p = fract(vUV.x/2.4 - uTime*1.2); float pulse = smoothstep(0.0,0.08,p)*(1.0-smoothstep(0.08,0.34,p)); e = emisCol*(emis*0.22 + uPulse*(0.6 + 5.0*pulse)); }
  col += e * uEmisScale;
  col += vec3(0.08,0.62,0.85) * groundGlow * 0.26;
  if (uHL > 0.0){ float rim = pow(1.0 - NV, 4.0); col += uHLCol * (rim * 0.9) * uHL; }
  float dist = length(vWorld - uCam);
  col = mix(uFogCol, col, exp(-dist * uFogDen));
  outColor = vec4(col, uAlpha);
}`;

  const VS_DEPTH = `#version 300 es
layout(location=0) in vec3 aPos; uniform mat4 uModel; uniform mat4 uVP;
void main(){ gl_Position = uVP * uModel * vec4(aPos,1.0); }`;
  const FS_DEPTH = `#version 300 es
precision mediump float; void main(){}`;
  const FS_ID = `#version 300 es
precision highp float; uniform vec3 uId; out vec4 o; void main(){ o = vec4(uId, 1.0); }`;

  const VS_FS = `#version 300 es
out vec2 vUV; void main(){ vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2); vUV = p; gl_Position = vec4(p*2.0-1.0, 0.0, 1.0); }`;

  const FS_BRIGHT = `#version 300 es
precision highp float; in vec2 vUV; uniform sampler2D uSrc; uniform float uThresh; out vec4 o;
void main(){ vec3 c = texture(uSrc, vUV).rgb; float l = max(c.r, max(c.g, c.b)); float k = clamp((l - uThresh) / (uThresh*0.9 + 1e-3), 0.0, 1.0); o = vec4(c * k * k * (3.0-2.0*k), 1.0); }`;
  const FS_DOWN = `#version 300 es
precision highp float; in vec2 vUV; uniform sampler2D uSrc; uniform vec2 uTexel; out vec4 o;
void main(){ vec3 c = texture(uSrc, vUV).rgb*4.0; c += texture(uSrc, vUV+uTexel*vec2(-1,-1)).rgb + texture(uSrc, vUV+uTexel*vec2(1,-1)).rgb + texture(uSrc, vUV+uTexel*vec2(-1,1)).rgb + texture(uSrc, vUV+uTexel*vec2(1,1)).rgb; o = vec4(c/8.0, 1.0); }`;
  const FS_UP = `#version 300 es
precision highp float; in vec2 vUV; uniform sampler2D uSrc; uniform vec2 uTexel; out vec4 o;
void main(){ vec3 c = vec3(0.0); c += texture(uSrc, vUV+uTexel*vec2(-1,-1)).rgb + texture(uSrc, vUV+uTexel*vec2(1,-1)).rgb + texture(uSrc, vUV+uTexel*vec2(-1,1)).rgb + texture(uSrc, vUV+uTexel*vec2(1,1)).rgb;
  c += 2.0*(texture(uSrc, vUV+uTexel*vec2(0,-1)).rgb + texture(uSrc, vUV+uTexel*vec2(0,1)).rgb + texture(uSrc, vUV+uTexel*vec2(-1,0)).rgb + texture(uSrc, vUV+uTexel*vec2(1,0)).rgb);
  c += 4.0*texture(uSrc, vUV).rgb; o = vec4(c/16.0, 1.0); }`;

  const FS_SSAO = `#version 300 es
precision highp float; in vec2 vUV; uniform sampler2D uDepth; uniform vec2 uTexel; uniform vec2 uProj; uniform float uNear, uFar, uRadius, uAspectTan; out vec4 o;
float lin(float d){ float z = d*2.0-1.0; return 2.0*uNear*uFar/(uFar+uNear - z*(uFar-uNear)); }
vec3 vpos(vec2 uv){ float z = lin(texture(uDepth, uv).r); return vec3((uv*2.0-1.0) * vec2(uAspectTan, uProj.y*0.0 + uProj.x) * z, -z); }
float ign(vec2 p){ return fract(52.9829189*fract(dot(p, vec2(0.06711056,0.00583715)))); }
void main(){
  float d0 = texture(uDepth, vUV).r; if (d0 >= 0.9999){ o = vec4(1.0); return; }
  vec3 p = vpos(vUV);
  vec3 pr = vpos(vUV + vec2(uTexel.x,0.)), pl = vpos(vUV - vec2(uTexel.x,0.)), pu = vpos(vUV + vec2(0.,uTexel.y)), pd = vpos(vUV - vec2(0.,uTexel.y));
  vec3 dx = abs(pr.z-p.z) < abs(p.z-pl.z) ? pr-p : p-pl; vec3 dy = abs(pu.z-p.z) < abs(p.z-pd.z) ? pu-p : p-pd;
  vec3 n = normalize(cross(dx, dy)); if (n.z < 0.0) n = -n;
  float ang0 = ign(gl_FragCoord.xy) * 6.2831; float occ = 0.0;
  for(int i=0;i<14;i++){
    float fi = float(i); float a = ang0 + fi*2.39996; float rr = (fi+0.5)/14.0;
    vec2 off = vec2(cos(a), sin(a)) * sqrt(rr);
    float rad = uRadius;
    vec3 sp = p + vec3(off*rad, 0.0);
    // project sample to screen, fetch real depth
    vec2 suv = (sp.xy / (-sp.z) / vec2(uAspectTan, uProj.x)) * 0.5 + 0.5;
    vec3 q = vpos(suv);
    vec3 v = q - p; float vv = dot(v,v); float nd = dot(n, v) - 0.03*rad;
    float range = smoothstep(0.0, 1.0, rad*1.6 / (abs(p.z - q.z) + 1e-4));
    occ += max(nd, 0.0) / (vv + 0.02*rad*rad) * range;
  }
  occ = clamp(occ / 14.0 * 1.15 * uRadius, 0.0, 1.0);
  o = vec4(vec3(1.0 - occ), 1.0);
}`;
  const FS_AOBLUR = `#version 300 es
precision highp float; in vec2 vUV; uniform sampler2D uAO; uniform sampler2D uDepth; uniform vec2 uTexel; uniform float uNear, uFar; out vec4 o;
float lin(float d){ float z = d*2.0-1.0; return 2.0*uNear*uFar/(uFar+uNear - z*(uFar-uNear)); }
void main(){
  float zc = lin(texture(uDepth, vUV).r); float s = 0.0, w = 0.0;
  for(int x=-2;x<=2;x++) for(int y=-2;y<=2;y++){
    vec2 uv = vUV + vec2(x,y)*uTexel; float z = lin(texture(uDepth, uv).r);
    float k = exp(-abs(z-zc)/(zc*0.02+1e-3)); s += texture(uAO, uv).r*k; w += k; }
  o = vec4(vec3(s/max(w,1e-4)), 1.0);
}`;

  const FS_COMP = `#version 300 es
precision highp float; in vec2 vUV; uniform sampler2D uScene; uniform sampler2D uBloom; uniform sampler2D uAO;
uniform float uBloomK; uniform float uExposure; uniform float uFade; uniform float uAOk; uniform float uTime; uniform vec2 uRes; uniform float uAber; out vec4 o;
vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
void main(){
  vec2 c = vUV - 0.5; float ab = uAber * dot(c,c);
  vec3 col; col.r = texture(uScene, vUV + c*ab).r; col.g = texture(uScene, vUV).g; col.b = texture(uScene, vUV - c*ab).b;
  float ao = texture(uAO, vUV).r; col *= mix(1.0, ao, uAOk);
  col += texture(uBloom, vUV).rgb * uBloomK;
  col = aces(col * uExposure);
  col = pow(col, vec3(1.0/2.2));
  float v = smoothstep(1.05, 0.25, length(c*vec2(1.0,0.9)*1.15)); col *= mix(0.55, 1.0, v);
  float g = fract(sin(dot(gl_FragCoord.xy + uTime, vec2(12.9898,78.233))) * 43758.5453); col += (g-0.5)/255.0*1.5;
  o = vec4(col * uFade, 1.0);
}`;

  /* ───────────────────────────── helpers ───────────────────────────── */
  function compile(gl, type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('Shader compile: ' + gl.getShaderInfoLog(s) + '\n' + src.split('\n').map((l, i) => (i + 1) + ': ' + l).join('\n'));
    return s;
  }
  function program(gl, vs, fs) {
    const p = gl.createProgram(); gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Program link: ' + gl.getProgramInfoLog(p));
    const cache = {};
    p.u = n => (n in cache ? cache[n] : (cache[n] = gl.getUniformLocation(p, n)));
    return p;
  }
  function normalMat(out, m) { // inverse-transpose of upper 3x3
    const a = m[0], b = m[1], c = m[2], d = m[4], e = m[5], f = m[6], g = m[8], h = m[9], i = m[10];
    const A = e * i - f * h, B = f * g - d * i, C = d * h - e * g;
    let det = a * A + b * B + c * C; det = det ? 1 / det : 1;
    out[0] = A * det; out[1] = (c * h - b * i) * det; out[2] = (b * f - c * e) * det;
    out[3] = B * det; out[4] = (a * i - c * g) * det; out[5] = (c * d - a * f) * det;
    out[6] = C * det; out[7] = (b * g - a * h) * det; out[8] = (a * e - b * d) * det;
    return out;
  }

  /* ───────────────────────────── scene graph ───────────────────────────── */
  let NEXT_ID = 1;
  class Node {
    constructor(name, mesh, material) {
      this.name = name || 'node'; this.mesh = mesh || null; this.material = Object.assign({}, material || {});
      this.pos = [0, 0, 0]; this.rot = [0, 0, 0]; this.scale = 1; this.off = [0, 0, 0]; this.explode = [0, 0, 0];
      this.children = []; this.parent = null; this.visible = true; this.castShadow = true; this.pickable = true;
      this.group = null;            // logical component id reported by picking
      this.highlight = 0; this.hlCol = [0.2, 0.9, 1.0]; this.pulse = 0; this.dim = 0; this.alphaOverride = null; this.spin = null; // spin: {axis:'y', speed}
      this.id = NEXT_ID++; this.world = m4.create(); this.local = m4.create();
    }
    add(n) { n.parent = this; this.children.push(n); return n; }
    remove(n) { const i = this.children.indexOf(n); if (i >= 0) this.children.splice(i, 1); n.parent = null; }
    update(parentWorld, explodeT) {
      const p = [this.pos[0] + this.off[0] + this.explode[0] * explodeT, this.pos[1] + this.off[1] + this.explode[1] * explodeT, this.pos[2] + this.off[2] + this.explode[2] * explodeT];
      m4.fromTRS(this.local, p, this.rot, this.scale);
      if (parentWorld) m4.multiply(this.world, parentWorld, this.local); else m4.copy(this.world, this.local);
      for (const c of this.children) c.update(this.world, explodeT);
    }
  }

  /* ───────────────────────────── orbit camera ───────────────────────────── */
  class OrbitCamera {
    constructor(opts) {
      opts = opts || {};
      this.target = (opts.target || [0, 0, 0]).slice(); this.yaw = opts.yaw != null ? opts.yaw : 0.6; this.pitch = opts.pitch != null ? opts.pitch : 0.55; this.dist = opts.dist || 30;
      this.fov = opts.fov || 38 * Math.PI / 180; this.minDist = opts.minDist || 1.2; this.maxDist = opts.maxDist || 80;
      this.minPitch = opts.minPitch != null ? opts.minPitch : -0.1; this.maxPitch = 1.5;
      this.vYaw = 0; this.vPitch = 0; this.auto = opts.auto != null ? opts.auto : 0; this.userActive = false; this.lastInput = -1e9;
      this.fly = null; this.pos = [0, 0, 0]; this.view = m4.create(); this.proj = m4.create(); this.vp = m4.create();
      this.near = 0.1; this.far = 400; this.aspect = 1; this.home = { target: this.target.slice(), yaw: this.yaw, pitch: this.pitch, dist: this.dist };
      this.onChange = null; this.dragging = false; this.shift = 0;
    }
    flyTo(pose, ms, ease) {
      this.fly = { t0: performance.now(), ms: ms || 1400, from: { target: this.target.slice(), yaw: this.yaw, pitch: this.pitch, dist: this.dist }, to: Object.assign({ target: this.target.slice(), yaw: this.yaw, pitch: this.pitch, dist: this.dist }, pose), ease: ease || easeInOut };
      if (pose.yaw != null) { // shortest yaw path
        let d = this.fly.to.yaw - this.fly.from.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.fly.to.yaw = this.fly.from.yaw + d;
      }
      this.vYaw = this.vPitch = 0;
      return new Promise(res => { this.fly.done = res; });
    }
    update(dt, now) {
      if (this.fly) {
        const f = this.fly, t = clamp((now - f.t0) / f.ms, 0, 1), k = f.ease(t);
        for (let i = 0; i < 3; i++) this.target[i] = lerp(f.from.target[i], f.to.target[i], k);
        this.yaw = lerp(f.from.yaw, f.to.yaw, k); this.pitch = lerp(f.from.pitch, f.to.pitch, k);
        this.dist = Math.exp(lerp(Math.log(f.from.dist), Math.log(f.to.dist), k)); // zoom in log-space = constant feel
        if (t >= 1) { const d = f.done; this.fly = null; if (d) d(); }
      } else {
        this.yaw += this.vYaw * dt; this.pitch += this.vPitch * dt;
        const damp = Math.exp(-dt * 6); this.vYaw *= damp; this.vPitch *= damp;
        if (this.auto && !this.dragging && now - this.lastInput > 2500) this.yaw += this.auto * dt;
      }
      this.pitch = clamp(this.pitch, this.minPitch, this.maxPitch); this.dist = clamp(this.dist, this.minDist, this.maxDist);
      const cp = Math.cos(this.pitch);
      this.pos[0] = this.target[0] + this.dist * cp * Math.sin(this.yaw);
      this.pos[1] = this.target[1] + this.dist * Math.sin(this.pitch);
      this.pos[2] = this.target[2] + this.dist * cp * Math.cos(this.yaw);
      this.near = Math.max(0.02, this.dist * 0.04); this.far = Math.max(200, this.dist * 40);
    }
    updateMatrices(aspect) {
      this.aspect = aspect;
      m4.lookAt(this.view, this.pos, this.target, [0, 1, 0]);
      m4.perspective(this.proj, this.fov, aspect, this.near, this.far); this.proj[8] = -this.shift;
      m4.multiply(this.vp, this.proj, this.view);
    }
    project(p, w, h) {
      const v = this.vp, x = v[0] * p[0] + v[4] * p[1] + v[8] * p[2] + v[12], y = v[1] * p[0] + v[5] * p[1] + v[9] * p[2] + v[13], z = v[2] * p[0] + v[6] * p[1] + v[10] * p[2] + v[14], ww = v[3] * p[0] + v[7] * p[1] + v[11] * p[2] + v[15];
      if (ww <= 0) return { x: -999, y: -999, visible: false, depth: ww };
      return { x: (x / ww * 0.5 + 0.5) * w, y: (1 - (y / ww * 0.5 + 0.5)) * h, visible: Math.abs(x / ww) < 1.2 && Math.abs(y / ww) < 1.2 && z / ww < 1, depth: ww };
    }
    attach(el) {
      const pts = new Map(); let lastPinch = 0, lastMid = null; const self = this;
      const touch = () => { self.lastInput = performance.now(); self.fly = null; };
      el.style.touchAction = 'none';
      el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY, btn: e.button, shift: e.shiftKey }); self.dragging = true; touch(); self._moved = 0; });
      el.addEventListener('pointermove', e => {
        const p = pts.get(e.pointerId); if (!p) return; touch();
        const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; self._moved += Math.abs(dx) + Math.abs(dy);
        if (pts.size === 2) {
          const a = [...pts.values()], dd = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), mid = { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 };
          if (lastPinch) self.dist *= lastPinch / dd; lastPinch = dd;
          if (lastMid) self._pan(mid.x - lastMid.x, mid.y - lastMid.y, el); lastMid = mid; return;
        }
        if (p.btn === 2 || p.btn === 1 || p.shift || e.shiftKey) self._pan(dx, dy, el);
        else { self.yaw -= dx * 0.0062; self.pitch += dy * 0.0062; self.vYaw = -dx * 0.0062 * 40; self.vPitch = dy * 0.0062 * 40; }
        if (self.onChange) self.onChange();
      });
      const up = e => { pts.delete(e.pointerId); lastPinch = 0; lastMid = null; if (!pts.size) { self.dragging = false; } };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('contextmenu', e => e.preventDefault());
      el.addEventListener('wheel', e => { e.preventDefault(); touch(); self.dist *= Math.exp(clamp(e.deltaY, -120, 120) * 0.0016); if (self.onChange) self.onChange(); }, { passive: false });
    }
    _pan(dx, dy, el) {
      const s = this.dist * Math.tan(this.fov / 2) * 2 / el.clientHeight;
      const v = this.view; // columns: right = (v[0],v[4],v[8]); up = (v[1],v[5],v[9])
      for (let i = 0; i < 3; i++) this.target[i] += (-dx * s) * v[i * 4] + (dy * s) * v[i * 4 + 1];
    }
  }

  /* ───────────────────────────── renderer ───────────────────────────── */
  class Renderer {
    constructor(canvas, opts) {
      opts = opts || {};
      const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserve });
      if (!gl) throw new Error('WebGL2 not available');
      this.gl = gl; this.canvas = canvas; this.opts = opts;
      this.floatOK = !!gl.getExtension('EXT_color_buffer_float'); gl.getExtension('OES_texture_float_linear');
      this.aniso = gl.getExtension('EXT_texture_filter_anisotropic');
      this.maxPixels = opts.maxPixels || 3.2e6; this.dprCap = opts.dpr || 2;
      this.P = {
        main: program(gl, VS, FS), depth: program(gl, VS_DEPTH, FS_DEPTH), id: program(gl, VS_DEPTH, FS_ID),
        bright: program(gl, VS_FS, FS_BRIGHT), down: program(gl, VS_FS, FS_DOWN), up: program(gl, VS_FS, FS_UP),
        ssao: program(gl, VS_FS, FS_SSAO), aoblur: program(gl, VS_FS, FS_AOBLUR), comp: program(gl, VS_FS, FS_COMP)
      };
      this.emptyVAO = gl.createVertexArray();
      this.settings = Object.assign({ exposure: 1.0, bloom: 0.3, bloomThresh: 1.7, ao: 0.9, shadows: true, aber: 0.012, fade: 1,
        keyDir: [0.5, 0.82, 0.55], keyCol: [2.3, 2.15, 1.98], fillDir: [-0.75, 0.35, -0.45], fillCol: [0.32, 0.45, 0.8], rimDir: [0.05, 0.28, -1.0], rimCol: [0.15, 0.85, 1.0],
        sky: [0.04, 0.055, 0.09], ground: [0.012, 0.014, 0.02], fogCol: [0.012, 0.022, 0.04], fogDen: 0.006, shadowSize: 2048 }, opts.settings || {});
      this.shadow = this._makeShadow(this.settings.shadowSize);
      this.lightVP = m4.create(); this.shadowTexel = 0.01;
      this.w = 0; this.h = 0; this.time = 0; this._nm = new Float32Array(9);
      this.textures = []; this.meshes = [];
      this._pickFB = null;
      this.resize();
    }
    _makeShadow(size) {
      const gl = this.gl, tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex); gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, size, size);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
      const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, tex, 0);
      gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { tex, fb, size };
    }
    _tex2D(w, h, fmt, filter) {
      const gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      const f = { rgba16f: [gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT], rgba8: [gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE], depth: [gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT] }[fmt];
      gl.texImage2D(gl.TEXTURE_2D, 0, f[0], w, h, 0, f[1], f[2], null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter || gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter || gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    }
    _fbWith(color, depth) {
      const gl = this.gl, fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      if (color) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, color, 0);
      if (depth) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depth, 0);
      return fb;
    }
    resize() {
      const c = this.canvas, dpr = Math.min(window.devicePixelRatio || 1, this.dprCap);
      let w = Math.max(2, Math.floor(c.clientWidth * dpr)), h = Math.max(2, Math.floor(c.clientHeight * dpr));
      const px = w * h; if (px > this.maxPixels) { const s = Math.sqrt(this.maxPixels / px); w = Math.floor(w * s); h = Math.floor(h * s); }
      if (w === this.w && h === this.h) return false;
      this.w = c.width = w; this.h = c.height = h; this._buildTargets(); return true;
    }
    _buildTargets() {
      const gl = this.gl, w = this.w, h = this.h, hdr = this.floatOK ? 'rgba16f' : 'rgba8';
      const del = o => { if (!o) return; for (const k in o) { const v = o[k]; if (v instanceof WebGLTexture) gl.deleteTexture(v); else if (v instanceof WebGLFramebuffer) gl.deleteFramebuffer(v); else if (v instanceof WebGLRenderbuffer) gl.deleteRenderbuffer(v); } };
      del(this.T);
      const T = {};
      const samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES));
      T.msColor = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, T.msColor); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, this.floatOK ? gl.RGBA16F : gl.RGBA8, w, h);
      T.msDepth = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, T.msDepth); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, w, h);
      T.msFB = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, T.msFB);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, T.msColor); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, T.msDepth);
      T.scene = this._tex2D(w, h, hdr); T.depth = this._tex2D(w, h, 'depth', gl.NEAREST); T.resFB = this._fbWith(T.scene, T.depth);
      const hw = Math.max(2, w >> 1), hh = Math.max(2, h >> 1);
      T.aoA = this._tex2D(hw, hh, 'rgba8'); T.aoB = this._tex2D(hw, hh, 'rgba8'); T.aoFA = this._fbWith(T.aoA); T.aoFB = this._fbWith(T.aoB); T.hw = hw; T.hh = hh;
      T.bloom = []; let bw = hw, bh = hh;
      for (let i = 0; i < 5; i++) { const t = this._tex2D(bw, bh, hdr); T.bloom.push({ tex: t, fb: this._fbWith(t), w: bw, h: bh }); bw = Math.max(2, bw >> 1); bh = Math.max(2, bh >> 1); }
      T.pw = Math.max(2, w >> 1); T.ph = Math.max(2, h >> 1);
      T.pickTex = this._tex2D(T.pw, T.ph, 'rgba8', gl.NEAREST); T.pickDepth = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, T.pickDepth); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, T.pw, T.ph);
      T.pickFB = this._fbWith(T.pickTex); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, T.pickDepth);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); this.T = T;
    }

    /* resources */
    createMesh(built) {
      const gl = this.gl, vao = gl.createVertexArray(); gl.bindVertexArray(vao);
      const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, built.data, gl.STATIC_DRAW);
      const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, built.idx, gl.STATIC_DRAW);
      const layout = [[0, 3, 0], [1, 3, 12], [2, 2, 24], [3, 3, 32], [4, 3, 44]];
      for (const [loc, n, off] of layout) { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, STRIDE, off); }
      gl.bindVertexArray(null);
      const m = { vao, count: built.idx.length, bounds: built.bounds, vb, ib }; this.meshes.push(m); return m;
    }
    createTexture(source, o) {
      o = o || {}; const gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      const wrap = o.repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE; gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
      if (this.aniso) gl.texParameterf(gl.TEXTURE_2D, this.aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(this.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      this.textures.push(t); return t;
    }

    updateTexture(tex, source) {
      const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source); gl.generateMipmap(gl.TEXTURE_2D);
    }
    /* frame */
    _collect(node, list) {
      if (!node.visible) return;
      if (node.mesh) list.push(node);
      for (const c of node.children) this._collect(c, list);
    }
    _drawNode(P, n, mode, cam, cur) {
      const gl = this.gl, mt = n.material;
      gl.uniformMatrix4fv(P.u('uModel'), false, n.world);
      if (mode === 'main') {
        gl.uniformMatrix3fv(P.u('uNormalMat'), false, normalMat(this._nm, n.world));
        const t1 = mt.tex || null, t2 = mt.tex2 || null;
        gl.uniform1i(P.u('uHasTex'), t1 ? 1 : 0); gl.uniform1i(P.u('uHasTex2'), t2 ? 1 : 0);
        if (t1) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, t1); }
        if (t2) { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, t2); }
        gl.uniform2f(P.u('uTexScale'), mt.texScale ? mt.texScale[0] : 1, mt.texScale ? mt.texScale[1] : 1);
        gl.uniform1f(P.u('uBump'), mt.bump || 0); gl.uniform1f(P.u('uTex2Emis'), mt.tex2Emis != null ? mt.tex2Emis : 2.0); gl.uniform1i(P.u('uProc'), mt.proc || 0); gl.uniform1f(P.u('uIrid'), mt.irid || 0);
        gl.uniform1i(P.u('uEmisAnim'), mt.emisAnim || 0); gl.uniform1f(P.u('uEmisScale'), mt.emisScale != null ? mt.emisScale : 1);
        gl.uniform1f(P.u('uHL'), n.highlight); gl.uniform3fv(P.u('uHLCol'), n.hlCol); gl.uniform1f(P.u('uPulse'), n.pulse); gl.uniform1f(P.u('uDim'), n.dim);
        gl.uniform1f(P.u('uAlpha'), n.alphaOverride != null ? n.alphaOverride : (mt.alpha != null ? mt.alpha : 1));
        if (mt.doubleSided) gl.disable(gl.CULL_FACE); else gl.enable(gl.CULL_FACE);
      } else if (mode === 'id') {
        const id = n.pickId || n.id; gl.uniform3f(P.u('uId'), (id & 255) / 255, ((id >> 8) & 255) / 255, ((id >> 16) & 255) / 255);
      }
      gl.bindVertexArray(n.mesh.vao); gl.drawElements(gl.TRIANGLES, n.mesh.count, gl.UNSIGNED_INT, 0);
    }
    _fitShadow(cam, scene) {
      const s = this.settings, K = s.keyDir, kl = Math.hypot(...K), Ld = K.map(x => x / kl);
      const ext = clamp(cam.dist * 1.5, 2.6, scene.shadowExtent || 22);
      const t = cam.target; const up = Math.abs(Ld[1]) > 0.95 ? [0, 0, 1] : [0, 1, 0];
      const eye = [t[0] + Ld[0] * 80, t[1] + Ld[1] * 80, t[2] + Ld[2] * 80];
      const view = m4.lookAt(new Float32Array(16), eye, t, up);
      // snap target to texel grid in light space to stop shimmering
      const texel = (ext * 2) / this.shadow.size;
      const ct = m4.transformPoint([0, 0, 0], view, t); ct[0] = Math.round(ct[0] / texel) * texel - ct[0]; ct[1] = Math.round(ct[1] / texel) * texel - ct[1];
      const proj = m4.ortho(new Float32Array(16), -ext + ct[0], ext + ct[0], -ext + ct[1], ext + ct[1], 20, 160);
      m4.multiply(this.lightVP, proj, view); this.shadowTexel = texel / (2 * ext) * 1.0; this.shadowWorldTexel = texel;
    }
    render(scene, cam, dt) {
      const gl = this.gl, S = this.settings, T = this.T, now = performance.now(); this.time += dt || 0;
      if (this.resize()) { /* targets rebuilt */ }
      cam.update(dt || 0.016, now); cam.updateMatrices(this.w / this.h);
      scene.root.update(null, scene.explodeT || 0);
      this._spin(scene.root, dt || 0.016);
      scene.root.update(null, scene.explodeT || 0);
      const list = []; this._collect(scene.root, list);
      const opaque = list.filter(n => (n.alphaOverride != null ? n.alphaOverride : (n.material.alpha != null ? n.material.alpha : 1)) >= 0.999);
      const trans = list.filter(n => !opaque.includes(n));
      const casters = list.filter(n => n.castShadow && n.material.alpha !== 0);

      /* shadow pass */
      const shadowOn = S.shadows && casters.length;
      if (shadowOn) {
        this._fitShadow(cam, scene);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadow.fb); gl.viewport(0, 0, this.shadow.size, this.shadow.size);
        gl.depthMask(true); gl.enable(gl.DEPTH_TEST); gl.clear(gl.DEPTH_BUFFER_BIT); gl.colorMask(false, false, false, false);
        gl.enable(gl.CULL_FACE); gl.cullFace(gl.FRONT); gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1.5, 2.0);
        gl.useProgram(this.P.depth); gl.uniformMatrix4fv(this.P.depth.u('uVP'), false, this.lightVP);
        for (const n of casters) this._drawNode(this.P.depth, n, 'depth', cam);
        gl.disable(gl.POLYGON_OFFSET_FILL); gl.cullFace(gl.BACK); gl.colorMask(true, true, true, true);
      }

      /* main pass → MSAA HDR */
      gl.bindFramebuffer(gl.FRAMEBUFFER, T.msFB); gl.viewport(0, 0, this.w, this.h);
      const bg = S.fogCol; gl.clearColor(bg[0], bg[1], bg[2], 1); gl.depthMask(true); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const P = this.P.main; gl.useProgram(P);
      gl.uniformMatrix4fv(P.u('uVP'), false, cam.vp); gl.uniform3fv(P.u('uCam'), cam.pos); gl.uniform1f(P.u('uTime'), this.time);
      gl.uniformMatrix4fv(P.u('uLightVP'), false, this.lightVP); gl.uniform1f(P.u('uShadowTexel'), shadowOn ? this.shadowWorldTexel : 0.01); gl.uniform1f(P.u('uShadowUV'), 1 / this.shadow.size); gl.uniform1f(P.u('uShadowOn'), shadowOn ? 1 : 0);
      gl.uniform3fv(P.u('uKeyDir'), S.keyDir); gl.uniform3fv(P.u('uKeyCol'), S.keyCol); gl.uniform3fv(P.u('uFillDir'), S.fillDir); gl.uniform3fv(P.u('uFillCol'), S.fillCol);
      gl.uniform3fv(P.u('uRimDir'), S.rimDir); gl.uniform3fv(P.u('uRimCol'), S.rimCol); gl.uniform3fv(P.u('uSky'), S.sky); gl.uniform3fv(P.u('uGround'), S.ground);
      gl.uniform3fv(P.u('uFogCol'), S.fogCol); gl.uniform1f(P.u('uFogDen'), S.fogDen * (scene.fogScale != null ? scene.fogScale : 1)); gl.uniform1f(P.u('uBoardY'), 0);
      gl.uniform1i(P.u('uTex'), 0); gl.uniform1i(P.u('uTex2'), 1); gl.uniform1i(P.u('uShadow'), 2);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.shadow.tex); gl.activeTexture(gl.TEXTURE0);
      gl.cullFace(gl.BACK);
      for (const n of opaque) this._drawNode(P, n, 'main', cam);
      if (trans.length) {
        trans.sort((a, b) => (b.world[14] - a.world[14]));
        gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
        for (const n of trans) this._drawNode(P, n, 'main', cam);
        gl.depthMask(true); gl.disable(gl.BLEND);
      }
      gl.enable(gl.CULL_FACE);

      /* resolve MSAA → textures */
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, T.msFB); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, T.resFB);
      gl.blitFramebuffer(0, 0, this.w, this.h, 0, 0, this.w, this.h, gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, gl.NEAREST);
      gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.bindVertexArray(this.emptyVAO);

      /* SSAO (half-res) */
      const aoOn = S.ao > 0;
      if (aoOn) {
        const A = this.P.ssao; gl.useProgram(A); gl.bindFramebuffer(gl.FRAMEBUFFER, T.aoFA); gl.viewport(0, 0, T.hw, T.hh);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, T.depth); gl.uniform1i(A.u('uDepth'), 0);
        const th = Math.tan(cam.fov / 2);
        gl.uniform2f(A.u('uTexel'), 1 / T.hw, 1 / T.hh); gl.uniform2f(A.u('uProj'), th, th); gl.uniform1f(A.u('uAspectTan'), th * cam.aspect);
        gl.uniform1f(A.u('uNear'), cam.near); gl.uniform1f(A.u('uFar'), cam.far); gl.uniform1f(A.u('uRadius'), clamp(cam.dist * 0.07, 0.06, 1.4));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        const B = this.P.aoblur; gl.useProgram(B); gl.bindFramebuffer(gl.FRAMEBUFFER, T.aoFB);
        gl.bindTexture(gl.TEXTURE_2D, T.aoA); gl.uniform1i(B.u('uAO'), 0); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, T.depth); gl.uniform1i(B.u('uDepth'), 1); gl.activeTexture(gl.TEXTURE0);
        gl.uniform2f(B.u('uTexel'), 1 / T.hw, 1 / T.hh); gl.uniform1f(B.u('uNear'), cam.near); gl.uniform1f(B.u('uFar'), cam.far);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

      /* bloom */
      const bl = T.bloom;
      gl.useProgram(this.P.bright); gl.bindFramebuffer(gl.FRAMEBUFFER, bl[0].fb); gl.viewport(0, 0, bl[0].w, bl[0].h);
      gl.bindTexture(gl.TEXTURE_2D, T.scene); gl.uniform1i(this.P.bright.u('uSrc'), 0); gl.uniform1f(this.P.bright.u('uThresh'), S.bloomThresh); gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.useProgram(this.P.down); gl.uniform1i(this.P.down.u('uSrc'), 0);
      for (let i = 1; i < bl.length; i++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, bl[i].fb); gl.viewport(0, 0, bl[i].w, bl[i].h); gl.bindTexture(gl.TEXTURE_2D, bl[i - 1].tex);
        gl.uniform2f(this.P.down.u('uTexel'), 1 / bl[i - 1].w, 1 / bl[i - 1].h); gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      gl.useProgram(this.P.up); gl.uniform1i(this.P.up.u('uSrc'), 0); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      for (let i = bl.length - 2; i >= 0; i--) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, bl[i].fb); gl.viewport(0, 0, bl[i].w, bl[i].h); gl.bindTexture(gl.TEXTURE_2D, bl[i + 1].tex);
        gl.uniform2f(this.P.up.u('uTexel'), 1 / bl[i + 1].w, 1 / bl[i + 1].h); gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      gl.disable(gl.BLEND);

      /* composite to screen */
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.w, this.h);
      const C = this.P.comp; gl.useProgram(C);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, T.scene); gl.uniform1i(C.u('uScene'), 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, bl[0].tex); gl.uniform1i(C.u('uBloom'), 1);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, T.aoB); gl.uniform1i(C.u('uAO'), 2);
      gl.uniform1f(C.u('uBloomK'), S.bloom); gl.uniform1f(C.u('uExposure'), S.exposure); gl.uniform1f(C.u('uFade'), S.fade); gl.uniform1f(C.u('uAOk'), aoOn ? S.ao : 0);
      gl.uniform1f(C.u('uTime'), this.time % 10); gl.uniform2f(C.u('uRes'), this.w, this.h); gl.uniform1f(C.u('uAber'), S.aber);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.activeTexture(gl.TEXTURE0); gl.bindVertexArray(null);
      this.stats = { nodes: list.length, w: this.w, h: this.h };
    }
    _spin(node, dt) {
      if (node.spin) node.rot[node.spin.axis === 'x' ? 0 : node.spin.axis === 'z' ? 2 : 1] += node.spin.speed * dt;
      for (const c of node.children) this._spin(c, dt);
    }
    /** Returns the node under CSS-pixel (x,y), or null. Renders an ID pass at half resolution. */
    pick(scene, cam, cssX, cssY) {
      const gl = this.gl, T = this.T; const list = []; this._collect(scene.root, list);
      gl.bindFramebuffer(gl.FRAMEBUFFER, T.pickFB); gl.viewport(0, 0, T.pw, T.ph);
      gl.clearColor(0, 0, 0, 0); gl.depthMask(true); gl.enable(gl.DEPTH_TEST); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.CULL_FACE);
      const P = this.P.id; gl.useProgram(P); gl.uniformMatrix4fv(P.u('uVP'), false, cam.vp);
      const byId = new Map();
      for (const n of list) { if (!n.pickable || (n.alphaOverride != null && n.alphaOverride < 0.05)) continue; this._drawNode(P, n, 'id', cam); byId.set(n.pickId || n.id, n); }
      const rx = clamp(Math.floor(cssX / this.canvas.clientWidth * T.pw), 0, T.pw - 1), ry = clamp(Math.floor((1 - cssY / this.canvas.clientHeight) * T.ph), 0, T.ph - 1);
      const px = new Uint8Array(4); gl.readPixels(rx, ry, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      const id = px[0] | (px[1] << 8) | (px[2] << 16); return id ? byId.get(id) || null : null;
    }
    readPixelsPNG() { return this.canvas.toDataURL('image/png'); }
  }

  global.ITM_GL.Engine = { Renderer, Node, OrbitCamera, normalMat };
})(typeof window !== 'undefined' ? window : globalThis);
