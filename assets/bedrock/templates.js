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
      c([-8,17,-16],[16,16,12],'body'),      // poitrail large
      c([-7,16,-6],[14,15,20],'body'),       // corps
      c([-6,15,-4],[12,3,18],'belly'),       // ventre clair
      c([-8,16,10],[16,15,11],'body'),       // hanches
      // épines dorsales
      c([-1,33,-8],[2,4,3],'horn'),c([-1,32,-3],[2,5,3],'horn'),c([-1,32,2],[2,5,3],'horn'),
      c([-1,32,7],[2,4,3],'horn'),c([-1,32,12],[2,3,3],'horn'),
    ]),
    bone('neck1',[0,29,-14],[
      c([-5,25,-24],[10,12,12],'body'),
      c([-1,36,-20],[2,4,3],'horn'),c([-1,35,-15],[2,3,3],'horn'),
    ],{ parent:'body', rotation:[-38,0,0] }),
    bone('neck2',[0,33,-22],[
      c([-4,30,-33],[8,10,11],'body'),
    ],{ parent:'neck1', rotation:[-18,0,0] }),
    bone('head',[0,35,-31],[
      c([-5,31,-43],[10,10,12],'body'),        // crâne
      c([-6,39,-41],[12,3,7],'horn'),          // arcade / front
      c([-4,29,-52],[8,7,11],'body'),          // museau
      c([-4,26,-52],[8,3,14],'belly'),         // mâchoire
      // crocs
      c([-3,29,-52],[1,2,2],'horn'),c([2,29,-52],[1,2,2],'horn'),
      c([-3,26,-52],[1,2,2],'horn'),c([2,26,-52],[1,2,2],'horn'),
    ],{ parent:'neck2', rotation:[28,0,0], eyeHost:true }),
    bone('horn_l',[5,41,-36],[ c([4,40,-36],[2,2,8],'horn'), c([4,39,-29],[2,2,7],'horn') ],{ parent:'head', rotation:[-45,-12,12] }),
    bone('horn_r',[-5,41,-36],[ c([-6,40,-36],[2,2,8],'horn'), c([-6,39,-29],[2,2,7],'horn') ],{ parent:'head', rotation:[-45,12,-12] }),
    bone('frill_l',[5,36,-34],[ c([5,33,-34],[1,5,7],'wing') ],{ parent:'head', rotation:[0,0,35] }),
    bone('frill_r',[-5,36,-34],[ c([-6,33,-34],[1,5,7],'wing') ],{ parent:'head', rotation:[0,0,-35] }),
    // Ailes : humérus + avant-bras + doigts + membranes
    bone('wing_l',[7,31,-6],[
      c([7,29,-9],[4,4,10],'horn'),            // humérus
      c([9,29,0],[3,3,20],'horn'),             // avant-bras vers l'extérieur
      c([11,28,-2],[24,1,16],'wing'),          // membrane haute
      c([11,28,14],[20,1,12],'wing'),          // membrane basse
      c([33,27,-2],[2,2,10],'horn'),           // doigt/pointe
    ],{ parent:'body', rotation:[-8,-22,-46] }),
    bone('wing_r',[-7,31,-6],[
      c([-11,29,-9],[4,4,10],'horn'),
      c([-12,29,0],[3,3,20],'horn'),
      c([-35,28,-2],[24,1,16],'wing'),
      c([-31,28,14],[20,1,12],'wing'),
      c([-35,27,-2],[2,2,10],'horn'),
    ],{ parent:'body', rotation:[-8,22,46] }),
    bone('tail1',[0,22,16],[ c([-5,17,14],[10,11,14],'body'), c([-1,28,16],[2,3,3],'horn'),c([-1,28,21],[2,3,3],'horn') ],{ parent:'body', rotation:[8,0,0] }),
    bone('tail2',[0,21,28],[ c([-4,17,26],[8,9,14],'body'), c([-1,26,28],[2,3,3],'horn') ],{ parent:'tail1', rotation:[8,0,0] }),
    bone('tail3',[0,20,40],[ c([-3,17,38],[6,7,14],'belly') ],{ parent:'tail2', rotation:[9,0,0] }),
    bone('tail4',[0,19,52],[
      c([-2,17,50],[4,5,12],'belly'),
      c([-3,17,60],[6,9,3],'horn'),            // dard en pointe de flèche
    ],{ parent:'tail3', rotation:[10,0,0] }),
    // Pattes : cuisse + tibia + pied griffu
    bone('leg_fr',[6,15,-8],[
      c([4,5,-11],[6,12,8],'body'), c([5,0,-12],[4,6,7],'body'),
      c([3,0,-16],[8,3,7],'body'), c([3,0,-18],[2,2,3],'horn'),c([5.5,0,-18],[2,2,3],'horn'),c([8,0,-18],[2,2,3],'horn'),
    ],{ parent:'body' }),
    bone('leg_fl',[-6,15,-8],[
      c([-10,5,-11],[6,12,8],'body'), c([-9,0,-12],[4,6,7],'body'),
      c([-11,0,-16],[8,3,7],'body'), c([-11,0,-18],[2,2,3],'horn'),c([-7.5,0,-18],[2,2,3],'horn'),c([-5,0,-18],[2,2,3],'horn'),
    ],{ parent:'body' }),
    bone('leg_br',[7,15,12],[
      c([5,4,9],[7,13,9],'body'), c([6,0,10],[5,6,8],'body'),
      c([4,0,6],[9,3,8],'body'), c([4,0,4],[2,2,3],'horn'),c([7,0,4],[2,2,3],'horn'),c([10,0,4],[2,2,3],'horn'),
    ],{ parent:'body' }),
    bone('leg_bl',[-7,15,12],[
      c([-12,4,9],[7,13,9],'body'), c([-11,0,10],[5,6,8],'body'),
      c([-13,0,6],[9,3,8],'body'), c([-13,0,4],[2,2,3],'horn'),c([-10,0,4],[2,2,3],'horn'),c([-7,0,4],[2,2,3],'horn'),
    ],{ parent:'body' }),
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
    bone('body',[0,8,2],[
      c([-6,5,-4],[12,8,12],'body'),           // céphalothorax
      c([-5,12,-3],[10,2,10],'abdomen'),       // plaque dorsale
      c([-4,6,-10],[8,6,6],'body'),            // tête
      c([-3,11,-9],[6,2,4],'abdomen'),         // front bombé
      // poils dorsaux
      c([-4,13,-1],[1,2,1],'leg'),c([3,13,-1],[1,2,1],'leg'),c([0,14,2],[1,2,1],'leg'),
    ],{ eyeHost:true }),
    bone('abdomen',[0,10,10],[
      c([-8,3,6],[16,14,17],'abdomen'),        // masse principale
      c([-6,15,8],[12,3,13],'abdomen'),        // bombé supérieur
      c([-3,16,10],[6,3,9],'mark'),            // marque dorsale
      c([-1,15,23],[2,2,3],'mark'),            // pointe de la marque
      // filières
      c([-2,4,22],[1,2,3],'fang'),c([1,4,22],[1,2,3],'fang'),
      // poils abdomen
      c([-8,10,10],[1,3,1],'leg'),c([7,10,10],[1,3,1],'leg'),
      c([-7,12,16],[1,3,1],'leg'),c([6,12,16],[1,3,1],'leg'),
    ],{ parent:'body', rotation:[12,0,0] }),
    // chélicères + crochets courbés
    bone('fang_l',[2.5,6,-10],[ c([1.5,3,-13],[2,4,3],'body'), c([2,1,-12.5],[1,3,2],'fang') ],{ parent:'body', rotation:[22,0,6] }),
    bone('fang_r',[-2.5,6,-10],[ c([-3.5,3,-13],[2,4,3],'body'), c([-3,1,-12.5],[1,3,2],'fang') ],{ parent:'body', rotation:[22,0,-6] }),
    // pédipalpes (petites pattes avant)
    bone('palp_l',[3.5,7,-9],[ c([3,6,-15],[1.5,1.5,6],'leg') ],{ parent:'body', rotation:[-18,14,0] }),
    bone('palp_r',[-3.5,7,-9],[ c([-4.5,6,-15],[1.5,1.5,6],'leg') ],{ parent:'body', rotation:[-18,-14,0] }),
    // 8 pattes coudées : fémur montant + genou + tibia descendant
    bone('leg_r1',[6,10,-2],[ c([5,9,-3.2],[10,2.5,2.5],'leg'), c([14,10,-3],[2.5,2.5,2.5],'body'), c([15,-2,-3],[2,13,2],'leg') ],{ parent:'body', rotation:[0,-28,-26] }),
    bone('leg_r2',[6,10,1],[  c([5,9,0],[11,2.5,2.5],'leg'),  c([15,10,0.2],[2.5,2.5,2.5],'body'), c([16,-3,0.3],[2,14,2],'leg') ], { parent:'body', rotation:[0,-9,-22] }),
    bone('leg_r3',[6,10,4],[  c([5,9,3.2],[11,2.5,2.5],'leg'), c([15,10,3.4],[2.5,2.5,2.5],'body'), c([16,-3,3.5],[2,14,2],'leg') ], { parent:'body', rotation:[0,9,-22] }),
    bone('leg_r4',[6,10,7],[  c([5,9,6.4],[10,2.5,2.5],'leg'), c([14,10,6.6],[2.5,2.5,2.5],'body'), c([15,-2,6.7],[2,13,2],'leg') ], { parent:'body', rotation:[0,28,-26] }),
    bone('leg_l1',[-6,10,-2],[ c([-15,9,-3.2],[10,2.5,2.5],'leg'), c([-16.5,10,-3],[2.5,2.5,2.5],'body'), c([-17,-2,-3],[2,13,2],'leg') ],{ parent:'body', rotation:[0,28,26] }),
    bone('leg_l2',[-6,10,1],[  c([-16,9,0],[11,2.5,2.5],'leg'),  c([-17.5,10,0.2],[2.5,2.5,2.5],'body'), c([-18,-3,0.3],[2,14,2],'leg') ], { parent:'body', rotation:[0,9,22] }),
    bone('leg_l3',[-6,10,4],[  c([-16,9,3.2],[11,2.5,2.5],'leg'), c([-17.5,10,3.4],[2.5,2.5,2.5],'body'), c([-18,-3,3.5],[2,14,2],'leg') ], { parent:'body', rotation:[0,-9,22] }),
    bone('leg_l4',[-6,10,7],[  c([-15,9,6.4],[10,2.5,2.5],'leg'), c([-16.5,10,6.6],[2.5,2.5,2.5],'body'), c([-17,-2,6.7],[2,13,2],'leg') ], { parent:'body', rotation:[0,-28,26] }),
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
    { key:'moss',  label:'Mousse',  def:'#4a6b2a' },
    { key:'eye',   label:'Yeux',    def:'#33d6ff' },
  ],
  bones:[
    bone('body',[0,22,0],[
      c([-9,20,-5],[18,15,10],'stone'),          // torse
      c([-10,30,-6],[20,5,12],'stone'),          // épaules massives
      c([-6,18,-4],[12,2,8],'dark'),             // ceinture sombre
      c([-3,24,-6],[6,6,2],'rune',{ glow:true }),// gemme de cœur
      c([-4,25,-6.5],[8,1,1],'dark'),c([-4,28,-6.5],[8,1,1],'dark'), // sertissage
      // fissures runiques latérales
      c([-9.5,22,-2],[1,8,1],'rune',{glow:true}), c([8.5,22,-2],[1,8,1],'rune',{glow:true}),
      // mousse
      c([-9,33,2],[4,2,4],'moss'), c([5,34,-3],[4,1,4],'moss'),
    ]),
    bone('head',[0,35,0],[
      c([-5,35,-5],[10,9,9],'stone'),
      c([-6,42,-6],[12,3,11],'stone'),           // couronne de pierre
      c([-6,44,-5],[2,3,2],'stone'),c([4,44,-5],[2,3,2],'stone'),c([-1,45,-5],[2,3,2],'stone'),
      c([-4,38,-5.5],[8,1,1],'rune',{glow:true}),// bandeau runique
      c([-1,33,-5],[2,3,2],'dark'),              // bouche/grille
    ],{ parent:'body', eyeHost:true }),
    // bras : épaulière + biceps + avant-bras + poing à jointures
    bone('arm_r',[-11,32,0],[
      c([-17,26,-5],[6,8,10],'stone'),           // épaulière
      c([-16,16,-4],[5,12,8],'stone'),           // biceps
      c([-17,6,-4.5],[6,11,9],'stone'),          // avant-bras massif
      c([-17,3,-4],[6,4,8],'dark'),              // poing
      c([-17.5,4,-3],[1,2,2],'stone'),c([-17.5,4,0],[1,2,2],'stone'), // jointures
      c([-16,12,-4.8],[4,1,1],'rune',{glow:true}),
    ],{ parent:'body' }),
    bone('arm_l',[11,32,0],[
      c([11,26,-5],[6,8,10],'stone'),
      c([11,16,-4],[5,12,8],'stone'),
      c([11,6,-4.5],[6,11,9],'stone'),
      c([11,3,-4],[6,4,8],'dark'),
      c([16.5,4,-3],[1,2,2],'stone'),c([16.5,4,0],[1,2,2],'stone'),
      c([12,12,-4.8],[4,1,1],'rune',{glow:true}),
      c([12,25,4],[4,2,3],'moss'),
    ],{ parent:'body' }),
    // jambes : cuisse + tibia + orteils de pierre
    bone('leg_r',[-4.5,20,0],[
      c([-8,10,-4],[7,10,8],'stone'),
      c([-8.5,0,-4.5],[8,10,9],'stone'),
      c([-8.5,0,-6.5],[3,3,2],'dark'),c([-4.5,0,-6.5],[3,3,2],'dark'), // orteils
    ],{ parent:'body' }),
    bone('leg_l',[4.5,20,0],[
      c([1,10,-4],[7,10,8],'stone'),
      c([0.5,0,-4.5],[8,10,9],'stone'),
      c([0.5,0,-6.5],[3,3,2],'dark'),c([4.5,0,-6.5],[3,3,2],'dark'),
      c([1,8,4],[4,2,2],'moss'),
    ],{ parent:'body' }),
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
      c([-2,18,-2],[4,8,4],'core',{ glow:true, alpha:0.55 }),   // noyau interne croisé
    ],{ rotation:[45,0,45], eyeHost:true }),
    // anneau orbital horizontal (4 segments)
    bone('ring',[0,22,0],[
      c([-7,21.5,-1],[3,1,2],'aura',{ alpha:0.75, glow:true }), c([4,21.5,-1],[3,1,2],'aura',{ alpha:0.75, glow:true }),
      c([-1,21.5,-7],[2,1,3],'aura',{ alpha:0.75, glow:true }), c([-1,21.5,4],[2,1,3],'aura',{ alpha:0.75, glow:true }),
    ],{ parent:'body', rotation:[0,0,12] }),
    // couronne de cristaux flottants
    bone('crystal_1',[0,22,0],[ c([-1,27,-1],[2,6,2],'crystal',{ alpha:0.92, glow:true }), c([-0.5,33,-0.5],[1,2,1],'crystal',{ alpha:0.8, glow:true }) ],{ parent:'body' }),
    bone('crystal_2',[0,22,0],[ c([6,20,0],[2,5,2],'crystal',{ alpha:0.92, glow:true }), c([6.5,25,0.5],[1,2,1],'crystal',{ alpha:0.8, glow:true }) ],{ parent:'body', rotation:[0,0,-32] }),
    bone('crystal_3',[0,22,0],[ c([-8,20,0],[2,5,2],'crystal',{ alpha:0.92, glow:true }), c([-7.5,25,0.5],[1,2,1],'crystal',{ alpha:0.8, glow:true }) ],{ parent:'body', rotation:[0,0,32] }),
    bone('crystal_4',[0,22,0],[ c([0,20,6],[2,5,2],'crystal',{ alpha:0.92, glow:true }) ],{ parent:'body', rotation:[32,0,0] }),
    bone('crystal_5',[0,22,0],[ c([0,20,-8],[2,5,2],'crystal',{ alpha:0.92, glow:true }) ],{ parent:'body', rotation:[-32,0,0] }),
    // éclats satellites
    bone('shard_1',[0,22,0],[ c([5,26,4],[1.5,1.5,1.5],'crystal',{ alpha:0.7, glow:true }) ],{ parent:'body' }),
    bone('shard_2',[0,22,0],[ c([-6,25,-5],[1.5,1.5,1.5],'crystal',{ alpha:0.7, glow:true }) ],{ parent:'body' }),
    bone('shard_3',[0,22,0],[ c([4,17,-6],[1.5,1.5,1.5],'crystal',{ alpha:0.7, glow:true }) ],{ parent:'body' }),
    // traîne d'énergie dégradée
    bone('tail',[0,19,0],[
      c([-1.5,13,-1.5],[3,6,3],'aura',{ alpha:0.65 }),
      c([-1,9,-1],[2,4,2],'aura',{ alpha:0.45 }),
      c([-0.5,6,-0.5],[1,3,1],'aura',{ alpha:0.3 }),
    ],{ parent:'body' }),
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
      c([-4.2,17,-2.2],[8.4,5,4.4],'shirt'),           // plastron
      c([-4,12,-2],[3,12,4],'accent',{ noise:false }), // liseré
      c([-4.3,11.5,-2.3],[8.6,2,4.6],'accent'),        // ceinture
      c([-1,11.5,-2.5],[2,2,1],'hair'),                // boucle de ceinture
      c([-4.4,21,-2.4],[2.5,3,4.8],'accent'),c([1.9,21,-2.4],[2.5,3,4.8],'accent'), // épaulières
    ]),
    bone('head',[0,24,0],[
      c([-4,24,-4],[8,8,8],'skin'),
      c([-1,26.5,-4.5],[2,2,1],'skin'),                // nez
    ],{ parent:'body', eyeHost:true }),
    // Coiffures (une seule visible ; gérées par les "parts")
    bone('hair_short',[0,24,0],[
      c([-4.3,29,-4.3],[8.6,4,8.6],'hair',{ inflate:0 }),
      c([-4.3,26,-4.3],[8.6,3.4,1.6],'hair'),
      c([-4.3,25,3],[8.6,5,1.4],'hair'),               // nuque
      c([-4.4,26,-4.4],[1.4,4,8.8],'hair'),c([3,26,-4.4],[1.4,4,8.8],'hair'), // tempes
    ],{ parent:'head', part:'hair', variant:'court' }),
    bone('hair_long',[0,24,0],[
      c([-4.3,29,-4.3],[8.6,4,8.6],'hair'),
      c([-4.3,26.5,-4.4],[8.6,3,1.6],'hair'),          // frange
      c([-4.4,15,3],[8.8,14,1.8],'hair'),              // chevelure dos
      c([-4.5,20,-1],[1.5,10,5.4],'hair'),c([3,20,-1],[1.5,10,5.4],'hair'), // mèches côtés
      c([-1.5,13.5,3.2],[3,2,1.6],'accent'),           // attache basse
    ],{ parent:'head', part:'hair', variant:'long' }),
    bone('hair_spiky',[0,24,0],[
      c([-4.3,30,-4.3],[8.6,3,8.6],'hair'),
      c([-3,33,-3],[1.5,3.5,1.5],'hair'),c([1.5,33,-2.5],[1.5,4,1.5],'hair'),
      c([-1,33.5,0],[1.5,3,1.5],'hair'),c([-3,33,1.5],[1.5,3.5,1.5],'hair'),c([2,33,1.5],[1.5,3,1.5],'hair'),
      c([-4.3,27,-4.4],[8.6,3,1.5],'hair'),
    ],{ parent:'head', part:'hair', variant:'piquant' }),
    bone('hair_bun',[0,24,0],[
      c([-4.3,29,-4.3],[8.6,4,8.6],'hair'),
      c([-2,31.5,2.5],[4,4,4],'hair'),
      c([-1.5,35,3],[3,1,3],'accent'),                 // ruban
      c([-4.3,26,-4.4],[8.6,3,1.5],'hair'),
    ],{ parent:'head', part:'hair', variant:'chignon' }),
    bone('arm_r',[-5,22,0],[
      c([-8,12,-2],[4,12,4],'skin'),
      c([-8.2,17,-2.2],[4.4,7,4.4],'shirt'),
      c([-8.3,12,-2.3],[4.6,2.5,4.6],'accent'),        // manchette
    ],{ parent:'body' }),
    bone('arm_l',[5,22,0],[
      c([4,12,-2],[4,12,4],'skin',{ mirror:true }),
      c([3.8,17,-2.2],[4.4,7,4.4],'shirt'),
      c([3.7,12,-2.3],[4.6,2.5,4.6],'accent'),
    ],{ parent:'body' }),
    bone('leg_r',[-2,12,0],[
      c([-4,0,-2],[4,12,4],'pants'),
      c([-4.2,0,-2.2],[4.4,4,4.4],'hair'),             // botte
      c([-4.3,3.5,-2.3],[4.6,1,4.6],'accent'),         // revers de botte
    ],{ parent:'body' }),
    bone('leg_l',[2,12,0],[
      c([0,0,-2],[4,12,4],'pants',{ mirror:true }),
      c([-0.2,0,-2.2],[4.4,4,4.4],'hair'),
      c([-0.3,3.5,-2.3],[4.6,1,4.6],'accent'),
    ],{ parent:'body' }),
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

