/* ============================================================
   poses.js — schémas d'exercices (figures) + schéma du corps
   Figures : squelettes simples dessinés en SVG, position de
   départ et position finale, avec flèches de mouvement.
   ============================================================ */
"use strict";

/* ---------- rendu d'une figure ----------
   pose = {
     head:[x,y], neck:[x,y], hip:[x,y],
     arms:[[[sx,sy],[ex,ey],[hx,hy]],...],   épaule→coude→main
     legs:[[[hx,hy],[kx,ky],[fx,fy]],...],   hanche→genou→pied
     props:[['wall',x] | ['box',x,y,w,h] | ['bag',x,y] | ['bot',x,y] | ['line',x1,y1,x2,y2]],
     arrows:[[x1,y1,x2,y2]]  flèche courbe du mouvement
   } */
function stickSVG(pose, caption) {
  const P = [];
  P.push('<line x1="4" y1="86" x2="116" y2="86" stroke="#33445e" stroke-width="2" stroke-linecap="round"/>');
  (pose.props || []).forEach((p) => {
    if (p[0] === "wall") P.push(`<line x1="${p[1]}" y1="10" x2="${p[1]}" y2="86" stroke="#4a5b74" stroke-width="4" stroke-linecap="round"/>`);
    if (p[0] === "box") P.push(`<rect x="${p[1]}" y="${p[2]}" width="${p[3]}" height="${p[4]}" rx="2.5" fill="#22314a" stroke="#4a5b74" stroke-width="1.5"/>`);
    if (p[0] === "bag") P.push(`<rect x="${p[1] - 5}" y="${p[2] - 4}" width="10" height="8" rx="2" fill="#2fe1c0" opacity=".85"/>`);
    if (p[0] === "bot") P.push(`<rect x="${p[1] - 2}" y="${p[2] - 5}" width="4" height="9" rx="1.6" fill="#2fe1c0" opacity=".9"/>`);
    if (p[0] === "line") P.push(`<line x1="${p[1]}" y1="${p[2]}" x2="${p[3]}" y2="${p[4]}" stroke="#4a5b74" stroke-width="3" stroke-linecap="round"/>`);
  });
  const limb = (pts, wdt) =>
    `<polyline points="${pts.map((p) => p.join(",")).join(" ")}" fill="none" stroke="#e8eef7" stroke-width="${wdt}" stroke-linecap="round" stroke-linejoin="round"/>`;
  (pose.legs || []).forEach((l) => P.push(limb(l, 3.4)));
  P.push(limb([pose.neck, pose.hip], 3.8));
  (pose.arms || []).forEach((a) => P.push(limb(a, 3.1)));
  P.push(`<circle cx="${pose.head[0]}" cy="${pose.head[1]}" r="5.6" fill="#0f151d" stroke="#e8eef7" stroke-width="3"/>`);
  (pose.arrows || []).forEach((a) => {
    const [x1, y1, x2, y2] = a;
    const mx = (x1 + x2) / 2 + (y1 - y2) * 0.28, my = (y1 + y2) / 2 + (x2 - x1) * 0.28;
    P.push(`<path d="M${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}" fill="none" stroke="#ff6a3d" stroke-width="2.4" stroke-linecap="round" marker-end="url(#ah)"/>`);
  });
  if (caption) P.push(`<text x="60" y="10" text-anchor="middle" fill="#93a3b8" font-size="7" font-weight="700">${caption}</text>`);
  return `<svg viewBox="0 0 120 92" role="img" aria-label="${caption || "schéma"}">
    <defs><marker id="ah" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
    <path d="M0 0 L10 5 L0 10 z" fill="#ff6a3d"/></marker></defs>${P.join("")}</svg>`;
}

