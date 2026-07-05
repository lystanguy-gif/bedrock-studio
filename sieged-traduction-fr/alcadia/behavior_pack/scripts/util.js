import { world, system, ItemStack } from "@minecraft/server";

// ===== identité commune à tous les PNJ du pack =====
export const MANAGED_TAG = "npc_managed";
export const DP_ROLE = "npc:role";     // "merchant" | "innkeeper" | "officer"
export const DP_ANCHOR = "npc:anchor";
export const PACIFY = true;
export const LIMIT_MAX = 10;           // curseur 1..9 = N fois par joueur, 10 = illimite
export const TALK = "mob.villager.idle";
// Émeraude par défaut : c'est la monnaie de Sieged (recrutement, impôts, boutiques).
export let COIN_ID = "minecraft:emerald";
try { const c = world.getDynamicProperty("eco:coinid"); if (typeof c === "string" && c) COIN_ID = c; } catch (e) {}
export function getCoinId() { return COIN_ID; }
export function setCoinId(id) { if (typeof id === "string" && id) { COIN_ID = id; try { world.setDynamicProperty("eco:coinid", id); } catch (e) {} } }

// ===== helpers generaux =====
export function isCreative(player) {
  try { return String(player.getGameMode()).toLowerCase() === "creative"; }
  catch (e) { return false; }
}
export function play(player, sound, loc) {
  try { player.playSound(sound, loc ? { location: loc } : undefined); } catch (e) {}
}
export function later(fn, ticks) { system.runTimeout(fn, ticks || 4); }
export function shortId(id) {
  return String(id || "").replace(/^[a-z0-9_.]+:/i, "").replace(/_/g, " ");
}
export function normalizeId(s) {
  s = String(s || "").trim().toLowerCase();
  if (!s) return "";
  if (!s.includes(":")) s = "minecraft:" + s;
  return s;
}
export function clampLimit(l) {
  const n = Number(l);
  if (!Number.isFinite(n)) return LIMIT_MAX;
  return Math.min(10, Math.max(1, Math.round(n)));
}
export function clampQty(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 1;
  return Math.min(64, Math.max(1, Math.round(x)));
}
export function isLimited(limit) {
  const n = Number(limit);
  return Number.isFinite(n) && n >= 1 && n <= 9;
}
export function limitReached(limit, current) {
  return isLimited(limit) && current >= Number(limit);
}
export function tradeLabel(t) {
  if (t.label && String(t.label).trim()) return String(t.label);
  const give = (t.sellName && String(t.sellName).trim()) ? t.sellName : shortId(t.sellId);
  return `${t.costCount}x ${shortId(t.costId)} → ${t.sellCount}x ${give}`;
}
export function parseItemList(str) {
  const out = [];
  for (const part of String(str || "").split(",")) {
    const seg = part.trim();
    if (!seg) continue;
    const sp = seg.split(/\s+/);
    const id = (sp[0] || "").trim();
    if (!id) continue;
    let cnt = 1, name = "";
    if (sp.length >= 2 && /^\d+$/.test(sp[1])) { cnt = parseInt(sp[1], 10); name = sp.slice(2).join(" "); }
    else { name = sp.slice(1).join(" "); }
    if (cnt < 1) cnt = 1;
    if (cnt > 64) cnt = 64;
    out.push({ id, count: cnt, name });
  }
  return out;
}
export function stringifyItemList(arr) {
  return (arr || []).map((r) => (r.name && String(r.name).trim()) ? `${r.id} ${r.count} ${r.name}` : `${r.id} ${r.count}`).join(", ");
}