const WOLF = {
  key:'wolf', name:'Loup Sombre', emoji:'🐺', category:'Bête féroce',
  desc:'Loup alpha au pelage hérissé, crocs découverts, échine dressée et regard braise.',
  defaultScale:1.3, flying:false,
  stats:{ hp:60, damage:8, armor:2, speed:0.38, knockback:0.3 },
  sounds:{ ambient:'mob.wolf.growl', hurt:'mob.wolf.hurt', death:'mob.wolf.death' },
  colorSlots:[
    { key:'fur',   label:'Pelage',      def:'#2e2a28' },
    { key:'mane',  label:'Crinière',    def:'#1a1716' },
    { key:'belly', label:'Ventre',      def:'#57504a' },
    { key:'claw',  label:'Griffes/crocs', def:'#d8cbb0' },
    { key:'eye',   label:'Yeux',        def:'#ff7a1a' },
  ],
  bones:[
    bone('body',[0,13,0],[
      c([-4.5,9,-8],[9,9,10],'fur'),            // poitrail
      c([-4,9,2],[8,8,10],'fur'),               // arrière-train
      c([-3.5,8.4,-7],[7,2,16],'belly'),        // ventre
      // échine hérissée
      c([-1.5,17.5,-7],[3,2.5,4],'mane'),c([-1.5,17,-3],[3,2.5,5],'mane'),c([-1.5,16.5,2],[3,2,5],'mane'),
    ]),
    bone('head',[0,16,-8],[
      c([-3.5,13,-15],[7,7,7],'fur'),           // crâne
      c([-2,12.2,-21],[4,3.5,6],'fur'),         // museau
      c([-2,11,-20.5],[4,1.5,5.5],'mane'),      // mâchoire inf
      c([-2.5,15.5,-16],[5,2,3],'mane'),        // front
      // crocs
      c([-1.8,11.6,-20.8],[1,1.4,1],'claw'),c([0.8,11.6,-20.8],[1,1.4,1],'claw'),
      c([-1.2,12.6,-21],[0.8,1,0.8],'claw'),c([0.6,12.6,-21],[0.8,1,0.8],'claw'),
      c([-0.8,13.6,-21.4],[1.6,1.2,1.4],'mane'),// truffe
    ],{ parent:'body', eyeHost:true }),
    bone('ear_l',[2.5,20,-13],[ c([1.5,19,-14],[2,3.5,1.5],'fur'), c([2,19.5,-13.7],[1,2,1],'mane') ],{ parent:'head', rotation:[0,0,12] }),
    bone('ear_r',[-2.5,20,-13],[ c([-3.5,19,-14],[2,3.5,1.5],'fur'), c([-3,19.5,-13.7],[1,2,1],'mane') ],{ parent:'head', rotation:[0,0,-12] }),
    bone('tail',[0,15,11],[
      c([-1.5,13,10],[3,3,7],'fur'), c([-1,11.5,16],[2,2.5,5],'mane'),
    ],{ parent:'body', rotation:[-35,0,0] }),
    // pattes : épaule + patte + coussinets à griffes
    bone('leg_fr',[2.8,9,-6],[ c([1.6,4,-7],[3,6,3.5],'fur'), c([1.8,0,-6.8],[2.6,4.5,3],'fur'), c([1.6,0,-8],[3,1.5,1.5],'claw') ],{ parent:'body' }),
    bone('leg_fl',[-2.8,9,-6],[ c([-4.6,4,-7],[3,6,3.5],'fur'), c([-4.4,0,-6.8],[2.6,4.5,3],'fur'), c([-4.6,0,-8],[3,1.5,1.5],'claw') ],{ parent:'body' }),
    bone('leg_br',[2.6,9,6],[ c([1.4,4,5],[3.2,6,4],'fur'), c([1.7,0,5.4],[2.6,4.5,3],'fur'), c([1.5,0,4.2],[3,1.5,1.5],'claw') ],{ parent:'body' }),
    bone('leg_bl',[-2.6,9,6],[ c([-4.6,4,5],[3.2,6,4],'fur'), c([-4.3,0,5.4],[2.6,4.5,3],'fur'), c([-4.5,0,4.2],[3,1.5,1.5],'claw') ],{ parent:'body' }),
  ],
  eyes:{ style:'reptile' },
};

