/* ═══════════════════════════════════════════════════════════════════════
   BEDROCK STUDIO — Application (UI + export .mcaddon)
   ═══════════════════════════════════════════════════════════════════════ */
(function (global) {
'use strict';
const E = global.BSEngine, T = global.BSTemplates;

// ── État ──────────────────────────────────────────────────────────────────
const state = {
  page: 'gallery',
  creatures: [], items: [], furniture: [],
  cur: { creature:null, item:null, furniture:null },
};
const view = { rotX:-12, rotY:28, zoom:1, anim:'idle', steve:true, autorotate:true };
const itemView = { rotX:-12, rotY:28, zoom:1, autorotate:true };
const furnView = { rotX:-20, rotY:32, autorotate:true };
// sélection au clic : { bone, ci } par type d'éditeur + polygones du dernier rendu
const sel = { creature:null, item:null, furniture:null };
const pickStores = { creature:[], item:[], furniture:[] };
// mode peinture 3D par type d'éditeur
const paint = {
  creature:{ on:false, color:'#ffffff', erase:false, size:1 },
  item:{ on:false, color:'#ffffff', erase:false, size:1 },
  furniture:{ on:false, color:'#ffffff', erase:false, size:1 },
};
const PAINT_SWATCHES = ['#ffffff','#000000','#c0392b','#e67e22','#f1c40f','#27ae60','#1abc9c','#2980b9','#8e44ad','#e84393','#7f5539','#95a5a6'];

const uid = (p)=> p + Math.random().toString(36).slice(2,9);
function uuid(){ return (crypto.randomUUID ? crypto.randomUUID() :
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==='x'?r:(r&0x3|0x8)).toString(16);})); }
function slug(s){ return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'')||'objet'; }
function ns(){ return slug(document.getElementById('proj-ns').value)||'monaddon'; }
function projName(){ return document.getElementById('proj-name').value||'Mon Add-on'; }

function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.style.display='block'; clearTimeout(t._t); t._t=setTimeout(()=>t.style.display='none',2600); }
function setStatus(id,msg,type){ const el=document.getElementById(id); if(el){el.textContent=msg; el.className='status-msg '+(type||'');} }

// ── Navigation ──────────────────────────────────────────────────────────
function showPage(name){
  state.page=name;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.toggle('active',t.dataset.page===name));
  const pg=document.getElementById('page-'+name); if(pg) pg.classList.add('active');
  if(name==='gallery') renderGallery();
}

// ═══════════════════════ GALERIE ═══════════════════════
function renderGallery(){
  const g=document.getElementById('gallery');
  const sec=(title)=>`<div class="gal-section-title">${title}</div>`;
  let html=`<div class="gal-hero"><h1>⚔ Bedrock Studio</h1>
    <p>Crée des créatures 3D détaillées, des objets et du mobilier médiéval pour Minecraft Bedrock —
    modèles pré-faits, échelle avec Steve comme référence, animations, sons. Export <b>.mcaddon</b> prêt à installer, sans coder.</p></div>`;

  html+=sec('🐲 Créatures — modèles pré-faits');
  html+='<div class="gal-grid">'+T.CREATURES.map(t=>galCard(t,'creature')).join('')+'</div>';

  html+=sec('⚔ Objets 3D — armes & médiéval');
  html+='<div class="gal-grid">'+T.ITEMS_3D.map(t=>galCard(t,'item3d')).join('')+'</div>';

  html+=sec('🎨 Objets 2D — pixel art');
  html+='<div class="gal-grid">'+T.ITEMS_2D.map(t=>galCard2D(t)).join('')+'</div>';

  html+=sec('🪑 Mobilier & décor médiéval');
  html+='<div class="gal-grid">'+T.FURNITURE.map(t=>galCard(t,'furniture')).join('')+'</div>';

  g.innerHTML=html;
  // dessine les vignettes 3D
  T.CREATURES.forEach(t=>drawThumb('thumb_creature_'+t.key,t));
  T.ITEMS_3D.forEach(t=>drawThumb('thumb_item3d_'+t.key,t,true));
  T.FURNITURE.forEach(t=>drawThumb('thumb_furniture_'+t.key,t,true));
}
function galCard(t,kind){
  return `<div class="gcard" onclick="BS.create('${kind}','${t.key}')">
    <div class="thumb"><span class="badge">${t.category||''}</span><canvas id="thumb_${kind}_${t.key}" width="190" height="150"></canvas></div>
    <div class="body"><div class="gtitle">${t.emoji} ${t.name}</div><div class="gdesc">${t.desc||''}</div></div></div>`;
}
function galCard2D(t){
  return `<div class="gcard" onclick="BS.create('item2d','${t.key}')">
    <div class="thumb"><span class="badge">Pixel ${t.size}×${t.size}</span><div style="font-size:54px">${t.emoji}</div></div>
    <div class="body"><div class="gtitle">${t.name}</div><div class="gdesc">Éditeur pixel art ${t.size}×${t.size}.</div></div></div>`;
}
function drawThumb(id,tpl,isSmall){
  const c=document.getElementById(id); if(!c) return;
  const model=BSEngine.cloneModel({bones:tpl.bones});
  (tpl.colorSlots||[]).forEach(()=>{});
  model.bones.forEach(b=>(b.cubes||[]).forEach(cu=>{ if(cu.slot){ const s=(tpl.colorSlots||[]).find(x=>x.key===cu.slot); cu.color=s?s.def:'#9aa8b8'; } }));
  E.renderModel(c,model,{rotX:-14,rotY:28,zoom:isSmall?0.9:1,ground:true});
}

// ═══════════════════════ CRÉATION D'INSTANCE ═══════════════════════
function create(kind,key){
  if(kind==='creature'){
    const tpl=T.CREATURES.find(t=>t.key===key);
    const colors={}; tpl.colorSlots.forEach(s=>colors[s.key]=s.def);
    const inst={ id:uid('c_'), _tpl:tpl, tplKey:key, name:tpl.name, mobId:slug(tpl.name)+'_'+state.creatures.length,
      colors, parts:{ hair:tpl.parts?tpl.parts.hair[0].key:null, eyes:tpl.parts?tpl.parts.eyes[0].key:null },
      scale:tpl.defaultScale||1, stats:Object.assign({},tpl.stats), sounds:Object.assign({},tpl.sounds),
      options:{ fireImmune:false, spawnEgg:true, boss:tpl.stats.hp>=150, summonable:true },
      drops:[], geo:BSEngine.cloneModel({bones:tpl.bones}) };
    resolveCreature(inst); state.creatures.push(inst); state.cur.creature=inst.id;
    renderLists(); showPage('creature'); renderCreatureEditor(); toast('✓ '+tpl.name+' créé');
  } else if(kind==='item3d'){
    const tpl=T.ITEMS_3D.find(t=>t.key===key);
    const colors={}; tpl.colorSlots.forEach(s=>colors[s.key]=s.def);
    const inst={ id:uid('i_'), _tpl:tpl, tplKey:key, mode:'3d', name:tpl.name, itemId:slug(tpl.name)+'_'+state.items.length,
      colors, scale:tpl.defaultScale||1, itemType:tpl.itemType, stats:Object.assign({},tpl.stats),
      options:{ glint:false, stack:tpl.itemType==='potion'?16:1 }, geo:BSEngine.cloneModel({bones:tpl.bones}) };
    resolveItem(inst); state.items.push(inst); state.cur.item=inst.id;
    renderLists(); showPage('item'); renderItemEditor();
  } else if(kind==='item2d'){
    const tpl=T.ITEMS_2D.find(t=>t.key===key);
    const gs=tpl.size;
    const inst={ id:uid('i_'), mode:'2d', name:tpl.name, itemId:slug(tpl.name)+'_'+state.items.length,
      gridSize:gs, pixels:Array.from({length:gs},()=>Array(gs).fill(null)),
      palette:(tpl.palette||['#f2f4f6','#cdd4da','#9aa8b8','#6c7880','#454e58','#c8a55a','#c0392b','#27ae60','#2980b9','#8e44ad','#000000','#ffffff']).slice(),
      itemType:'misc', stats:{damage:1,durability:0}, options:{glint:false,stack:64} };
    if(tpl.preset) load2DPreset(inst,tpl.preset);
    state.items.push(inst); state.cur.item=inst.id;
    renderLists(); showPage('item'); renderItemEditor();
  } else if(kind==='furniture'){
    const tpl=T.FURNITURE.find(t=>t.key===key);
    const colors={}; tpl.colorSlots.forEach(s=>colors[s.key]=s.def);
    const inst={ id:uid('f_'), _tpl:tpl, tplKey:key, name:tpl.name, blockId:slug(tpl.name)+'_'+state.furniture.length,
      colors, options:{ light:tpl.light||0 }, geo:BSEngine.cloneModel({bones:tpl.bones}) };
    resolveFurniture(inst); state.furniture.push(inst); state.cur.furniture=inst.id;
    renderLists(); showPage('furniture'); renderFurnitureEditor();
  }
}

// ── Résolution des modèles (couleurs, yeux, parties) ──────────────────────
function baseModel(inst){
  const tpl=inst._tpl;
  const model=BSEngine.cloneModel({bones:(inst.geo&&inst.geo.bones)||tpl.bones});
  // parties (cheveux) : ne garder que la variante choisie
  if(tpl.parts&&tpl.parts.hair){
    const sel=inst.parts.hair;
    model.bones=model.bones.filter(b=> b.part!=='hair' || b.variant===sel);
  }
  // couleurs
  model.bones.forEach(b=>(b.cubes||[]).forEach(cu=>{ if(cu.slot&&inst.colors[cu.slot]) cu.color=inst.colors[cu.slot]; }));
  E.autoUV(model);
  applyEyes(model,inst);
  // annotation pour la sélection au clic (nom d'os + index de cube)
  model.bones.forEach(b=>(b.cubes||[]).forEach((cu,ci)=>{ cu._pick={ bone:b.name, ci }; }));
  return model;
}
function resolveCreature(inst){ inst._resolved=baseModel(inst); }
function resolveItem(inst){ if(inst.mode==='3d') inst._resolved=baseModel(inst); }
function resolveFurniture(inst){ inst._resolved=baseModel(inst); }

// ═══════════════════════ ÉDITEUR DE CUBES (édition libre) ═══════════════════════
function geoInst(type){ return type==='creature'?curCreature():type==='item'?curItem():curFurniture(); }
function geoResolve(type){ const i=geoInst(type); if(!i)return;
  if(type==='creature')resolveCreature(i); else if(type==='item')resolveItem(i); else resolveFurniture(i);
  const h=document.getElementById('geo-height-'+type); if(h&&type==='creature'){ updateScaleReadout(); } }
function slotColor(inst,slot){ const s=(inst._tpl.colorSlots||[]).find(x=>x.key===slot); return (slot&&inst.colors[slot])||(s&&s.def)||'#9aa8b8'; }
function cubeColorOf(inst,cu){ return cu.color || slotColor(inst,cu.slot); }

function geoEditorCard(type){
  return `<div class="card"><div class="card-title">🧊 Édition avancée des cubes
    <button class="px-btn" style="margin-left:auto" onclick="BS.geoJsonToggle('${type}')">⟨⟩ JSON expert</button>
    <button class="px-btn" onclick="BS.geoToggle('${type}')" id="geo-toggle-${type}">▾ Afficher</button></div>
    <div id="geo-editor-${type}" style="display:none"></div>
    <div id="geo-json-${type}" style="display:none">
      <p style="font-size:11px;color:var(--muted);margin:8px 0 6px">Squelette complet (os + cubes) au format du studio — modifie puis applique. La validation est faite en direct.</p>
      <textarea id="geo-json-ta-${type}" spellcheck="false" style="font-family:monospace;font-size:11px;min-height:220px;white-space:pre" oninput="BS.geoJsonCheck('${type}')"></textarea>
      <div style="display:flex;gap:6px;align-items:center;margin-top:6px">
        <button class="px-btn" onclick="BS.geoJsonApply('${type}')">✓ Appliquer</button>
        <span id="geo-json-msg-${type}" style="font-size:11px;color:var(--muted)"></span>
      </div>
    </div></div>`;
}
const geoJsonOpen={};
function geoJsonToggle(type){
  geoJsonOpen[type]=!geoJsonOpen[type];
  const el=document.getElementById('geo-json-'+type); if(!el)return;
  el.style.display=geoJsonOpen[type]?'block':'none';
  if(geoJsonOpen[type]){
    const inst=geoInst(type);
    if(inst&&inst.geo) document.getElementById('geo-json-ta-'+type).value=JSON.stringify(inst.geo.bones,null,2);
  }
}
function geoJsonCheck(type){
  const msg=document.getElementById('geo-json-msg-'+type);
  try{
    const v=JSON.parse(document.getElementById('geo-json-ta-'+type).value);
    if(!Array.isArray(v)) throw new Error('Le JSON doit être un tableau d\'os [ {name, pivot, cubes:[…]} ]');
    msg.textContent='✓ JSON valide ('+v.length+' os)'; msg.style.color='var(--green)'; return v;
  }catch(e){ msg.textContent='✗ '+e.message; msg.style.color='#e07060'; return null; }
}
function geoJsonApply(type){
  const bones=geoJsonCheck(type); if(!bones)return;
  const inst=geoInst(type); if(!inst||!inst.geo)return;
  inst.geo.bones=bones; geoResolve(type); pushHistory();
  if(geoOpen[type])renderGeoInner(type);
  toast('✓ Squelette appliqué');
}
const geoOpen={};
function geoToggle(type){ geoOpen[type]=!geoOpen[type];
  const el=document.getElementById('geo-editor-'+type); const btn=document.getElementById('geo-toggle-'+type);
  if(!el)return; el.style.display=geoOpen[type]?'block':'none'; btn.textContent=geoOpen[type]?'▴ Masquer':'▾ Afficher';
  if(geoOpen[type]) renderGeoInner(type); }
