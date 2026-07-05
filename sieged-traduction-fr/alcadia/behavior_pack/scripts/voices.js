import { ModalFormData } from "@minecraft/server-ui";
import { play } from "./util.js";

// Voix assignée à un PNJ (toutes entités gérées)
export const DP_VOICE = "npc:voice";
export const DP_VOICE3D = "npc:voice3d";

// Répliques disponibles. L'id doit exister dans sound_definitions.json du pack de ressources.
export const VOICE_LIST = [
  { id: "alcadia:garde1", label: "Garde, halte et demi-tour (1)" },
  { id: "alcadia:garde2", label: "Garde, montre patte blanche (2)" },
  { id: "alcadia:marchand", label: "Marchand chaleureux (3)" },
  { id: "alcadia:vieuxmarchand", label: "Vieux marchand rusé (4)" },
  { id: "alcadia:aubergiste", label: "Aubergiste jovial (5)" },
  { id: "alcadia:aubergiste_fatigue", label: "Aubergiste fatigué (6)" },
  { id: "alcadia:forgeron", label: "Doc, le forgeron (7)" },
  { id: "alcadia:vendeur", label: "Vendeur de maison (9)" },
  { id: "alcadia:agence", label: "Agent d'agence (10)" },
  { id: "alcadia:vieillard", label: "Vieillard sage (11)" },
  { id: "alcadia:villageois", label: "Villageois méfiant (12)" },
  { id: "alcadia:villageoise", label: "Jeune villageoise (13)" },
  { id: "alcadia:crieur", label: "Crieur public (14)" },
  { id: "alcadia:noble", label: "Noble hautain (15)" },
  { id: "alcadia:pretre", label: "Prêtre apaisant (16)" },
  { id: "alcadia:paysan", label: "Paysan (17)" },
  { id: "alcadia:herboriste", label: "Herboriste mystérieuse (18)" },
  { id: "alcadia:bandit", label: "Bandit (19)" },
  { id: "alcadia:esprit1", label: "Esprit de la forêt, accueil (21)" },
  { id: "alcadia:esprit2", label: "Esprit de la forêt, quête (21)" },
  { id: "alcadia:sorciere1", label: "Sorcière, accueil (22)" },
  { id: "alcadia:sorciere2", label: "Sorcière, échange (22)" },
];

// Joue la voix assignée au PNJ pour le joueur qui l'interpelle
export function playVoice(entity, player) {
  try {
    const id = entity.getDynamicProperty(DP_VOICE);
    if (!id || typeof id !== "string") return;
    const threeD = entity.getDynamicProperty(DP_VOICE3D) === true;
    play(player, id, threeD ? entity.location : undefined);
  } catch (e) {}
}

// Éditeur : choisir la réplique du PNJ + mode de sortie
export function openVoiceEditor(player, entity, reopen) {
  let cur = "";
  let cur3d = false;
  try { cur = entity.getDynamicProperty(DP_VOICE) || ""; cur3d = entity.getDynamicProperty(DP_VOICE3D) === true; } catch (e) {}

  const labels = ["§7Aucune voix"].concat(VOICE_LIST.map((v) => v.label));
  let idx = 0;
  for (let i = 0; i < VOICE_LIST.length; i++) if (VOICE_LIST[i].id === cur) idx = i + 1;

  const f = new ModalFormData()
    .title("Voix du PNJ")
    .dropdown("Réplique jouée quand un joueur l'interpelle", labels, { defaultValueIndex: idx })
    .toggle("Voix spatiale 3D (sinon réplique directe dans les oreilles du joueur)", { defaultValue: cur3d });

  f.show(player).then((res) => {
    if (res.canceled) { if (reopen) reopen(); return; }
    const sel = res.formValues[0] | 0;
    const threeD = res.formValues[1] === true;
    const id = sel <= 0 ? "" : VOICE_LIST[sel - 1].id;
    try {
      entity.setDynamicProperty(DP_VOICE, id);
      entity.setDynamicProperty(DP_VOICE3D, threeD);
    } catch (e) {}
    if (id) { play(player, id, threeD ? entity.location : undefined); player.sendMessage("§aVoix assignée. Aperçu joué."); }
    else player.sendMessage("§7Voix retirée de ce PNJ.");
    if (reopen) reopen();
  });
}