const HYDRA = {
  key:'hydra', name:'Hydre', emoji:'🐉', category:'Boss légendaire',
  desc:'Hydre à trois têtes sur cous serpentins, corps massif cuirassé et double queue.',
  defaultScale:2.4, flying:false,
  stats:{ hp:400, damage:18, armor:14, speed:0.22, knockback:1 },
  sounds:{ ambient:'mob.enderdragon.growl', hurt:'mob.ravager.hurt', death:'mob.enderdragon.death' },
  colorSlots:[
    { key:'body',  label:'Écailles',   def:'#2e4a2e' },
    { key:'belly', label:'Plastron',   def:'#c9c39a' },
    { key:'spine', label:'Crêtes',     def:'#8a2020' },
    { key:'horn',  label:'Cornes',     def:'#d8cbb0' },
    { key:'eye',   label:'Yeux',       def:'#ffd020' },
  ],
  bones:[
    bone('body',[0,16,0],[
      c([-9,10,-10],[18,16,22],'body'),          // masse principale
      c([-7,9,-9],[14,4,20],'belly'),            // plastron
      c([-10,22,-8],[20,5,18],'body'),           // dos bombé
      // rangée de crêtes dorsales
      c([-1.5,27,-8],[3,4,3],'spine'),c([-1.5,27,-3],[3,5,3],'spine'),c([-1.5,27,2],[3,5,3],'spine'),c([-1.5,27,7],[3,4,3],'spine'),
    ]),
    // 3 cous serpentins + têtes cornues
    bone('neck_c',[0,26,-8],[ c([-3,24,-18],[6,8,12],'body'), c([-1,32,-14],[2,3,3],'spine') ],{ parent:'body', rotation:[-32,0,0] }),
    bone('head_c',[0,30,-17],[
      c([-4,27,-26],[8,8,10],'body'), c([-3,26,-32],[6,5,7],'body'), c([-3,24.5,-32],[6,2,8],'belly'),
      c([-2.5,25,-31.8],[1,1.5,1],'horn'),c([1.5,25,-31.8],[1,1.5,1],'horn'),
    ],{ parent:'neck_c', rotation:[26,0,0], eyeHost:true }),
    bone('hornc_l',[3,34,-22],[ c([2.5,33.5,-23],[1.5,1.5,6],'horn') ],{ parent:'head_c', rotation:[-38,-10,0] }),
    bone('hornc_r',[-3,34,-22],[ c([-4,33.5,-23],[1.5,1.5,6],'horn') ],{ parent:'head_c', rotation:[-38,10,0] }),
    bone('neck_l',[6,24,-6],[ c([3,22,-16],[6,7,11],'body') ],{ parent:'body', rotation:[-24,-28,-14] }),
    bone('head_l',[6,27,-14],[
      c([2,24,-23],[8,7,9],'body'), c([3,23,-28],[6,4.5,6],'body'), c([3,21.8,-28],[6,1.6,7],'belly'),
    ],{ parent:'neck_l', rotation:[22,0,0], eyeHost:true }),
    bone('hornl_l',[9,30,-19],[ c([8.5,29.5,-20],[1.5,1.5,5],'horn') ],{ parent:'head_l', rotation:[-35,-12,0] }),
    bone('neck_r',[-6,24,-6],[ c([-9,22,-16],[6,7,11],'body') ],{ parent:'body', rotation:[-24,28,14] }),
    bone('head_r',[-6,27,-14],[
      c([-10,24,-23],[8,7,9],'body'), c([-9,23,-28],[6,4.5,6],'body'), c([-9,21.8,-28],[6,1.6,7],'belly'),
    ],{ parent:'neck_r', rotation:[22,0,0], eyeHost:true }),
    bone('hornr_r',[-9,30,-19],[ c([-10,29.5,-20],[1.5,1.5,5],'horn') ],{ parent:'head_r', rotation:[-35,12,0] }),
    // double queue
    bone('tail_a1',[2,18,12],[ c([0,14,10],[7,8,12],'body'), c([2,22,12],[2,2.5,3],'spine') ],{ parent:'body', rotation:[8,14,0] }),
    bone('tail_a2',[3,17,22],[ c([1.5,14,20],[5,6,12],'body'), c([2.5,14,31],[3,3,4],'spine') ],{ parent:'tail_a1', rotation:[8,10,0] }),
    bone('tail_b1',[-2,18,12],[ c([-7,14,10],[7,8,12],'body') ],{ parent:'body', rotation:[8,-14,0] }),
    bone('tail_b2',[-3,17,22],[ c([-6.5,14,20],[5,6,12],'body'), c([-5.5,14,31],[3,3,4],'spine') ],{ parent:'tail_b1', rotation:[8,-10,0] }),
    // 4 pattes trapues griffues
    bone('leg_fr',[7,12,-6],[ c([5,4,-8],[6,9,7],'body'), c([4.5,0,-8.5],[7,4,8],'body'), c([4.5,0,-10],[2,2,2.5],'horn'),c([7,0,-10],[2,2,2.5],'horn') ],{ parent:'body' }),
    bone('leg_fl',[-7,12,-6],[ c([-11,4,-8],[6,9,7],'body'), c([-11.5,0,-8.5],[7,4,8],'body'), c([-11.5,0,-10],[2,2,2.5],'horn'),c([-9,0,-10],[2,2,2.5],'horn') ],{ parent:'body' }),
    bone('leg_br',[7,12,8],[ c([5,4,6],[6,9,7],'body'), c([4.5,0,5.5],[7,4,8],'body'), c([4.5,0,4],[2,2,2.5],'horn'),c([7,0,4],[2,2,2.5],'horn') ],{ parent:'body' }),
    bone('leg_bl',[-7,12,8],[ c([-11,4,6],[6,9,7],'body'), c([-11.5,0,5.5],[7,4,8],'body'), c([-11.5,0,4],[2,2,2.5],'horn'),c([-9,0,4],[2,2,2.5],'horn') ],{ parent:'body' }),
  ],
  eyes:{ style:'reptile' },
};


