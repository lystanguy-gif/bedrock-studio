// Vidéo « maison » : un réseau pair-à-pair (mesh WebRTC) entre les participants.
//
// Principe : chaque appareil ouvre une connexion directe (RTCPeerConnection)
// vers les autres. Les débatteurs publient leur caméra + voix ; tout le monde
// les reçoit. La « signalisation » (échange des descriptions SDP et des
// candidats ICE pour établir la connexion) passe par un canal Supabase Realtime
// en mode diffusion — aucun serveur média payant n'est nécessaire.
//
// Limite assumée du « maison » : sans serveur TURN, certains réseaux très
// fermés (deux mobiles en 4G derrière des NAT symétriques) peuvent ne pas se
// connecter. Pour ~15 personnes en Wi-Fi/ADSL, les serveurs STUN publics
// suffisent dans la grande majorité des cas.

const ICE = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ],
}

export class MeshRTC {
  // selfId  : identifiant unique de cet appareil (clé de présence)
  // send    : (msg) => void  diffuse un message de signalisation aux autres
  // onStream: (peerId, stream) => void  flux distant reçu
  // onClose : (peerId) => void           un pair s'en va / se ferme
  constructor({ selfId, send, onStream, onClose }) {
    this.selfId = selfId
    this.send = send
    this.onStream = onStream
    this.onClose = onClose || (() => {})
    this.peers = new Map() // peerId -> { pc, polite, makingOffer, ignoreOffer }
    this.knownPeers = new Set() // pairs présents (avec ou sans connexion ouverte)
    this.localStream = null
  }

  // Liste à jour des pairs présents. On crée une connexion pour les nouveaux
  // (seulement si on publie quelque chose) et on ferme celles des partis.
  setPeers(ids) {
    const next = new Set(ids.filter((id) => id && id !== this.selfId))
    this.knownPeers = next
    for (const id of next) {
      if (!this.peers.has(id) && this.localStream) this._ensure(id)
    }
    for (const id of [...this.peers.keys()]) {
      if (!next.has(id)) this._drop(id)
    }
  }

  // Définit (ou retire) le flux local publié. Met à jour toutes les connexions.
  setLocalStream(stream) {
    this.localStream = stream || null
    for (const id of this.knownPeers) {
      // Si je me mets à publier alors qu'aucune connexion n'existe encore, je
      // l'ouvre maintenant (j'enverrai l'offre).
      const entry = this.peers.get(id) || (this.localStream ? this._ensure(id) : null)
      if (entry) this._applyStream(entry)
    }
  }

  _ensure(id) {
    let entry = this.peers.get(id)
    if (entry) return entry
    const pc = new RTCPeerConnection(ICE)
    entry = { pc, polite: this.selfId < id, makingOffer: false, ignoreOffer: false }
    this.peers.set(id, entry)

    pc.ontrack = (e) => { if (e.streams && e.streams[0]) this.onStream(id, e.streams[0]) }
    pc.onicecandidate = (e) => { if (e.candidate) this.send({ to: id, kind: 'ice', data: e.candidate }) }
    pc.onnegotiationneeded = async () => {
      try {
        entry.makingOffer = true
        const offer = await pc.createOffer()
        if (pc.signalingState !== 'stable') return
        await pc.setLocalDescription(offer)
        this.send({ to: id, kind: 'desc', data: pc.localDescription })
      } catch (err) { /* ignore : renégociera */ } finally { entry.makingOffer = false }
    }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') { try { pc.restartIce() } catch (e) {} }
    }

    this._applyStream(entry)
    return entry
  }

  // Aligne les pistes envoyées sur le flux local courant (caméra/voix on/off).
  _applyStream(entry) {
    const pc = entry.pc
    const tracks = this.localStream ? this.localStream.getTracks() : []
    for (const kind of ['audio', 'video']) {
      const track = tracks.find((t) => t.kind === kind) || null
      const sender = pc.getSenders().find((s) => s._kind === kind)
      if (sender) {
        sender.replaceTrack(track).catch(() => {})
      } else if (track) {
        const sn = pc.addTrack(track, this.localStream)
        sn._kind = kind
      }
    }
  }

  // Réception d'un message de signalisation d'un pair.
  async onSignal(from, msg) {
    if (!from || from === this.selfId) return
    // Un pair nous contacte : on crée la connexion si besoin (pour répondre).
    const entry = this._ensure(from)
    const pc = entry.pc
    try {
      if (msg.kind === 'desc') {
        const desc = msg.data
        const offerCollision = desc.type === 'offer' && (entry.makingOffer || pc.signalingState !== 'stable')
        entry.ignoreOffer = !entry.polite && offerCollision
        if (entry.ignoreOffer) return
        await pc.setRemoteDescription(desc)
        if (desc.type === 'offer') {
          await pc.setLocalDescription(await pc.createAnswer())
          this.send({ to: from, kind: 'desc', data: pc.localDescription })
        }
      } else if (msg.kind === 'ice') {
        try { await pc.addIceCandidate(msg.data) } catch (e) { if (!entry.ignoreOffer) throw e }
      }
    } catch (err) { /* ignore : la connexion réessaiera */ }
  }

  _drop(id) {
    const entry = this.peers.get(id)
    if (!entry) return
    try { entry.pc.close() } catch (e) {}
    this.peers.delete(id)
    this.onClose(id)
  }

  destroy() {
    for (const id of [...this.peers.keys()]) this._drop(id)
    this.knownPeers.clear()
    this.localStream = null
  }
}