// ===== inventaire =====
export function container(player) {
  const inv = player.getComponent("minecraft:inventory");
  return inv ? inv.container : undefined;
}
export function countItem(cont, typeId) {
  let n = 0;
  for (let i = 0; i < cont.size; i++) {
    const it = cont.getItem(i);
    if (it && it.typeId === typeId) n += it.amount;
  }
  return n;
}
export function removeItem(cont, typeId, count) {
  let left = count;
  for (let i = 0; i < cont.size && left > 0; i++) {
    const it = cont.getItem(i);
    if (it && it.typeId === typeId) {
      if (it.amount <= left) { left -= it.amount; cont.setItem(i); }
      else { it.amount -= left; cont.setItem(i, it); left = 0; }
    }
  }
  return left === 0;
}
export function giveCustom(player, typeId, count, name) {
  let stack;
  try { stack = new ItemStack(typeId, Math.min(64, Math.max(1, count || 1))); } catch (e) { return false; }
  if (name && String(name).trim()) { try { stack.nameTag = String(name); } catch (e) {} }
  const cont = container(player);
  if (!cont) return false;
  const leftover = cont.addItem(stack);
  if (leftover) { try { player.dimension.spawnItem(leftover, player.location); } catch (e) {} }
  return true;
}
export function giveList(player, list) {
  for (const it of (list || [])) {
    let n = it.count || 1;
    while (n > 0) { const part = Math.min(64, n); giveCustom(player, it.id, part, it.name); n -= part; }
  }
}

// ===== compteurs par joueur stockes en JSON sur l'entite =====
export function getMap(entity, dp) {
  const raw = entity.getDynamicProperty(dp);
  if (typeof raw === "string") {
    try { const o = JSON.parse(raw); if (o && typeof o === "object" && !Array.isArray(o)) return o; } catch (e) {}
  }
  return {};
}
export function setMap(entity, dp, obj) { try { entity.setDynamicProperty(dp, JSON.stringify(obj)); } catch (e) {} }

// ===== coordonnees =====
export function parseCoords(str, fallback) {
  const sp = String(str || "").trim().split(/[\s,]+/).filter(Boolean);
  if (sp.length < 3) return fallback || null;
  const x = Number(sp[0]), y = Number(sp[1]), z = Number(sp[2]);
  if (![x, y, z].every(Number.isFinite)) return fallback || null;
  return { x, y, z };
}
export function coordStr(c) { return c ? (Math.floor(c.x) + " " + Math.floor(c.y) + " " + Math.floor(c.z)) : ""; }
export function insideBox(loc, a, b) {
  if (!a || !b) return false;
  const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y), maxY = Math.max(a.y, b.y);
  const minZ = Math.min(a.z, b.z), maxZ = Math.max(a.z, b.z);
  return loc.x >= minX && loc.x < maxX + 1 && loc.y >= minY && loc.y < maxY + 1 && loc.z >= minZ && loc.z < maxZ + 1;
}

// ===== prenom du joueur, pose par la creation de personnage =====
export function playerPrenom(player) {
  try { const p = player.getDynamicProperty("origin:prenom"); if (p && String(p).trim()) return String(p); } catch (e) {}
  return "";
}

// ===== compte bancaire (argent reel du joueur, stocke en nombre) =====
const DP_BAL = "eco:balance";
export function getBalance(player) {
  try { const v = player.getDynamicProperty(DP_BAL); if (typeof v === "number" && v >= 0) return Math.floor(v); } catch (e) {}
  return 0;
}
export function setBalance(player, n) { try { player.setDynamicProperty(DP_BAL, Math.max(0, Math.floor(n || 0))); } catch (e) {} }
export function addBalance(player, n) { setBalance(player, getBalance(player) + Math.floor(n || 0)); return getBalance(player); }

// ===== registre partage des biens (maisons et proprietes) =====
const WDP_PROPS = "npc:props";
export function getProps() {
  const raw = world.getDynamicProperty(WDP_PROPS);
  if (typeof raw === "string") { try { const o = JSON.parse(raw); if (o && typeof o === "object" && !Array.isArray(o)) return o; } catch (e) {} }
  return {};
}
export function saveProps(o) { try { world.setDynamicProperty(WDP_PROPS, JSON.stringify(o)); } catch (e) {} }
export function makePropId(name) {
  const base = String(name || "bien").toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") || "bien";
  return base + "_" + Math.random().toString(36).slice(2, 6);
}