const LEGIONNAIRE = {
  key:'legionnaire', name:'Légionnaire Romain', emoji:'🏛️', category:'Soldat en armure',
  desc:'Soldat au gabarit Steve portant la panoplie complète : casque à cimier, lorica segmentata, ptéruges et scutum.',
  defaultScale:1, flying:false, combat:true,
  stats:{ hp:60, damage:8, armor:15, speed:0.3, knockback:0.2 },
  sounds:{ ambient:'mob.villager.idle', hurt:'mob.villager.hurt', death:'mob.villager.death' },
  colorSlots:[
    { key:'steel', label:'Acier du casque',  def:'#c6ccd6', mat:'metal' },
    { key:'iron',  label:'Cuirasse',         def:'#565d68', mat:'metal' },
    { key:'gold',  label:'Or / rivets',      def:'#e8b93c', mat:'metal' },
    { key:'red',   label:'Cimier & tissu',   def:'#c8362b' },
    { key:'leather', label:'Cuir / tunique', def:'#7a5a38' },
    { key:'skin',  label:'Peau',             def:'#d8a878' },
  ],
  bones:[
    bone('body',[0,12,0],[
      c([-4,12,-2],[8,12,4],'leather'),                       // tunique
      // lorica segmentata : cuirasse + bandes segmentées
      c([-4.3,14.5,-2.4],[8.6,8,4.8],'iron'),
      c([-4.45,20.2,-2.55],[8.9,1.2,5.1],'steel'),            // bande haute
      c([-4.45,17.6,-2.55],[8.9,1.2,5.1],'steel'),
      c([-4.45,15,-2.55],[8.9,1.2,5.1],'steel'),
      // plaques pectorales verticales gris sombre + rivets d'or
      c([-3.5,15.8,-2.9],[3,6,0.7],'iron'),
      c([0.5,15.8,-2.9],[3,6,0.7],'iron'),
      c([-0.6,15.2,-2.8],[1.2,7,0.5],'#31363e'),               // gorge centrale plus sombre
      // plaques dorsales (la lorica couvre aussi le dos)
      c([-3.5,15.8,2.2],[3,6,0.7],'iron'),
      c([0.5,15.8,2.2],[3,6,0.7],'iron'),
      // cerceaux d'épaule (couvrent les trapèzes jusqu'au cou)
      c([-4.5,22.3,-2.5],[2.7,1.7,5],'iron'),
      c([1.8,22.3,-2.5],[2.7,1.7,5],'iron'),
      // focale : écharpe rouge qui protège le cou du frottement de la cuirasse
      c([-3.2,22.9,-2.85],[6.4,1.5,1.1],'red'),
      c([-3.4,22.9,-2.3],[1.1,1.7,4.4],'red'),
      c([2.3,22.9,-2.3],[1.1,1.7,4.4],'red'),
      // gorgerin arrière : ferme la nuque en cuir entre la lorica et le casque + écharpe qui fait le tour
      c([-4.3,20.4,1.9],[8.6,3.7,1.2],'steel'),
      c([-3.3,22.8,2.0],[6.6,1.6,1.05],'red'),
      // rivets d'or : alignés au centre exact des 3 bandes (haute 20.8, milieu 18.2, basse 15.6)
      // 2 rivets frontaux + 2 rivets de flanc par bande, parfaitement symétriques
      c([-2.4,20.4,-2.95],[0.8,0.8,0.4],'gold'), c([1.6,20.4,-2.95],[0.8,0.8,0.4],'gold'),
      c([-2.4,17.8,-2.95],[0.8,0.8,0.4],'gold'), c([1.6,17.8,-2.95],[0.8,0.8,0.4],'gold'),
      c([-2.4,15.2,-2.95],[0.8,0.8,0.4],'gold'), c([1.6,15.2,-2.95],[0.8,0.8,0.4],'gold'),
      c([-4.75,20.4,-0.7],[0.5,0.9,1.4],'gold'), c([4.25,20.4,-0.7],[0.5,0.9,1.4],'gold'),
      c([-4.75,17.8,-0.7],[0.5,0.9,1.4],'gold'), c([4.25,17.8,-0.7],[0.5,0.9,1.4],'gold'),
      c([-4.75,15.2,-0.7],[0.5,0.9,1.4],'gold'), c([4.25,15.2,-0.7],[0.5,0.9,1.4],'gold'),
      // ceinture (cingulum) + boucle
      c([-4.4,11.6,-2.4],[8.8,1.8,4.8],'leather'),
      c([-1,11.7,-2.7],[2,1.6,0.5],'gold'),
      // ptéruges : jupe rouge à médaillons d'or et franges
      c([-4,6.5,-2.9],[8,5.4,1.1],'red'),
      c([-2.6,8.6,-3.2],[1.3,1.3,0.4],'gold'), c([-0.6,8.6,-3.2],[1.3,1.3,0.4],'gold'), c([1.4,8.6,-3.2],[1.3,1.3,0.4],'gold'),
      c([-2.5,6.1,-3.1],[1,1,0.4],'gold'), c([0.9,6.1,-3.1],[1,1,0.4],'gold'),
      c([-4.9,7,-2],[1,4.8,4],'red'), c([3.9,7,-2],[1,4.8,4],'red'),   // pans latéraux
      c([-4,4.5,1.9],[8,7.5,1.2],'red'),                       // pan arrière long (cape courte)
      c([-3,3.8,2.2],[6,1,0.7],'gold'),                        // liseré bas de cape
      // cingulum : 5 longues lanières de cuir cloutées qui pendouillent
      c([-3.7,3.4,-3.05],[1,3.6,0.5],'leather'), c([-2.1,3,-3.05],[1,4,0.5],'leather'),
      c([-0.5,3.4,-3.05],[1,3.6,0.5],'leather'), c([1.1,3,-3.05],[1,4,0.5],'leather'),
      c([2.7,3.4,-3.05],[1,3.6,0.5],'leather'),
      c([-3.7,5.2,-3.15],[1,0.7,0.5],'gold'), c([-2.1,4.8,-3.15],[1,0.7,0.5],'gold'),
      c([-0.5,5.2,-3.15],[1,0.7,0.5],'gold'), c([1.1,4.8,-3.15],[1,0.7,0.5],'gold'),
      c([2.7,5.2,-3.15],[1,0.7,0.5],'gold'),
      c([-3.7,2.7,-3.1],[1,0.8,0.55],'gold'), c([-2.1,2.3,-3.1],[1,0.8,0.55],'gold'),
      c([-0.5,2.7,-3.1],[1,0.8,0.55],'gold'), c([1.1,2.3,-3.1],[1,0.8,0.55],'gold'),
      c([2.7,2.7,-3.1],[1,0.8,0.55],'gold'),
      // ourlet de cuir en bas de la jupe + bandes de cuir latérales
      c([-4.05,6.2,-3.02],[8.1,1,1.05],'leather'),
      c([-5.05,6.4,-1.6],[1,2.8,3.2],'leather'), c([4.05,6.4,-1.6],[1,2.8,3.2],'leather'),
    ]),
    bone('head',[0,24,0],[
      c([-4,24,-4],[8,8,8],'skin'),
      // casque (galea) : dôme, visière, bandeau d'or, couvre-nuque, protège-joues avant
      c([-4.6,28,-4.6],[9.2,4.4,9.2],'steel'),
      c([-4.85,28.2,-5.2],[9.7,1.3,1.6],'steel'),              // visière frontale
      c([-4.7,29.6,-4.85],[9.4,1.1,1.1],'gold'),               // bandeau d'or
      c([-2.9,30.9,-4.9],[1.2,0.9,0.5],'gold'), c([1.7,30.9,-4.9],[1.2,0.9,0.5],'gold'),
      c([-4.85,23.8,-4.5],[1.5,4.7,4.8],'steel'),              // joue gauche (avant)
      c([3.35,23.8,-4.5],[1.5,4.7,4.8],'steel'),               // joue droite (avant)
      c([-3.6,23.6,-4.45],[0.9,1.2,0.6],'gold'), c([2.7,23.6,-4.45],[0.9,1.2,0.6],'gold'), // rivets de joues
      // plaques latérales + arrière : ferment le bas du casque (plus aucun trou de peau nue)
      c([-4.7,24,-4],[0.7,4,8],'steel'),                       // flanc gauche
      c([4.0,24,-4],[0.7,4,8],'steel'),                        // flanc droit
      c([-4,24,4.0],[8,4,0.7],'steel'),                        // arrière (au-dessus du couvre-nuque)
      c([-4.95,23.2,2.8],[9.9,3,2.9],'steel'),                 // couvre-nuque évasé
      // reliefs latéraux : couvre-oreilles bombés + rivet doré + nervure + liseré (des 2 côtés)
      c([-5.05,24.8,-1.3],[0.65,2.8,2.8],'steel'), c([4.4,24.8,-1.3],[0.65,2.8,2.8],'steel'),   // couvre-oreilles
      c([-5.25,25.9,-0.4],[0.4,1.0,1.0],'gold'),   c([4.85,25.9,-0.4],[0.4,1.0,1.0],'gold'),     // rivet d'oreillère
      c([-4.82,27.2,-3.6],[0.42,0.7,7],'steel'),   c([4.4,27.2,-3.6],[0.42,0.7,7],'steel'),      // nervure haute
      c([-4.82,24.3,-3.6],[0.42,0.6,6.5],'gold'),  c([4.4,24.3,-3.6],[0.42,0.6,6.5],'gold'),      // liseré doré bas
      // socle doré du cimier puis grand cimier rouge + retombée arrière
      c([-1.4,31.9,-4.8],[2.8,0.9,9.6],'gold'),
      c([-1.1,32.3,-5.4],[2.2,2.4,10.8],'red'),
      c([-1.1,34.5,-4.4],[2.2,2.6,9],'red'),
      c([-1.1,36.9,-2.8],[2.2,2,6],'red'),                     // sommet de l'arc
      c([-1.1,30.4,-6.6],[2.2,3,1.6],'red'),                   // touffe avant
      c([-1.1,29.4,4.9],[2.2,4.6,1.5],'red'),                  // retombée arrière
      c([-1.1,26,5.4],[2.2,4,1.3],'red'),                      // queue basse
      // visage : yeux plats à fleur de peau (pas de cubes qui dépassent) + nez + bouche
      // blanc de l'oeil (légèrement crème pour ne pas paraître gris) puis iris/pupille bien centré
      // yeux bruns francs : base brune + pupille noire + petit reflet blanc (vivant, jamais gris)
      c([-2.6,26.35,-4.14],[1.8,1.15,0.16],'#5a3a1e'), c([0.8,26.35,-4.14],[1.8,1.15,0.16],'#5a3a1e'),
      c([-2.15,26.45,-4.22],[0.85,0.85,0.16],'#0a0603'), c([1.3,26.45,-4.22],[0.85,0.85,0.16],'#0a0603'), // pupille noire
      c([-2.5,27.0,-4.26],[0.45,0.35,0.16],'#f0ece0'), c([0.95,27.0,-4.26],[0.45,0.35,0.16],'#f0ece0'), // reflet blanc
      c([-2.7,27.65,-4.14],[1.85,0.42,0.18],'#43301c'), c([0.85,27.65,-4.14],[1.85,0.42,0.18],'#43301c'), // sourcils
      c([-0.65,24.9,-4.25],[1.3,1.9,0.4],'skin'),              // nez en relief
      c([-1.4,24.1,-4.18],[2.8,0.35,0.18],'#7a4638'),          // bouche
    ],{ parent:'body' }),
    bone('arm_r',[-5,22,0],[
      c([-8,12,-2],[4,12,4],'skin'),
      c([-8.2,17.5,-2.2],[4.4,5,4.4],'leather'),               // manche
      c([-8.4,18.9,-2.4],[4.8,1.9,4.8],'red'),                 // épaulette rouge (fine)
      c([-8.4,20.4,-2.4],[4.8,2.1,4.8],'steel'),               // spallière d'acier ajustée sur l'épaule
      c([-8.1,20.7,-2.5],[3.6,0.7,0.6],'gold'),                // liseré d'or
      c([-8.35,12.8,-2.35],[4.7,2.8,4.7],'leather'),           // brassard
    ],{ parent:'body' }),
    // ARME dans son propre os (enfant du bras, pivot au poing) : inclinée vers l'avant
    // → tenue "prête", et suit tout le mouvement du bras. Hasta pour le légionnaire.
    bone('item_r',[-6,12.5,-2.3],[
      c([-6.6,0.5,-2.7],[1.1,34,1.1],'leather'),               // hampe
      c([-6.8,28,-2.85],[1.5,2,1.4],'gold'),                   // douille
      c([-7.0,29.8,-2.85],[1.9,5.2,1.35],'steel'),             // fer en feuille (large)
      c([-6.5,34.5,-2.7],[0.9,2.4,0.9],'steel'),               // pointe
      c([-6.5,-1,-2.65],[0.9,2.2,0.9],'gold'),                 // talon (sauroterion)
    ],{ parent:'arm_r', rotation:[-45,0,0], locators:{ blade:[-6.05,33,-2.2] } }),
    // sang sur le fer (caché par défaut, apparaît au coup via l'animation)
    bone('blood',[-6.05,31,-2.85],[
      c([-7.03,29.9,-2.98],[1.96,4.8,0.16],'#7c0f0f'),         // film de sang sur le fer
      c([-6.55,27.8,-2.98],[0.42,2.6,0.14],'#7c0f0f'),         // goutte qui coule
      c([-6.53,26.9,-2.98],[0.36,0.8,0.14],'#8a1414'),         // bout de goutte
    ],{ parent:'item_r' }),
    bone('arm_l',[5,22,0],[
      c([4,12,-2],[4,12,4],'skin',{ mirror:true }),
      c([3.8,17.5,-2.2],[4.4,5,4.4],'leather'),
      c([3.6,18.9,-2.4],[4.8,1.9,4.8],'red'),
      c([3.6,20.4,-2.4],[4.8,2.1,4.8],'steel'),
      c([4.5,20.7,-2.5],[3.6,0.7,0.6],'gold'),
      c([3.65,12.8,-2.35],[4.7,2.8,4.7],'leather'),
      // scutum : plateau rouge centré (centre y=13.75, z=0), décor symétrique autour de l'umbo
      c([8.6,5,-5],[1.3,17.5,10],'red'),
      c([8.5,21.4,-5.2],[1.5,1.1,10.4],'gold'), c([8.5,5.0,-5.2],[1.5,1.1,10.4],'gold'), // bordures haut/bas
      c([8.5,5,-5.4],[1.5,17.5,1],'gold'), c([8.5,5,4.4],[1.5,17.5,1],'gold'),           // bordures avant/arrière
      c([9.7,12.45,-5],[0.8,2.6,10],'steel'),                  // bande horizontale (traverse le centre)
      c([9.65,5.5,-1],[0.75,16.5,2],'gold'),                   // épine verticale (traverse le centre)
      c([9.9,11.85,-2],[0.95,3.8,4],'steel'),                  // umbo (bombe) dead center
      c([9.8,15.5,-3.8],[0.6,3,1.6],'gold'), c([9.8,15.5,2.2],[0.6,3,1.6],'gold'),       // ailes hautes
      c([9.8,9.0,-3.8],[0.6,3,1.6],'gold'), c([9.8,9.0,2.2],[0.6,3,1.6],'gold'),         // ailes basses (miroir)
    ],{ parent:'body' }),
    bone('leg_r',[-2,12,0],[
      c([-4,0,-2],[4,12,4],'skin'),
      c([-4.2,0,-2.2],[4.4,4.6,4.4],'leather'),                // bottes (caligae)
      c([-4.3,4.4,-2.3],[4.6,0.9,4.6],'iron'),                 // sangle
      c([-4.35,5.1,-2.55],[4.7,6.2,1.2],'steel'),              // cnémide (jambière avant)
      c([-3.2,10.6,-2.7],[2.4,0.8,0.6],'gold'),                // liseré haut de cnémide
    ],{ parent:'body' }),
    bone('leg_l',[2,12,0],[
      c([0,0,-2],[4,12,4],'skin',{ mirror:true }),
      c([-0.2,0,-2.2],[4.4,4.6,4.4],'leather'),
      c([-0.3,4.4,-2.3],[4.6,0.9,4.6],'iron'),
      c([-0.35,5.1,-2.55],[4.7,6.2,1.2],'steel'),
      c([0.8,10.6,-2.7],[2.4,0.8,0.6],'gold'),
    ],{ parent:'body' }),
  ],
  eyes:{ style:'none' },
};