/* Fiche illustrée : départ + arrivée côte à côte */
function exIllustration(ex) {
  const a = POSES[ex.illu[0]], b = POSES[ex.illu[1] || ex.illu[0]];
  if (!a) return "";
  return `<div class="fiche-illu">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
      <div>${stickSVG(a)}</div><div>${stickSVG(b)}</div>
    </div>
    <div class="fiche-cap"><span>1 · Départ</span><span>2 · ${ex.illu[1] ? "Arrivée" : "Maintien"}</span></div>
  </div>`;
}

/* ---------- bibliothèque de poses ---------- */
const POSES = {
  /* pompes */
  pushup_up: { head: [101, 47], neck: [93, 52], hip: [58, 61], arms: [[[93, 52], [92, 68], [91, 84]]], legs: [[[58, 61], [38, 72], [19, 84]]], arrows: [[104, 58, 104, 74]] },
  pushup_down: { head: [102, 66], neck: [93, 70], hip: [57, 74], arms: [[[93, 70], [82, 78], [91, 84]]], legs: [[[57, 74], [38, 79], [19, 84]]], arrows: [[104, 76, 104, 60]] },
  pushup_incline_up: { head: [96, 34], neck: [89, 40], hip: [57, 58], arms: [[[89, 40], [91, 52], [93, 62]]], legs: [[[57, 58], [38, 71], [20, 84]]], props: [["box", 88, 62, 22, 24]], arrows: [[102, 42, 102, 56]] },
  pushup_incline_down: { head: [98, 48], neck: [90, 52], hip: [56, 66], arms: [[[90, 52], [82, 60], [93, 62]]], legs: [[[56, 66], [37, 75], [20, 84]]], props: [["box", 88, 62, 22, 24]], arrows: [[104, 56, 104, 42]] },
  pushup_knee_up: { head: [97, 51], neck: [89, 56], hip: [56, 66], arms: [[[89, 56], [88, 70], [87, 84]]], legs: [[[56, 66], [40, 76], [40, 84]], [[56, 66], [40, 76], [30, 82]]], arrows: [[100, 60, 100, 74]] },
  pushup_knee_down: { head: [98, 66], neck: [89, 70], hip: [55, 75], arms: [[[89, 70], [79, 78], [87, 84]]], legs: [[[55, 75], [40, 80], [40, 84]]], arrows: [[102, 76, 102, 62]] },
  pushup_decline: { head: [98, 42], neck: [90, 47], hip: [58, 52], arms: [[[90, 47], [89, 65], [88, 84]]], legs: [[[58, 52], [38, 54], [22, 56]]], props: [["box", 12, 56, 20, 30]], arrows: [[102, 52, 102, 70]] },
  pushup_decline_down: { head: [99, 62], neck: [90, 66], hip: [57, 58], arms: [[[90, 66], [80, 76], [88, 84]]], legs: [[[57, 58], [38, 56], [22, 56]]], props: [["box", 12, 56, 20, 30]], arrows: [[104, 72, 104, 56]] },
  /* squat / fentes / jambes */
  stand: { head: [62, 17], neck: [60, 25], hip: [58, 52], arms: [[[60, 29], [61, 41], [62, 52]]], legs: [[[58, 52], [59, 68], [58, 84]], [[58, 52], [56, 68], [54, 84]]] },
  stand_bag: { head: [62, 17], neck: [60, 25], hip: [58, 52], arms: [[[60, 29], [63, 40], [58, 46]]], legs: [[[58, 52], [59, 68], [58, 84]], [[58, 52], [56, 68], [54, 84]]], props: [["bag", 66, 30]] },
  squat_down: { head: [70, 36], neck: [66, 43], hip: [50, 62], arms: [[[66, 45], [78, 47], [88, 46]]], legs: [[[50, 62], [68, 66], [64, 84]], [[50, 62], [66, 68], [60, 84]]], arrows: [[44, 44, 42, 60]] },
  squat_down_bag: { head: [70, 36], neck: [66, 43], hip: [50, 62], arms: [[[66, 45], [72, 52], [64, 55]]], legs: [[[50, 62], [68, 66], [64, 84]]], props: [["bag", 70, 40]], arrows: [[44, 44, 42, 60]] },
  lunge_down: { head: [61, 30], neck: [59, 38], hip: [57, 62], arms: [[[59, 42], [60, 53], [61, 62]]], legs: [[[57, 62], [74, 66], [76, 84]], [[57, 62], [42, 76], [28, 82]]], arrows: [[46, 46, 44, 62]] },
  rdl_hinge: { head: [88, 44], neck: [82, 48], hip: [56, 50], arms: [[[81, 49], [80, 62], [79, 73]]], legs: [[[56, 50], [57, 68], [56, 84]], [[56, 50], [50, 66], [42, 82]]], props: [["bag", 79, 76]], arrows: [[96, 56, 96, 38]] },
  bridge_down: { head: [22, 76], neck: [30, 77], hip: [56, 78], arms: [[[31, 77], [40, 81], [48, 84]]], legs: [[[56, 78], [66, 62], [74, 84]], [[56, 78], [70, 64], [78, 84]]], arrows: [[56, 72, 56, 58]] },
  bridge_up: { head: [22, 76], neck: [30, 75], hip: [58, 58], arms: [[[31, 76], [40, 80], [48, 84]]], legs: [[[58, 58], [70, 62], [74, 84]]], arrows: [[52, 52, 60, 48]] },
  bridge1_up: { head: [22, 76], neck: [30, 75], hip: [58, 58], arms: [[[31, 76], [40, 80], [48, 84]]], legs: [[[58, 58], [70, 62], [74, 84]], [[58, 58], [76, 48], [92, 42]]], arrows: [[52, 52, 60, 48]] },
  calf_flat: { head: [62, 17], neck: [60, 25], hip: [58, 52], arms: [[[60, 29], [70, 34], [78, 30]]], legs: [[[58, 52], [59, 68], [58, 84]]], props: [["wall", 84]] },
  calf_up: { head: [62, 13], neck: [60, 21], hip: [58, 48], arms: [[[60, 25], [70, 30], [78, 26]]], legs: [[[58, 48], [59, 64], [58, 78]]], props: [["wall", 84], ["line", 54, 78, 64, 78]], arrows: [[46, 76, 46, 62]] },
  wallsit: { head: [55, 32], neck: [54, 40], hip: [54, 62], arms: [[[54, 44], [55, 54], [56, 62]]], legs: [[[54, 62], [72, 62], [72, 84]], [[54, 62], [70, 64], [70, 84]]], props: [["wall", 48]], arrows: [[86, 50, 86, 62]] },
  /* gainage / tronc */
  plank: { head: [100, 58], neck: [92, 62], hip: [58, 66], arms: [[[92, 62], [92, 74], [98, 84]]], legs: [[[58, 66], [39, 75], [20, 84]]], arrows: [[52, 54, 70, 54]] },
  sideplank_knee: { head: [96, 52], neck: [88, 56], hip: [56, 64], arms: [[[88, 56], [88, 70], [88, 84]], [[88, 56], [90, 44], [92, 33]]], legs: [[[56, 64], [42, 76], [46, 84]]], arrows: [[60, 52, 60, 42]] },
  deadbug_start: { head: [22, 78], neck: [31, 78], hip: [58, 78], arms: [[[32, 78], [33, 65], [34, 54]]], legs: [[[58, 78], [62, 62], [74, 62]], [[58, 78], [66, 63], [78, 63]]] },
  deadbug_ext: { head: [22, 78], neck: [31, 78], hip: [58, 78], arms: [[[32, 78], [24, 66], [16, 56]]], legs: [[[58, 78], [72, 70], [86, 66]], [[58, 78], [64, 62], [76, 62]]], arrows: [[30, 60, 18, 60], [72, 62, 86, 68]] },
  birddog_start: { head: [98, 52], neck: [90, 56], hip: [56, 56], arms: [[[90, 56], [90, 70], [90, 84]], [[86, 56], [86, 70], [86, 84]]], legs: [[[56, 56], [56, 70], [56, 84]], [[60, 56], [60, 70], [60, 84]]] },
  birddog_ext: { head: [98, 50], neck: [90, 54], hip: [56, 56], arms: [[[90, 54], [100, 47], [111, 42]], [[88, 56], [88, 70], [88, 84]]], legs: [[[56, 56], [44, 50], [30, 46]], [[58, 56], [58, 70], [58, 84]]], arrows: [[104, 52, 112, 46], [40, 56, 30, 50]] },
  superman_down: { head: [18, 78], neck: [27, 79], hip: [58, 80], arms: [[[28, 79], [18, 75], [8, 72]]], legs: [[[58, 80], [76, 80], [94, 80]]] },
  superman_up: { head: [16, 70], neck: [26, 74], hip: [58, 78], arms: [[[27, 74], [16, 68], [6, 62]]], legs: [[[58, 78], [76, 74], [94, 70]]], arrows: [[12, 60, 12, 50], [96, 66, 100, 58]] },
  /* dos — tirages */
  row_down: { head: [85, 40], neck: [79, 45], hip: [56, 50], arms: [[[79, 46], [80, 60], [81, 72]]], legs: [[[56, 50], [57, 68], [56, 84]], [[56, 50], [50, 67], [44, 83]]], props: [["bag", 81, 75]], arrows: [[92, 70, 92, 54]] },
  row_up: { head: [85, 40], neck: [79, 45], hip: [56, 50], arms: [[[79, 46], [82, 56], [76, 57]]], legs: [[[56, 50], [57, 68], [56, 84]], [[56, 50], [50, 67], [44, 83]]], props: [["bag", 74, 58]], arrows: [[92, 66, 92, 52]] },
  row1_down: { head: [88, 42], neck: [81, 46], hip: [58, 50], arms: [[[81, 47], [70, 55], [60, 60]], [[81, 47], [83, 61], [84, 73]]], legs: [[[58, 50], [58, 68], [57, 84]], [[58, 50], [51, 67], [45, 83]]], props: [["box", 44, 60, 20, 26], ["bag", 84, 76]], arrows: [[94, 70, 94, 54]] },
  row1_up: { head: [88, 42], neck: [81, 46], hip: [58, 50], arms: [[[81, 47], [70, 55], [60, 60]], [[81, 47], [86, 56], [80, 57]]], legs: [[[58, 50], [58, 68], [57, 84]], [[58, 50], [51, 67], [45, 83]]], props: [["box", 44, 60, 20, 26], ["bag", 78, 58]], arrows: [[94, 66, 94, 52]] },
  /* épaules */
  ohp_start: { head: [60, 20], neck: [58, 28], hip: [57, 54], arms: [[[58, 30], [66, 34], [64, 26]], [[58, 30], [50, 34], [52, 26]]], legs: [[[57, 54], [58, 69], [57, 84]], [[57, 54], [54, 69], [51, 84]]], props: [["bot", 64, 23], ["bot", 52, 23]], arrows: [[74, 30, 74, 14]] },
  ohp_up: { head: [60, 22], neck: [58, 30], hip: [57, 54], arms: [[[58, 30], [64, 20], [63, 10]], [[58, 30], [52, 20], [53, 10]]], legs: [[[57, 54], [58, 69], [57, 84]], [[57, 54], [54, 69], [51, 84]]], props: [["bot", 63, 8], ["bot", 53, 8]], arrows: [[74, 26, 74, 10]] },
  ohp_seat_start: { head: [58, 26], neck: [56, 34], hip: [55, 58], arms: [[[56, 36], [64, 40], [62, 32]], [[56, 36], [48, 40], [50, 32]]], legs: [[[55, 58], [72, 60], [72, 84]]], props: [["box", 40, 58, 18, 28], ["bot", 62, 29], ["bot", 50, 29]], arrows: [[74, 34, 74, 18]] },
  ohp_seat_up: { head: [58, 28], neck: [56, 36], hip: [55, 58], arms: [[[56, 36], [62, 26], [61, 16]], [[56, 36], [50, 26], [51, 16]]], legs: [[[55, 58], [72, 60], [72, 84]]], props: [["box", 40, 58, 18, 28], ["bot", 61, 14], ["bot", 51, 14]], arrows: [[74, 32, 74, 14]] },
  lat_down: { head: [60, 18], neck: [58, 26], hip: [57, 52], arms: [[[58, 30], [64, 41], [68, 50]], [[58, 30], [52, 41], [48, 50]]], legs: [[[57, 52], [58, 68], [57, 84]], [[57, 52], [54, 68], [51, 84]]], props: [["bot", 69, 52], ["bot", 47, 52]], arrows: [[82, 46, 88, 32]] },
  lat_up: { head: [60, 18], neck: [58, 26], hip: [57, 52], arms: [[[58, 30], [70, 29], [82, 28]], [[58, 30], [46, 29], [34, 28]]], legs: [[[57, 52], [58, 68], [57, 84]], [[57, 52], [54, 68], [51, 84]]], props: [["bot", 84, 28], ["bot", 32, 28]], arrows: [[88, 40, 90, 30]] },
  front_up: { head: [60, 18], neck: [58, 26], hip: [57, 52], arms: [[[58, 30], [70, 30], [81, 30]]], legs: [[[57, 52], [58, 68], [57, 84]], [[57, 52], [54, 68], [51, 84]]], props: [["bot", 83, 30]], arrows: [[90, 44, 92, 32]] },
  pike_box: { head: [76, 56], neck: [70, 52], hip: [46, 30], arms: [[[70, 53], [73, 68], [76, 82]]], legs: [[[46, 30], [38, 44], [30, 56]]], props: [["box", 18, 56, 20, 30]], arrows: [[86, 60, 86, 74]] },
  pike_box_down: { head: [80, 70], neck: [73, 64], hip: [48, 34], arms: [[[73, 65], [70, 74], [76, 82]]], legs: [[[48, 34], [39, 46], [30, 56]]], props: [["box", 18, 56, 20, 30]], arrows: [[90, 74, 90, 60]] },
  /* bras */
  curl_down: { head: [60, 18], neck: [58, 26], hip: [57, 52], arms: [[[58, 30], [60, 42], [62, 52]]], legs: [[[57, 52], [58, 68], [57, 84]], [[57, 52], [54, 68], [51, 84]]], props: [["bot", 63, 54]], arrows: [[76, 50, 78, 36]] },
  curl_up: { head: [60, 18], neck: [58, 26], hip: [57, 52], arms: [[[58, 30], [60, 42], [68, 36]]], legs: [[[57, 52], [58, 68], [57, 84]], [[57, 52], [54, 68], [51, 84]]], props: [["bot", 70, 34]], arrows: [[80, 48, 80, 36]] },
  tri_bent: { head: [60, 16], neck: [58, 24], hip: [57, 52], arms: [[[58, 26], [63, 16], [70, 22]]], legs: [[[57, 52], [58, 68], [57, 84]], [[57, 52], [54, 68], [51, 84]]], props: [["bot", 72, 24]], arrows: [[80, 26, 80, 12]] },
  tri_ext: { head: [60, 16], neck: [58, 24], hip: [57, 52], arms: [[[58, 26], [62, 15], [63, 5]]], legs: [[[57, 52], [58, 68], [57, 84]], [[57, 52], [54, 68], [51, 84]]], props: [["bot", 64, 4]], arrows: [[78, 22, 78, 8]] },
  dips_up: { head: [56, 30], neck: [55, 38], hip: [54, 60], arms: [[[55, 40], [62, 50], [64, 58]]], legs: [[[54, 60], [70, 68], [84, 78]]], props: [["box", 58, 58, 20, 28]], arrows: [[44, 44, 44, 58]] },
  dips_down: { head: [54, 42], neck: [53, 50], hip: [52, 68], arms: [[[53, 51], [64, 55], [64, 60]]], legs: [[[52, 68], [69, 73], [84, 80]]], props: [["box", 58, 60, 20, 26]], arrows: [[42, 58, 42, 44]] },
  iso_hold: { head: [60, 18], neck: [58, 26], hip: [57, 52], arms: [[[58, 30], [70, 29], [82, 28]], [[58, 30], [46, 29], [34, 28]]], legs: [[[57, 52], [58, 68], [57, 84]], [[57, 52], [54, 68], [51, 84]]], arrows: [] },
};