function renderGeoInner(type){
  const inst=geoInst(type); const el=document.getElementById('geo-editor-'+type); if(!inst||!el)return;
  const bones=inst.geo.bones;
  const n3=(v,cb)=>`<input type="number" step="0.5" value="${v}" style="width:52px;padding:4px 5px" oninput="${cb}">`;
  let count=0; bones.forEach(b=>count+=(b.cubes||[]).length);
  el.innerHTML=`<div style="font-size:11px;color:var(--muted);margin-bottom:10px">${bones.length} os · ${count} cubes — modifie chaque valeur, l'aperçu se met à jour en direct. <b>origin</b> = coin (x,y,z), <b>size</b> = dimensions.</div>`
    + bones.map((b,bi)=>`
    <div style="border:1px solid var(--border);margin-bottom:8px;background:var(--bg1)">
      <div style="display:flex;align-items:center;gap:6px;padding:7px 9px;background:var(--bg3);flex-wrap:wrap">
        <input type="text" value="${b.name}" style="width:110px;font-size:12px;color:var(--gold);padding:3px 5px" oninput="BS.geoBoneName('${type}',${bi},this.value)">
        <span style="font-size:10px;color:var(--muted)">pivot</span>${['0','1','2'].map(a=>n3((b.pivot||[0,0,0])[a],`BS.geoBone('${type}',${bi},'pivot',${a},+this.value)`)).join('')}
        <span style="font-size:10px;color:var(--muted)">rot</span>${['0','1','2'].map(a=>n3((b.rotation||[0,0,0])[a],`BS.geoBone('${type}',${bi},'rotation',${a},+this.value)`)).join('')}
        <button class="px-btn" onclick="BS.geoAddCube('${type}',${bi})">+ cube</button>
        <button class="px-btn" style="color:var(--red);border-color:#3a2020" onclick="BS.geoDelBone('${type}',${bi})">🗑 os</button>
      </div>
      <div style="padding:6px 9px">
      ${(b.cubes||[]).map((cu,ci)=>`
        <div style="display:flex;align-items:center;gap:5px;padding:4px 0;flex-wrap:wrap;border-bottom:1px solid #14181f">
          <span style="font-size:10px;color:var(--muted);width:36px">org</span>${['0','1','2'].map(a=>n3(cu.origin[a],`BS.geoCube('${type}',${bi},${ci},'origin',${a},+this.value)`)).join('')}
          <span style="font-size:10px;color:var(--muted);width:30px">size</span>${['0','1','2'].map(a=>n3(cu.size[a],`BS.geoCube('${type}',${bi},${ci},'size',${a},+this.value)`)).join('')}
          <span style="font-size:10px;color:var(--muted)">infl</span><input type="number" step="0.1" value="${cu.inflate||0}" style="width:44px;padding:4px 5px" oninput="BS.geoCube('${type}',${bi},${ci},'inflate',0,+this.value)">
          <input type="color" value="${E.hexToRgb?cubeHex(inst,cu):'#888'}" style="width:28px;height:26px;background:none;border:1px solid var(--border)" oninput="BS.geoCubeColor('${type}',${bi},${ci},this.value)">
          <button class="px-btn" title="Dupliquer" onclick="BS.geoDupCube('${type}',${bi},${ci})">⧉</button>
          <button class="px-btn" style="color:var(--red)" onclick="BS.geoDelCube('${type}',${bi},${ci})">✕</button>
        </div>`).join('')}
      </div>
    </div>`).join('')
    + `<button class="add-mini" onclick="BS.geoAddBone('${type}')">+ Ajouter un os</button>
       <div style="font-size:11px;color:var(--muted);margin-top:6px">💡 Astuce : ajoute de petits cubes (size 1–2) pour les détails fins (écailles, boutons, rivets…).</div>`;
}
function cubeHex(inst,cu){ const col=cubeColorOf(inst,cu); return /^#/.test(col)?col:'#888888'; }

function geoBoneName(type,bi,v){ const i=geoInst(type); i.geo.bones[bi].name=v; geoResolve(type); }
function geoBone(type,bi,field,axis,v){ const i=geoInst(type); const b=i.geo.bones[bi];
  b[field]=b[field]||[0,0,0]; b[field][axis]=v; geoResolve(type); }
function geoCube(type,bi,ci,field,axis,v){ const i=geoInst(type); const cu=i.geo.bones[bi].cubes[ci];
  if(field==='inflate'){ cu.inflate=v; } else { cu[field][axis]=v; } geoResolve(type); }
function geoCubeColor(type,bi,ci,v){ const i=geoInst(type); const cu=i.geo.bones[bi].cubes[ci]; cu.color=v; cu.slot=null; geoResolve(type); }
function geoAddCube(type,bi){ const i=geoInst(type); const b=i.geo.bones[bi];
  const p=b.pivot||[0,0,0]; b.cubes=b.cubes||[]; b.cubes.push({ origin:[p[0]-2,p[1],p[2]-2], size:[4,4,4], color:'#c8a55a' });
  geoResolve(type); renderGeoInner(type); }
function geoDupCube(type,bi,ci){ const i=geoInst(type); const b=i.geo.bones[bi]; const cu=JSON.parse(JSON.stringify(b.cubes[ci]));
  cu.origin=[cu.origin[0]+2,cu.origin[1],cu.origin[2]]; b.cubes.splice(ci+1,0,cu); geoResolve(type); renderGeoInner(type); }
function geoDelCube(type,bi,ci){ const i=geoInst(type); i.geo.bones[bi].cubes.splice(ci,1); geoResolve(type); renderGeoInner(type); }
function geoAddBone(type){ const i=geoInst(type); i.geo.bones.push({ name:'os_'+i.geo.bones.length, pivot:[0,12,0], parent:i.geo.bones[0]?i.geo.bones[0].name:undefined, cubes:[{ origin:[-2,12,-2], size:[4,4,4], color:'#c8a55a' }] }); geoResolve(type); renderGeoInner(type); }
function geoDelBone(type,bi){ const i=geoInst(type); if(i.geo.bones.length<=1)return; i.geo.bones.splice(bi,1); geoResolve(type); renderGeoInner(type); }

function applyEyes(model,inst){
  const tpl=inst._tpl; const style=(tpl.eyes&&tpl.eyes.style)||'none';
  if(style==='none') return;
  let head=null; model.bones.forEach(b=>{ if(b.eyeHost&&b.cubes&&b.cubes.length&&!head) head=b.cubes[0]; });
  if(!head||!head.uv) return;
  const r=E.faceRect(head.uv,head.size).north; const [fx,fy,fw,fh]=r;
  const eyeCol=inst.colors.eye||(tpl.colorSlots.find(s=>s.key==='eye')||{}).def||'#222';
  head.decals=head.decals||[];
  const D=(x,y,w,h,color)=>head.decals.push({x:Math.round(fx+x),y:Math.round(fy+y),w:Math.round(w),h:Math.round(h),color});
  const midY=Math.round(fh*0.42);
  const eStyle = inst.parts&&inst.parts.eyes;
  if(style==='human'){
    const gap=Math.max(1,Math.round(fw*0.18));
    const ew=Math.max(1,Math.round(fw*0.18)), lx=Math.round(fw*0.18), rx=fw-lx-ew;
    D(lx,midY,ew,2,'#ffffff'); D(rx,midY,ew,2,'#ffffff');
    if(eStyle==='colere'){ D(lx,midY-1,ew,1,'#000'); D(rx,midY-1,ew,1,'#000'); }
    if(eStyle==='endormis'){ D(lx,midY+1,ew,1,'#000'); D(rx,midY+1,ew,1,'#000'); }
    const pw=Math.max(1,Math.round(ew*0.6));
    if(eStyle!=='endormis'){ D(lx+ew-pw,midY,pw,2,eyeCol); D(rx,midY,pw,2,eyeCol); }
    if(eStyle==='brillants'){ D(lx,midY,1,1,'#fff'); D(rx+pw,midY,1,1,'#fff'); }
  } else if(style==='reptile'){
    const ew=2, lx=Math.round(fw*0.12), rx=fw-lx-ew, y=Math.round(fh*0.35);
    D(lx,y,ew,3,eyeCol); D(rx,y,ew,3,eyeCol);
    D(lx+1,y,1,3,'#111'); D(rx,y,1,3,'#111');
  } else if(style==='cluster'){
    const pts=[[0.15,0.3],[0.3,0.2],[0.7,0.2],[0.85,0.3],[0.32,0.45],[0.68,0.45]];
    pts.forEach(p=>D(Math.round(fw*p[0]),Math.round(fh*p[1]),1,1,eyeCol));
  } else if(style==='glow'){
    const y=Math.round(fh*0.4);
    D(Math.round(fw*0.2),y,2,2,eyeCol); D(Math.round(fw*0.6),y,2,2,eyeCol);
  }
}

// scale le modèle pour l'aperçu + ajoute Steve
const STEVE_REF=[
  {o:[-4,24,-2],s:[8,8,8]},{o:[-4,12,-2],s:[8,12,4]},
  {o:[-6,12,-2],s:[2,12,4]},{o:[4,12,-2],s:[2,12,4]},
  {o:[-4,0,-2],s:[3,12,4]},{o:[1,0,-2],s:[3,12,4]},
];
function buildPreview(inst){
  const m=BSEngine.cloneModel(inst._resolved);
  const s=inst.scale||1;
  m.bones.forEach(b=>{ b.pivot=(b.pivot||[0,0,0]).map(v=>v*s);
    (b.cubes||[]).forEach(cu=>{ cu._uvSize=cu.size.slice(); cu.origin=cu.origin.map(v=>v*s); cu.size=cu.size.map(v=>v*s); if(cu.inflate)cu.inflate*=s; }); });
  if(view.steve){
    let maxX=-1e9; m.bones.forEach(b=>(b.cubes||[]).forEach(cu=>maxX=Math.max(maxX,cu.origin[0]+cu.size[0])));
    if(maxX<-1e8)maxX=8;
    const off=maxX+8+4;
    m.bones.push({ name:'steve_ref', pivot:[0,0,0], cubes:STEVE_REF.map(p=>({
      origin:[p.o[0]+off,p.o[1],p.o[2]], size:p.s, color:'#5b7fa6', alpha:0.5, noise:false })) });
  }
  return m;
}

// ═══════════════════════ ÉDITEUR CRÉATURE ═══════════════════════
function renderLists(){
  const build=(arr,type,cur,icon)=> arr.map(x=>`<div class="sidebar-item ${cur===x.id?'active':''}" onclick="BS.select('${type}','${x.id}')">
    <span class="icon">${(x._tpl&&x._tpl.emoji)||icon}</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${x.name}</span>
    <span class="del" onclick="event.stopPropagation();BS.remove('${type}','${x.id}')">✕</span></div>`).join('');
  document.getElementById('list-creature').innerHTML=build(state.creatures,'creature',state.cur.creature,'🐲');
  document.getElementById('list-item').innerHTML=build(state.items,'item',state.cur.item,'⚔');
  document.getElementById('list-furniture').innerHTML=build(state.furniture,'furniture',state.cur.furniture,'🪑');
}
function select(type,id){
  state.cur[type]=id; renderLists(); showPage(type);
  sel[type]=null; renderSelPanel(type);
  if(type==='creature') renderCreatureEditor();
  if(type==='item') renderItemEditor();
  if(type==='furniture') renderFurnitureEditor();
}
function remove(type,id){
  const key=type==='creature'?'creatures':type==='item'?'items':'furniture';
  state[key]=state[key].filter(x=>x.id!==id);
  if(state.cur[type]===id) state.cur[type]=state[key][0]?state[key][0].id:null;
  renderLists();
  if(state.cur[type]){ select(type,state.cur[type]); } else { showPage('gallery'); }
}
function curCreature(){ return state.creatures.find(x=>x.id===state.cur.creature); }
function curItem(){ return state.items.find(x=>x.id===state.cur.item); }
function curFurniture(){ return state.furniture.find(x=>x.id===state.cur.furniture); }

function renderCreatureEditor(){
  const inst=curCreature();
  document.getElementById('creature-preview').style.display=inst?'flex':'none';
  if(!inst){ document.getElementById('creature-editor').innerHTML='<div class="empty-hint">Choisis un modèle de créature dans l\'Accueil.</div>'; return; }
  const tpl=inst._tpl;
  const slotHtml=tpl.colorSlots.map(s=>`<div class="slot"><label>${s.label}</label>
    <input type="color" value="${inst.colors[s.key]}" oninput="BS.setColor('${s.key}',this.value)"></div>`).join('');
  let partsHtml='';
  if(tpl.parts){
    partsHtml=`<div class="card"><div class="card-title">💇 Personnalisation du personnage</div>
      <div class="field" style="margin-bottom:10px"><label class="lbl">Coiffure</label><div class="chips">
      ${tpl.parts.hair.map(h=>`<div class="chip ${inst.parts.hair===h.key?'active':''}" onclick="BS.setPart('hair','${h.key}')">${h.label}</div>`).join('')}</div></div>
      <div class="field"><label class="lbl">Yeux</label><div class="chips">
      ${tpl.parts.eyes.map(e=>`<div class="chip ${inst.parts.eyes===e.key?'active':''}" onclick="BS.setPart('eyes','${e.key}')">${e.label}</div>`).join('')}</div></div></div>`;
  }
  const sounds=['none','mob.ravager.ambient','mob.spider.say','mob.zombie.say','mob.wolf.growl','mob.enderdragon.growl','mob.allay.ambient','mob.villager.idle','mob.irongolem.walk','mob.ghast.scream','mob.wither.ambient'];
  document.getElementById('creature-editor').innerHTML=`
    <div class="card"><div class="card-title">${tpl.emoji} Identité <button class="px-btn" style="margin-left:auto" onclick="BS.help('creature')">? Aide</button></div>
      <div class="form-row">
        <div class="field"><label class="lbl">Nom affiché</label><input type="text" value="${inst.name}" oninput="BS.field('name',this.value)"></div>
        <div class="field"><label class="lbl">ID technique</label><input type="text" value="${inst.mobId}" oninput="BS.field('mobId',this.value)"></div>
      </div>
    </div>
    <div class="card"><div class="card-title">🎨 Couleurs & matériaux</div><div class="slot-grid">${slotHtml}</div></div>
    ${partsHtml}
    <div class="card"><div class="card-title">📊 Statistiques</div>
      <div class="form-row triple">
        <div class="field"><label class="lbl">❤ Points de vie</label><input type="number" min="1" max="2048" value="${inst.stats.hp}" oninput="BS.stat('hp',+this.value)"></div>
        <div class="field"><label class="lbl">⚔ Dégâts</label><input type="number" min="0" max="100" value="${inst.stats.damage}" oninput="BS.stat('damage',+this.value)"></div>
        <div class="field"><label class="lbl">🛡 Armure</label><input type="number" min="0" max="30" value="${inst.stats.armor||0}" oninput="BS.stat('armor',+this.value)"></div>
      </div>
      <div class="form-row">
        <div class="field"><label class="lbl">🏃 Vitesse (0.05–0.8)</label><input type="number" step="0.01" min="0.05" max="0.8" value="${inst.stats.speed}" oninput="BS.stat('speed',+this.value)"></div>
        <div class="field"><label class="lbl">🔊 Sons</label><select onchange="BS.field('_snd',this.value)">
          ${sounds.map(s=>`<option value="${s}" ${inst.sounds.ambient===s?'selected':''}>${s==='none'?'Aucun':s}</option>`).join('')}
        </select></div>
      </div>
    </div>
    <div class="card"><div class="card-title">⚙ Options</div><div class="toggles-grid">
      <div class="trow"><span class="tlabel">🔥 Immunité au feu</span><label class="toggle"><input type="checkbox" ${inst.options.fireImmune?'checked':''} onchange="BS.opt('fireImmune',this.checked)"><span class="tslider"></span></label></div>
      <div class="trow"><span class="tlabel">👑 Boss (barre de vie)</span><label class="toggle"><input type="checkbox" ${inst.options.boss?'checked':''} onchange="BS.opt('boss',this.checked)"><span class="tslider"></span></label></div>
      <div class="trow"><span class="tlabel">🥚 Œuf d'apparition</span><label class="toggle"><input type="checkbox" ${inst.options.spawnEgg?'checked':''} onchange="BS.opt('spawnEgg',this.checked)"><span class="tslider"></span></label></div>
      <div class="trow"><span class="tlabel">✨ Peut voler</span><label class="toggle"><input type="checkbox" ${tpl.flying?'checked':''} onchange="BS.opt('flying',this.checked)"><span class="tslider"></span></label></div>
    </div></div>
    <div class="card"><div class="card-title">🎁 Butins (drops)</div><div id="drops">${dropsHtml(inst)}</div>
      <button class="add-mini" onclick="BS.addDrop()">+ Ajouter un butin</button></div>
    ${geoEditorCard('creature')}`;
  buildAnimTools();
  updateScaleReadout();
}
function dropsHtml(inst){
  return inst.drops.map((d,i)=>`<div class="drop-item"><span>📦</span>
    <input type="text" style="flex:1" value="${d.item}" placeholder="minecraft:diamond ou ns:item" oninput="BS.drop(${i},'item',this.value)">
    <span style="font-size:11px;color:var(--muted)">×</span><input type="number" style="width:40px" value="${d.count}" min="1" max="64" oninput="BS.drop(${i},'count',+this.value)">
    <input type="number" style="width:46px" value="${d.chance}" min="1" max="100" oninput="BS.drop(${i},'chance',+this.value)"><span style="font-size:11px;color:var(--muted)">%</span>
    <button class="rm" onclick="BS.rmDrop(${i})">✕</button></div>`).join('');
}
function buildAnimTools(){
  const inst=curCreature(); if(!inst)return;
  const anims=[['none','⏸ Statique'],['idle','🌬 Repos'],['walk','🚶 Marche'],['run','🏃 Course'],['attack','⚔ Attaque'],['roar','🦁 Rugir'],['sleep','😴 Sommeil']];
  if(inst._tpl.flying) anims.push(['fly','🕊 Vol']);
  document.getElementById('anim-tools').innerHTML=anims.map(a=>`<button class="vbtn ${view.anim===a[0]?'active':''}" onclick="BS.setAnim('${a[0]}')">${a[1]}</button>`).join('');
}

// setters créature
function field(k,v){ const i=curCreature(); if(!i)return;
  if(k==='_snd'){ i.sounds.ambient=v==='none'?undefined:v; return; }
  i[k]=v; if(k==='name'){ renderLists(); } }
function setColor(slot,v){ const i=curCreature(); if(!i)return; i.colors[slot]=v; resolveCreature(i); }
function setPart(kind,v){ const i=curCreature(); if(!i)return; i.parts[kind]=v; resolveCreature(i); renderCreatureEditor(); }
function stat(k,v){ const i=curCreature(); if(!i)return; i.stats[k]=v; }
function opt(k,v){ const i=curCreature(); if(!i)return; i.options[k]=v; if(k==='flying'){i._tpl.flying=v;buildAnimTools();} }
function addDrop(){ const i=curCreature(); if(!i)return; i.drops.push({item:'minecraft:emerald',count:1,chance:50}); document.getElementById('drops').innerHTML=dropsHtml(i); }
function drop(idx,k,v){ const i=curCreature(); if(!i)return; i.drops[idx][k]=v; }
function rmDrop(idx){ const i=curCreature(); if(!i)return; i.drops.splice(idx,1); document.getElementById('drops').innerHTML=dropsHtml(i); }
function setAnim(a){ view.anim=a; buildAnimTools(); }
function toggleSteve(){ view.steve=!view.steve; document.getElementById('steve-btn').classList.toggle('active',view.steve); }
function toggleRotate(){ view.autorotate=!view.autorotate; document.getElementById('rot-btn').classList.toggle('active',view.autorotate); }
function resetView(){ view.rotX=-12; view.rotY=28; view.zoom=1; }
function updateScaleReadout(){
  const i=curCreature(); if(!i)return;
  const h=E.modelHeightBlocks(i._resolved,i.scale);
  document.getElementById('scale-readout').textContent='≈ '+h.toFixed(1)+' bloc'+(h>=2?'s':'');
  document.getElementById('scale-range').value=i.scale;
}

// ═══════════════════════ ÉDITEUR OBJET ═══════════════════════
function renderItemEditor(){
  const inst=curItem();
  const prev=document.getElementById('item-preview');
  prev.style.display=inst?'flex':'none';
  if(!inst){ document.getElementById('item-editor').innerHTML='<div class="empty-hint">Choisis un objet dans l\'Accueil.</div>'; return; }
  document.getElementById('item-view-tools').style.display=inst.mode==='3d'?'flex':'none';
  document.getElementById('item-scale-wrap').style.display=inst.mode==='3d'?'flex':'none';
  if(inst.mode==='3d') renderItem3DEditor(inst); else renderItem2DEditor(inst);
}
function renderItem3DEditor(inst){
  const tpl=inst._tpl;
  const slotHtml=tpl.colorSlots.map(s=>`<div class="slot"><label>${s.label}</label>
    <input type="color" value="${inst.colors[s.key]}" oninput="BS.setIColor('${s.key}',this.value)"></div>`).join('');
  document.getElementById('item-editor').innerHTML=`
    <div class="card"><div class="card-title">${tpl.emoji} Identité — objet 3D</div>
      <div class="form-row">
        <div class="field"><label class="lbl">Nom affiché</label><input type="text" value="${inst.name}" oninput="BS.ifield('name',this.value)"></div>
        <div class="field"><label class="lbl">ID technique</label><input type="text" value="${inst.itemId}" oninput="BS.ifield('itemId',this.value)"></div>
      </div></div>
    <div class="card"><div class="card-title">🎨 Couleurs</div><div class="slot-grid">${slotHtml}</div></div>
    <div class="card"><div class="card-title">⚔ Statistiques</div><div class="form-row">
      <div class="field"><label class="lbl">Dégâts</label><input type="number" min="0" max="100" value="${inst.stats.damage||0}" oninput="BS.istat('damage',+this.value)"></div>
      <div class="field"><label class="lbl">Durabilité</label><input type="number" min="0" max="10000" value="${inst.stats.durability||0}" oninput="BS.istat('durability',+this.value)"></div>
    </div>
    <div class="toggles-grid">
      <div class="trow"><span class="tlabel">💎 Brillance d'enchantement</span><label class="toggle"><input type="checkbox" ${inst.options.glint?'checked':''} onchange="BS.iopt('glint',this.checked)"><span class="tslider"></span></label></div>
    </div></div>
    ${geoEditorCard('item')}`;
}
function renderItem2DEditor(inst){
  document.getElementById('item-editor').innerHTML=`
    <div class="card"><div class="card-title">🎨 Identité — objet 2D pixel</div>
      <div class="form-row">
        <div class="field"><label class="lbl">Nom affiché</label><input type="text" value="${inst.name}" oninput="BS.ifield('name',this.value)"></div>
        <div class="field"><label class="lbl">ID technique</label><input type="text" value="${inst.itemId}" oninput="BS.ifield('itemId',this.value)"></div>
      </div>
      <div class="form-row"><div class="field"><label class="lbl">Type d'objet</label><select onchange="BS.ifield('itemType',this.value)">
        ${['misc','sword','axe','pickaxe','food'].map(x=>`<option value="${x}" ${inst.itemType===x?'selected':''}>${x}</option>`).join('')}</select></div>
        <div class="field"><label class="lbl">Dégâts (si arme)</label><input type="number" min="0" max="100" value="${inst.stats.damage||0}" oninput="BS.istat('damage',+this.value)"></div></div>
    </div>
    <div class="card"><div class="card-title">🖌 Éditeur pixel ${inst.gridSize}×${inst.gridSize}</div>
      <div style="display:flex;justify-content:center"><canvas id="pixelCanvas" width="384" height="384"></canvas></div>
      <div class="px-tools">
        <button class="px-btn active" id="tool-pen" onclick="BS.setTool('pen')">✏ Crayon</button>
        <button class="px-btn" id="tool-fill" onclick="BS.setTool('fill')">🪣 Remplir</button>
        <button class="px-btn" id="tool-erase" onclick="BS.setTool('erase')">◻ Gomme</button>
        <button class="px-btn" onclick="BS.clearPx()">🗑 Tout effacer</button>
      </div>
      <div class="palette-row" id="px-palette"></div>
      <div style="margin-top:8px;display:flex;gap:8px;align-items:center">
        <input type="color" id="custom-color" value="#c8a55a" style="width:32px;height:26px;background:none;border:1px solid var(--border)">
        <button class="px-btn" onclick="BS.addColor()">+ Couleur</button></div>
    </div>`;
  initPixel(inst);
}

function setIColor(s,v){ const i=curItem(); if(!i)return; i.colors[s]=v; resolveItem(i); }
function ifield(k,v){ const i=curItem(); if(!i)return; i[k]=v; if(k==='name')renderLists(); }
function istat(k,v){ const i=curItem(); if(!i)return; i.stats[k]=v; }
function iopt(k,v){ const i=curItem(); if(!i)return; i.options[k]=v; }
function toggleItemRotate(){ itemView.autorotate=!itemView.autorotate; document.getElementById('item-rot-btn').classList.toggle('active',itemView.autorotate); }
function resetItemView(){ itemView.rotX=-12; itemView.rotY=28; }

// ── Éditeur pixel 2D ──
let pxTool='pen', pxColor='#c8a55a', pxDrawing=false;
function initPixel(inst){
  pxColor=inst.palette[0]||'#c8a55a';
  renderPalette(inst); redrawPx(inst);
  const c=document.getElementById('pixelCanvas'); if(!c)return;
  const cell=384/inst.gridSize;
  function at(e){ const r=c.getBoundingClientRect(); const sx=384/r.width; return {x:Math.floor((e.clientX-r.left)*sx/cell),y:Math.floor((e.clientY-r.top)*sx/cell)}; }
  function paint(e){ const {x,y}=at(e); const gs=inst.gridSize; if(x<0||y<0||x>=gs||y>=gs)return;
    if(pxTool==='erase')inst.pixels[y][x]=null; else if(pxTool==='pen')inst.pixels[y][x]=pxColor;
    else if(pxTool==='fill')flood(inst,x,y,inst.pixels[y][x],pxColor); redrawPx(inst); }
  c.onmousedown=e=>{pxDrawing=true;paint(e);}; c.onmousemove=e=>{if(pxDrawing)paint(e);};
  c.onmouseup=()=>pxDrawing=false; c.onmouseleave=()=>pxDrawing=false;
  c.ontouchstart=e=>{e.preventDefault();pxDrawing=true;paint(e.touches[0]);};
  c.ontouchmove=e=>{e.preventDefault();if(pxDrawing)paint(e.touches[0]);};
  c.ontouchend=()=>pxDrawing=false;
}
function flood(inst,x,y,tgt,rep){ const px=inst.pixels,gs=inst.gridSize;
  if(tgt===rep||x<0||x>=gs||y<0||y>=gs||px[y][x]!==tgt)return; px[y][x]=rep;
  [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>flood(inst,x+dx,y+dy,tgt,rep)); }
function redrawPx(inst){ const c=document.getElementById('pixelCanvas'); if(!c)return; const ctx=c.getContext('2d');
  const gs=inst.gridSize, cell=384/gs; ctx.clearRect(0,0,384,384);
  for(let y=0;y<gs;y++)for(let x=0;x<gs;x++){ ctx.fillStyle=(x+y)%2?'#14181f':'#1a1f28'; ctx.fillRect(x*cell,y*cell,cell,cell);
    if(inst.pixels[y][x]){ctx.fillStyle=inst.pixels[y][x];ctx.fillRect(x*cell,y*cell,cell,cell);} } }
function renderPalette(inst){ const el=document.getElementById('px-palette'); if(!el)return; el.innerHTML='';
  inst.palette.forEach((col,i)=>{ const s=document.createElement('div'); s.className='swatch'+(col===pxColor?' active':''); s.style.background=col;
    s.onclick=()=>{pxColor=col;pxTool='pen';setTool('pen');renderPalette(inst);};
    s.oncontextmenu=e=>{e.preventDefault(); if(inst.palette.length>1){inst.palette.splice(i,1);renderPalette(inst);}}; el.appendChild(s); }); }
function setTool(t){ pxTool=t; ['pen','fill','erase'].forEach(x=>{const el=document.getElementById('tool-'+x);if(el)el.classList.toggle('active',x===t);}); }
function clearPx(){ const i=curItem(); if(!i)return; i.pixels=Array.from({length:i.gridSize},()=>Array(i.gridSize).fill(null)); redrawPx(i); }
function addColor(){ const i=curItem(); if(!i)return; const c=document.getElementById('custom-color').value; if(!i.palette.includes(c))i.palette.push(c); pxColor=c; renderPalette(i); }
function load2DPreset(inst,preset){
  const g=inst.gridSize, p=inst.palette; const set=(x,y,c)=>{if(x>=0&&y>=0&&x<g&&y<g)inst.pixels[y][x]=c;};
  if(preset==='gem'){ for(let y=3;y<13;y++)for(let x=3;x<13;x++){ const d=Math.abs(x-8)+Math.abs(y-8); if(d<6)set(x,y,d<3?p[0]:d<5?p[1]:p[2]); } }
  else if(preset==='coin'){ for(let y=3;y<13;y++)for(let x=3;x<13;x++){ const d=Math.hypot(x-7.5,y-7.5); if(d<5)set(x,y,d<3?p[0]:d<4.3?p[1]:p[2]); } }
  else if(preset==='scroll'){ for(let y=4;y<12;y++)for(let x=2;x<14;x++)set(x,y,p[0]); for(let y=4;y<12;y++){set(2,y,p[2]);set(13,y,p[2]);} }
}

// ═══════════════════════ ÉDITEUR MOBILIER ═══════════════════════
function renderFurnitureEditor(){
  const inst=curFurniture();
  document.getElementById('furniture-preview').style.display=inst?'flex':'none';
  if(!inst){ document.getElementById('furniture-editor').innerHTML='<div class="empty-hint">Choisis un meuble dans l\'Accueil.</div>'; return; }
  const tpl=inst._tpl;
  const slotHtml=tpl.colorSlots.map(s=>`<div class="slot"><label>${s.label}</label>
    <input type="color" value="${inst.colors[s.key]}" oninput="BS.setFColor('${s.key}',this.value)"></div>`).join('');
  document.getElementById('furniture-editor').innerHTML=`
    <div class="card"><div class="card-title">${tpl.emoji} Identité — bloc décoratif</div>
      <div class="form-row">
        <div class="field"><label class="lbl">Nom affiché</label><input type="text" value="${inst.name}" oninput="BS.ffield('name',this.value)"></div>
        <div class="field"><label class="lbl">ID technique</label><input type="text" value="${inst.blockId}" oninput="BS.ffield('blockId',this.value)"></div>
      </div></div>
    <div class="card"><div class="card-title">🎨 Couleurs & matériaux</div><div class="slot-grid">${slotHtml}</div></div>
    <div class="card"><div class="card-title">💡 Options</div>
      <div class="field"><label class="lbl">Émission de lumière (0–15)</label><input type="number" min="0" max="15" value="${inst.options.light||0}" oninput="BS.fopt('light',+this.value)"></div>
    </div>
    ${geoEditorCard('furniture')}`;
}
function setFColor(s,v){ const i=curFurniture(); if(!i)return; i.colors[s]=v; resolveFurniture(i); }
function ffield(k,v){ const i=curFurniture(); if(!i)return; i[k]=v; if(k==='name')renderLists(); }
function fopt(k,v){ const i=curFurniture(); if(!i)return; i.options[k]=v; }
function toggleFurnRotate(){ furnView.autorotate=!furnView.autorotate; document.getElementById('furn-rot-btn').classList.toggle('active',furnView.autorotate); }
function resetFurnView(){ furnView.rotX=-20; furnView.rotY=32; }

// ═══════════════════════ BOUCLE DE RENDU 3D ═══════════════════════
function frame(ts){
  requestAnimationFrame(frame);
  const t=ts/1000;
  if(state.page==='creature'){
    const i=curCreature(); const c=document.getElementById('viewCanvas');
    if(i&&c){ if(view.autorotate)view.rotY=(view.rotY+0.5)%360;
      const m=buildPreview(i); const pose=E.poseAt(i._resolved,view.anim,t);
      E.renderModel(c,m,{rotX:view.rotX,rotY:view.rotY,zoom:view.zoom,pose,ground:true,pickStore:pickStores.creature,sel:sel.creature}); }
  } else if(state.page==='item'){
    const i=curItem(); const c=document.getElementById('itemViewCanvas');
    if(i&&c){ if(i.mode==='3d'&&i._resolved){ if(itemView.autorotate)itemView.rotY=(itemView.rotY+0.6)%360;
        E.renderModel(c,i._resolved,{rotX:itemView.rotX,rotY:itemView.rotY,zoom:1,ground:false,pickStore:pickStores.item,sel:sel.item}); }
      else if(i.mode==='2d'){ pickStores.item.length=0; drawPixelPreview(c,i); } }
  } else if(state.page==='furniture'){
    const i=curFurniture(); const c=document.getElementById('furnViewCanvas');
    if(i&&c&&i._resolved){ if(furnView.autorotate)furnView.rotY=(furnView.rotY+0.5)%360;
      E.renderModel(c,i._resolved,{rotX:furnView.rotX,rotY:furnView.rotY,zoom:0.85,ground:true,pickStore:pickStores.furniture,sel:sel.furniture}); }
  }
}
function drawPixelPreview(c,inst){ const ctx=c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height);
  const gs=inst.gridSize, s=Math.floor(Math.min(c.width,c.height)*0.7/gs), ox=(c.width-s*gs)/2, oy=(c.height-s*gs)/2;
  ctx.imageSmoothingEnabled=false;
  for(let y=0;y<gs;y++)for(let x=0;x<gs;x++){ if(inst.pixels[y][x]){ctx.fillStyle=inst.pixels[y][x];ctx.fillRect(ox+x*s,oy+y*s,s,s);} } }