// ═══════════════════════ CENTURION (clone du légionnaire) ═══════════════════════
// Officier : masque de parade argenté + crête TRANSVERSALE (crista transversa),
// le reste de la panoplie est identique au légionnaire.
const CENTURION = (function(){
  const base = JSON.parse(JSON.stringify(LEGIONNAIRE));
  base.key='centurion';
  base.name='Centurion Romain';
  base.emoji='🎖️';
  base.category='Soldat en armure';
  base.desc='Officier au masque de parade et à la crête transversale (portée de gauche à droite), sur la panoplie complète.';
  base.stats = Object.assign({}, LEGIONNAIRE.stats, { hp:80, damage:10, armor:18 });
  base.colorSlots = LEGIONNAIRE.colorSlots.concat([{ key:'mask', label:'Masque de parade', def:'#dde1e7', mat:'metal' }]);
  const head = base.bones.find(b=>b.name==='head');
  head.cubes = [
    c([-4,24,-4],[8,8,8],'skin'),
    // casque identique au légionnaire (dôme, visière, bandeau, joues, flancs, nuque)
    c([-4.6,28,-4.6],[9.2,4.4,9.2],'steel'),
    c([-4.85,28.2,-5.2],[9.7,1.3,1.6],'steel'),
    c([-4.7,29.6,-4.85],[9.4,1.1,1.1],'gold'),
    c([-2.9,30.9,-4.9],[1.2,0.9,0.5],'gold'), c([1.7,30.9,-4.9],[1.2,0.9,0.5],'gold'),
    c([-4.85,23.8,-4.5],[1.5,4.7,4.8],'steel'),
    c([3.35,23.8,-4.5],[1.5,4.7,4.8],'steel'),
    c([-4.7,24,-4],[0.7,4,8],'steel'),
    c([4.0,24,-4],[0.7,4,8],'steel'),
    c([-4,24,4.0],[8,4,0.7],'steel'),
    c([-4.95,23.2,2.8],[9.9,3,2.9],'steel'),
    // reliefs latéraux : couvre-oreilles bombés + rivet doré + nervure + liseré (des 2 côtés)
    c([-5.05,24.8,-1.3],[0.65,2.8,2.8],'steel'), c([4.4,24.8,-1.3],[0.65,2.8,2.8],'steel'),
    c([-5.25,25.9,-0.4],[0.4,1.0,1.0],'gold'),   c([4.85,25.9,-0.4],[0.4,1.0,1.0],'gold'),
    c([-4.82,27.2,-3.6],[0.42,0.7,7],'steel'),   c([4.4,27.2,-3.6],[0.42,0.7,7],'steel'),
    c([-4.82,24.3,-3.6],[0.42,0.6,6.5],'gold'),  c([4.4,24.3,-3.6],[0.42,0.6,6.5],'gold'),
    // crête TRANSVERSALE : socle doré + arc rouge gauche→droite + retombées aux deux bouts
    c([-4.8,31.9,-1.4],[9.6,0.9,2.8],'gold'),
    c([-5.4,32.3,-1.1],[10.8,2.4,2.2],'red'),
    c([-4.4,34.5,-1.1],[9,2.6,2.2],'red'),
    c([-2.8,36.9,-1.1],[5.6,2,2.2],'red'),
    c([-6.6,30.2,-1.1],[1.6,3,2.2],'red'),               // retombée gauche
    c([5.0,30.2,-1.1],[1.6,3,2.2],'red'),                // retombée droite
    // MASQUE de parade : plaque argentée, arcade, nez droit, fentes yeux/bouche, liserés d'or
    c([-3.6,23.9,-4.55],[7.2,4.5,0.55],'mask'),          // plaque du visage
    c([-3.7,27.7,-4.65],[7.4,0.7,0.7],'mask'),           // arcade sourcilière
    c([-0.65,24.6,-4.9],[1.3,3.3,0.6],'mask'),           // nez droit idéalisé
    c([-2.55,26.05,-4.62],[1.65,1.05,0.3],'#15100c'),    // fente oeil gauche
    c([0.9,26.05,-4.62],[1.65,1.05,0.3],'#15100c'),      // fente oeil droit
    c([-1.3,24.15,-4.62],[2.6,0.5,0.28],'#15100c'),      // fente de bouche
    c([-3.8,23.8,-4.5],[0.45,4.6,0.5],'gold'), c([3.35,23.8,-4.5],[0.45,4.6,0.5],'gold'), // liserés du masque
  ];
  // le centurion (officier) porte le GLADIUS au lieu de la hasta (dans item_r)
  const itemR = base.bones.find(b=>b.name==='item_r');
  itemR.cubes = [
    c([-6.55,9.5,-1.95],[1,1.5,1],'gold'),                   // pommeau
    c([-6.65,10.8,-2.05],[1.2,3.8,1.2],'leather'),           // poignée (rentre dans le poing)
    c([-7.35,14.5,-2.35],[2.6,1,1.8],'gold'),                // garde large
    c([-6.85,15.4,-2.15],[1.7,10.5,0.8],'steel'),            // lame LARGE
    c([-6.55,25.7,-2.15],[1.1,2.4,0.8],'steel'),             // pointe triangulaire
  ];
  itemR.rotation = [-45,0,0];
  itemR.locators = { blade:[-6.0,27,-1.7] };
  const bloodB = base.bones.find(b=>b.name==='blood');
  bloodB.pivot = [-6.0,20,-2.25];
  bloodB.cubes = [
    c([-6.88,15.5,-2.28],[1.76,9.4,0.15],'#7c0f0f'),         // film de sang sur la lame
    c([-6.5,13.3,-2.28],[0.42,2.6,0.14],'#7c0f0f'),          // goutte
    c([-6.48,12.4,-2.28],[0.36,0.8,0.14],'#8a1414'),
  ];
  return base;
})();

