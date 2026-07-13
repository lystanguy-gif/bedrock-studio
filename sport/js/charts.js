/* ============================================================
   charts.js — graphiques SVG légers (poids, tour de taille,
   répétitions, fatigue/douleur)
   ============================================================ */
"use strict";

/* série = { label, color, pts:[{x:ISOdate|nombre, y:nombre}], dash } */
function svgLineChart(opts) {
  const { series, height = 150, unit = "", yMin: forceMin, yMax: forceMax } = opts;
  const W = 340, H = height, padL = 34, padR = 10, padT = 12, padB = 22;
  const all = series.flatMap((s) => s.pts);
  if (!all.length) return `<div class="empty">Pas encore de données — elles apparaîtront ici.</div>`;
  const xs = all.map((p) => (typeof p.x === "number" ? p.x : new Date(p.x + "T12:00:00").getTime()));
  const ys = all.map((p) => p.y);
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  if (x0 === x1) { x0 -= 1; x1 += 1; }
  let y0 = forceMin !== undefined ? forceMin : Math.min(...ys), y1 = forceMax !== undefined ? forceMax : Math.max(...ys);
  const spread = (y1 - y0) || 1;
  if (forceMin === undefined) y0 -= spread * 0.15;
  if (forceMax === undefined) y1 += spread * 0.15;
  if (y0 === y1) { y0 -= 1; y1 += 1; }
  const X = (v) => padL + ((v - x0) / (x1 - x0)) * (W - padL - padR);
  const Y = (v) => padT + (1 - (v - y0) / (y1 - y0)) * (H - padT - padB);
  const P = [];
  // grille + étiquettes Y
  for (let i = 0; i <= 3; i++) {
    const vy = y0 + ((y1 - y0) * i) / 3, py = Y(vy);
    P.push(`<line x1="${padL}" y1="${py}" x2="${W - padR}" y2="${py}" stroke="#22304a" stroke-width="1" stroke-dasharray="3 4"/>`);
    P.push(`<text x="${padL - 5}" y="${py + 3}" text-anchor="end" fill="#5c6c82" font-size="8.5" class="num">${(Math.round(vy * 10) / 10).toLocaleString("fr-FR")}</text>`);
  }
  // étiquettes X (première / dernière date)
  const isDate = typeof all[0].x !== "number";
  const fmtX = (v) => (isDate ? frDate(isoDate(new Date(v)), { day: "numeric", month: "short" }) : String(v));
  P.push(`<text x="${padL}" y="${H - 6}" fill="#5c6c82" font-size="8.5">${fmtX(x0)}</text>`);
  P.push(`<text x="${W - padR}" y="${H - 6}" text-anchor="end" fill="#5c6c82" font-size="8.5">${fmtX(x1)}</text>`);
  series.forEach((s) => {
    if (!s.pts.length) return;
    const pts = s.pts.map((p) => [X(typeof p.x === "number" ? p.x : new Date(p.x + "T12:00:00").getTime()), Y(p.y)]);
    if (pts.length > 1) {
      P.push(`<polyline points="${pts.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" ${s.dash ? 'stroke-dasharray="5 5"' : ""}/>`);
    }
    pts.forEach((p, i) => {
      const last = i === pts.length - 1;
      P.push(`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${last ? 3.6 : 2.4}" fill="${s.color}" ${last ? 'stroke="#0f151d" stroke-width="1.6"' : ""}/>`);
    });
  });
  const legend = series.filter((s) => s.label).map((s) =>
    `<span><span class="dot" style="background:${s.color};margin-right:5px"></span>${s.label}${unit ? " (" + unit + ")" : ""}</span>`).join("");
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}">${P.join("")}</svg>${legend ? `<div class="legend">${legend}</div>` : ""}</div>`;
}

/* mini barres — séances de la semaine */
function weekBars(done, total, color) {
  const W = 100, seg = total ? W / total : W;
  let x = 0, P = [];
  for (let i = 0; i < total; i++) {
    P.push(`<rect x="${x + 1}" y="0" width="${seg - 2}" height="8" rx="3" fill="${i < done ? color || "#34d399" : "#1d2939"}"/>`);
    x += seg;
  }
  return `<svg viewBox="0 0 ${W} 8" preserveAspectRatio="none" style="width:100%;height:9px;display:block">${P.join("")}</svg>`;
}

/* anneau de progression */
function ringSVG(pct, size, color, label) {
  const r = (size - 8) / 2, c = 2 * Math.PI * r, off = c * (1 - Math.min(1, Math.max(0, pct)));
  return `<div class="ring" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#1d2939" stroke-width="6"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color || "#ff6a3d"}" stroke-width="6" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/></svg>
    <span class="in num">${label !== undefined ? label : Math.round(pct * 100) + "%"}</span></div>`;
}