/* ---------- schéma du corps humain ----------
   zones cliquables, vue face + dos                     */
const BODY_ZONES = {
  front: [
    ["tete", "Tête"], ["cou", "Cou"], ["epaules", "Épaules"], ["pectoraux", "Pectoraux"],
    ["bras", "Bras"], ["coudes", "Coudes"], ["avantbras", "Avant-bras"], ["poignets", "Poignets"],
    ["mains", "Mains"], ["abdominaux", "Abdominaux"], ["hanches", "Hanches"], ["cuisses", "Cuisses"],
    ["genoux", "Genoux"], ["tibias", "Tibias"], ["chevilles", "Chevilles"], ["pieds", "Pieds"],
  ],
  back: [
    ["tete", "Tête"], ["cou", "Cou"], ["epaules", "Épaules"], ["hautdos", "Haut du dos"],
    ["milieudos", "Milieu du dos"], ["basdos", "Bas du dos"], ["bras", "Bras"], ["coudes", "Coudes"],
    ["avantbras", "Avant-bras"], ["poignets", "Poignets"], ["mains", "Mains"], ["fessiers", "Fessiers"],
    ["cuisses", "Cuisses (arrière)"], ["genoux", "Genoux"], ["mollets", "Mollets"], ["chevilles", "Chevilles"], ["pieds", "Pieds"],
  ],
};
const ZONE_LABEL = {};
BODY_ZONES.front.concat(BODY_ZONES.back).forEach(([id, lbl]) => { if (!ZONE_LABEL[id]) ZONE_LABEL[id] = lbl; });