// ── interactions souris (rotation) ──
function bindDrag(canvasId,vw,type){
  const c=document.getElementById(canvasId); if(!c)return;
  let dragging=false,lx=0,ly=0,moved=0;
  const down=e=>{dragging=true;moved=0;const p=e.touches?e.touches[0]:e;lx=p.clientX;ly=p.clientY;c.parentElement.classList.add('dragging');
    if(type&&paint[type].on){ paintAt(type,c,p.clientX,p.clientY); if(e.touches)e.preventDefault(); } };
  const move=e=>{ if(!dragging)return; const p=e.touches?e.touches[0]:e;
    if(type&&paint[type].on){ paintAt(type,c,p.clientX,p.clientY); if(e.touches)e.preventDefault(); return; }
    const dx=p.clientX-lx, dy=p.clientY-ly; moved+=Math.abs(dx)+Math.abs(dy);
    if(moved>4){ vw.autorotate=false; const b=document.getElementById(canvasId==='viewCanvas'?'rot-btn':canvasId==='itemViewCanvas'?'item-rot-btn':'furn-rot-btn'); if(b)b.classList.remove('active'); }
    vw.rotY=(vw.rotY+dx*0.6)%360; vw.rotX=Math.max(-89,Math.min(89,vw.rotX-dy*0.5)); lx=p.clientX;ly=p.clientY; if(e.touches)e.preventDefault(); };
  const up=e=>{ if(dragging&&moved<=4&&type&&!paint[type].on){ const p=(e.changedTouches&&e.changedTouches[0])||e; pickAt(type,c,p.clientX,p.clientY); }
    if(dragging&&type&&paint[type].on) pushHistory();
    dragging=false;c.parentElement.classList.remove('dragging'); };
  c.addEventListener('mousedown',down);window.addEventListener('mousemove',move);window.addEventListener('mouseup',up);
  c.addEventListener('touchstart',down,{passive:false});c.addEventListener('touchmove',move,{passive:false});c.addEventListener('touchend',up);
  c.addEventListener('wheel',e=>{e.preventDefault();vw.zoom=Math.max(0.4,Math.min(3,(vw.zoom||1)*(e.deltaY<0?1.1:0.9)));},{passive:false});
}

