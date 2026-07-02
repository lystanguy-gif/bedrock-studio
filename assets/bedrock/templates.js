/* ═══════════════════════════════════════════════════════════════════════
   BEDROCK STUDIO — Bibliothèque de modèles pré-faits
   Créatures 3D détaillées, objets médiévaux 2D/3D, pièces de personnage.
   Toutes les coordonnées sont en unités Bedrock (16 = 1 bloc, y vers le haut).
   ═══════════════════════════════════════════════════════════════════════ */
(function (global) {
'use strict';

// helper cube : c(origin, size, slot, extra?)
function c(origin, size, slot, extra){
  return Object.assign({ origin, size, slot }, extra||{});
}
function bone(name, pivot, cubes, opts){
  return Object.assign({ name, pivot: pivot||[0,0,0], cubes: cubes||[] }, opts||{});
}

// ═══════════════════════ CRÉATURES ═══════════════════════

const DRAGON = {
  key:'dragon', name:'Dragon', emoji:'🐲', category:'Créature légendaire',
  desc:'Dragon massif à écailles, ailes membraneuses, longue queue et cornes.',
  defaultScale:2.2, flying:true,
  stats:{ hp:250, damage:16, armor:12, speed:0.28, knockback:0.9 },
  sounds:{ ambient:'mob.ravager.ambient', hurt:'mob.ravager.hurt', death:'mob.ravager.death' },
  colorSlots:[
    { key:'body',   label:'Écailles',      def:'#7d1f1f' },
    { key:'belly',  label:'Ventre',        def:'#caa15a' },
    { key:'wing',   label:'Membrane ailes',def:'#4a1414' },
    { key:'horn',   label:'Cornes / griffes', def:'#d8cbb0' },
    { key:'eye',    label:'Yeux',          def:'#ffcf33' },
  ],
  bones:[
    bone('body',[0,20,0],[
      c([-8,16,-14],[16,15,10],'body'),      // poitrail
      c([-7,16,-6],[14,13,22],'body'),       // corps
      c([-6,15,-6],[12,3,22],'belly'),       // ventre
    ]),
    bone('neck',[0,28,-12],[
      c([-4,24,-22],[8,10,12],'body'),
    ],{ parent:'body', rotation:[-28,0,0] }),
    bone('head',[0,30,-20],[
      c([-5,26,-32],[10,10,14],'body'),
      c([-4,25,-40],[8,6,10],'body'),        // museau
      c([-4,23,-40],[8,3,12],'belly'),       // mâchoire
    ],{ parent:'neck', rotation:[20,0,0], eyeHost:true }),
    bone('horn_l',[4,34,-26],[ c([3,33,-26],[2,2,10],'horn') ],{ parent:'head', rotation:[-40,0,10] }),
    bone('horn_r',[-4,34,-26],[ c([-5,33,-26],[2,2,10],'horn') ],{ parent:'head', rotation:[-40,0,-10] }),
    bone('wing_l',[7,29,-4],[
      c([7,28,-8],[3,3,22],'horn'),          // bras d'aile
      c([9,27,-6],[28,1,20],'wing'),         // membrane
    ],{ parent:'body', rotation:[0,0,-8] }),
    bone('wing_r',[-7,29,-4],[
      c([-10,28,-8],[3,3,22],'horn'),
      c([-37,27,-6],[28,1,20],'wing'),
    ],{ parent:'body', rotation:[0,0,8] }),
    bone('tail1',[0,22,14],[ c([-5,18,12],[10,10,14],'body') ],{ parent:'body', rotation:[6,0,0] }),
    bone('tail2',[0,22,26],[ c([-4,19,24],[8,8,14],'body') ],{ parent:'tail1', rotation:[6,0,0] }),
    bone('tail3',[0,22,38],[
      c([-3,20,36],[6,6,16],'belly'),
      c([-1,26,48],[2,6,6],'horn'),          // pointe
    ],{ parent:'tail2', rotation:[8,0,0] }),
    bone('leg_fr',[5,14,-6],[ c([4,0,-8],[5,15,6],'body'), c([3,0,-11],[7,3,7],'horn') ],{ parent:'body' }),
    bone('leg_fl',[-5,14,-6],[ c([-9,0,-8],[5,15,6],'body'), c([-10,0,-11],[7,3,7],'horn') ],{ parent:'body' }),
    bone('leg_br',[6,14,12],[ c([5,0,10],[6,15,7],'body'), c([4,0,7],[8,3,8],'horn') ],{ parent:'body' }),
    bone('leg_bl',[-6,14,12],[ c([-11,0,10],[6,15,7],'body'), c([-12,0,7],[8,3,8],'horn') ],{ parent:'body' }),
  ],
  eyes:{ style:'reptile' },
};

const SPIDER = {
  key:'spider', name:'Araignée Géante', emoji:'🕷️', category:'Créature terrifiante',
  desc:'Araignée cauchemardesque : abdomen énorme, huit pattes, crochets et yeux rouges.',
  defaultScale:1.8, flying:false,
  stats:{ hp:90, damage:9, armor:4, speed:0.42, knockback:0.2 },
  sounds:{ ambient:'mob.spider.say', hurt:'mob.spider.hurt', death:'mob.spider.death' },
  colorSlots:[
    { key:'body',   label:'Carapace',  def:'#1a1712' },
    { key:'abdomen',label:'Abdomen',   def:'#241a14' },
    { key:'mark',   label:'Marque',    def:'#8a1010' },
    { key:'fang',   label:'Crochets',  def:'#c9b48a' },
    { key:'eye',    label:'Yeux',      def:'#ff2a2a' },
    { key:'leg',    label:'Pattes',    def:'#141210' },
  ],
  bones:[
    bone('body',[0,7,2],[
      c([-6,4,-4],[12,7,12],'body'),          // céphalothorax
      c([-4,6,-10],[8,5,6],'body'),           // tête
    ],{ eyeHost:true }),
    bone('abdomen',[0,9,10],[
      c([-8,3,6],[16,13,16],'abdomen'),
      c([-3,15,12],[6,3,8],'mark',{ decalMark:'hourglass' }),
    ],{ parent:'body', rotation:[10,0,0] }),
    bone('fang_l',[2,5,-10],[ c([1,2,-13],[2,4,4],'fang') ],{ parent:'body', rotation:[20,0,0] }),
    bone('fang_r',[-2,5,-10],[ c([-3,2,-13],[2,4,4],'fang') ],{ parent:'body', rotation:[20,0,0] }),
    // 8 pattes (4 par côté) écartées via rotation Z
    bone('leg_r1',[6,8,-2],[ c([6,7,-3],[16,2,2],'leg') ],{ parent:'body', rotation:[0,-25,-58] }),
    bone('leg_r2',[6,8,1],[  c([6,7,0],[17,2,2],'leg') ], { parent:'body', rotation:[0,-8,-50] }),
    bone('leg_r3',[6,8,4],[  c([6,7,3],[17,2,2],'leg') ], { parent:'body', rotation:[0,10,-50] }),
    bone('leg_r4',[6,8,7],[  c([6,7,6],[16,2,2],'leg') ], { parent:'body', rotation:[0,26,-58] }),
    bone('leg_l1',[-6,8,-2],[ c([-22,7,-3],[16,2,2],'leg') ],{ parent:'body', rotation:[0,25,58] }),
    bone('leg_l2',[-6,8,1],[  c([-23,7,0],[17,2,2],'leg') ], { parent:'body', rotation:[0,8,50] }),
    bone('leg_l3',[-6,8,4],[  c([-23,7,3],[17,2,2],'leg') ], { parent:'body', rotation:[0,-10,50] }),
    bone('leg_l4',[-6,8,7],[  c([-22,7,6],[16,2,2],'leg') ], { parent:'body', rotation:[0,-26,58] }),
  ],
  eyes:{ style:'cluster' },
};

const GOLEM = {
  key:'golem', name:'Golem de Pierre', emoji:'🗿', category:'Gardien magique',
  desc:'Colosse de pierre gravé de runes lumineuses. Lent mais dévastateur.',
  defaultScale:1.9, flying:false,
  stats:{ hp:300, damage:20, armor:16, speed:0.18, knockback:1 },
  sounds:{ ambient:'mob.irongolem.walk', hurt:'mob.irongolem.hit', death:'mob.irongolem.death' },
  colorSlots:[
    { key:'stone', label:'Pierre',  def:'#6b6b6e' },
    { key:'dark',  label:'Failles', def:'#3c3c40' },
    { key:'rune',  label:'Runes',   def:'#33d6ff' },
  ],
  bones:[
    bone('body',[0,22,0],[
      c([-9,20,-5],[18,14,10],'stone'),
      c([-6,18,-4],[12,2,8],'dark'),
      c([-3,24,-6],[6,6,1],'rune',{ glow:true }),
    ]),
    bone('head',[0,34,0],[
      c([-5,34,-5],[10,9,9],'stone'),
      c([-6,36,-6],[2,3,3],'dark'),c([4,36,-6],[2,3,3],'dark'),
    ],{ parent:'body', eyeHost:true }),
    bone('arm_r',[-10,32,0],[ c([-15,10,-4],[5,22,8],'stone'), c([-15,10,-4],[5,3,8],'rune',{glow:true}) ],{ parent:'body' }),
    bone('arm_l',[10,32,0],[ c([10,10,-4],[5,22,8],'stone'), c([10,10,-4],[5,3,8],'rune',{glow:true}) ],{ parent:'body' }),
    bone('leg_r',[-4,20,0],[ c([-8,0,-4],[7,20,8],'stone') ],{ parent:'body' }),
    bone('leg_l',[4,20,0],[ c([1,0,-4],[7,20,8],'stone') ],{ parent:'body' }),
  ],
  eyes:{ style:'glow' },
};

const WISP = {
  key:'wisp', name:'Esprit Magique', emoji:'✨', category:'Créature magique',
  desc:'Noyau de lumière flottant entouré de cristaux tournoyants. Insaisissable.',
  defaultScale:1.1, flying:true,
  stats:{ hp:40, damage:7, armor:0, speed:0.4, knockback:0 },
  sounds:{ ambient:'mob.allay.ambient', hurt:'mob.allay.hurt', death:'mob.allay.death' },
  colorSlots:[
    { key:'core',    label:'Cœur',     def:'#8be9ff' },
    { key:'crystal', label:'Cristaux', def:'#b98bff' },
    { key:'aura',    label:'Aura',     def:'#e7c6ff' },
  ],
  bones:[
    bone('body',[0,22,0],[
      c([-3,19,-3],[6,6,6],'core',{ glow:true, alpha:0.95 }),
    ],{ rotation:[45,0,45], eyeHost:true }),
    bone('crystal_1',[0,22,0],[ c([-1,26,-1],[2,5,2],'crystal',{ alpha:0.9, glow:true }) ],{ parent:'body' }),
    bone('crystal_2',[0,22,0],[ c([6,20,0],[2,4,2],'crystal',{ alpha:0.9, glow:true }) ],{ parent:'body', rotation:[0,0,-30] }),
    bone('crystal_3',[0,22,0],[ c([-8,20,0],[2,4,2],'crystal',{ alpha:0.9, glow:true }) ],{ parent:'body', rotation:[0,0,30] }),
    bone('crystal_4',[0,22,0],[ c([0,20,6],[2,4,2],'crystal',{ alpha:0.9, glow:true }) ],{ parent:'body', rotation:[30,0,0] }),
    bone('tail',[0,19,0],[ c([-1,13,-1],[2,6,2],'aura',{ alpha:0.6 }), c([-1,9,-1],[2,4,2],'aura',{ alpha:0.4 }) ],{ parent:'body' }),
  ],
  eyes:{ style:'none' },
};

// Personnage humanoïde entièrement personnalisable (cheveux, yeux, tenue)
const HUMANOID = {
  key:'humanoid', name:'Personnage', emoji:'🧍', category:'Personnage',
  desc:'Humanoïde de base : coiffures et yeux pré-faits, tenue et peau au choix.',
  defaultScale:1.0, flying:false, humanoid:true,
  stats:{ hp:20, damage:3, armor:2, speed:0.25, knockback:0 },
  sounds:{ ambient:'mob.villager.idle', hurt:'mob.villager.hurt', death:'mob.villager.death' },
  colorSlots:[
    { key:'skin',    label:'Peau',      def:'#c9a07a' },
    { key:'shirt',   label:'Haut',      def:'#b23030' },
    { key:'pants',   label:'Bas',       def:'#3a3550' },
    { key:'hair',    label:'Cheveux',   def:'#3a281a' },
    { key:'eye',     label:'Yeux',      def:'#3a6ea5' },
    { key:'accent',  label:'Accent',    def:'#caa15a' },
  ],
  bones:[
    bone('body',[0,12,0],[
      c([-4,12,-2],[8,12,4],'shirt'),
      c([-4,12,-2],[3,12,4],'accent',{ noise:false }), // liseré
    ]),
    bone('head',[0,24,0],[ c([-4,24,-4],[8,8,8],'skin') ],{ parent:'body', eyeHost:true }),
    // Coiffures (une seule visible ; gérées par les "parts")
    bone('hair_short',[0,24,0],[ c([-4.3,29,-4.3],[8.6,4,8.6],'hair',{ inflate:0 }), c([-4.3,26,-4.3],[8.6,3,1.5],'hair') ],{ parent:'head', part:'hair', variant:'court' }),
    bone('hair_long',[0,24,0],[ c([-4.3,29,-4.3],[8.6,4,8.6],'hair'), c([-4.4,17,3],[8.8,12,2],'hair') ],{ parent:'head', part:'hair', variant:'long' }),
    bone('hair_spiky',[0,24,0],[ c([-4.3,31,-4.3],[8.6,3,8.6],'hair'), c([-2,34,-2],[1,3,1],'hair'),c([1,34,-2],[1,3,1],'hair'),c([-2,34,1],[1,3,1],'hair'),c([1,34,1],[1,3,1],'hair') ],{ parent:'head', part:'hair', variant:'piquant' }),
    bone('hair_bun',[0,24,0],[ c([-4.3,29,-4.3],[8.6,4,8.6],'hair'), c([-2,32,2],[4,4,4],'hair') ],{ parent:'head', part:'hair', variant:'chignon' }),
    bone('arm_r',[-5,22,0],[ c([-8,12,-2],[4,12,4],'skin'), c([-8.2,12,-2.2],[4.4,7,4.4],'shirt') ],{ parent:'body' }),
    bone('arm_l',[5,22,0],[ c([4,12,-2],[4,12,4],'skin',{ mirror:true }), c([3.8,12,-2.2],[4.4,7,4.4],'shirt') ],{ parent:'body' }),
    bone('leg_r',[-2,12,0],[ c([-4,0,-2],[4,12,4],'pants') ],{ parent:'body' }),
    bone('leg_l',[2,12,0],[ c([0,0,-2],[4,12,4],'pants',{ mirror:true }) ],{ parent:'body' }),
  ],
  parts:{
    hair:[
      { key:'court',   label:'Courts' },
      { key:'long',    label:'Longs' },
      { key:'piquant', label:'Piquants' },
      { key:'chignon', label:'Chignon' },
      { key:'aucun',   label:'Aucun' },
    ],
    eyes:[
      { key:'ronds',    label:'Ronds' },
      { key:'fendus',   label:'Fendus' },
      { key:'endormis', label:'Endormis' },
      { key:'colere',   label:'En colère' },
      { key:'brillants',label:'Brillants' },
    ],
  },
  eyes:{ style:'human' },
};

const CREATURES = [ DRAGON, SPIDER, GOLEM, WISP, HUMANOID ];

// ═══════════════════════ OBJETS 3D (modèles) ═══════════════════════
// Objets "attachable" tenus en main. Géométrie simple à plat + reliefs.

function itemBone(cubes){ return [ bone('root', [0,0,0], cubes) ]; }

const ITEMS_3D = [
  {
    key:'sword', name:'Épée médiévale', emoji:'⚔️', category:'Arme',
    itemType:'sword', defaultScale:1.0,
    colorSlots:[
      { key:'blade', label:'Lame',    def:'#c7ccd4' },
      { key:'guard', label:'Garde',   def:'#c8a55a' },
      { key:'grip',  label:'Poignée', def:'#5a3a1a' },
    ],
    bones: itemBone([
      c([-1,6,-0.5],[2,16,1],'blade'),        // lame
      c([-0.5,21,-0.5],[1,2,1],'blade'),      // pointe
      c([-3,4,-0.5],[6,2,1],'guard'),         // garde
      c([-1,-2,-0.5],[2,6,1],'grip'),         // poignée
      c([-1.5,-3,-0.6],[3,2,1.2],'guard'),    // pommeau
    ]),
    stats:{ damage:8, durability:1400 },
  },
  {
    key:'axe', name:'Hache de guerre', emoji:'🪓', category:'Arme',
    itemType:'axe', defaultScale:1.0,
    colorSlots:[
      { key:'head',  label:'Fer',     def:'#9aa0a8' },
      { key:'handle',label:'Manche',  def:'#5a3a1a' },
      { key:'bind',  label:'Ligature',def:'#c8a55a' },
    ],
    bones: itemBone([
      c([-1,-4,-0.5],[2,22,1],'handle'),
      c([1,12,-0.5],[5,6,1],'head'),
      c([1,10,-0.5],[3,2,1],'head'),
      c([-6,12,-0.5],[5,6,1],'head'),
      c([-1.5,11,-0.7],[3,2,1.4],'bind'),
    ]),
    stats:{ damage:9, durability:1200 },
  },
  {
    key:'shield', name:'Bouclier', emoji:'🛡️', category:'Défense',
    itemType:'shield', defaultScale:1.0,
    colorSlots:[
      { key:'face',  label:'Face',    def:'#7a1f1f' },
      { key:'rim',   label:'Bordure', def:'#c8a55a' },
      { key:'boss',  label:'Umbo',    def:'#c7ccd4' },
    ],
    bones: itemBone([
      c([-6,0,0],[12,16,2],'face'),
      c([-6,0,0],[12,2,2],'rim'),c([-6,14,0],[12,2,2],'rim'),
      c([-6,0,0],[2,16,2],'rim'),c([4,0,0],[2,16,2],'rim'),
      c([-2,6,2],[4,4,1],'boss'),
    ]),
    stats:{ durability:1800 },
  },
  {
    key:'staff', name:'Bâton magique', emoji:'🪄', category:'Arme magique',
    itemType:'staff', defaultScale:1.1,
    colorSlots:[
      { key:'wood',   label:'Bois',     def:'#5a3a1a' },
      { key:'gem',    label:'Gemme',    def:'#8be9ff' },
      { key:'binding',label:'Monture',  def:'#c8a55a' },
    ],
    bones: itemBone([
      c([-0.5,-6,-0.5],[1,20,1],'wood'),
      c([-2,14,-2],[4,2,4],'binding'),
      c([-2,16,-2],[4,4,4],'gem',{ glow:true, alpha:0.92 }),
      c([-1,20,-1],[2,3,2],'gem',{ glow:true, alpha:0.85 }),
    ]),
    stats:{ damage:6, durability:900 },
  },
  {
    key:'potion', name:'Fiole de potion', emoji:'⚗️', category:'Consommable',
    itemType:'potion', defaultScale:0.9,
    colorSlots:[
      { key:'glass',  label:'Verre',   def:'#cfe4e8' },
      { key:'liquid', label:'Liquide', def:'#8a1e8a' },
      { key:'cork',   label:'Bouchon', def:'#7a5a30' },
    ],
    bones: itemBone([
      c([-3,0,-3],[6,6,6],'glass',{ alpha:0.7 }),
      c([-2.5,1,-2.5],[5,4,5],'liquid'),
      c([-1.5,6,-1.5],[3,4,3],'glass',{ alpha:0.7 }),
      c([-1.5,10,-1.5],[3,2,3],'cork'),
    ]),
    stats:{},
  },
];

// ═══════════════════════ OBJETS 2D (patrons pixel) ═══════════════════════
// Palette courte + patron facultatif chargé dans l'éditeur pixel.
const ITEMS_2D = [
  { key:'blank16', name:'Toile vierge 16×16', emoji:'🖼️', size:16 },
  { key:'blank32', name:'Toile vierge 32×32', emoji:'🖼️', size:32 },
  { key:'gem2d',   name:'Gemme', emoji:'💎', size:16, palette:['#8be9ff','#4fb8d8','#2b6a80'], preset:'gem' },
  { key:'coin2d',  name:'Pièce d\'or', emoji:'🪙', size:16, palette:['#f2d16b','#c8a03a','#8a6a1a'], preset:'coin' },
  { key:'scroll2d',name:'Parchemin', emoji:'📜', size:16, palette:['#e8d8a8','#c8b070','#8a6a30'], preset:'scroll' },
];

// ═══════════════════════ BLOCS / MOBILIER (décor médiéval) ═══════════════
// Modèles de blocs à géométrie custom (16 unités = 1 bloc plein).
const FURNITURE = [
  {
    key:'chair', name:'Chaise', emoji:'🪑', category:'Mobilier',
    defaultScale:1.0, seat:true,
    colorSlots:[ { key:'wood', label:'Bois', def:'#6a4a24' }, { key:'cushion', label:'Coussin', def:'#7a1f1f' } ],
    bones: [ bone('root',[8,0,8],[
      c([2,0,2],[2,8,2],'wood'),c([12,0,2],[2,8,2],'wood'),c([2,0,12],[2,8,2],'wood'),c([12,0,12],[2,8,2],'wood'),
      c([2,8,2],[12,2,12],'wood'),c([3,10,3],[10,1,10],'cushion'),
      c([2,10,12],[12,10,2],'wood'),
    ]) ],
  },
  {
    key:'table', name:'Table', emoji:'🪵', category:'Mobilier',
    defaultScale:1.0,
    colorSlots:[ { key:'wood', label:'Bois', def:'#6a4a24' } ],
    bones:[ bone('root',[8,0,8],[
      c([1,0,1],[2,12,2],'wood'),c([13,0,1],[2,12,2],'wood'),c([1,0,13],[2,12,2],'wood'),c([13,0,13],[2,12,2],'wood'),
      c([0,12,0],[16,3,16],'wood'),
    ]) ],
  },
  {
    key:'barrel', name:'Tonneau', emoji:'🛢️', category:'Mobilier',
    defaultScale:1.0,
    colorSlots:[ { key:'wood', label:'Douves', def:'#6a4224' }, { key:'iron', label:'Cerclage', def:'#4a4a50' } ],
    bones:[ bone('root',[8,0,8],[
      c([2,0,2],[12,16,12],'wood'),
      c([1,3,1],[14,2,14],'iron'),c([1,11,1],[14,2,14],'iron'),
      c([3,15,3],[10,1,10],'wood'),
    ]) ],
  },
  {
    key:'chest', name:'Coffre médiéval', emoji:'🧰', category:'Rangement', storage:true,
    defaultScale:1.0,
    colorSlots:[ { key:'wood', label:'Bois', def:'#5a3a1a' }, { key:'iron', label:'Ferrures', def:'#3a3a40' }, { key:'gold', label:'Serrure', def:'#c8a55a' } ],
    bones:[ bone('root',[8,0,8],[
      c([1,0,1],[14,9,14],'wood'),
      c([1,9,1],[14,5,14],'wood'),
      c([0,3,0],[16,2,16],'iron'),c([7,4,0],[2,8,1],'gold'),
    ]) ],
  },
  {
    key:'candelabra', name:'Chandelier', emoji:'🕯️', category:'Éclairage', light:12,
    defaultScale:1.0,
    colorSlots:[ { key:'metal', label:'Métal', def:'#c8a55a' }, { key:'wax', label:'Bougie', def:'#e8e0c8' }, { key:'flame', label:'Flamme', def:'#ff9a2a' } ],
    bones:[ bone('root',[8,0,8],[
      c([6,0,6],[4,2,4],'metal'),c([7,2,7],[2,10,2],'metal'),
      c([5,11,7],[6,1,2],'metal'),
      c([5,12,7],[1,3,2],'wax'),c([10,12,7],[1,3,2],'wax'),c([7,12,7],[2,4,2],'wax'),
      c([5,15,7],[1,1,2],'flame',{ glow:true }),c([10,15,7],[1,1,2],'flame',{ glow:true }),c([7,16,7],[2,2,2],'flame',{ glow:true }),
    ]) ],
  },
  {
    key:'bed', name:'Lit à baldaquin', emoji:'🛏️', category:'Mobilier',
    defaultScale:1.0,
    colorSlots:[ { key:'wood', label:'Bois', def:'#5a3a1a' }, { key:'sheet', label:'Draps', def:'#b23030' }, { key:'pillow', label:'Oreiller', def:'#e8e0d0' } ],
    bones:[ bone('root',[8,0,8],[
      c([0,0,0],[16,4,16],'wood'),
      c([0,4,0],[16,2,16],'sheet'),
      c([1,6,1],[6,2,4],'pillow'),
      c([0,0,0],[2,14,2],'wood'),c([14,0,0],[2,14,2],'wood'),
    ]) ],
  },
];

global.BSTemplates = { CREATURES, ITEMS_3D, ITEMS_2D, FURNITURE };

})(window);