function bodySVG(view, selected, watched) {
  const sel = selected || [], wat = watched || [];
  const cls = (z) => `zone${sel.includes(z) ? " sel" : wat.includes(z) ? " watch" : ""}`;
  const z = (shape, zone) => shape.replace("/>", ` class="${cls(zone)}" data-zone="${zone}" data-view="${view}"/>`);
  const S = [];
  // tête, cou, épaules, bras — communs
  S.push(z(`<circle cx="50" cy="15" r="9.5"/>`, "tete"));
  S.push(z(`<rect x="45" y="25" width="10" height="7" rx="3"/>`, "cou"));
  S.push(z(`<ellipse cx="33" cy="37" rx="8.5" ry="5.5"/>`, "epaules"));
  S.push(z(`<ellipse cx="67" cy="37" rx="8.5" ry="5.5"/>`, "epaules"));
  S.push(z(`<rect x="21.5" y="41" width="8.5" height="24" rx="4"/>`, "bras"));
  S.push(z(`<rect x="70" y="41" width="8.5" height="24" rx="4"/>`, "bras"));
  S.push(z(`<circle cx="25.5" cy="68.5" r="4.4"/>`, "coudes"));
  S.push(z(`<circle cx="74.5" cy="68.5" r="4.4"/>`, "coudes"));
  S.push(z(`<rect x="21.8" y="74" width="7.6" height="19" rx="3.6"/>`, "avantbras"));
  S.push(z(`<rect x="70.6" y="74" width="7.6" height="19" rx="3.6"/>`, "avantbras"));
  S.push(z(`<circle cx="25.6" cy="96" r="3.4"/>`, "poignets"));
  S.push(z(`<circle cx="74.4" cy="96" r="3.4"/>`, "poignets"));
  S.push(z(`<ellipse cx="25.4" cy="103.5" rx="4.4" ry="5"/>`, "mains"));
  S.push(z(`<ellipse cx="74.6" cy="103.5" rx="4.4" ry="5"/>`, "mains"));
  if (view === "front") {
    S.push(z(`<path d="M36 34 h28 a3 3 0 0 1 3 3 v16 a3 3 0 0 1 -3 3 h-28 a3 3 0 0 1 -3 -3 v-16 a3 3 0 0 1 3 -3 z"/>`, "pectoraux"));
    S.push(z(`<rect x="37" y="57" width="26" height="21" rx="4"/>`, "abdominaux"));
    S.push(z(`<rect x="35" y="79" width="30" height="12" rx="5"/>`, "hanches"));
    S.push(z(`<rect x="35.5" y="92" width="12.5" height="33" rx="5.5"/>`, "cuisses"));
    S.push(z(`<rect x="52" y="92" width="12.5" height="33" rx="5.5"/>`, "cuisses"));
    S.push(z(`<circle cx="42" cy="130" r="5"/>`, "genoux"));
    S.push(z(`<circle cx="58" cy="130" r="5"/>`, "genoux"));
    S.push(z(`<rect x="37.8" y="136" width="8.5" height="27" rx="4"/>`, "tibias"));
    S.push(z(`<rect x="53.7" y="136" width="8.5" height="27" rx="4"/>`, "tibias"));
  } else {
    S.push(z(`<path d="M36 34 h28 a3 3 0 0 1 3 3 v10 h-34 v-10 a3 3 0 0 1 3 -3 z"/>`, "hautdos"));
    S.push(z(`<rect x="33" y="48.5" width="34" height="14" rx="2.5"/>`, "milieudos"));
    S.push(z(`<rect x="35" y="64" width="30" height="14" rx="3"/>`, "basdos"));
    S.push(z(`<path d="M35 79.5 h30 a4 4 0 0 1 4 4.5 c0 5.5 -3 9 -9 9.5 h-20 c-6 -.5 -9 -4 -9 -9.5 a4 4 0 0 1 4 -4.5 z"/>`, "fessiers"));
    S.push(z(`<rect x="35.5" y="95" width="12.5" height="30" rx="5.5"/>`, "cuisses"));
    S.push(z(`<rect x="52" y="95" width="12.5" height="30" rx="5.5"/>`, "cuisses"));
    S.push(z(`<circle cx="42" cy="130" r="5"/>`, "genoux"));
    S.push(z(`<circle cx="58" cy="130" r="5"/>`, "genoux"));
    S.push(z(`<rect x="37.8" y="136" width="8.5" height="27" rx="4"/>`, "mollets"));
    S.push(z(`<rect x="53.7" y="136" width="8.5" height="27" rx="4"/>`, "mollets"));
  }
  S.push(z(`<circle cx="42" cy="166.5" r="3.4"/>`, "chevilles"));
  S.push(z(`<circle cx="58" cy="166.5" r="3.4"/>`, "chevilles"));
  S.push(z(`<ellipse cx="41" cy="174" rx="6" ry="4"/>`, "pieds"));
  S.push(z(`<ellipse cx="59" cy="174" rx="6" ry="4"/>`, "pieds"));
  S.push(`<text x="50" y="188">${view === "front" ? "FACE" : "DOS"}</text>`);
  return `<svg viewBox="0 0 100 192" role="img" aria-label="Schéma du corps — vue ${view === "front" ? "de face" : "de dos"}">${S.join("")}</svg>`;
}