// ── Sélection au clic + panneau du cube sélectionné ────────────────────────
function pickAt(type,canvas,clientX,clientY){
  const r=canvas.getBoundingClientRect();
  const x=(clientX-r.left)*canvas.width/r.width, y=(clientY-r.top)*canvas.height/r.height;
  const hit=E.pickAtPoint(pickStores[type],x,y);
  sel[type]=hit||null;
  renderSelPanel(type);
}
function selCube(type){
  const inst=geoInst(type); const s=sel[type]; if(!inst||!s||!inst.geo)return null;
  const bi=inst.geo.bones.findIndex(b=>b.name===s.bone); if(bi<0)return null;
  const cu=(inst.geo.bones[bi].cubes||[])[s.ci]; if(!cu)return null;
  return { inst, bi, ci:s.ci, cu, bone:inst.geo.bones[bi] };
}
function renderSelPanel(type){
  const el=document.getElementById('sel-'+type); if(!el)return;
  const found=selCube(type);
  if(!found){ el.innerHTML='<div class="sel-hint">🖱 Clique sur un cube du modèle pour le modifier ici</div>'; return; }
  const {cu,bone}=found;
  const ax=['X','Y','Z'];
  const nrow=(label,kind)=>`<div class="sel-row"><span class="sel-lbl">${label}</span>${ax.map((a,i)=>
    `<span class="sel-axis">${a}</span><button class="nudge" onclick="BS.selNudge('${type}','${kind}',${i},-1)">−</button><span class="sel-val">${cu[kind][i]}</span><button class="nudge" onclick="BS.selNudge('${type}','${kind}',${i},1)">+</button>`).join('')}</div>`;
  el.innerHTML=`<div class="sel-head">🧊 <b>${bone.name}</b> · cube ${found.ci+1}
      <input type="color" value="${cubeHex(found.inst,cu)}" style="width:26px;height:22px;margin-left:auto;background:none;border:1px solid var(--border)" oninput="BS.selColor('${type}',this.value)">
    </div>
    ${nrow('Position','origin')}
    ${nrow('Taille','size')}
    <div class="sel-row"><span class="sel-lbl">Relief</span>
      <button class="nudge" onclick="BS.selInflate('${type}',-0.25)">−</button><span class="sel-val">${cu.inflate||0}</span><button class="nudge" onclick="BS.selInflate('${type}',0.25)">+</button>
      <span style="flex:1"></span>
      <button class="px-btn" onclick="BS.selDup('${type}')">⧉ Dupliquer</button>
      <button class="px-btn" style="color:var(--red)" onclick="BS.selDel('${type}')">✕ Supprimer</button>
    </div>`;
}
// ── Peinture 3D ─────────────────────────────────────────────────────────
function paintCubes(type,pick){
  const inst=geoInst(type); if(!inst||!inst.geo)return [];
  const out=[];
  const sb=inst.geo.bones.find(b=>b.name===pick.bone);
  if(sb&&sb.cubes&&sb.cubes[pick.ci]) out.push(sb.cubes[pick.ci]);
  const rm=inst._resolved; if(rm){
    const rb=rm.bones.find(b=>b.name===pick.bone);
    if(rb&&rb.cubes&&rb.cubes[pick.ci]) out.push(rb.cubes[pick.ci]);
  }
  return out;
}
function paintAt(type,canvas,clientX,clientY){
  const r=canvas.getBoundingClientRect();
  const x=(clientX-r.left)*canvas.width/r.width, y=(clientY-r.top)*canvas.height/r.height;
  const hit=E.paintHit(pickStores[type],x,y); if(!hit)return;
  const pt=paint[type];
  const [w,h]=hit.dims, cw=Math.ceil(w), ch=Math.ceil(h);
  paintCubes(type,hit.pick).forEach(cu=>{
    cu.paint=cu.paint||{}; const fp=cu.paint[hit.faceKey]=cu.paint[hit.faceKey]||{};
    for(let dy=0;dy<pt.size;dy++)for(let dx=0;dx<pt.size;dx++){
      const tx=hit.px+dx, ty=hit.py+dy;
      if(tx>=cw||ty>=ch)continue;
      if(pt.erase) delete fp[tx+','+ty]; else fp[tx+','+ty]=pt.color;
    }
    if(pt.erase&&!Object.keys(fp).length){ delete cu.paint[hit.faceKey]; if(!Object.keys(cu.paint).length)delete cu.paint; }
  });

}
function togglePaint(type){
  const pt=paint[type]; pt.on=!pt.on;
  const btn=document.getElementById('paint-btn-'+type); if(btn)btn.classList.toggle('active',pt.on);
  const cv=document.getElementById(type==='creature'?'viewCanvas':type==='item'?'itemViewCanvas':'furnViewCanvas');
  if(cv)cv.parentElement.classList.toggle('painting',pt.on);
  if(pt.on){
    const vw=type==='creature'?view:type==='item'?itemView:furnView;
    vw.autorotate=false;
    const rb=document.getElementById(type==='creature'?'rot-btn':type==='item'?'item-rot-btn':'furn-rot-btn');
    if(rb)rb.classList.remove('active');
    renderPaintPanel(type);
  } else renderSelPanel(type);
}
function renderPaintPanel(type){
  const el=document.getElementById('sel-'+type); if(!el)return;
  const pt=paint[type];
  el.innerHTML=`<div class="sel-head">🖌 <b>Peinture 3D</b>
      <span style="font-size:10px;color:var(--muted);margin-left:4px">glisse sur le modèle pour peindre</span>
      <button class="px-btn" style="margin-left:auto" onclick="BS.togglePaint('${type}')">✕ Fermer</button></div>
    <div class="paint-swatches">${PAINT_SWATCHES.map(c=>
      `<div class="pswatch ${!pt.erase&&pt.color===c?'active':''}" style="background:${c}" onclick="BS.paintColor('${type}','${c}')"></div>`).join('')}
      <input type="color" value="${pt.color}" style="width:24px;height:24px;background:none;border:1px solid var(--border);padding:1px;cursor:pointer" oninput="BS.paintColor('${type}',this.value)">
    </div>
    <div class="sel-row" style="border-top:none">
      <span class="sel-lbl">Pinceau</span>
      <button class="px-btn ${pt.size===1?'active':''}" onclick="BS.paintSize('${type}',1)">1px</button>
      <button class="px-btn ${pt.size===2?'active':''}" onclick="BS.paintSize('${type}',2)">2px</button>
      <button class="px-btn ${pt.size===3?'active':''}" onclick="BS.paintSize('${type}',3)">3px</button>
      <span style="flex:1"></span>
      <button class="px-btn ${pt.erase?'active':''}" onclick="BS.paintErase('${type}')">◻ Gomme</button>
      <button class="px-btn" style="color:var(--red)" onclick="BS.paintClear('${type}')">🗑 Tout effacer</button>
    </div>`;
}
function paintColor(type,c){ paint[type].color=c; paint[type].erase=false; renderPaintPanel(type); }
function paintSize(type,s){ paint[type].size=s; renderPaintPanel(type); }
function paintErase(type){ paint[type].erase=!paint[type].erase; renderPaintPanel(type); }
function paintClear(type){
  const inst=geoInst(type); if(!inst||!inst.geo)return;
  [inst.geo,inst._resolved].forEach(m=>m&&m.bones.forEach(b=>(b.cubes||[]).forEach(cu=>{delete cu.paint;})));
  toast("Peinture effacée");
}