const CREATURES = [ DRAGON, HYDRA, SPIDER, WOLF, GOLEM, WISP, HUMANOID, LEGIONNAIRE, CENTURION ];

// ═══════════════════════ OBJETS 3D (modèles) ═══════════════════════
// Objets "attachable" tenus en main. Géométrie simple à plat + reliefs.

function itemBone(cubes){ return [ bone('root', [0,0,0], cubes) ]; }

const ITEMS_3D = [
  {
    key:'sword', name:'Épée médiévale', emoji:'⚔️', category:'Arme',
    itemType:'sword', defaultScale:1.0,
    colorSlots:[
      { key:'blade', label:'Lame',    def:'#c7ccd4', mat:'metal' },
      { key:'guard', label:'Garde',   def:'#c8a55a', mat:'metal' },
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
      { key:'head',  label:'Fer',     def:'#9aa0a8', mat:'metal' },
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
      { key:'rim',   label:'Bordure', def:'#c8a55a', mat:'metal' },
      { key:'boss',  label:'Umbo',    def:'#c7ccd4', mat:'metal' },
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
      { key:'binding',label:'Monture',  def:'#c8a55a', mat:'metal' },
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
    key:'hasta', name:'Hasta (lance romaine)', emoji:'🔱', category:'Arme',
    itemType:'sword', defaultScale:1.0,
    colorSlots:[
      { key:'shaft', label:'Hampe',  def:'#6a4a24' },
      { key:'iron',  label:'Fer',    def:'#c7ccd4', mat:'metal' },
      { key:'bronze',label:'Bronze', def:'#b5893a', mat:'metal' },
    ],
    bones: itemBone([
      c([-0.5,-10,-0.5],[1,32,1],'shaft'),         // hampe
      c([-0.9,20,-0.6],[1.8,1.8,1.2],'bronze'),    // douille
      c([-1,21.5,-0.4],[2,4.5,0.8],'iron'),        // fer en feuille
      c([-0.5,26,-0.4],[1,2,0.8],'iron'),          // pointe
      c([-0.7,-11.5,-0.5],[1.4,2,1],'bronze'),     // talon (sauroterion)
    ]),
    stats:{ damage:8, durability:1200 },
  },
  {
    key:'pilum', name:'Pilum (javelot)', emoji:'🎯', category:'Arme',
    itemType:'sword', defaultScale:1.0,
    colorSlots:[
      { key:'shaft', label:'Hampe', def:'#6a4a24' },
      { key:'iron',  label:'Fer',   def:'#b8bcc4', mat:'metal' },
    ],
    bones: itemBone([
      c([-0.5,-8,-0.5],[1,16,1],'shaft'),          // hampe bois
      c([-0.9,7,-0.6],[1.8,1.5,1.2],'iron'),       // collet
      c([-0.35,8,-0.35],[0.7,14,0.7],'iron'),      // long fût de fer
      c([-0.4,22,-0.4],[0.8,1.5,0.8],'iron'),      // pointe pyramidale
    ]),
    stats:{ damage:7, durability:400 },
  },
  {
    key:'rhomphaia', name:'Glaive (rhomphaia)', emoji:'⚔️', category:'Arme',
    itemType:'axe', defaultScale:1.0,
    colorSlots:[
      { key:'shaft', label:'Manche',  def:'#5a3a1a' },
      { key:'iron',  label:'Lame',    def:'#c7ccd4', mat:'metal' },
      { key:'bind',  label:'Ligature',def:'#b5893a', mat:'metal' },
    ],
    bones: itemBone([
      c([-0.5,-8,-0.5],[1,18,1],'shaft'),          // hampe
      c([-1.4,9,-0.6],[1.8,1.5,1.2],'bind'),       // jonction
      c([-1,10,-0.4],[2,14,0.8],'iron'),           // longue lame
      c([-0.6,23,-0.4],[1.2,3,0.8],'iron'),        // pointe
    ]),
    stats:{ damage:9, durability:1100 },
  },
  {
    key:'gladius', name:'Gladius', emoji:'🗡️', category:'Arme',
    itemType:'sword', defaultScale:1.0,
    colorSlots:[
      { key:'blade', label:'Lame',    def:'#cfd3da', mat:'metal' },
      { key:'guard', label:'Garde',   def:'#7a5a30' },
      { key:'grip',  label:'Poignée', def:'#3a2a18' },
      { key:'pommel',label:'Pommeau', def:'#c8a55a', mat:'metal' },
    ],
    bones: itemBone([
      c([-1.3,2,-0.4],[2.6,13,0.8],'blade'),       // lame large
      c([-0.7,15,-0.4],[1.4,2.5,0.8],'blade'),     // pointe triangulaire
      c([-2,0.5,-0.5],[4,1.5,1],'guard'),          // garde
      c([-0.8,-3.5,-0.5],[1.6,4,1],'grip'),        // poignée
      c([-1.3,-5,-0.6],[2.6,2,1.2],'pommel'),      // pommeau
    ]),
    stats:{ damage:7, durability:1500 },
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
    colorSlots:[ { key:'metal', label:'Métal', def:'#c8a55a', mat:'metal' }, { key:'wax', label:'Bougie', def:'#e8e0c8' }, { key:'flame', label:'Flamme', def:'#ff9a2a' } ],
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
