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
      drops:[] };
    resolveCreature(inst); state.creatures.push(inst); state.cur.creature=inst.id;
    renderLists(); showPage('creature'); renderCreatureEditor(); toast('✓ '+tpl.name+' créé');
  } else if(kind==='item3d'){
    const tpl=T.ITEMS_3D.find(t=>t.key===key);
    const colors={}; tpl.colorSlots.forEach(s=>colors[s.key]=s.def);
    const inst={ id:uid('i_'), _tpl:tpl, tplKey:key, mode:'3d', name:tpl.name, itemId:slug(tpl.name)+'_'+state.items.length,
      colors, scale:tpl.defaultScale||1, itemType:tpl.itemType, stats:Object.assign({},tpl.stats),
      options:{ glint:false, stack:tpl.itemType==='potion'?16:1 } };
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
      colors, options:{ light:tpl.light||0 } };
    resolveFurniture(inst); state.furniture.push(inst); state.cur.furniture=inst.id;
    renderLists(); showPage('furniture'); renderFurnitureEditor();
  }
}

// ── Résolution des modèles (couleurs, yeux, parties) ──────────────────────
function baseModel(inst){
  const tpl=inst._tpl;
  const model=BSEngine.cloneModel({bones:tpl.bones});
  // parties (cheveux) : ne garder que la variante choisie
  if(tpl.parts&&tpl.parts.hair){
    const sel=inst.parts.hair;
    model.bones=model.bones.filter(b=> b.part!=='hair' || b.variant===sel);
  }
  // couleurs
  model.bones.forEach(b=>(b.cubes||[]).forEach(cu=>{ if(cu.slot&&inst.colors[cu.slot]) cu.color=inst.colors[cu.slot]; }));
  E.autoUV(model);
  applyEyes(model,inst);
  return model;
}
function resolveCreature(inst){ inst._resolved=baseModel(inst); }
function resolveItem(inst){ if(inst.mode==='3d') inst._resolved=baseModel(inst); }
function resolveFurniture(inst){ inst._resolved=baseModel(inst); }

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
    (b.cubes||[]).forEach(cu=>{ cu.origin=cu.origin.map(v=>v*s); cu.size=cu.size.map(v=>v*s); if(cu.inflate)cu.inflate*=s; }); });
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
      <button class="add-mini" onclick="BS.addDrop()">+ Ajouter un butin</button></div>`;
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
  const anims=[['none','⏸ Statique'],['idle','🌬 Repos'],['walk','🚶 Marche'],['attack','⚔ Attaque']];
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
    </div></div>`;
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
    </div>`;
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
      E.renderModel(c,m,{rotX:view.rotX,rotY:view.rotY,zoom:view.zoom,pose,ground:true}); }
  } else if(state.page==='item'){
    const i=curItem(); const c=document.getElementById('itemViewCanvas');
    if(i&&c){ if(i.mode==='3d'&&i._resolved){ if(itemView.autorotate)itemView.rotY=(itemView.rotY+0.6)%360;
        E.renderModel(c,i._resolved,{rotX:itemView.rotX,rotY:itemView.rotY,zoom:1,ground:false}); }
      else if(i.mode==='2d'){ drawPixelPreview(c,i); } }
  } else if(state.page==='furniture'){
    const i=curFurniture(); const c=document.getElementById('furnViewCanvas');
    if(i&&c&&i._resolved){ if(furnView.autorotate)furnView.rotY=(furnView.rotY+0.5)%360;
      E.renderModel(c,i._resolved,{rotX:furnView.rotX,rotY:furnView.rotY,zoom:0.85,ground:true}); }
  }
}
function drawPixelPreview(c,inst){ const ctx=c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height);
  const gs=inst.gridSize, s=Math.floor(Math.min(c.width,c.height)*0.7/gs), ox=(c.width-s*gs)/2, oy=(c.height-s*gs)/2;
  ctx.imageSmoothingEnabled=false;
  for(let y=0;y<gs;y++)for(let x=0;x<gs;x++){ if(inst.pixels[y][x]){ctx.fillStyle=inst.pixels[y][x];ctx.fillRect(ox+x*s,oy+y*s,s,s);} } }

// ── interactions souris (rotation) ──
function bindDrag(canvasId,vw){
  const c=document.getElementById(canvasId); if(!c)return;
  let dragging=false,lx=0,ly=0;
  const down=e=>{dragging=true;vw.autorotate=false;const p=e.touches?e.touches[0]:e;lx=p.clientX;ly=p.clientY;c.parentElement.classList.add('dragging');
    const b=document.getElementById(canvasId==='viewCanvas'?'rot-btn':canvasId==='itemViewCanvas'?'item-rot-btn':'furn-rot-btn'); if(b)b.classList.remove('active'); };
  const move=e=>{ if(!dragging)return; const p=e.touches?e.touches[0]:e; vw.rotY=(vw.rotY+(p.clientX-lx)*0.6)%360; vw.rotX=Math.max(-89,Math.min(89,vw.rotX-(p.clientY-ly)*0.5)); lx=p.clientX;ly=p.clientY; if(e.touches)e.preventDefault(); };
  const up=()=>{dragging=false;c.parentElement.classList.remove('dragging');};
  c.addEventListener('mousedown',down);window.addEventListener('mousemove',move);window.addEventListener('mouseup',up);
  c.addEventListener('touchstart',down,{passive:false});c.addEventListener('touchmove',move,{passive:false});c.addEventListener('touchend',up);
  c.addEventListener('wheel',e=>{e.preventDefault();vw.zoom=Math.max(0.4,Math.min(3,(vw.zoom||1)*(e.deltaY<0?1.1:0.9)));},{passive:false});
}

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
  rp.file('animations/'+id+'.animation.json',J(E.toAnimationJSON(NS,id,anims)));
  // animation controller (états idle/marche/combat)
  rp.file('animation_controllers/'+id+'.animation_controllers.json',J({
    format_version:'1.10.0',
    animation_controllers:{ ['controller.animation.'+NS+'_'+id+'.general']:{
      initial_state:'idle',
      states:{
        idle:{ animations:['idle'], transitions:[{ move:'q.modified_move_speed > 0.1' },{ attack:'q.has_target' }] },
        move:{ animations:['walk'], blend_transition:0.2, transitions:[{ idle:'q.modified_move_speed <= 0.1' },{ attack:'q.has_target' }] },
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
      animations:{ idle:'animation.'+id+'.idle', walk:'animation.'+id+'.walk', attack:'animation.'+id+'.attack', general:'controller.animation.'+NS+'_'+id+'.general' },
      scripts:{ animate:['general'] },
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

function addFurniture(inst,NS,rp,bp,langFR,langEN,terrainTex){
  const id=slug(inst.blockId), ident=NS+':'+id, geoId='geometry.'+NS+'.'+id;
  const model=inst._resolved;
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
function exportCreature(){ const i=curCreature(); if(!i)return; const a=empty(); a.creatures=[i]; exportSet(a,slug(i.name)+'.mcaddon','creature-status'); }
function exportItem(){ const i=curItem(); if(!i)return; const a=empty(); a.items=[i]; exportSet(a,slug(i.name)+'.mcaddon','item-status'); }
function exportFurniture(){ const i=curFurniture(); if(!i)return; const a=empty(); a.furniture=[i]; exportSet(a,slug(i.name)+'.mcaddon','furniture-status'); }
function exportAll(){
  if(!state.creatures.length&&!state.items.length&&!state.furniture.length){ toast('Crée au moins un élément d\'abord'); return; }
  exportSet({ creatures:state.creatures, items:state.items, furniture:state.furniture }, slug(projName())+'.mcaddon','creature-status');
}

// ── Aide ──
const helpTxt={ creature:{ title:'🐲 Créer une créature', body:'<p>Choisis un modèle, ajuste les <b>couleurs</b>, la <b>taille</b> (comparée à Steve), les <b>stats</b> et les <b>sons</b>. Fais glisser l\'aperçu pour tourner le modèle, teste les <b>animations</b>.</p><p>Export : un fichier <code>.mcaddon</code> contenant le pack de comportement + ressources (géométrie, texture, animations, œuf d\'apparition). Ouvre-le dans Minecraft pour installer.</p><p>En jeu : <code>/summon '+'ns:id</code> ou pose l\'œuf d\'apparition.</p>' } };
function help(k){ const h=helpTxt[k]||{title:'Aide',body:''}; document.getElementById('modal-title').innerHTML=h.title; document.getElementById('modal-body').innerHTML=h.body; document.getElementById('modal-overlay').classList.add('show'); }
function closeModal(){ document.getElementById('modal-overlay').classList.remove('show'); }

// ── Init ──
function init(){
  renderGallery(); renderLists();
  bindDrag('viewCanvas',view); bindDrag('itemViewCanvas',itemView); bindDrag('furnViewCanvas',furnView);
  requestAnimationFrame(frame);
}

global.BS={ showPage, create, select, remove, field, setColor, setPart, stat, opt, addDrop, drop, rmDrop,
  setAnim, toggleSteve, toggleRotate, resetView, setIColor, ifield, istat, iopt, toggleItemRotate, resetItemView,
  setTool, clearPx, addColor, setFColor, ffield, fopt, toggleFurnRotate, resetFurnView,
  exportCreature, exportItem, exportFurniture, exportAll, help, closeModal, _state:()=>state };

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();

})(window);