function selNudge(type,kind,axis,delta){ const f=selCube(type); if(!f)return;
  f.cu[kind][axis]=Math.round((f.cu[kind][axis]+delta)*2)/2;
  if(kind==='size') f.cu[kind][axis]=Math.max(0.5,f.cu[kind][axis]);
  geoResolve(type); renderSelPanel(type); if(geoOpen[type])renderGeoInner(type); }
function selInflate(type,delta){ const f=selCube(type); if(!f)return;
  f.cu.inflate=Math.max(0,Math.round(((f.cu.inflate||0)+delta)*4)/4);
  geoResolve(type); renderSelPanel(type); if(geoOpen[type])renderGeoInner(type); }
function selColor(type,v){ const f=selCube(type); if(!f)return; f.cu.color=v; f.cu.slot=null;
  geoResolve(type); if(geoOpen[type])renderGeoInner(type); }
function selDup(type){ const f=selCube(type); if(!f)return;
  const copy=JSON.parse(JSON.stringify(f.cu)); copy.origin=[copy.origin[0]+1,copy.origin[1]+1,copy.origin[2]];
  f.bone.cubes.splice(f.ci+1,0,copy); sel[type]={bone:f.bone.name,ci:f.ci+1};
  geoResolve(type); renderSelPanel(type); if(geoOpen[type])renderGeoInner(type); }
function selDel(type){ const f=selCube(type); if(!f)return;
  f.bone.cubes.splice(f.ci,1); sel[type]=null;
  geoResolve(type); renderSelPanel(type); if(geoOpen[type])renderGeoInner(type); }

// scale range
document.addEventListener('input',e=>{
  if(e.target.id==='scale-range'){ const i=curCreature(); if(i){i.scale=+e.target.value;updateScaleReadout();} }
  if(e.target.id==='item-scale-range'){ const i=curItem(); if(i){i.scale=+e.target.value;document.getElementById('item-scale-readout').textContent='Taille '+i.scale.toFixed(1)+'×';} }
});

// ═══════════════════════ EXPORT .MCADDON ═══════════════════════
function b64toBlob(b64){ const bin=atob(b64),arr=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i); return new Blob([arr],{type:'image/png'}); }
function J(o){ return JSON.stringify(o,null,2); }

function renderIconPNG(model,size){ size=size||64; const c=document.createElement('canvas'); c.width=size;c.height=size;
  E.renderModel(c,model,{rotX:-18,rotY:32,zoom:1,ground:false}); return c.toDataURL('image/png').split(',')[1]; }
function pixelIconPNG(inst){ const c=document.createElement('canvas'); c.width=inst.gridSize;c.height=inst.gridSize; const ctx=c.getContext('2d');
  for(let y=0;y<inst.gridSize;y++)for(let x=0;x<inst.gridSize;x++){ if(inst.pixels[y][x]){ctx.fillStyle=inst.pixels[y][x];ctx.fillRect(x,y,1,1);} }
  return c.toDataURL('image/png').split(',')[1]; }
function packIconPNG(){ const c=document.createElement('canvas');c.width=128;c.height=128;const ctx=c.getContext('2d');
  const g=ctx.createRadialGradient(64,54,10,64,64,80); g.addColorStop(0,'#1a2438');g.addColorStop(1,'#0a0c12'); ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
  ctx.fillStyle='#c8a55a';ctx.font='bold 60px serif';ctx.textAlign='center';ctx.fillText('⚔',64,84); return c.toDataURL('image/png').split(',')[1]; }

function makeManifest(name,desc,kind,rpUuid,needScript){
  const m={ format_version:2, header:{ name, description:desc, uuid:uuid(), version:[1,0,0], min_engine_version:[1,21,0] }, modules:[] };
  if(kind==='rp'){ m.modules.push({ type:'resources', uuid:uuid(), version:[1,0,0] }); }
  else { m.modules.push({ type:'data', uuid:uuid(), version:[1,0,0] });
    if(needScript) m.modules.push({ type:'script', language:'javascript', uuid:uuid(), version:[1,0,0], entry:'scripts/main.js' });
    m.dependencies=[];
    if(needScript) m.dependencies.push({ module_name:'@minecraft/server', version:'1.14.0' });
    if(rpUuid) m.dependencies.push({ uuid:rpUuid, version:[1,0,0] });
  }
  return m;
}

// construit un dossier BP+RP dans un zip pour un ensemble d'assets
async function buildAddon(assets){
  const NS=ns(), PN=projName();
  const zip=new JSZip();
  const rp=zip.folder(PN+' RP'), bp=zip.folder(PN+' BP');
  const rpManifest=makeManifest(PN+' [RP]','Ressources — '+PN,'rp');
  const rpUuid=rpManifest.header.modules?null:rpManifest.modules[0].uuid;
  // besoin de script ? (aucun pour l'instant → packs 100% data/resource, fiables)
  const bpManifest=makeManifest(PN+' [BP]','Comportements — '+PN,'bp',rpManifest.header.uuid?null:null);
  // relie BP → RP via uuid du header RP
  bpManifest.dependencies=[{ uuid:rpManifest.header.uuid, version:[1,0,0] }];
  rp.file('manifest.json',J(rpManifest));
  bp.file('manifest.json',J(bpManifest));
  rp.file('pack_icon.png',b64toBlob(packIconPNG()));
  bp.file('pack_icon.png',b64toBlob(packIconPNG()));

  const langFR=[], langEN=[], itemTex={}, terrainTex={};

  assets.creatures.forEach(inst=>addCreature(inst,NS,rp,bp,langFR,langEN));
  assets.items.forEach(inst=>addItem(inst,NS,rp,bp,langFR,langEN,itemTex));
  assets.furniture.forEach(inst=>addFurniture(inst,NS,rp,bp,langFR,langEN,terrainTex));

  if(Object.keys(itemTex).length) rp.file('textures/item_texture.json',J({ resource_pack_name:NS, texture_name:'atlas.items', texture_data:itemTex }));
  if(Object.keys(terrainTex).length) rp.file('textures/terrain_texture.json',J({ resource_pack_name:NS, texture_name:'atlas.terrain', padding:8, num_mip_levels:4, texture_data:terrainTex }));
  rp.file('texts/fr_FR.lang',langFR.join('\n')+'\n');
  rp.file('texts/en_US.lang',langEN.join('\n')+'\n');
  rp.file('texts/languages.json',J(['fr_FR','en_US']));
  bp.file('texts/fr_FR.lang',langFR.join('\n')+'\n');

  return zip;
}

