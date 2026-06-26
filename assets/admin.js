/* =====================================================================
   LKS ART — Espace privé de Léa (admin.html)
   Connexion Supabase Auth, puis gestion simple des peintures, des
   annonces et de la presse. Interface en français, sans terme technique.
   ===================================================================== */
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function formatPrice(p) {
    if (p == null || p === '' || isNaN(Number(p))) return null;
    return new Intl.NumberFormat('fr-FR').format(Number(p)) + ' €';
  }

  var tt;
  function toast(msg, isError) {
    var t = $('toast'); if (!t) return;
    t.textContent = msg;
    t.classList.toggle('error', !!isError);
    t.classList.add('show');
    clearTimeout(tt); tt = setTimeout(function () { t.classList.remove('show'); }, 3800);
  }

  /* ---------- couche de données (Supabase réel, ou démo locale) ---------- */
  var store = window.LKS_STORE;
  var DEMO = store.mode === 'demo';

  /* ====================================================================
     AUTHENTIFICATION
     ==================================================================== */
  function showLogin() {
    $('loginScreen').style.display = 'flex';
    $('dash').style.display = 'none';
  }
  function showDash(user) {
    $('loginScreen').style.display = 'none';
    $('dash').style.display = 'flex';
    $('whoami').textContent = user && user.email ? user.email : '';
    if (DEMO) $('demoBanner').style.display = 'block';
    loadPaintings();
    loadAnnonces();
    loadPresse();
    loadSite();
  }

  // En mode démo, l'utilisateur est connecté d'office (pour essayer l'interface).
  store.auth.getUser().then(function (user) {
    if (user) showDash(user); else showLogin();
  });

  $('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = $('loginBtn'); var err = $('loginErr');
    err.textContent = '';
    btn.disabled = true; btn.textContent = 'Connexion…';
    store.auth.signIn($('loginEmail').value.trim(), $('loginPass').value)
      .then(function (res) {
        if (res.error) {
          err.textContent = 'E-mail ou mot de passe incorrect.';
        } else {
          showDash(res.data.user);
        }
      })
      .catch(function () { err.textContent = 'La connexion a échoué. Réessayez.'; })
      .finally(function () { btn.disabled = false; btn.textContent = 'Se connecter'; });
  });

  $('logoutBtn').addEventListener('click', function () {
    store.auth.signOut().then(function () { showLogin(); });
  });

  /* ====================================================================
     ONGLETS
     ==================================================================== */
  document.querySelectorAll('.admin-tabs button').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.admin-tabs button').forEach(function (x) { x.classList.remove('active'); });
      document.querySelectorAll('.admin-panel').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      $('panel-' + b.dataset.tab).classList.add('active');
    });
  });

  /* ====================================================================
     MODALE DE CONFIRMATION (suppressions)
     ==================================================================== */
  var confirmCb = null;
  function askConfirm(text, cb) {
    $('confirmText').textContent = text;
    confirmCb = cb;
    $('confirmModal').classList.add('open');
  }
  $('confirmCancel').addEventListener('click', function () { $('confirmModal').classList.remove('open'); confirmCb = null; });
  $('confirmOk').addEventListener('click', function () {
    $('confirmModal').classList.remove('open');
    if (confirmCb) { confirmCb(); confirmCb = null; }
  });

  function openModal(id) { $(id).classList.add('open'); }
  function closeModal(id) { $(id).classList.remove('open'); }
  // fermer en cliquant sur le fond
  ['paintingModal', 'annonceModal', 'presseModal'].forEach(function (id) {
    $(id).addEventListener('click', function (e) { if (e.target === $(id)) closeModal(id); });
  });

  /* ====================================================================
     PEINTURES
     ==================================================================== */
  var paintings = [];

  function loadPaintings() {
    $('paintingsLoading').style.display = '';
    store.paintings.list()
      .then(function (rows) {
        $('paintingsLoading').style.display = 'none';
        paintings = rows || [];
        renderPaintings();
      })
      .catch(function () { $('paintingsLoading').style.display = 'none'; toast('Impossible de charger les peintures.', true); });
  }

  function renderPaintings() {
    var list = $('paintingsList');
    if (!paintings.length) {
      list.innerHTML = '<div class="adm-empty">Aucune peinture pour le moment. Cliquez sur « Ajouter une peinture » pour commencer.</div>';
      return;
    }
    list.innerHTML = '';
    paintings.forEach(function (p, i) {
      var row = document.createElement('div');
      row.className = 'adm-row';
      var price = formatPrice(p.price);
      row.innerHTML =
        '<div class="adm-reorder">' +
          '<button data-up="' + i + '" title="Monter"' + (i === 0 ? ' disabled' : '') + '>▲</button>' +
          '<button data-down="' + i + '" title="Descendre"' + (i === paintings.length - 1 ? ' disabled' : '') + '>▼</button>' +
        '</div>' +
        '<img class="adm-row__thumb" src="' + esc(p.image_url || '') + '" alt="">' +
        '<div class="adm-row__info">' +
          '<div class="adm-row__title">' + esc(p.title) + '</div>' +
          '<div class="adm-row__meta">' + esc(capitalize(p.category || '')) + (p.dimensions ? ' · ' + esc(p.dimensions) : '') + '</div>' +
          (price ? '<div class="adm-row__price">' + price + '</div>' : '<div class="adm-row__meta">Aucun prix affiché</div>') +
          (p.sold ? '<div class="adm-row__sold">● Vendue</div>' : '') +
        '</div>' +
        '<div class="adm-row__actions">' +
          '<button class="icon-btn ' + (p.sold ? 'on' : '') + '" data-sold="' + i + '">' + (p.sold ? 'Vendue' : 'Marquer vendue') + '</button>' +
          '<button class="icon-btn" data-edit="' + i + '">Modifier</button>' +
          '<button class="icon-btn danger" data-del="' + i + '">Supprimer</button>' +
        '</div>';
      list.appendChild(row);
    });
  }

  $('paintingsList').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.edit != null) openPaintingForm(paintings[+b.dataset.edit]);
    else if (b.dataset.del != null) { var p = paintings[+b.dataset.del]; askConfirm('Supprimer définitivement « ' + p.title + ' » ?', function () { deletePainting(p); }); }
    else if (b.dataset.sold != null) toggleSold(paintings[+b.dataset.sold]);
    else if (b.dataset.up != null) reorder(+b.dataset.up, -1);
    else if (b.dataset.down != null) reorder(+b.dataset.down, 1);
  });

  function toggleSold(p) {
    store.paintings.update(p.id, { sold: !p.sold }).then(function (res) {
      if (res.error) { toast('La mise à jour a échoué.', true); return; }
      p.sold = !p.sold; renderPaintings();
      toast(p.sold ? 'Œuvre marquée comme vendue.' : 'Œuvre remise en vente.');
    });
  }

  function reorder(i, dir) {
    var j = i + dir;
    if (j < 0 || j >= paintings.length) return;
    var a = paintings[i], b = paintings[j];
    var ao = a.sort_order, bo = b.sort_order;
    if (ao === bo) { ao = i; bo = j; } // sécurité si valeurs identiques
    Promise.all([
      store.paintings.update(a.id, { sort_order: bo }),
      store.paintings.update(b.id, { sort_order: ao })
    ]).then(function () { loadPaintings(); })
      .catch(function () { toast('Le réordonnancement a échoué.', true); });
  }

  function deletePainting(p) {
    store.paintings.remove(p.id).then(function (res) {
      if (res.error) { toast('La suppression a échoué.', true); return; }
      // on tente aussi de retirer l'image du stockage (best effort, mode Supabase)
      store.removeStorage(store.storagePathFromUrl(p.image_url));
      toast('Œuvre supprimée.');
      loadPaintings();
    });
  }

  /* ---------- formulaire peinture (ajout / modification) ---------- */
  var pendingFile = null;

  function openPaintingForm(p) {
    pendingFile = null;
    $('paintingForm').reset();
    $('pPreview').style.display = 'none'; $('pPreview').src = '';
    $('uploaderHint').textContent = '📷 Choisir une photo de la toile (depuis votre téléphone ou ordinateur)';
    if (p) {
      $('paintingModalTitle').textContent = 'Modifier la peinture';
      $('pId').value = p.id;
      $('pTitle').value = p.title || '';
      $('pCategory').value = (p.category || 'paysages');
      $('pDimensions').value = p.dimensions || '';
      $('pMedium').value = p.medium || 'Huile sur toile';
      $('pPrice').value = (p.price == null ? '' : p.price);
      $('pOnRequest').checked = (p.price == null);
      $('pDescription').value = p.description || '';
      $('pSold').checked = !!p.sold;
      if (p.image_url) { $('pPreview').src = p.image_url; $('pPreview').style.display = 'block'; }
    } else {
      $('paintingModalTitle').textContent = 'Ajouter une peinture';
      $('pId').value = '';
      $('pMedium').value = 'Huile sur toile';
      $('pCategory').value = 'paysages';
    }
    syncOnRequest();
    openModal('paintingModal');
  }

  // « Prix sur demande » : désactive et vide le champ prix quand c'est coché
  function syncOnRequest() {
    var on = $('pOnRequest').checked;
    var pr = $('pPrice');
    pr.disabled = on;
    pr.style.opacity = on ? '.45' : '';
    if (on) pr.value = '';
  }
  $('pOnRequest').addEventListener('change', syncOnRequest);

  $('addPainting').addEventListener('click', function () { openPaintingForm(null); });
  $('closePaintingModal').addEventListener('click', function () { closeModal('paintingModal'); });
  $('cancelPainting').addEventListener('click', function () { closeModal('paintingModal'); });

  $('pFile').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    pendingFile = f;
    var reader = new FileReader();
    reader.onload = function (ev) { $('pPreview').src = ev.target.result; $('pPreview').style.display = 'block'; };
    reader.readAsDataURL(f);
    $('uploaderHint').textContent = f.name;
  });

  $('paintingForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var id = $('pId').value;
    var title = $('pTitle').value.trim();
    if (!title) { toast('Le titre est obligatoire.', true); return; }
    if (!id && !pendingFile) { toast('Merci de choisir une photo de la toile.', true); return; }

    var priceVal = $('pPrice').value.trim();
    var onRequest = $('pOnRequest').checked;
    var record = {
      title: title,
      category: $('pCategory').value,
      dimensions: $('pDimensions').value.trim(),
      medium: $('pMedium').value.trim() || 'Huile sur toile',
      description: $('pDescription').value.trim(),
      // « Prix sur demande » coché => aucun montant (null) ; sinon le montant saisi.
      price: (onRequest || priceVal === '') ? null : Number(priceVal),
      sold: $('pSold').checked
    };

    var btn = $('savePainting'); btn.disabled = true; btn.textContent = 'Enregistrement…';

    var prep = pendingFile ? store.uploadImage(pendingFile) : Promise.resolve(null);
    prep.then(function (url) {
      if (url) record.image_url = url;
      if (id) {
        return store.paintings.update(id, record);
      } else {
        var maxOrder = paintings.reduce(function (m, p) { return Math.max(m, p.sort_order || 0); }, -1);
        record.sort_order = maxOrder + 1;
        return store.paintings.insert(record);
      }
    }).then(function (res) {
      if (res && res.error) throw res.error;
      toast(id ? 'Peinture mise à jour.' : 'Peinture ajoutée. Elle est en ligne.');
      closeModal('paintingModal');
      loadPaintings();
    }).catch(function (err) {
      toast("L'enregistrement a échoué. " + (err && err.message ? err.message : ''), true);
    }).finally(function () {
      btn.disabled = false; btn.textContent = 'Enregistrer';
    });
  });

  /* ====================================================================
     ANNONCES
     ==================================================================== */
  var annonces = [];

  function loadAnnonces() {
    store.annonces.list().then(function (rows) { annonces = rows || []; renderAnnonces(); });
  }
  function renderAnnonces() {
    var list = $('annoncesList');
    if (!annonces.length) {
      list.innerHTML = '<div class="adm-empty">Aucune annonce pour le moment.</div>';
      return;
    }
    list.innerHTML = '';
    annonces.forEach(function (a, i) {
      var d = a.created_at ? new Date(a.created_at).toLocaleDateString('fr-FR') : '';
      var row = document.createElement('div');
      row.className = 'adm-row';
      row.innerHTML =
        '<div class="adm-row__info">' +
          '<div class="adm-row__title">' + esc(a.title) + '</div>' +
          '<div class="adm-row__meta">' + esc(d) + '</div>' +
          (a.body ? '<div class="adm-row__meta">' + esc(a.body) + '</div>' : '') +
        '</div>' +
        '<div class="adm-row__actions">' +
          '<button class="icon-btn" data-aedit="' + i + '">Modifier</button>' +
          '<button class="icon-btn danger" data-adel="' + i + '">Supprimer</button>' +
        '</div>';
      list.appendChild(row);
    });
  }
  $('annoncesList').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.aedit != null) openAnnonceForm(annonces[+b.dataset.aedit]);
    else if (b.dataset.adel != null) { var a = annonces[+b.dataset.adel]; askConfirm('Supprimer l\'annonce « ' + a.title + ' » ?', function () {
      store.annonces.remove(a.id).then(function (r) {
        if (r.error) { toast('La suppression a échoué.', true); return; }
        toast('Annonce supprimée.'); loadAnnonces();
      });
    }); }
  });
  function openAnnonceForm(a) {
    $('annonceForm').reset();
    if (a) { $('annonceModalTitle').textContent = 'Modifier l\'annonce'; $('aId').value = a.id; $('aTitle').value = a.title || ''; $('aBody').value = a.body || ''; }
    else { $('annonceModalTitle').textContent = 'Ajouter une annonce'; $('aId').value = ''; }
    openModal('annonceModal');
  }
  $('addAnnonce').addEventListener('click', function () { openAnnonceForm(null); });
  $('closeAnnonceModal').addEventListener('click', function () { closeModal('annonceModal'); });
  $('cancelAnnonce').addEventListener('click', function () { closeModal('annonceModal'); });
  $('annonceForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var id = $('aId').value;
    var rec = { title: $('aTitle').value.trim(), body: $('aBody').value.trim() };
    if (!rec.title) { toast('Le titre est obligatoire.', true); return; }
    var op = id ? store.annonces.update(id, rec) : store.annonces.insert(rec);
    op.then(function (r) {
      if (r.error) { toast("L'enregistrement a échoué.", true); return; }
      toast(id ? 'Annonce mise à jour.' : 'Annonce publiée.');
      closeModal('annonceModal'); loadAnnonces();
    });
  });

  /* ====================================================================
     PRESSE & MÉDIAS
     ==================================================================== */
  var presse = [];

  function loadPresse() {
    store.presse.list().then(function (rows) { presse = rows || []; renderPresse(); });
  }
  function renderPresse() {
    var list = $('presseList');
    if (!presse.length) {
      list.innerHTML = '<div class="adm-empty">Aucune parution pour le moment.</div>';
      return;
    }
    list.innerHTML = '';
    presse.forEach(function (p, i) {
      var row = document.createElement('div');
      row.className = 'adm-row';
      row.innerHTML =
        '<div class="adm-row__info">' +
          '<div class="adm-row__title">' + esc(p.title || p.media) + '</div>' +
          '<div class="adm-row__meta">' + esc(p.media) + (p.url ? ' · <a href="' + esc(p.url) + '" target="_blank" rel="noopener" style="color:var(--gold)">lien</a>' : '') + '</div>' +
        '</div>' +
        '<div class="adm-row__actions">' +
          '<button class="icon-btn" data-predit="' + i + '">Modifier</button>' +
          '<button class="icon-btn danger" data-prdel="' + i + '">Supprimer</button>' +
        '</div>';
      list.appendChild(row);
    });
  }
  $('presseList').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.predit != null) openPresseForm(presse[+b.dataset.predit]);
    else if (b.dataset.prdel != null) { var p = presse[+b.dataset.prdel]; askConfirm('Supprimer cette parution ?', function () {
      store.presse.remove(p.id).then(function (r) {
        if (r.error) { toast('La suppression a échoué.', true); return; }
        toast('Parution supprimée.'); loadPresse();
      });
    }); }
  });
  function openPresseForm(p) {
    $('presseForm').reset();
    if (p) { $('presseModalTitle').textContent = 'Modifier la parution'; $('prId').value = p.id; $('prMedia').value = p.media || ''; $('prTitle').value = p.title || ''; $('prUrl').value = p.url || ''; }
    else { $('presseModalTitle').textContent = 'Ajouter une parution'; $('prId').value = ''; }
    openModal('presseModal');
  }
  $('addPresse').addEventListener('click', function () { openPresseForm(null); });
  $('closePresseModal').addEventListener('click', function () { closeModal('presseModal'); });
  $('cancelPresse').addEventListener('click', function () { closeModal('presseModal'); });
  $('presseForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var id = $('prId').value;
    var rec = { media: $('prMedia').value.trim(), title: $('prTitle').value.trim(), url: $('prUrl').value.trim() };
    if (!rec.media) { toast('Le nom du média est obligatoire.', true); return; }
    var op = id ? store.presse.update(id, rec) : store.presse.insert(rec);
    op.then(function (r) {
      if (r.error) { toast("L'enregistrement a échoué.", true); return; }
      toast(id ? 'Parution mise à jour.' : 'Parution ajoutée.');
      closeModal('presseModal'); loadPresse();
    });
  });

  /* ====================================================================
     MON SITE — textes & photos de personnalisation (table site_content)
     ==================================================================== */
  var siteData = {};
  var heroFile = null, portraitFile = null;

  // Correspondance clé Supabase ↔ champ du formulaire
  var SITE_FIELDS = {
    hero_kicker: 'sHeroKicker',
    hero_sub: 'sHeroSub',
    about_body: 'sAboutBody',
    about_medium: 'sAboutMedium',
    about_atelier: 'sAboutAtelier',
    about_expose: 'sAboutExpose',
    contact_email: 'sContactEmail',
    contact_phone: 'sContactPhone',
    contact_hours: 'sContactHours',
    facebook_url: 'sFacebook'
  };

  function loadSite() {
    $('siteLoading').style.display = '';
    store.site.get()
      .then(function (map) {
        $('siteLoading').style.display = 'none';
        siteData = map || {};
        // remplir le formulaire
        Object.keys(SITE_FIELDS).forEach(function (key) {
          var el = $(SITE_FIELDS[key]); if (el) el.value = siteData[key] || '';
        });
        if (siteData.hero_image) { $('heroPreview').src = siteData.hero_image; $('heroPreview').style.display = 'block'; }
        if (siteData.portrait_image) { $('portraitPreview').src = siteData.portrait_image; $('portraitPreview').style.display = 'block'; }
      });
  }

  function previewInto(file, imgId) {
    var reader = new FileReader();
    reader.onload = function (ev) { $(imgId).src = ev.target.result; $(imgId).style.display = 'block'; };
    reader.readAsDataURL(file);
  }
  $('heroFile').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0]; if (!f) return;
    heroFile = f; previewInto(f, 'heroPreview'); $('heroHint').textContent = f.name;
  });
  $('portraitFile').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0]; if (!f) return;
    portraitFile = f; previewInto(f, 'portraitPreview'); $('portraitHint').textContent = f.name;
  });

  $('siteForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = $('saveSite'); btn.disabled = true; btn.textContent = 'Mise à jour…';

    // récupère les valeurs des champs texte
    Object.keys(SITE_FIELDS).forEach(function (key) {
      var el = $(SITE_FIELDS[key]); if (el) siteData[key] = el.value.trim();
    });

    // envoie les images choisies, puis enregistre tout
    var uploads = [];
    if (heroFile) uploads.push(store.uploadImage(heroFile).then(function (url) { siteData.hero_image = url; }));
    if (portraitFile) uploads.push(store.uploadImage(portraitFile).then(function (url) { siteData.portrait_image = url; }));

    Promise.all(uploads).then(function () {
      return store.site.setMany(siteData);
    }).then(function (res) {
      if (res && res.error) throw res.error;
      heroFile = null; portraitFile = null;
      toast(DEMO ? 'Aperçu mis à jour sur cet appareil.' : 'Votre site est à jour. Les visiteurs voient déjà les changements.');
    }).catch(function (err) {
      toast("La mise à jour a échoué. " + (err && err.message ? err.message : ''), true);
    }).finally(function () {
      btn.disabled = false; btn.textContent = 'Mettre à jour le site';
    });
  });

  /* fermeture des modales avec Échap */
  addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      ['paintingModal', 'annonceModal', 'presseModal', 'confirmModal'].forEach(closeModal);
    }
  });
})();
