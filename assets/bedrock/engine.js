/* ═══════════════════════════════════════════════════════════════════════
   BEDROCK STUDIO — Moteur 3D & Géométrie Bedrock
   -----------------------------------------------------------------------
   - Modèle de géométrie (bones / cubes) au format Minecraft Bedrock
   - Rendu 3D logiciel interactif sur <canvas> (projection + faces triées)
   - Générateur de texture par disposition UV "boîte" Bedrock
   - Système d'échelle avec Steve comme référence de taille
   - Export geometry.json + animations
   ═══════════════════════════════════════════════════════════════════════ */
(function (global) {
'use strict';

// ── Maths affines (rotation 3x3 + translation) ────────────────────────────
const D2R = Math.PI / 180;

function rotMat(rx, ry, rz) {
  const cx = Math.cos(rx * D2R), sx = Math.sin(rx * D2R);
  const cy = Math.cos(ry * D2R), sy = Math.sin(ry * D2R);
  const cz = Math.cos(rz * D2R), sz = Math.sin(rz * D2R);
  // R = Rz * Ry * Rx  (X appliqué en premier)
  const Rx = [1,0,0, 0,cx,-sx, 0,sx,cx];
  const Ry = [cy,0,sy, 0,1,0, -sy,0,cy];
  const Rz = [cz,-sz,0, sz,cz,0, 0,0,1];
  return mul3(Rz, mul3(Ry, Rx));
}
function mul3(a, b) {
  const r = new Array(9);
  for (let i=0;i<3;i++) for (let j=0;j<3;j++)
    r[i*3+j] = a[i*3]*b[j] + a[i*3+1]*b[3+j] + a[i*3+2]*b[6+j];
  return r;
}
function apply3(m, v) {
  return [ m[0]*v[0]+m[1]*v[1]+m[2]*v[2],
           m[3]*v[0]+m[4]*v[1]+m[5]*v[2],
           m[6]*v[0]+m[7]*v[1]+m[8]*v[2] ];
}
// Affine : { r:mat3, t:vec3 }  →  p' = r·p + t
function affine(r, t){ return { r, t }; }
function identity(){ return affine([1,0,0,0,1,0,0,0,1],[0,0,0]); }
function composeA(a, b){ // applique a APRÈS b : p → a(b(p))
  const r = mul3(a.r, b.r);
  const t = [ a.r[0]*b.t[0]+a.r[1]*b.t[1]+a.r[2]*b.t[2]+a.t[0],
              a.r[3]*b.t[0]+a.r[4]*b.t[1]+a.r[5]*b.t[2]+a.t[1],
              a.r[6]*b.t[0]+a.r[7]*b.t[1]+a.r[8]*b.t[2]+a.t[2] ];
  return affine(r, t);
}
function applyA(a, p){
  return [ a.r[0]*p[0]+a.r[1]*p[1]+a.r[2]*p[2]+a.t[0],
           a.r[3]*p[0]+a.r[4]*p[1]+a.r[5]*p[2]+a.t[1],
           a.r[6]*p[0]+a.r[7]*p[1]+a.r[8]*p[2]+a.t[2] ];
}
// Rotation autour d'un pivot en espace modèle
function pivotRot(pivot, rot){
  const R = rotMat(rot[0], rot[1], rot[2]);
  const Rp = apply3(R, pivot);
  return affine(R, [ pivot[0]-Rp[0], pivot[1]-Rp[1], pivot[2]-Rp[2] ]);
}

// ── Transformations hiérarchiques des os ──────────────────────────────────
// Calcule la matrice monde de chaque os (en tenant compte des parents + pose)
function computeBoneWorld(bones, pose){
  const byName = {}; bones.forEach(b => byName[b.name] = b);
  const cache = {};
  function world(name){
    if (cache[name]) return cache[name];
    const b = byName[name];
    if (!b) return identity();
    const baseRot = b.rotation || [0,0,0];
    const p = (pose && pose[name]) || [0,0,0];
    const rot = [ baseRot[0]+p[0], baseRot[1]+p[1], baseRot[2]+p[2] ];
    let local = (rot[0]||rot[1]||rot[2]) ? pivotRot(b.pivot||[0,0,0], rot) : identity();
    // décalage de position optionnel (animations de translation)
    const off = (pose && pose['@'+name]) ;
    if (off) local = composeA(affine([1,0,0,0,1,0,0,0,1], off), local);
    const parent = b.parent ? world(b.parent) : identity();
    cache[name] = composeA(parent, local);
    return cache[name];
  }
  bones.forEach(b => world(b.name));
  return cache;
}

// ── Rendu 3D logiciel ─────────────────────────────────────────────────────
// faces d'un cube : [ [idx corners], normal, faceKey ]
const CUBE_FACES = [
  [[0,1,2,3], [0,0,-1], 'north'],
  [[5,4,7,6], [0,0, 1], 'south'],
  [[4,0,3,7], [-1,0,0], 'west'],
  [[1,5,6,2], [1,0,0],  'east'],
  [[4,5,1,0], [0,-1,0], 'up'],
  [[3,2,6,7], [0,1,0],  'down'],
];
// réordonne les coins d'une face en espace texture : [TL, TR, BR, BL]
const FACE_TEX_ORDER = { north:[1,0,3,2], south:[1,0,3,2], west:[0,1,2,3], east:[0,1,2,3], up:[3,2,1,0], down:[3,2,1,0] };
// dimensions texture (w,h) d'une face selon la taille du cube
function faceTexDims(size, key){
  const [sx,sy,sz] = size;
  if (key==='north'||key==='south') return [sx,sy];
  if (key==='west'||key==='east')   return [sz,sy];
  return [sx,sz]; // up / down
}

function cubeCorners(origin, size, inflate){
  const inf = inflate || 0;
  const x0 = origin[0]-inf, y0 = origin[1]-inf, z0 = origin[2]-inf;
  const x1 = origin[0]+size[0]+inf, y1 = origin[1]+size[1]+inf, z1 = origin[2]+size[2]+inf;
  return [
    [x0,y1,z0],[x1,y1,z0],[x1,y0,z0],[x0,y0,z0], // 0-3 arrière (z0)
    [x0,y1,z1],[x1,y1,z1],[x1,y0,z1],[x0,y0,z1], // 4-7 avant  (z1)
  ];
}

function shade(color, f){
  // f : facteur de luminosité 0..1.4
  const c = hexToRgb(color);
  const r = Math.max(0, Math.min(255, Math.round(c.r*f)));
  const g = Math.max(0, Math.min(255, Math.round(c.g*f)));
  const b = Math.max(0, Math.min(255, Math.round(c.b*f)));
  return `rgb(${r},${g},${b})`;
}
function hexToRgb(hex){
  hex = (hex||'#888888').replace('#','');
  if (hex.length===3) hex = hex.split('').map(c=>c+c).join('');
  return { r:parseInt(hex.slice(0,2),16), g:parseInt(hex.slice(2,4),16), b:parseInt(hex.slice(4,6),16) };
}

// Rendu principal
function renderModel(canvas, model, opts){
  opts = opts || {};
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  const bones = model.bones || [];
  const world = computeBoneWorld(bones, opts.pose);

  // Rotation caméra
  const camR = mul3(rotMat(opts.rotX||0, 0, 0), rotMat(0, opts.rotY||0, 0));

  // Collecte des faces
  const faces = [];
  const lightDir = normalize([-0.4, -0.9, -0.5]);
  let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9,minZ=1e9,maxZ=-1e9;
  const projected = []; // stocke pour bbox

  function collectFaces(cubes, boneWorld, defColor){
    (cubes||[]).forEach(cube => {
      if (cube.hidden) return;
      const corners = cubeCorners(cube.origin, cube.size, cube.inflate);
      // en monde puis caméra
      const cam = corners.map(p => {
        const w = applyA(boneWorld, p);
        const c = apply3(camR, w);
        minX=Math.min(minX,c[0]);maxX=Math.max(maxX,c[0]);
        minY=Math.min(minY,c[1]);maxY=Math.max(maxY,c[1]);
        minZ=Math.min(minZ,c[2]);maxZ=Math.max(maxZ,c[2]);
        return c;
      });
      const isSel = opts.sel && cube._pick && cube._pick.bone===opts.sel.bone && cube._pick.ci===opts.sel.ci;
      const uvSize = cube._uvSize || cube.size;
      CUBE_FACES.forEach(([idx, n, key]) => {
        const nc = apply3(camR, apply3(boneWorld.r, n));
        // culling arrière léger : on garde tout mais on trie par profondeur
        const pts = idx.map(i => cam[i]);
        const depth = (pts[0][2]+pts[1][2]+pts[2][2]+pts[3][2])/4;
        const light = 0.55 + 0.75 * Math.max(0, -dot(normalize(nc), lightDir));
        const col = (cube.faceColors && cube.faceColors[key]) || cube.color || defColor || '#9aa8b8';
        faces.push({ pts, depth, col, light, alpha: cube.alpha, pick: cube._pick, isSel,
          faceKey: key, texDims: faceTexDims(uvSize, key), mat: cube.mat,
          paint: cube.paint && cube.paint[key] });
      });
    });
  }

  // l'os "blood" est un effet de combat (sang sur la lame) : masqué dans l'aperçu,
  // il n'apparaît qu'en jeu au moment du coup via l'animation.
  bones.forEach(b => { if (b.name==='blood') return; collectFaces(b.cubes, world[b.name], b.color); });

  // échelle & centrage
  const spanX = maxX-minX, spanY = maxY-minY;
  const pad = 0.86;
  const scale = Math.min(W/(spanX||1), H/(spanY||1)) * pad * (opts.zoom||1);
  const cx = (minX+maxX)/2, cy = (minY+maxY)/2;
  const ox = W/2, oy = H/2;
  function project(p){ return [ ox + (p[0]-cx)*scale, oy - (p[1]-cy)*scale ]; }

  // sol / ombre
  if (opts.ground !== false){
    const gy = oy - (minY - cy)*scale;
    const gx = ox;
    ctx.save();
    ctx.globalAlpha = 0.20;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(gx, gy, spanX*scale*0.42, spanX*scale*0.14, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  // Steve de référence
  if (opts.steve){
    drawSteve(ctx, camR, project, scale, model._steveOffsetX || (spanX*0.62), opts);
  }

  faces.sort((a,b)=> a.depth - b.depth);
  if (opts.pickStore) opts.pickStore.length = 0;
  faces.forEach(f => {
    const p = f.pts.map(project);
    ctx.beginPath();
    ctx.moveTo(p[0][0],p[0][1]);
    for (let i=1;i<4;i++) ctx.lineTo(p[i][0],p[i][1]);
    ctx.closePath();
    ctx.globalAlpha = (f.alpha!=null?f.alpha:1);
    if (f.mat === 'metal'){
      // dégradé métallique : reflet en haut, creux sombre, liseré brillant en bas
      const xs=p.map(q=>q[0]), ys=p.map(q=>q[1]);
      const x0=Math.min.apply(null,xs), y0=Math.min.apply(null,ys);
      const x1=Math.max.apply(null,xs), y1=Math.max.apply(null,ys);
      const g=ctx.createLinearGradient(x0,y0,x0+(x1-x0)*0.35,y1);
      g.addColorStop(0,   shade(f.col, Math.min(1.45, f.light*1.28+0.12)));
      g.addColorStop(0.38, shade(f.col, f.light*1.0));
      g.addColorStop(0.72, shade(f.col, f.light*0.7));
      g.addColorStop(0.92, shade(f.col, f.light*0.88));
      g.addColorStop(1,   shade(f.col, Math.min(1.35, f.light*1.12)));
      ctx.fillStyle=g;
    } else {
      ctx.fillStyle = shade(f.col, f.light);
    }
    ctx.fill();
    ctx.globalAlpha = 1;
    // pixels peints : sous-quadrilatères interpolés sur la face (WYSIWYG avec la texture)
    if (f.paint){
      const ord = FACE_TEX_ORDER[f.faceKey];
      const TL=p[ord[0]], TR=p[ord[1]], BL=p[ord[3]];
      const ax=TR[0]-TL[0], ay=TR[1]-TL[1], bx=BL[0]-TL[0], by=BL[1]-TL[1];
      const [w,h]=f.texDims;
      ctx.globalAlpha = (f.alpha!=null?f.alpha:1);
      for (const k in f.paint){
        const ci=k.indexOf(','), px=+k.slice(0,ci), py=+k.slice(ci+1);
        if (px>=Math.ceil(w)||py>=Math.ceil(h)) continue;
        const u0=px/w, v0=py/h, u1=Math.min((px+1)/w,1), v1=Math.min((py+1)/h,1);
        ctx.beginPath();
        ctx.moveTo(TL[0]+u0*ax+v0*bx, TL[1]+u0*ay+v0*by);
        ctx.lineTo(TL[0]+u1*ax+v0*bx, TL[1]+u1*ay+v0*by);
        ctx.lineTo(TL[0]+u1*ax+v1*bx, TL[1]+u1*ay+v1*by);
        ctx.lineTo(TL[0]+u0*ax+v1*bx, TL[1]+u0*ay+v1*by);
        ctx.closePath();
        ctx.fillStyle = shade(f.paint[k], f.light);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.stroke();
    if (f.isSel){
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = '#e8c878';
      ctx.stroke();
    }
    if (opts.pickStore) opts.pickStore.push({ poly:p, pick:f.pick, faceKey:f.faceKey, texDims:f.texDims });
  });
}

// localise le pixel de texture touché : { pick, faceKey, px, py, dims }
function paintHit(pickStore, x, y){
  for (let i = pickStore.length - 1; i >= 0; i--){
    const f = pickStore[i];
    if (!f.pick || !pointInPoly(f.poly, x, y)) continue;
    const ord = FACE_TEX_ORDER[f.faceKey];
    const TL=f.poly[ord[0]], TR=f.poly[ord[1]], BL=f.poly[ord[3]];
    const ax=TR[0]-TL[0], ay=TR[1]-TL[1], bx=BL[0]-TL[0], by=BL[1]-TL[1];
    const det = ax*by - ay*bx;
    if (Math.abs(det) < 1e-6) return null;
    const dx=x-TL[0], dy=y-TL[1];
    const s=(dx*by - dy*bx)/det, t=(ax*dy - ay*dx)/det;
    if (s<0||s>1||t<0||t>1) continue;
    const [w,h]=f.texDims;
    return { pick:f.pick, faceKey:f.faceKey, dims:[w,h],
      px:Math.min(Math.ceil(w)-1, Math.floor(s*w)),
      py:Math.min(Math.ceil(h)-1, Math.floor(t*h)) };
  }
  return null;
}

// test point-dans-polygone (pour le picking au clic)
function pickAtPoint(pickStore, x, y){
  for (let i = pickStore.length - 1; i >= 0; i--){
    const f = pickStore[i];
    if (f.pick && pointInPoly(f.poly, x, y)) return f.pick;
  }
  return null;
}
function pointInPoly(poly, x, y){
  let inside = false;
  for (let i=0, j=poly.length-1; i<poly.length; j=i++){
    const xi=poly[i][0], yi=poly[i][1], xj=poly[j][0], yj=poly[j][1];
    if (((yi>y)!==(yj>y)) && (x < (xj-xi)*(y-yi)/(yj-yi)+xi)) inside = !inside;
  }
  return inside;
}

// Steve de référence (humanoïde gris translucide) à côté du modèle
function drawSteve(ctx, camR, project, scale, offX, opts){
  const parts = STEVE_PARTS;
  const faces = [];
  parts.forEach(part => {
    const corners = cubeCorners([part.o[0]+offX, part.o[1], part.o[2]], part.s, 0);
    const cam = corners.map(p => apply3(camR, p));
    CUBE_FACES.forEach(([idx, n]) => {
      const nc = apply3(camR, n);
      const pts = idx.map(i => cam[i]);
      const depth = (pts[0][2]+pts[1][2]+pts[2][2]+pts[3][2])/4;
      const light = 0.5 + 0.6*Math.max(0, -dot(normalize(nc), normalize([-0.4,-0.9,-0.5])));
      faces.push({ pts, depth, light });
    });
  });
  faces.sort((a,b)=>a.depth-b.depth);
  ctx.save();
  faces.forEach(f => {
    const p = f.pts.map(project);
    ctx.beginPath(); ctx.moveTo(p[0][0],p[0][1]);
    for (let i=1;i<4;i++) ctx.lineTo(p[i][0],p[i][1]);
    ctx.closePath();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = shade('#5b7fa6', f.light);
    ctx.fill();
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 0.5; ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.stroke();
  });
  ctx.restore();
}
// Steve ≈ 32 unités de haut = 1.8 bloc de référence
const STEVE_PARTS = [
  { o:[-4,24,-2], s:[8,8,8] },   // tête
  { o:[-4,12,-2], s:[8,12,4] },  // torse
  { o:[-6,12,-2], s:[2,12,4] },  // bras g (approché)
  { o:[4,12,-2],  s:[2,12,4] },  // bras d
  { o:[-4,0,-2],  s:[3,12,4] },  // jambe g
  { o:[1,0,-2],   s:[3,12,4] },  // jambe d
];

function dot(a,b){ return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
function normalize(v){ const l=Math.hypot(v[0],v[1],v[2])||1; return [v[0]/l,v[1]/l,v[2]/l]; }

// ── Générateur de texture (atlas UV boîte Bedrock) ────────────────────────
function faceRect(uv, size){
  const [u,v]=uv, [w,h,d]=size;
  return {
    up:    [u+d,     v,     w, d],
    down:  [u+d+w,   v,     w, d],
    west:  [u,       v+d,   d, h],
    north: [u+d,     v+d,   w, h],
    east:  [u+d+w,   v+d,   d, h],
    south: [u+d+w+d, v+d,   w, h],
  };
}
// Génère un PNG (dataURL base64) depuis les couleurs des cubes
function generateTexture(model){
  const tw = (model.texture_size && model.texture_size[0]) || 64;
  const th = (model.texture_size && model.texture_size[1]) || 64;
  // densité 4 : le PNG fait 4 px par unité de texture (Bedrock mappe les UV
  // proportionnellement) — les yeux, liserés et rivets < 1 unité restent nets
  const D = 4;
  const c = document.createElement('canvas');
  c.width = tw*D; c.height = th*D;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.scale(D, D);
  const shadeF = { up:1.18, down:0.72, north:1.0, south:0.9, west:0.82, east:0.95 };
  (model.bones||[]).forEach(b => (b.cubes||[]).forEach(cube => {
    if (!cube.uv || cube.mirrorSkip) return;
    const rects = faceRect(cube.uv, cube.size);
    Object.keys(rects).forEach(face => {
      const [x,y,w,h] = rects[face];
      if (w<=0||h<=0) return;
      const base = (cube.faceColors && cube.faceColors[face]) || cube.color || b.color || '#9aa8b8';
      if (cube.mat === 'metal'){
        // métal : dégradé vertical (reflet haut, creux, liseré bas) + brossage
        const hh = Math.max(1, Math.round(h));
        for (let py=0; py<hh; py++){
          const t = hh<2 ? 0.3 : py/(hh-1);
          let f2 = 1.32 - t*0.72;
          if (py===0) f2 = 1.55;
          else if (hh>3 && py===1) f2 = 1.4;
          else if (py===hh-1) f2 = 1.1;      // liseré de bord
          else if (hh>3 && py===hh-2) f2 = 0.5;
          ctx.fillStyle = shade(base, shadeF[face]*f2);
          ctx.fillRect(x, y+py, w, 1);
        }
        // stries de brossage discrètes
        const ww = Math.max(1, Math.round(w));
        for (let px=0; px<ww; px+=3){
          ctx.fillStyle = 'rgba(255,255,255,0.07)';
          ctx.fillRect(x+px, y, 1, hh);
        }
        ctx.fillStyle='rgba(0,0,0,0)';
      } else {
        ctx.fillStyle = shade(base, shadeF[face]);
        ctx.fillRect(x, y, w, h);
      }
      // légère variation "pixel" pour un rendu moins plat
      if (cube.mat !== 'metal' && cube.noise !== false){
        const rgb = hexToRgb(base);
        for (let py=0;py<h;py++) for (let px=0;px<w;px++){
          if (((px*7+py*13)%5)===0){
            const d = ((px+py)%2? -12:10);
            ctx.fillStyle = `rgba(${clamp(rgb.r*shadeF[face]+d)},${clamp(rgb.g*shadeF[face]+d)},${clamp(rgb.b*shadeF[face]+d)},1)`;
            ctx.fillRect(x+px, y+py, 1, 1);
          }
        }
      }
    });
    // détails custom (yeux, motifs) dessinés par-dessus
    if (cube.decals) cube.decals.forEach(dc => {
      ctx.fillStyle = dc.color;
      ctx.fillRect(dc.x, dc.y, dc.w, dc.h);
    });
    // pixels peints à la main (pinceau 3D)
    if (cube.paint){
      Object.keys(cube.paint).forEach(face => {
        const [x,y,w,h] = rects[face] || [];
        if (w==null) return;
        const entries = cube.paint[face];
        for (const k in entries){
          const ci=k.indexOf(','), px=+k.slice(0,ci), py=+k.slice(ci+1);
          if (px>=Math.ceil(w)||py>=Math.ceil(h)) continue;
          ctx.fillStyle = entries[k];
          ctx.fillRect(Math.floor(x)+px, Math.floor(y)+py, 1, 1);
        }
      });
    }
  }));
  return c.toDataURL('image/png').split(',')[1];
}
function clamp(n){ return Math.max(0,Math.min(255,Math.round(n))); }

// ── Export geometry.json Bedrock ──────────────────────────────────────────
function toGeometryJSON(model, identifier){
  const bones = (model.bones||[]).map(b => {
    const out = { name: b.name, pivot: b.pivot || [0,0,0] };
    if (b.parent) out.parent = b.parent;
    if (b.rotation && (b.rotation[0]||b.rotation[1]||b.rotation[2])) out.rotation = b.rotation;
    if (b.mirror) out.mirror = true;
    if (b.locators) out.locators = b.locators;
    if (b.cubes && b.cubes.length){
      out.cubes = b.cubes.filter(cu=>!cu.previewOnly).map(cu => {
        // UV PAR FACE : chaque face déclare exactement son rectangle de
        // texture (aucun arrondi Bedrock, tailles fractionnaires fidèles).
        // Les rectangles sont ceux que generateTexture peint → couverture
        // garantie à 100 %, en jeu comme dans l'aperçu.
        const rects = faceRect(cu.uv || [0,0], cu.size);
        const uv = {};
        Object.keys(rects).forEach(f => {
          const [u,v,w,h] = rects[f];
          uv[f] = { uv: [u, v], uv_size: [w, h] };
        });
        const cube = { origin: cu.origin, size: cu.size, uv };
        if (cu.inflate) cube.inflate = cu.inflate;
        return cube;
      });
    }
    return out;
  });
  const th = model.texture_size ? model.texture_size[1] : 64;
  const tw = model.texture_size ? model.texture_size[0] : 64;
  return {
    format_version: '1.16.0',
    'minecraft:geometry': [{
      description: {
        identifier: identifier,
        texture_width: tw,
        texture_height: th,
        visible_bounds_width: 4,
        visible_bounds_height: 4,
        visible_bounds_offset: [0, 1, 0],
      },
      bones,
    }],
  };
}

// ── Export animations Bedrock ─────────────────────────────────────────────
// anims : { idle:{...}, walk:{...}, attack:{...} } (déjà au format Bedrock bones)
function toAnimationJSON(namespace, id, anims){
  const out = {};
  Object.keys(anims||{}).forEach(name => {
    const a = anims[name];
    out[`animation.${id}.${name}`] = a;
  });
  return { format_version: '1.8.0', animations: out };
}

// hauteur du modèle en blocs (pour l'échelle vs Steve)
function modelHeightBlocks(model, sizeScale){
  let maxY = 0;
  (model.bones||[]).forEach(b => (b.cubes||[]).forEach(cu => {
    maxY = Math.max(maxY, cu.origin[1] + cu.size[1]);
  }));
  return (maxY / 16) * (sizeScale||1);
}

// clonage profond d'un modèle template
function cloneModel(m){ return JSON.parse(JSON.stringify(m)); }

// ── Packer UV automatique ─────────────────────────────────────────────────
// Assigne un uv non-chevauchant à chaque cube et ajuste texture_size
function autoUV(model){
  const cubes = [];
  (model.bones||[]).forEach(b => (b.cubes||[]).forEach(cu => { if(!cu.previewOnly) cubes.push(cu); }));
  // largeur/hauteur occupée par le patron "boîte" de chaque cube
  const boxes = cubes.map(cu => {
    const [w,h,d] = cu.size;
    // arrondi à l'entier supérieur : chaque patron occupe des pixels entiers
    return { cu, bw: Math.ceil(2*d + 2*w), bh: Math.ceil(d + h) };
  });
  // trie par hauteur décroissante pour un packing simple par rangées
  boxes.sort((a,b)=> b.bh - a.bh);
  let atlasW = 64;
  // estime une largeur d'atlas correcte
  const totalArea = boxes.reduce((s,b)=> s + b.bw*b.bh, 0);
  atlasW = Math.max(64, nextPow2(Math.ceil(Math.sqrt(totalArea*1.6))));
  let x=0, y=0, rowH=0, maxY=0;
  boxes.forEach(b => {
    if (x + b.bw > atlasW){ x=0; y += rowH + 1; rowH=0; }
    b.cu.uv = [x, y];
    x += b.bw + 1;
    rowH = Math.max(rowH, b.bh);
    maxY = Math.max(maxY, y + b.bh);
  });
  model.texture_size = [ atlasW, nextPow2(maxY) ];
  return model;
}
function nextPow2(n){ let p=16; while(p<n) p*=2; return p; }

// ── Animations génériques (selon la convention de nommage des os) ──────────
function classifyBone(name){
  const n = name.toLowerCase();
  if (n.includes('wing')) return 'wing';
  if (n.includes('tail')) return 'tail';
  if (n.includes('head') || n.includes('jaw')) return 'head';
  if (n.includes('leg') || n.includes('arm') || n.includes('limb')) return 'limb';
  return 'body';
}
function limbSide(name){ // gauche/droite pour alterner
  const n = name.toLowerCase();
  if (/(_?r$|right|_fr|_br|arm_r|leg_r|1$|3$|5$|7$)/.test(n)) return 1;
  return -1;
}

// pose de prévisualisation (retourne { boneName:[rx,ry,rz] })
function poseAt(model, anim, t){
  const pose = {};
  if (anim === 'none') return pose;
  const bones = model.bones||[];
  bones.forEach(b => {
    const kind = classifyBone(b.name);
    const side = limbSide(b.name);
    if (anim === 'idle'){
      if (kind==='wing') pose[b.name] = [0,0, Math.sin(t*2.2)*18*side ];
      else if (kind==='tail') pose[b.name] = [0, Math.sin(t*1.6)*8, 0];
      else if (kind==='head') pose[b.name] = [Math.sin(t*1.2)*4, Math.sin(t*0.9)*5, 0];
      else if (kind==='body') pose[b.name] = ['@'+b.name] && [0,0,0];
    } else if (anim === 'walk'){
      if (kind==='limb') pose[b.name] = [ Math.sin(t*4)*32*side, 0, 0 ];
      else if (kind==='wing') pose[b.name] = [0,0, Math.sin(t*3)*20*side ];
      else if (kind==='tail') pose[b.name] = [0, Math.sin(t*4)*14, 0];
      else if (kind==='head') pose[b.name] = [Math.sin(t*4)*3,0,0];
    } else if (anim === 'attack'){
      const p = (Math.sin(t*5)+1)/2;
      if (kind==='head') pose[b.name] = [ -28*p, 0, 0 ];
      else if (kind==='limb' && side>0) pose[b.name] = [ -55*p, 0, 0 ];
      else if (kind==='wing') pose[b.name] = [0,0, (40+Math.sin(t*6)*15)*side ];
      else if (kind==='tail') pose[b.name] = [0, Math.sin(t*6)*20, 0];
    } else if (anim === 'fly'){
      if (kind==='wing') pose[b.name] = [0,0, Math.sin(t*4.5)*45*side ];
      else if (kind==='tail') pose[b.name] = [Math.sin(t*3)*10,0,0];
      else if (kind==='limb') pose[b.name] = [ 35, 0, 0 ];
    } else if (anim === 'run'){
      if (kind==='limb') pose[b.name] = [ Math.sin(t*7)*52*side, 0, 0 ];
      else if (kind==='wing') pose[b.name] = [0,0, (25+Math.sin(t*7)*10)*side ];
      else if (kind==='tail') pose[b.name] = [ 12+Math.sin(t*7)*5, Math.sin(t*3.5)*8, 0 ];
      else if (kind==='head') pose[b.name] = [ 8+Math.sin(t*7)*2, 0, 0 ];
      else if (kind==='body') pose['@'+b.name] = [0, Math.abs(Math.sin(t*7))*0.9, 0];
    } else if (anim === 'roar'){
      const ph = (t%2.4)/2.4;
      const up = ph<0.2 ? ph/0.2 : ph>0.8 ? (1-ph)/0.2 : 1;   // monte, tient, redescend
      const shake = (ph>0.25&&ph<0.75) ? Math.sin(t*30)*4 : 0;
      if (kind==='head') pose[b.name] = [ -38*up, shake, 0 ];
      else if (kind==='wing') pose[b.name] = [0,0, 55*up*side ];
      else if (kind==='tail') pose[b.name] = [ 15*up, Math.sin(t*10)*12*up, 0 ];
      else if (kind==='limb' && side>0) pose[b.name] = [ -25*up, 0, 0 ];
      else if (kind==='body') pose[b.name] = [ -8*up, 0, 0 ];
    } else if (anim === 'sleep'){
      const br = Math.sin(t*1.1); // respiration lente
      if (kind==='head') pose[b.name] = [ 26+br*2, 12, 8 ];
      else if (kind==='wing') pose[b.name] = [0,0, -6*side ];
      else if (kind==='tail') pose[b.name] = [ 0, 30, 0 ];
      else if (kind==='limb') pose[b.name] = [ 12*side, 0, 0 ];
      else if (kind==='body'){ pose[b.name]=[0,0,br*1.2]; pose['@'+b.name]=[0,-1+br*0.15,0]; }
    }
  });
  // léger flottement vertical pour les créatures volantes/magiques
  return pose;
}

// construit des animations Bedrock exportables à partir des os
function buildAnimations(model){
  const bones = model.bones||[];
  const idle = { loop:true, animation_length:2.0, bones:{} };
  const walk = { loop:true, animation_length:1.0, bones:{} };
  const attack = { loop:false, animation_length:0.6, bones:{} };
  const run = { loop:true, animation_length:0.6, bones:{} };
  const roar = { loop:false, animation_length:1.6, bones:{} };
  const sleep = { loop:true, animation_length:4.0, bones:{} };
  bones.forEach(b => {
    const kind = classifyBone(b.name);
    const side = limbSide(b.name);
    if (kind==='wing'){
      idle.bones[b.name] = { rotation: { '0.0':[0,0,0], '1.0':[0,0,18*side], '2.0':[0,0,0] } };
      walk.bones[b.name] = { rotation: { '0.0':[0,0,0], '0.5':[0,0,22*side], '1.0':[0,0,0] } };
      run.bones[b.name]  = { rotation: { '0.0':[0,0,25*side], '0.3':[0,0,40*side], '0.6':[0,0,25*side] } };
      roar.bones[b.name] = { rotation: { '0.0':[0,0,0], '0.4':[0,0,55*side], '1.2':[0,0,55*side], '1.6':[0,0,0] } };
      sleep.bones[b.name]= { rotation: { '0.0':[0,0,-6*side], '4.0':[0,0,-6*side] } };
    } else if (kind==='tail'){
      idle.bones[b.name] = { rotation: { '0.0':[0,0,0], '1.0':[0,8,0], '2.0':[0,0,0] } };
      walk.bones[b.name] = { rotation: { '0.0':[0,-12,0], '0.5':[0,12,0], '1.0':[0,-12,0] } };
      run.bones[b.name]  = { rotation: { '0.0':[12,-10,0], '0.3':[16,10,0], '0.6':[12,-10,0] } };
      roar.bones[b.name] = { rotation: { '0.0':[0,0,0], '0.4':[15,12,0], '0.8':[15,-12,0], '1.2':[15,12,0], '1.6':[0,0,0] } };
      sleep.bones[b.name]= { rotation: { '0.0':[0,30,0], '2.0':[0,34,0], '4.0':[0,30,0] } };
    } else if (kind==='limb'){
      walk.bones[b.name] = { rotation: { '0.0':[30*side,0,0], '0.5':[-30*side,0,0], '1.0':[30*side,0,0] } };
      run.bones[b.name]  = { rotation: { '0.0':[50*side,0,0], '0.3':[-50*side,0,0], '0.6':[50*side,0,0] } };
      sleep.bones[b.name]= { rotation: { '0.0':[12*side,0,0], '4.0':[12*side,0,0] } };
      if (side>0){
        attack.bones[b.name] = { rotation: { '0.0':[0,0,0], '0.2':[-60,0,0], '0.6':[0,0,0] } };
        roar.bones[b.name]   = { rotation: { '0.0':[0,0,0], '0.4':[-25,0,0], '1.2':[-25,0,0], '1.6':[0,0,0] } };
      }
    } else if (kind==='head'){
      idle.bones[b.name] = { rotation: { '0.0':[0,0,0], '1.0':[3,4,0], '2.0':[0,0,0] } };
      attack.bones[b.name] = { rotation: { '0.0':[0,0,0], '0.2':[-25,0,0], '0.6':[0,0,0] } };
      run.bones[b.name]  = { rotation: { '0.0':[8,0,0], '0.3':[10,0,0], '0.6':[8,0,0] } };
      roar.bones[b.name] = { rotation: { '0.0':[0,0,0], '0.4':[-38,4,0], '0.6':[-38,-4,0], '0.8':[-38,4,0], '1.0':[-38,-4,0], '1.2':[-38,0,0], '1.6':[0,0,0] } };
      sleep.bones[b.name]= { rotation: { '0.0':[26,12,8], '2.0':[28,12,8], '4.0':[26,12,8] } };
    } else if (kind==='body' && b.name==='body'){
      roar.bones[b.name] = { rotation: { '0.0':[0,0,0], '0.4':[-8,0,0], '1.2':[-8,0,0], '1.6':[0,0,0] } };
    }
    // os "blood" (sang sur la lame) : caché par défaut (scale 0) dans toutes les poses
    if (b.name==='blood'){
      const z=[0,0,0];
      idle.bones[b.name]={ scale:z }; walk.bones[b.name]={ scale:z }; run.bones[b.name]={ scale:z };
      roar.bones[b.name]={ scale:z }; sleep.bones[b.name]={ scale:z }; attack.bones[b.name]={ scale:z };
    }
  });
  const anims = { idle, walk, attack, run, roar, sleep };
  // ── Combat des soldats : combos variés + sang qui gicle ─────────────────
  if (model.combat){
    const names = bones.map(b=>b.name);
    const hasR = names.includes('arm_r'), hasL = names.includes('arm_l');
    const hasBlood = names.includes('blood'), hasLegR = names.includes('leg_r'), hasHead = names.includes('head');
    // POSTURE ROMAINE : bouclier tenu EN AVANT (garde), arme prête à piquer.
    // Les attaques sont des ESTOCS COURTS vers l'avant, autour/par-dessus le bouclier,
    // pas des moulinets (technique du légionnaire : le scutum couvre, le glaive pique).
    // NB : l'os item_r (arme) est déjà incliné de -45° vers l'avant. Le bras (arm_r)
    // ne doit donc bouger que modérément, sinon les angles s'additionnent et la lance
    // pointe vers le bas. Ici GR est quasi neutre : l'arme est portée en avant par item_r.
    const GL = [-52,0,-6];      // bras gauche : bouclier levé devant (modéré)
    const GR = [-8,-8,0];       // bras droit : garde (arme déjà en avant via item_r)
    // atk1 — estoc bas (le bras pique en avant → arme ~ horizontale)
    const stab = { loop:false, animation_length:0.55, bones:{}, particle_effects:{} };
    if (hasL) stab.bones.arm_l = { rotation:{ '0.0':GL, '0.55':GL } };
    if (hasR) stab.bones.arm_r = { rotation:{ '0.0':GR, '0.2':[-48,-16,0], '0.38':GR, '0.55':GR } };
    stab.bones.body = { rotation:{ '0.0':[3,-5,0], '0.2':[7,-11,0], '0.55':[3,-5,0] } };
    if (hasLegR) stab.bones.leg_r = { rotation:{ '0.0':[0,0,0], '0.2':[-14,0,0], '0.55':[0,0,0] } };
    // atk2 — coup de bouclier (le scutum frappe en avant), arme gardée en garde
    const bash = { loop:false, animation_length:0.5, bones:{}, particle_effects:{} };
    if (hasL) bash.bones.arm_l = { rotation:{ '0.0':GL, '0.16':[-84,0,-14], '0.34':GL, '0.5':GL } };
    if (hasR) bash.bones.arm_r = { rotation:{ '0.0':GR, '0.5':GR } };
    bash.bones.body = { rotation:{ '0.0':[3,-5,0], '0.16':[3,15,0], '0.5':[3,-5,0] } };
    // atk3 — estoc haut (lève l'arme puis pique en avant, ligne haute)
    const over = { loop:false, animation_length:0.65, bones:{}, particle_effects:{} };
    if (hasL) over.bones.arm_l = { rotation:{ '0.0':GL, '0.65':GL } };
    if (hasR) over.bones.arm_r = { rotation:{ '0.0':GR, '0.2':[12,-6,0], '0.4':[-52,-8,0], '0.55':GR, '0.65':GR } };
    over.bones.body = { rotation:{ '0.0':[3,-5,0], '0.2':[-6,0,0], '0.4':[10,-5,0], '0.65':[3,-5,0] } };
    if (hasHead) over.bones.head = { rotation:{ '0.0':[0,0,0], '0.4':[8,0,0], '0.65':[0,0,0] } };
    // sang qui gicle de la lame (locator "blade") aux impacts
    stab.particle_effects['0.2']  = { effect:'blood', locator:'blade' };
    over.particle_effects['0.38'] = { effect:'blood', locator:'blade' };
    // sang qui apparaît sur la lame puis s'estompe
    if (hasBlood){
      stab.bones.blood = { scale:{ '0.0':[0,0,0], '0.2':[1,1,1], '0.42':[0.6,0.6,0.6], '0.55':[0,0,0] } };
      bash.bones.blood = { scale:[0,0,0] };
      over.bones.blood = { scale:{ '0.0':[0,0,0], '0.38':[1,1,1], '0.55':[0.7,0.7,0.7], '0.65':[0,0,0] } };
    }
    anims.attack_stab = stab; anims.attack_bash = bash; anims.attack_over = over;
    // idle vivant : respiration + léger balancement de l'arme (le soldat n'est jamais figé)
    idle.bones.body = { rotation:{ '0.0':[0,0,0], '1.0':[1.6,0,0], '2.0':[0,0,0] } };
    if (hasR) idle.bones.arm_r = { rotation:{ '0.0':[0,0,0], '1.0':[-4,0,2], '2.0':[0,0,0] } };
    if (hasL) idle.bones.arm_l = { rotation:{ '0.0':[0,0,0], '1.0':[-3,0,-2], '2.0':[0,0,0] } };
  }
  return anims;
}

global.BSEngine = {
  renderModel, generateTexture, toGeometryJSON, toAnimationJSON,
  modelHeightBlocks, cloneModel, hexToRgb, shade,
  autoUV, poseAt, buildAnimations, faceRect, pickAtPoint, paintHit,
};

})(window);