function addCreature(inst,NS,rp,bp,langFR,langEN){
  const id=slug(inst.mobId), ident=NS+':'+id, geoId='geometry.'+NS+'.'+id;
  const model=inst._resolved;
  // RP: géométrie + texture
  rp.file('models/entity/'+id+'.geo.json',J(E.toGeometryJSON(model,geoId)));
  rp.file('textures/entity/'+id+'/'+id+'.png',b64toBlob(E.generateTexture(model)));
  // animations
  const anims=E.buildAnimations(model);
  const headBone=model.bones.find(b=>/head/i.test(b.name));
  const animJson=E.toAnimationJSON(NS,id,anims);
  if(headBone){
    animJson.animations['animation.'+id+'.look_at']={ loop:true,
      bones:{ [headBone.name]:{ rotation:['query.target_x_rotation','query.target_y_rotation',0] } } };
  }
  rp.file('animations/'+id+'.animation.json',J(animJson));
  // animation controller (états idle/marche/combat)
  rp.file('animation_controllers/'+id+'.animation_controllers.json',J({
    format_version:'1.10.0',
    animation_controllers:{ ['controller.animation.'+NS+'_'+id+'.general']:{
      initial_state:'idle',
      states:{
        idle:{ animations:['idle'], transitions:[{ move:'q.modified_move_speed > 0.1' },{ roar:'q.has_target' }] },
        move:{ animations:['walk'], blend_transition:0.2, transitions:[{ run:'q.modified_move_speed > 0.5' },{ idle:'q.modified_move_speed <= 0.1' },{ attack:'q.has_target' }] },
        run:{ animations:['run'], blend_transition:0.15, transitions:[{ move:'q.modified_move_speed <= 0.5' },{ attack:'q.has_target' }] },
        roar:{ animations:['roar'], blend_transition:0.1, transitions:[{ attack:'q.all_animations_finished' },{ idle:'!q.has_target' }] },
        attack:{ animations:['attack'], blend_transition:0.1, transitions:[{ idle:'!q.has_target' }] },
      } } }
  }));
  // render controller
  rp.file('render_controllers/'+id+'.render_controllers.json',J({
    format_version:'1.10.0',
    render_controllers:{ ['controller.render.'+NS+'_'+id]:{ geometry:'Geometry.default', materials:[{ '*':'Material.default' }], textures:['Texture.default'] } }
  }));
  // client entity
  const eng=E.hexToRgb(inst.colors[inst._tpl.colorSlots[0].key]||'#888');
  rp.file('entity/'+id+'.entity.json',J({
    format_version:'1.10.0',
    'minecraft:client_entity':{ description:{
      identifier:ident,
      materials:{ default:'entity_alphatest' },
      textures:{ default:'textures/entity/'+id+'/'+id },
      geometry:{ default:geoId },
      animations:Object.assign({ idle:'animation.'+id+'.idle', walk:'animation.'+id+'.walk', attack:'animation.'+id+'.attack',
        run:'animation.'+id+'.run', roar:'animation.'+id+'.roar', sleep:'animation.'+id+'.sleep',
        general:'controller.animation.'+NS+'_'+id+'.general' },
        headBone?{ look_at:'animation.'+id+'.look_at' }:{}),
      scripts:{ animate: headBone?['general','look_at']:['general'] },
      render_controllers:['controller.render.'+NS+'_'+id],
      spawn_egg:{ base_color:rgbHex(eng), overlay_color:'#e8c878' },
    } }
  }));
  // BP: entité serveur
  const flying=inst.options.flying, boss=inst.options.boss;
  const comp={
    'minecraft:type_family':{ family:['monster',id] },
    'minecraft:health':{ value:inst.stats.hp, max:inst.stats.hp },
    'minecraft:attack':{ damage:inst.stats.damage },
    'minecraft:movement':{ value:inst.stats.speed },
    'minecraft:follow_range':{ value:24, max:32 },
    'minecraft:physics':{},
    'minecraft:pushable':{ is_pushable:true, is_pushable_by_piston:true },
    'minecraft:collision_box':{ width:Math.max(0.6,0.9*inst.scale), height:Math.max(0.6,1.4*inst.scale) },
    'minecraft:scale':{ value:inst.scale },
    'minecraft:nameable':{},
    'minecraft:behavior.look_at_player':{ priority:7, look_distance:8 },
    'minecraft:behavior.random_look_around':{ priority:8 },
  };
  if(inst.stats.armor) comp['minecraft:armor']={ value:inst.stats.armor };
  if(inst.options.fireImmune) comp['minecraft:fire_immune']={};
  if(boss) comp['minecraft:boss']={ should_darken_sky:false, hud_range:55, name:inst.name };
  // IA
  comp['minecraft:behavior.nearest_attackable_target']={ priority:2, must_see:true, entity_types:[{ filters:{ test:'is_family', subject:'other', value:'player' }, max_dist:24 }] };
  comp['minecraft:behavior.melee_attack']={ priority:3, speed_multiplier:1.2, track_target:true };
  comp['minecraft:behavior.random_stroll']={ priority:6, speed_multiplier:1 };
  if(flying){ comp['minecraft:movement.fly']={}; comp['minecraft:navigation.fly']={ can_path_over_water:true }; comp['minecraft:behavior.float_wander']={ priority:5, xz_dist:8, y_dist:6 }; delete comp['minecraft:behavior.random_stroll']; }
  else { comp['minecraft:movement.basic']={}; comp['minecraft:navigation.walk']={ can_path_over_water:true, avoid_water:true }; comp['minecraft:jump.static']={}; comp['minecraft:behavior.random_stroll'].priority=6; }
  if(inst.drops.length) comp['minecraft:loot']={ table:'loot_tables/entities/'+id+'.json' };

  const desc={ identifier:ident, is_spawnable:inst.options.spawnEgg, is_summonable:inst.options.summonable!==false, is_experimental:false };
  bp.file('entities/'+id+'.behavior.json',J({ format_version:'1.19.0', 'minecraft:entity':{ description:desc, component_groups:{}, components:comp, events:{} } }));

  if(inst.drops.length) bp.file('loot_tables/entities/'+id+'.json',J({
    pools: inst.drops.map(d=>({ rolls:{ min:1, max:Math.max(1,d.count) },
      entries:[{ type:'item', name:d.item, weight:1, functions:[{ function:'set_count', count:{ min:1, max:Math.max(1,d.count) } }] }],
      conditions:[{ condition:'random_chance', chance:Math.min(1,(d.chance||100)/100) }] })) }));

  langFR.push('entity.'+ident+'.name='+inst.name);
  langEN.push('entity.'+ident+'.name='+inst.name);
  if(inst.options.spawnEgg){ langFR.push('item.spawn_egg.entity.'+ident+'.name=Apparition : '+inst.name); langEN.push('item.spawn_egg.entity.'+ident+'.name=Spawn '+inst.name); }
}
function rgbHex(c){ const h=n=>('0'+Math.max(0,Math.min(255,n)).toString(16)).slice(-2); return '#'+h(c.r)+h(c.g)+h(c.b); }

function addItem(inst,NS,rp,bp,langFR,langEN,itemTex){
  const id=slug(inst.itemId), ident=NS+':'+id;
  const iconName=id+'_icon';
  if(inst.mode==='3d'){
    const model=inst._resolved, geoId='geometry.'+NS+'.'+id;
    rp.file('models/entity/'+id+'.geo.json',J(E.toGeometryJSON(model,geoId)));
    rp.file('textures/entity/'+id+'/'+id+'.png',b64toBlob(E.generateTexture(model)));
    // icône d'inventaire = rendu 3D
    rp.file('textures/items/'+id+'.png',b64toBlob(renderIconPNG(model,64)));
    // attachable (modèle 3D tenu en main)
    rp.file('attachables/'+id+'.json',J({ format_version:'1.10.0','minecraft:attachable':{ description:{
      identifier:ident, materials:{ default:'entity_alphatest', enchanted:'entity_alphatest_glint' },
      textures:{ default:'textures/entity/'+id+'/'+id, enchanted:'textures/misc/enchanted_item_glint' },
      geometry:{ default:geoId },
      render_controllers:['controller.render.item_default'] } } }));
  } else {
    rp.file('textures/items/'+id+'.png',b64toBlob(pixelIconPNG(inst)));
  }
  itemTex[iconName]={ textures:'textures/items/'+id };
  // BP item
  const comps={ 'minecraft:display_name':{ value:inst.name }, 'minecraft:icon':{ texture:iconName }, 'minecraft:max_stack_size':inst.options.stack||1 };
  if(inst.stats&&inst.stats.damage){ comps['minecraft:damage']={ value:inst.stats.damage }; comps['minecraft:hand_equipped']=true; }
  if(inst.stats&&inst.stats.durability){ comps['minecraft:durability']={ max_durability:inst.stats.durability }; comps['minecraft:repairable']={ repair_items:[{ items:['minecraft:iron_ingot'], repair_amount:100 }] }; }
  if(inst.itemType==='sword'||inst.itemType==='axe'){ comps['minecraft:weapon']={}; comps['minecraft:enchantable']={ slot:'sword', value:10 }; }
  if(inst.itemType==='potion'){ comps['minecraft:food']={ nutrition:0, can_always_eat:true }; comps['minecraft:use_modifiers']={ use_duration:1.2 }; }
  if(inst.options&&inst.options.glint){ comps['minecraft:glint']=true; }
  bp.file('items/'+id+'.json',J({ format_version:'1.20.50','minecraft:item':{ description:{ identifier:ident, menu_category:{ category:'equipment' } }, components:comps } }));
  langFR.push('item.'+ident+'.name='+inst.name);
  langEN.push('item.'+ident+'.name='+inst.name);
}

// la géométrie de bloc Bedrock est centrée sur le bloc : x/z ∈ [-8,8].
// Les gabarits créés en 0..16 sont recentrés automatiquement à l'export.
function normalizeBlockSpace(model){
  const m=E.cloneModel(model);
  let minX=1e9,maxX=-1e9,minZ=1e9,maxZ=-1e9;
  m.bones.forEach(b=>(b.cubes||[]).forEach(cu=>{
    minX=Math.min(minX,cu.origin[0]); maxX=Math.max(maxX,cu.origin[0]+cu.size[0]);
    minZ=Math.min(minZ,cu.origin[2]); maxZ=Math.max(maxZ,cu.origin[2]+cu.size[2]);
  }));
  if((minX+maxX)/2>4&&(minZ+maxZ)/2>4){
    m.bones.forEach(b=>{ b.pivot=b.pivot||[0,0,0]; b.pivot[0]-=8; b.pivot[2]-=8;
      (b.cubes||[]).forEach(cu=>{ cu.origin[0]-=8; cu.origin[2]-=8; }); });
  }
  return m;
}
function addFurniture(inst,NS,rp,bp,langFR,langEN,terrainTex){
  const id=slug(inst.blockId), ident=NS+':'+id, geoId='geometry.'+NS+'.'+id;
  const model=normalizeBlockSpace(inst._resolved);
  rp.file('models/entity/'+id+'.geo.json',J(E.toGeometryJSON(model,geoId)));
  rp.file('textures/blocks/'+id+'.png',b64toBlob(E.generateTexture(model)));
  terrainTex[id]={ textures:'textures/blocks/'+id };
  const comps={
    'minecraft:geometry':geoId,
    'minecraft:material_instances':{ '*':{ texture:id, render_method:'alpha_test', face_dimming:true, ambient_occlusion:true } },
    'minecraft:collision_box':{ origin:[-8,0,-8], size:[16,16,16] },
    'minecraft:selection_box':{ origin:[-8,0,-8], size:[16,16,16] },
    'minecraft:destructible_by_mining':{ seconds_to_destroy:1.2 },
    'minecraft:destructible_by_explosion':{ explosion_resistance:1 },
    'minecraft:placement_filter':{ conditions:[{ allowed_faces:['up'], block_filter:[] }] },
  };
  if(inst.options.light>0) comps['minecraft:light_emission']=inst.options.light;
  bp.file('blocks/'+id+'.json',J({ format_version:'1.21.0','minecraft:block':{ description:{ identifier:ident, menu_category:{ category:'construction' } }, components:comps } }));
  langFR.push('tile.'+ident+'.name='+inst.name);
  langEN.push('tile.'+ident+'.name='+inst.name);
}

// download (compatible iOS)
function download(blob,name){
  const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  if(isIOS){ const rd=new FileReader(); rd.onloadend=()=>{ const win=window.open('');
    if(!win){ alert('⚠ Autorise les pop-ups pour télécharger.'); return; }
    win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+name+'</title><style>body{font-family:-apple-system,sans-serif;background:#0a0c12;color:#c8a55a;text-align:center;padding:40px 20px}a{display:inline-block;background:#c8a55a;color:#0a0c12;padding:18px 32px;text-decoration:none;font-weight:bold;border-radius:6px;margin:16px 0}ol{text-align:left;max-width:380px;margin:20px auto;line-height:1.8;color:#aaa}b{color:#c8a55a}</style></head><body><h2>📦 '+name+'</h2><a href="'+rd.result+'" download="'+name+'">⬇ APPUIE LONGUEMENT ICI</a><ol><li>Appuie <b>longuement</b> sur le bouton doré</li><li><b>Télécharger le fichier lié</b></li><li>Ouvre <b>Fichiers &gt; Téléchargements</b></li><li>Appuie sur le <b>.mcaddon</b> → <b>Ouvrir dans Minecraft</b></li></ol></body></html>');
    win.document.close(); }; rd.readAsDataURL(blob);
  } else { const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(url);},1000); }
}

async function exportSet(assets,fname,statusId){
  try{
    setStatus(statusId,'⏳ Génération…');
    const zip=await buildAddon(assets);
    const blob=await zip.generateAsync({ type:'blob' });
    download(new File([blob],fname,{type:'application/octet-stream'}),fname);
    setStatus(statusId,'✓ Exporté : '+fname,'ok'); toast('✓ '+fname);
  }catch(err){ console.error(err); setStatus(statusId,'✗ Erreur : '+err.message,'err'); }
}
function empty(){ return { creatures:[], items:[], furniture:[] }; }
function exportCreature(){ const i=curCreature(); if(!i)return; const a=empty(); a.creatures=[i]; guardedExport(a,slug(i.name)+'.mcaddon','creature-status'); }
function exportItem(){ const i=curItem(); if(!i)return; const a=empty(); a.items=[i]; guardedExport(a,slug(i.name)+'.mcaddon','item-status'); }
function exportFurniture(){ const i=curFurniture(); if(!i)return; const a=empty(); a.furniture=[i]; guardedExport(a,slug(i.name)+'.mcaddon','furniture-status'); }
function exportAll(){
  if(!state.creatures.length&&!state.items.length&&!state.furniture.length){ toast('Crée au moins un élément d\'abord'); return; }
  guardedExport({ creatures:state.creatures, items:state.items, furniture:state.furniture }, slug(projName())+'.mcaddon','creature-status');
}

// ── Garde-fous : validation en langage humain avant chaque export ─────────
function validateAssets(a){
  const errors=[], warns=[];
  const ids=new Set();
  const checkId=(id,what,name)=>{
    if(!/^[a-z0-9_]+$/.test(id)) errors.push('« '+name+' » : l\'ID technique « '+id+' » contient des caractères interdits (utilise minuscules, chiffres, _).');
    if(ids.has(id)) errors.push('Deux éléments partagent le même ID technique « '+id+' » — renomme l\'un des deux.');
    ids.add(id);
  };
  if(!/^[a-z0-9_]+$/.test(ns())) errors.push('Le namespace « '+ns()+' » est invalide (minuscules, chiffres et _ uniquement).');
  if(ns()==='minecraft') errors.push('Le namespace ne peut pas être « minecraft » (réservé au jeu).');
  (a.creatures||[]).forEach(c=>{
    if(!c.name.trim()) errors.push('Une créature n\'a pas de nom.');
    checkId(c.mobId,'créature',c.name);
    const n=(c._resolved?c._resolved.bones:c.geo.bones).reduce((x,b)=>x+(b.cubes||[]).length,0);
    if(!n) errors.push('« '+c.name+' » n\'a aucun cube — elle serait invisible en jeu.');
    if(n>250) warns.push('« '+c.name+' » a '+n+' cubes : ça peut ralentir le jeu sur mobile (conseillé : < 250).');
    if(c.scale>6) warns.push('« '+c.name+' » est très grande (×'+c.scale+') — vérifie qu\'elle passe dans tes bâtiments.');
    if(c.stats.hp>500) warns.push('« '+c.name+' » a '+c.stats.hp+' PV : presque impossible à tuer sans équipement spécial.');
  });
  (a.items||[]).forEach(it=>{
    if(!it.name.trim()) errors.push('Un objet n\'a pas de nom.');
    checkId(it.itemId,'objet',it.name);
    if(it.mode==='2d'){
      const filled=it.pixels.some(row=>row.some(p=>p));
      if(!filled) errors.push('« '+it.name+' » (pixel-art) est entièrement vide — dessine au moins un pixel.');
    } else {
      const n=(it._resolved?it._resolved.bones:it.geo.bones).reduce((x,b)=>x+(b.cubes||[]).length,0);
      if(!n) errors.push('« '+it.name+' » n\'a aucun cube.');
      if(n>380) warns.push('« '+it.name+' » a '+n+' cubes : lourd pour un objet tenu en main.');
    }
  });
  (a.furniture||[]).forEach(f=>{
    if(!f.name.trim()) errors.push('Un meuble n\'a pas de nom.');
    checkId(f.blockId,'meuble',f.name);
    let outside=false;
    const nm=normalizeBlockSpace(f._resolved||{bones:f.geo.bones});
    nm.bones.forEach(b=>(b.cubes||[]).forEach(cu=>{
      // seul le débordement LATÉRAL pose problème (traverse les murs voisins) ;
      // dépasser en hauteur (dossier de chaise, lampadaire…) est normal
      if(cu.origin[0]<-8.5||cu.origin[0]+cu.size[0]>8.5||cu.origin[2]<-8.5||cu.origin[2]+cu.size[2]>8.5||cu.origin[1]<-0.5||cu.origin[1]+cu.size[1]>34) outside=true;
    }));
    if(outside) warns.push('« '+f.name+' » déborde latéralement de son bloc : en jeu, les parties qui dépassent peuvent traverser les murs voisins.');
  });
  return { errors, warns };
}
function guardedExport(a,fname,statusId){
  const v=validateAssets(a);
  if(!v.errors.length&&!v.warns.length){ exportSet(a,fname,statusId); return; }
  const li=(arr,ico)=>arr.map(m=>'<li style="margin-bottom:6px">'+ico+' '+m+'</li>').join('');
  document.getElementById('modal-title').innerHTML=v.errors.length?'🛑 Impossible d\'exporter':'⚠ Vérifie avant d\'exporter';
  document.getElementById('modal-body').innerHTML=
    '<ul style="list-style:none;font-size:13px;line-height:1.6">'+li(v.errors,'🛑')+li(v.warns,'⚠️')+'</ul>'+
    (v.errors.length
      ? '<p style="font-size:12px;color:var(--muted)">Corrige les points 🛑 puis réessaie — un addon invalide ne se chargerait pas dans Minecraft.</p>'
      : '<button class="export-btn eb-all" onclick="BS.closeModal();BS._forceExport()">Exporter quand même</button>');
  document.getElementById('modal-overlay').classList.add('show');
  if(!v.errors.length) global.BS._forceExport=()=>exportSet(a,fname,statusId);
}

// ── Aide ──
const helpTxt={ creature:{ title:'🐲 Créer une créature', body:'<p>Choisis un modèle, ajuste les <b>couleurs</b>, la <b>taille</b> (comparée à Steve), les <b>stats</b> et les <b>sons</b>. Fais glisser l\'aperçu pour tourner le modèle, teste les <b>animations</b>.</p><p>Export : un fichier <code>.mcaddon</code> contenant le pack de comportement + ressources (géométrie, texture, animations, œuf d\'apparition). Ouvre-le dans Minecraft pour installer.</p><p>En jeu : <code>/summon '+'ns:id</code> ou pose l\'œuf d\'apparition.</p>' } };
function help(k){ const h=helpTxt[k]||{title:'Aide',body:''}; document.getElementById('modal-title').innerHTML=h.title; document.getElementById('modal-body').innerHTML=h.body; document.getElementById('modal-overlay').classList.add('show'); }
function closeModal(){ document.getElementById('modal-overlay').classList.remove('show'); }

// ── Init ──
// ── Historique undo/redo (instantanés du projet complet) ──────────────────
const history={ stack:[], idx:-1, max:80, muted:false, _t:null };
function pushHistory(){
  if(history.muted) return;
  clearTimeout(history._t);
  history._t=setTimeout(()=>{
    let s; try{ s=serializeProject(); }catch(e){ return; }
    if(history.stack[history.idx]===s) return;
    history.stack.splice(history.idx+1);
    history.stack.push(s);
    if(history.stack.length>history.max) history.stack.shift();
    history.idx=history.stack.length-1;
    updateUndoButtons();
  },250);
}
function undo(){ if(history.idx<=0){ toast('Rien à annuler'); return; } history.idx--; applyHistory(); toast('↶ Annulé'); }
function redo(){ if(history.idx>=history.stack.length-1){ toast('Rien à rétablir'); return; } history.idx++; applyHistory(); toast('↷ Rétabli'); }
function applyHistory(){
  const s=history.stack[history.idx]; if(!s) return;
  const cur=Object.assign({},state.cur);
  history.muted=true;
  try{
    loadProjectData(JSON.parse(s));
    [['creature',state.creatures],['item',state.items],['furniture',state.furniture]].forEach(([t,list])=>{
      state.cur[t]=(cur[t]&&list.find(i=>i.id===cur[t]))?cur[t]:(list.length?list[list.length-1].id:null);
    });
    renderLists();
    if(state.page==='creature'&&curCreature())renderCreatureEditor();
    if(state.page==='item'&&curItem())renderItemEditor();
    if(state.page==='furniture'&&curFurniture())renderFurnitureEditor();
    ['creature','item','furniture'].forEach(t=>{ sel[t]=null; renderSelPanel(t); });
  }finally{ history.muted=false; }
  updateUndoButtons(); doSave();
}
function updateUndoButtons(){
  const u=document.getElementById('undo-btn'), r=document.getElementById('redo-btn');
  if(u)u.classList.toggle('off',history.idx<=0);
  if(r)r.classList.toggle('off',history.idx>=history.stack.length-1);
}

// ── Studio IA : création depuis une spécification générée ─────────────────
function createFromSpec(spec){
  if(spec.kind==='item2d'){
    const inst={ id:uid('i_'), mode:'2d', name:spec.name, itemId:slug(spec.name)+'_'+state.items.length,
      gridSize:16, pixels:spec.pixels,
      palette:['#f2f4f6','#cdd4da','#9aa8b8','#6c7880','#454e58','#c8a55a','#c0392b','#27ae60','#2980b9','#8e44ad','#000000','#ffffff'],
      itemType:'misc', stats:{damage:1,durability:0}, options:{glint:false,stack:64} };
    state.items.push(inst); state.cur.item=inst.id;
    renderLists(); showPage('item'); renderItemEditor();
    return inst;
  }
  if(spec.kind==='item3d'){
    const tpl={ key:'ai_item', name:spec.name, emoji:spec.emoji, category:'Création IA',
      desc:'Objet reconstruit par IA', itemType:'weapon', defaultScale:1,
      stats:{ damage:spec.stats.damage||6, durability:800, speed:1.4 },
      colorSlots:spec.colorSlots, bones:spec.bones };
    const colors={}; tpl.colorSlots.forEach(s=>colors[s.key]=s.def);
    const inst={ id:uid('i_'), _tpl:tpl, customTpl:tpl, tplKey:'ai_item', mode:'3d', name:spec.name,
      itemId:slug(spec.name)+'_'+state.items.length, colors, scale:1, itemType:'weapon',
      stats:Object.assign({},tpl.stats), options:{glint:false,stack:1},
      geo:BSEngine.cloneModel({bones:tpl.bones}) };
    resolveItem(inst); state.items.push(inst); state.cur.item=inst.id;
    renderLists(); showPage('item'); renderItemEditor();
    return inst;
  }
  if(spec.kind==='furniture'){
    const tpl={ key:'ai_furniture', name:spec.name, emoji:spec.emoji, category:'Création IA',
      desc:'Meuble reconstruit par IA', light:0,
      colorSlots:spec.colorSlots, bones:spec.bones };
    const colors={}; tpl.colorSlots.forEach(s=>colors[s.key]=s.def);
    const inst={ id:uid('f_'), _tpl:tpl, customTpl:tpl, tplKey:'ai_furniture', name:spec.name,
      blockId:slug(spec.name)+'_'+state.furniture.length, colors, options:{light:0},
      geo:BSEngine.cloneModel({bones:tpl.bones}) };
    resolveFurniture(inst); state.furniture.push(inst); state.cur.furniture=inst.id;
    renderLists(); showPage('furniture'); renderFurnitureEditor();
    return inst;
  }
  // créature (défaut)
  const tpl={ key:'ai_creature', name:spec.name, emoji:spec.emoji, category:'Création IA',
    desc:'Créature reconstruite par IA depuis une image', defaultScale:spec.scale, flying:spec.flying,
    stats:Object.assign({knockback:0.2},spec.stats),
    sounds:{ ambient:'mob.ravager.ambient', hurt:'mob.ravager.hurt', death:'mob.ravager.death' },
    colorSlots:spec.colorSlots, bones:spec.bones, eyes:{style:'none'} };
  const colors={}; tpl.colorSlots.forEach(s=>colors[s.key]=s.def);
  const inst={ id:uid('c_'), _tpl:tpl, customTpl:tpl, tplKey:'ai_creature', name:spec.name,
    mobId:slug(spec.name)+'_'+state.creatures.length, colors,
    parts:{hair:null,eyes:null}, scale:spec.scale,
    stats:Object.assign({},tpl.stats), sounds:Object.assign({},tpl.sounds),
    options:{ fireImmune:false, spawnEgg:true, boss:spec.stats.hp>=150, summonable:true, flying:spec.flying },
    drops:[], geo:BSEngine.cloneModel({bones:tpl.bones}) };
  resolveCreature(inst); state.creatures.push(inst); state.cur.creature=inst.id;
  renderLists(); showPage('creature'); renderCreatureEditor();
  return inst;
}

// rendu offscreen d'une spec (pour la boucle rendu↔critique)
function renderSpecPreview(spec){
  const slotColor={}; (spec.colorSlots||[]).forEach(s=>slotColor[s.key]=s.def);
  const model={ bones: BSEngine.cloneModel({bones:spec.bones}).bones };
  model.bones.forEach(b=>(b.cubes||[]).forEach(cu=>{ if(cu.slot) cu.color=slotColor[cu.slot]||'#9aa8b8'; }));
  const c=document.createElement('canvas'); c.width=512; c.height=460;
  E.renderModel(c,model,{rotX:-12,rotY:32,zoom:1,ground:true});
  return c.toDataURL('image/png').split(',')[1];
}

// ── Page IA : interactions ─────────────────────────────────────────────────
const AI_KEY_STORE='bedrock_studio_api_key';
let aiFile=null, aiBusy=false;
function aiKey(){ try{ return localStorage.getItem(AI_KEY_STORE)||''; }catch(e){ return ''; } }
function aiSaveKey(v){ try{ if(v)localStorage.setItem(AI_KEY_STORE,v.trim()); else localStorage.removeItem(AI_KEY_STORE); }catch(e){} }
function aiSetFile(fileList){
  const f=fileList&&fileList[0]; if(!f)return;
  if(!/^image\//.test(f.type)){ toast('⚠ Choisis une image (PNG, JPG…)'); return; }
  aiFile=f;
  const img=document.getElementById('ai-preview-img');
  img.src=URL.createObjectURL(f); img.style.display='block';
  document.getElementById('ai-drop-hint').style.display='none';
  aiStatus('Image prête. Clique sur « Reconstruire en 3D ».');
}
function aiStatus(msg,cls){ const el=document.getElementById('ai-status'); if(el){ el.textContent=msg; el.className='ai-status '+(cls||''); } }
async function aiGenerate(){
  if(aiBusy)return;
  const key=document.getElementById('ai-key').value.trim();
  if(!key){ aiStatus('⚠ Colle ta clé API Anthropic (sk-ant-…) ci-dessus.','err'); return; }
  if(!aiFile){ aiStatus('⚠ Dépose d\'abord une image.','err'); return; }
  aiSaveKey(key);
  const kind=document.getElementById('ai-kind').value;
  const notes=document.getElementById('ai-notes').value;
  aiBusy=true;
  const btn=document.getElementById('ai-go'); btn.disabled=true; btn.textContent='⏳ Reconstruction en cours…';
  const t0=Date.now();
  const timer=setInterval(()=>{ const s=Math.round((Date.now()-t0)/1000);
    const st=document.getElementById('ai-status'); if(st&&st.dataset.wait==='1') st.textContent=st.dataset.base+' — '+s+'s'; },1000);
  try{
    const refine=document.getElementById('ai-refine').checked;
    const spec=await BSAI.generate(key,aiFile,{kind,notes,refine},m=>{
      const st=document.getElementById('ai-status');
      if(st){ st.dataset.base=m; st.dataset.wait=/analyse|critique/.test(m)?'1':'0'; st.textContent=m; st.className='ai-status'; }
    },renderSpecPreview);
    const st=document.getElementById('ai-status'); if(st)st.dataset.wait='0';
    const nCubes=spec.bones.reduce((n,b)=>n+b.cubes.length,0);
    createFromSpec(spec);
    doSave();
    toast('✨ « '+spec.name+' » reconstruit ('+(nCubes||'pixel-art')+' cubes) !');
    let msg='✓ « '+spec.name+' » ajouté au projet — tu es maintenant dans son éditeur.';
    if(spec.fidelity!=null) msg+=' Fidélité estimée : '+Math.round(spec.fidelity)+'/100.';
    if(spec.changes&&spec.changes.length) msg+=' Corrections appliquées : '+spec.changes.slice(0,4).join(' · ');
    aiStatus(msg,'ok');
  }catch(e){
    aiStatus('✗ '+(e&&e.message||e)+' — Astuce : l\'Extrusion 2.5D ci-dessous fonctionne sans IA.','err');
  }finally{
    clearInterval(timer);
    aiBusy=false; btn.disabled=false; btn.textContent='🪄 Reconstruire en 3D';
  }
}

async function aiExtrude(){
  if(!aiFile){ aiStatus('⚠ Dépose d\'abord une image (en haut).','err'); return; }
  try{
    aiStatus('Extrusion 2.5D en cours…');
    const spec=await BSAI.extrude(aiFile,{
      resolution:+document.getElementById('ai-ext-res').value,
      kind:document.getElementById('ai-ext-kind').value,
      name:(aiFile.name||'Sprite').replace(/\.[^.]+$/,'').slice(0,30),
    });
    const n=spec.bones.reduce((x,b)=>x+b.cubes.length,0);
    createFromSpec(spec); doSave();
    toast('🖼 Sprite extrudé ('+n+' cubes) !');
    aiStatus('✓ Sprite 2.5D ajouté au projet ('+n+' cubes).','ok');
  }catch(e){ aiStatus('✗ '+(e&&e.message||e),'err'); }
}

// ── Sauvegarde automatique du projet (localStorage) ────────────────────────
const SAVE_KEY='bedrock_studio_project_v1';
let lastSaved='';
function serializeProject(){
  return JSON.stringify({
    v:1, project:projName(), ns:document.getElementById('proj-ns').value,
    creatures:state.creatures, items:state.items, furniture:state.furniture,
  }, (k,v)=> (k && k[0]==='_') ? undefined : v);
}
function relink(inst,type){
  if(inst.customTpl){ inst._tpl=inst.customTpl; return true; }
  const list=type==='creature'?T.CREATURES:type==='item'?T.ITEMS_3D:T.FURNITURE;
  const tpl=list.find(t=>t.key===inst.tplKey);
  if(!tpl)return false;
  inst._tpl=tpl; return true;
}
function loadProjectData(d){
  if(!d||(!d.creatures&&!d.items&&!d.furniture)) return false;
  document.getElementById('proj-name').value=d.project||'Mon Add-on';
  document.getElementById('proj-ns').value=d.ns||'monaddon';
  state.creatures=(d.creatures||[]).filter(i=>relink(i,'creature'));
  state.items=(d.items||[]).filter(i=>i.mode==='2d'||relink(i,'item'));
  state.furniture=(d.furniture||[]).filter(i=>relink(i,'furniture'));
  state.cur={creature:null,item:null,furniture:null};
  state.creatures.forEach(resolveCreature);
  state.items.forEach(i=>{ if(i.mode==='3d')resolveItem(i); });
  state.furniture.forEach(resolveFurniture);
  renderLists();
  return true;
}
function restoreProject(){
  let raw=null;
  try{ raw=localStorage.getItem(SAVE_KEY); }catch(e){ return false; }
  if(!raw) return false;
  try{
    const ok=loadProjectData(JSON.parse(raw));
    if(ok){ lastSaved=serializeProject(); }
    return ok && (state.creatures.length+state.items.length+state.furniture.length)>0;
  }catch(e){ console.warn('Restauration impossible :',e); return false; }
}
function doSave(){
  try{
    const s=serializeProject();
    if(s===lastSaved) return;
    pushHistory();
    localStorage.setItem(SAVE_KEY,s); lastSaved=s;
    const el=document.getElementById('save-ind');
    if(el){ const d=new Date();
      el.textContent='💾 '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
      el.classList.add('flash'); setTimeout(()=>el.classList.remove('flash'),600); }
  }catch(e){ /* quota plein : on n'écrase pas la dernière bonne sauvegarde */ }
}
function exportProject(){
  const blob=new Blob([serializeProject()],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=slug(projName())+'_projet.json';
  document.body.appendChild(a); a.click();
  setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(a.href);},800);
  toast('✓ Projet téléchargé (garde ce fichier en secours)');
}
function importProject(input){
  const f=input.files&&input.files[0]; if(!f)return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      if(!loadProjectData(JSON.parse(r.result))) throw new Error('format');
      doSave(); showPage('gallery');
      toast('✓ Projet importé — '+(state.creatures.length+state.items.length+state.furniture.length)+' création(s)');
    }catch(e){ toast('⚠ Fichier de projet invalide'); }
    input.value='';
  };
  r.readAsText(f);
}
function resetProject(){
  if(!confirm('Tout effacer et repartir de zéro ? (les créations non exportées seront perdues)'))return;
  state.creatures=[];state.items=[];state.furniture=[];
  state.cur={creature:null,item:null,furniture:null};
  try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
  lastSaved='';
  renderLists(); showPage('gallery'); toast('Projet réinitialisé');
}

function init(){
  const restored=restoreProject();
  renderGallery(); renderLists();
  if(restored) toast('✓ Projet restauré automatiquement');
  setInterval(doSave,2500);
  window.addEventListener('beforeunload',doSave);
  bindDrag('viewCanvas',view,'creature'); bindDrag('itemViewCanvas',itemView,'item'); bindDrag('furnViewCanvas',furnView,'furniture');
  renderSelPanel('creature'); renderSelPanel('item'); renderSelPanel('furniture');
  const kEl=document.getElementById('ai-key'); if(kEl)kEl.value=aiKey();
  try{ history.stack=[serializeProject()]; history.idx=0; }catch(e){}
  updateUndoButtons();
  window.addEventListener('keydown',e=>{
    const t=e.target&&e.target.tagName;
    if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT') return; // laisser l'undo natif des champs
    if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.key.toLowerCase()==='z'){ e.preventDefault(); undo(); }
    else if(((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==='z')||((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y')){ e.preventDefault(); redo(); }
  });
  requestAnimationFrame(frame);
}

global.BS={ showPage, create, select, remove, field, setColor, setPart, stat, opt, addDrop, drop, rmDrop,
  setAnim, toggleSteve, toggleRotate, resetView, setIColor, ifield, istat, iopt, toggleItemRotate, resetItemView,
  setTool, clearPx, addColor, setFColor, ffield, fopt, toggleFurnRotate, resetFurnView,
  geoToggle, geoBoneName, geoBone, geoCube, geoCubeColor, geoAddCube, geoDupCube, geoDelCube, geoAddBone, geoDelBone,
  selNudge, selInflate, selColor, selDup, selDel,
  togglePaint, paintColor, paintSize, paintErase, paintClear,
  exportProject, importProject, resetProject,
  aiSetFile, aiGenerate, aiExtrude, createFromSpec,
  undo, redo, geoJsonToggle, geoJsonCheck, geoJsonApply,
  exportCreature, exportItem, exportFurniture, exportAll, help, closeModal, _state:()=>state };

// Chaque action de modification pousse un instantané dans l'historique (undo/redo)
['create','remove','field','setColor','setPart','stat','opt','addDrop','drop','rmDrop',
 'setIColor','ifield','istat','iopt','clearPx','addColor','setFColor','ffield','fopt',
 'setScale','scale','setItemScale','iscale',
 'geoBoneName','geoBone','geoCube','geoCubeColor','geoAddCube','geoDupCube','geoDelCube','geoAddBone','geoDelBone',
 'selNudge','selInflate','selColor','selDup','selDel','paintClear','createFromSpec','aiExtrude']
.forEach(k=>{ const f=global.BS[k]; if(typeof f==='function')
  global.BS[k]=function(){ const r=f.apply(this,arguments); pushHistory(); return r; }; });

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();

})(window);
