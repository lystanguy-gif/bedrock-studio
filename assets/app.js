/* =====================================================================
   LKS ART — Logique du site public
   - Charge les œuvres depuis Supabase ; à défaut (non configuré ou vide),
     repli automatique sur images/ + contenu-initial.json.
   - Galerie, filtres, fiche détaillée (lightbox), achat PayPal (réel ou
     démonstration), annonces, presse, formulaire de contact, protection
     des images.
   ===================================================================== */
(function () {
  "use strict";

  var CFG = window.LKS_CONFIG || {};
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- couche de données (Supabase réel, ou démo locale) ---------- */
  var store = window.LKS_STORE;

  /* ---------- état ---------- */
  var WORKS = [];           // œuvres normalisées affichées
  var curIndex = null;      // index de l'œuvre ouverte dans la lightbox

  /* ---------- utilitaires ---------- */
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
  function showToast(msg, isError) {
    var t = $('toast'); if (!t) return;
    t.textContent = msg;
    t.classList.toggle('error', !!isError);
    t.classList.add('show');
    clearTimeout(tt); tt = setTimeout(function () { t.classList.remove('show'); }, 3800);
  }

  /* ---------- chargement des œuvres ---------- */
  function normalize(row, fromFallback) {
    return {
      id: row.id || null,
      title: row.title || 'Sans titre',
      category: (row.category || 'paysages').toLowerCase(),
      description: row.description || '',
      dimensions: row.dimensions || '',
      medium: row.medium || 'Huile sur toile',
      price: (row.price === undefined ? null : row.price),
      sold: !!row.sold,
      // disponibilité : 'sale' (à vendre), 'request' (prix sur demande), 'exhibition' (exposition seule)
      availability: (function () {
        var a = (row.availability || '').toLowerCase();
        if (a === 'sale' || a === 'request' || a === 'exhibition') return a;
        return (row.price === undefined || row.price === null || row.price === '') ? 'request' : 'sale';
      })(),
      // Supabase fournit image_url ; le repli local fournit image_file.
      image: fromFallback ? (row.image_file || row.image_url) : (row.image_url || row.image_file)
    };
  }

  // libellé court affiché sous chaque toile dans la galerie
  function statusLabel(w) {
    if (w.sold) return 'Vendue';
    if (w.availability === 'exhibition') return 'Exposition';
    if (w.availability === 'sale' && formatPrice(w.price)) return formatPrice(w.price);
    return 'Prix sur demande';
  }

  function loadFallback() {
    return fetch('contenu-initial.json', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        return (data.paintings || []).map(function (p) { return normalize(p, true); });
      })
      .catch(function () { return []; });
  }

  function loadWorks() {
    return store.paintings.list()
      .then(function (rows) {
        if (!rows || !rows.length) return loadFallback();
        return rows.map(function (r) { return normalize(r, false); });
      })
      .catch(function () { return loadFallback(); });
  }

  /* ---------- rendu de la galerie (avec pagination) ---------- */
  var PER_PAGE = 6;
  var currentPage = 1;

  // indices (dans WORKS) des œuvres correspondant au filtre courant
  function filteredIndexes() {
    var out = [];
    WORKS.forEach(function (w, i) {
      if (currentFilter === 'all' || w.category === currentFilter) out.push(i);
    });
    return out;
  }

  function renderGallery() { currentPage = 1; renderPage(); }

  function renderPage() {
    var grid = $('grid'), state = $('galleryState');
    grid.innerHTML = '';
    var idxs = filteredIndexes();
    if (!WORKS.length) {
      state.innerHTML = "La galerie sera bientôt enrichie de nouvelles toiles.";
      state.style.display = '';
      renderPager(0);
      return;
    }
    state.style.display = 'none';

    var pages = Math.max(1, Math.ceil(idxs.length / PER_PAGE));
    if (currentPage > pages) currentPage = pages;
    var slice = idxs.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

    slice.forEach(function (i, pos) {
      var w = WORKS[i];
      var card = document.createElement('article');
      card.className = 'card';
      card.setAttribute('data-cat', w.category);
      card.setAttribute('data-index', i);
      card.setAttribute('data-pos', pos);
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', 'Voir ' + w.title);

      var html = '';
      if (w.sold) html += '<span class="card__sold">Vendu</span>';
      else if (w.availability === 'exhibition') html += '<span class="card__sold">Exposition</span>';
      html += '<span class="card__wm">LKS ART</span>';
      html += '<img src="' + esc(w.image) + '" alt="' + esc(w.title) + '" loading="lazy">';
      html += '<div class="card__cap"><span class="card__capL">' +
                '<span class="card__cat">' + esc(capitalize(w.category)) + '</span>' +
                '<span class="card__title">' + esc(w.title) + '</span>' +
                '<span class="card__price">' + esc(statusLabel(w)) + '</span>' +
              '</span><span class="card__see">Voir ›</span></div>';
      card.innerHTML = html;
      grid.appendChild(card);
    });
    renderPager(pages);
    revealCards();
  }

  function renderPager(pages) {
    var pager = $('pager');
    if (!pager) return;
    pager.innerHTML = '';
    if (pages <= 1) return;
    function btn(label, page, opts) {
      var b = document.createElement('button');
      b.className = 'pager__btn' + (opts && opts.active ? ' active' : '');
      b.textContent = label;
      if (opts && opts.disabled) b.disabled = true;
      else b.addEventListener('click', function () { goToPage(page); });
      pager.appendChild(b);
    }
    btn('‹', currentPage - 1, { disabled: currentPage === 1 });
    for (var p = 1; p <= pages; p++) btn(String(p), p, { active: p === currentPage });
    btn('›', currentPage + 1, { disabled: currentPage === pages });
  }

  function goToPage(p) {
    currentPage = p;
    renderPage();
    var sec = document.querySelector('#galerie');
    if (sec) sec.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  /* apparition en fondu décalée des toiles */
  function revealCards() {
    var cards = document.querySelectorAll('#grid .card');
    if (reduce) { cards.forEach(function (c) { c.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var c = en.target;
          // léger décalage pour un effet en cascade
          c.style.transitionDelay = ((+c.getAttribute('data-index') % 3) * 90) + 'ms';
          c.classList.add('in');
          io.unobserve(c);
        }
      });
    }, { threshold: .08, rootMargin: '0px 0px -40px 0px' });
    cards.forEach(function (c) { io.observe(c); });
  }

  /* set hero : contenu personnalisé par Léa > image d'accueil par défaut */
  var DEFAULT_HERO = 'images/02-harde-orage.jpg';
  function setHero() {
    var hero = $('heroImg');
    if (!hero) return;
    var src = SITE.hero_image || DEFAULT_HERO;
    hero.style.backgroundImage = "url('" + src + "')";
  }

  /* ---------- contenu personnalisé (édité par Léa depuis l'espace privé) ---------- */
  var SITE = {};
  function setText(id, val) { var el = $(id); if (el && val) el.textContent = val; }
  function loadSiteContent() {
    return store.site.get()
      .then(function (map) {
        if (!map) return;
        Object.keys(map).forEach(function (k) { if (map[k]) SITE[k] = map[k]; });
        applySiteContent();
      })
      .catch(function () { /* on garde les textes par défaut */ });
  }
  function applySiteContent() {
    setText('heroKicker', SITE.hero_kicker);
    setText('heroSub', SITE.hero_sub);
    setText('aboutTitle', SITE.about_title);
    setText('aboutMedium', SITE.about_medium);
    setText('aboutAtelier', SITE.about_atelier);
    setText('aboutExpose', SITE.about_expose);
    // bio : on reconstruit les paragraphes (séparés par des lignes vides)
    if (SITE.about_body) {
      var box = $('aboutBody');
      if (box) {
        box.innerHTML = '';
        SITE.about_body.split(/\n\s*\n/).forEach(function (para, i) {
          if (!para.trim()) return;
          var p = document.createElement('p');
          if (i === 0) p.className = 'first';
          p.textContent = para.trim();
          box.appendChild(p);
        });
      }
    }
    // portrait : si une image est fournie, on l'affiche dans le cadre
    if (SITE.portrait_image) {
      var portrait = $('portrait');
      if (portrait) {
        portrait.innerHTML = '';
        var img = document.createElement('img');
        img.src = SITE.portrait_image; img.alt = SITE.about_title || 'Léa Kalck';
        portrait.appendChild(img);
      }
    }
    // coordonnées de contact (priorité au contenu édité par Léa sur le config.js)
    if (SITE.contact_email) {
      var em = $('contactEmail'); if (em) { em.textContent = SITE.contact_email; em.href = 'mailto:' + SITE.contact_email; }
    }
    if (SITE.contact_phone) showPhone(SITE.contact_phone);
    if (SITE.contact_hours) setText('contactHours', SITE.contact_hours);
    if (SITE.facebook_url) {
      var fb = $('fbLink'); if (fb) { fb.href = SITE.facebook_url; fb.target = '_blank'; fb.rel = 'noopener'; fb.dataset.set = '1'; }
    }
  }

  /* ---------- filtres ---------- */
  var currentFilter = 'all';
  $('filters').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    document.querySelectorAll('#filters button').forEach(function (x) { x.classList.remove('active'); });
    b.classList.add('active');
    currentFilter = b.dataset.f;
    currentPage = 1;
    renderPage();
  });

  /* ---------- lightbox / fiche détaillée ---------- */
  var lb = $('lb'), lbImg = $('lbImg');

  function openLB(index) {
    curIndex = index;
    var w = WORKS[index];
    lbImg.src = w.image; lbImg.alt = w.title;
    $('lbCat').textContent = capitalize(w.category);
    $('lbTitle').textContent = w.title;
    $('lbDesc').textContent = w.description || '';
    $('lbDesc').style.display = w.description ? '' : 'none';
    $('lbMedium').textContent = w.medium;
    $('lbDims').textContent = w.dimensions || 'Non précisées';

    var price = formatPrice(w.price);
    var priceEl = $('lbPrice'), priceSub = $('lbPriceSub'), soldEl = $('lbSold'),
        buyBtn = $('lbBuy'), askBtn = $('lbAsk'), sdkEl = $('lbPaypalSdk'),
        noteEl = $('lbNote'), buyHead = $('lbBuyHead');
    sdkEl.innerHTML = '';
    buyBtn.style.display = 'none';
    askBtn.style.display = 'none';

    if (w.sold) {
      buyHead.textContent = 'Œuvre vendue';
      priceEl.style.display = 'none';
      priceSub.style.display = 'none';
      soldEl.style.display = '';
      noteEl.textContent = "Cette œuvre a trouvé preneur. Écrivez à Léa pour une pièce similaire ou une commande sur mesure.";
    } else if (w.availability === 'exhibition') {
      // Exposition uniquement : pas à vendre.
      buyHead.textContent = 'Œuvre en exposition';
      priceEl.textContent = 'Exposition uniquement'; priceEl.style.display = '';
      priceSub.textContent = 'Œuvre présentée en exposition, non proposée à la vente.'; priceSub.style.display = '';
      soldEl.style.display = 'none';
      noteEl.textContent = "Cette œuvre n'est pas à vendre. Vous pouvez écrire à Léa pour en savoir plus.";
    } else if (w.availability === 'sale' && price) {
      // Prix affiché : achat possible.
      buyHead.textContent = 'Acquérir cette œuvre';
      priceEl.textContent = price; priceEl.style.display = '';
      priceSub.textContent = 'Œuvre originale · pièce unique'; priceSub.style.display = '';
      soldEl.style.display = 'none';
      setupPurchase(w, price);
    } else {
      // Prix sur demande / à négocier : on oriente vers le contact.
      buyHead.textContent = 'Acquérir cette œuvre';
      priceEl.textContent = 'Prix sur demande'; priceEl.style.display = '';
      priceSub.textContent = 'Œuvre originale · pièce unique · prix à convenir avec Léa'; priceSub.style.display = '';
      soldEl.style.display = 'none';
      askBtn.textContent = 'Demander le prix';
      askBtn.style.display = '';
      noteEl.textContent = "Pour cette œuvre, le prix se définit directement avec Léa. Cliquez sur « Demander le prix ».";
    }

    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  /* PayPal : SDK réel si PAYPAL_CLIENT_ID fourni, sinon démonstration */
  function setupPurchase(w, priceLabel) {
    var buyBtn = $('lbBuy'), sdkEl = $('lbPaypalSdk'), noteEl = $('lbNote');
    if (CFG.PAYPAL_CLIENT_ID && window.paypal && window.paypal.Buttons) {
      buyBtn.style.display = 'none';
      noteEl.textContent = "Paiement sécurisé via PayPal. Une commission d'environ 3 % est prélevée par PayPal sur le compte de Léa.";
      try {
        window.paypal.Buttons({
          style: { color: 'gold', shape: 'pill', label: 'pay', height: 45 },
          createOrder: function (data, actions) {
            return actions.order.create({
              purchase_units: [{
                description: w.title + ', ' + w.medium,
                amount: { value: String(Number(w.price).toFixed(2)), currency_code: CFG.PAYPAL_CURRENCY || 'EUR' }
              }]
            });
          },
          onApprove: function (data, actions) {
            return actions.order.capture().then(function () {
              showToast('Merci ! Votre acquisition de « ' + w.title + ' » est confirmée.');
            });
          },
          onError: function () { showToast("Le paiement n'a pas pu aboutir. Réessayez ou contactez Léa.", true); }
        }).render('#lbPaypalSdk');
      } catch (e) {
        buyBtn.style.display = '';
      }
    } else {
      // Paiement en ligne pas encore actif : aucun bouton de paiement.
      // On indique que c'est pour bientot et on oriente vers le contact.
      buyBtn.style.display = 'none';
      var ask = $('lbAsk');
      ask.textContent = 'Contacter Léa';
      ask.style.display = '';
      noteEl.textContent = "Le paiement en ligne sécurisé sera bientôt disponible. En attendant, écrivez à Léa pour acquérir cette œuvre.";
    }
  }

  function stepLB(d) {
    var vis = filteredIndexes(); if (!vis.length) return;
    var pos = vis.indexOf(curIndex);
    if (pos === -1) pos = 0;
    pos = (pos + d + vis.length) % vis.length;
    var newIdx = vis[pos];
    // garde la galerie en phase : on se place sur la page de l'œuvre affichée
    var targetPage = Math.floor(pos / PER_PAGE) + 1;
    if (targetPage !== currentPage) { currentPage = targetPage; renderPage(); }
    openLB(newIdx);
  }
  function closeLB() { lb.classList.remove('open'); document.body.style.overflow = ''; }

  $('grid').addEventListener('click', function (e) {
    var c = e.target.closest('.card'); if (c) openLB(+c.getAttribute('data-index'));
  });
  $('grid').addEventListener('keydown', function (e) {
    var c = e.target.closest('.card');
    if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openLB(+c.getAttribute('data-index')); }
  });
  $('lbClose').addEventListener('click', closeLB);
  $('lbPrev').addEventListener('click', function () { stepLB(-1); });
  $('lbNext').addEventListener('click', function () { stepLB(1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) closeLB(); });
  addEventListener('keydown', function (e) {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') closeLB();
    if (e.key === 'ArrowLeft') stepLB(-1);
    if (e.key === 'ArrowRight') stepLB(1);
  });

  /* achat — démonstration (modal) */
  var buyModal = $('buyModal');
  $('lbBuy').addEventListener('click', function () {
    var w = WORKS[curIndex]; if (!w) return;
    $('buyWork').textContent = '« ' + w.title + ' », ' + w.medium + (w.dimensions ? ', ' + w.dimensions : '');
    $('buyPrice').textContent = formatPrice(w.price) || '';
    buyModal.classList.add('open');
  });
  document.querySelector('[data-close-buy]').addEventListener('click', function () { buyModal.classList.remove('open'); });
  buyModal.addEventListener('click', function (e) { if (e.target === buyModal) buyModal.classList.remove('open'); });

  /* « Demander le prix » : pré-remplit le message de contact et y conduit */
  $('lbAsk').addEventListener('click', function () {
    var w = WORKS[curIndex]; if (!w) return;
    closeLB();
    var m = $('m');
    if (m) m.value = 'Bonjour Léa,\n\nJe souhaite connaître le prix de l\'œuvre « ' + w.title +
      ' » (' + w.medium + (w.dimensions ? ', ' + w.dimensions : '') + ').\n\nMerci !';
    var contact = document.querySelector('#contact');
    if (contact) contact.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    setTimeout(function () { if (m) m.focus(); }, reduce ? 0 : 600);
  });

  /* ---------- annonces ---------- */
  function loadAnnonces() {
    store.annonces.list()
      .then(function (rows) {
        if (!rows || !rows.length) return;
        var tl = $('timeline');
        tl.innerHTML = '';
        rows.forEach(function (a) {
          var d = a.created_at ? new Date(a.created_at) : null;
          var when = d ? d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '';
          var el = document.createElement('div');
          el.className = 'tl reveal in';
          el.innerHTML = '<div class="when">' + esc(capitalize(when)) + '</div>' +
                         '<div class="what">' + esc(a.title) + '</div>' +
                         '<div class="where">' + esc(a.body || '') + '</div>';
          tl.appendChild(el);
        });
      })
      .catch(function () { /* on garde le repli statique */ });
  }

  /* ---------- presse ---------- */
  function loadPresse() {
    store.presse.list()
      .then(function (rows) {
        if (!rows || !rows.length) return;
        var list = $('pressList'), state = $('pressState');
        list.innerHTML = '';
        rows.forEach(function (p) {
          var el = document.createElement('div');
          el.className = 'press__item reveal in';
          var inner = '<div class="press__media">' + esc(p.media) + '</div>' +
                      '<div class="press__title">' + esc(p.title || '') + '</div>';
          if (p.url) inner += '<a class="press__link" href="' + esc(p.url) + '" target="_blank" rel="noopener">Lire / Écouter →</a>';
          el.innerHTML = inner;
          list.appendChild(el);
        });
        state.style.display = 'none';
      })
      .catch(function () { /* on garde l'état par défaut */ });
  }

  /* ---------- formulaire de contact ---------- */
  $('contactForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target;
    if (!f.n.value.trim() || !f.e.value.trim() || !f.m.value.trim()) {
      showToast('Merci de remplir tous les champs.', true); return;
    }
    var btn = $('contactSubmit');
    var ok = function () { showToast('Message envoyé. Léa vous répondra bientôt.'); f.reset(); };
    var fail = function () { showToast("L'envoi a échoué. Réessayez ou écrivez directement par e-mail.", true); };
    var done = function () { btn.disabled = false; btn.textContent = 'Envoyer le message'; };

    // Variables envoyées au modèle. On fournit plusieurs alias pour rester
    // compatible quel que soit le nommage du modèle EmailJS.
    var vars = {
      name: f.n.value, from_name: f.n.value,
      email: f.e.value, reply_to: f.e.value, from_email: f.e.value,
      message: f.m.value,
      title: 'Nouveau message depuis le site LKS ART',
      to_email: CFG.CONTACT_EMAIL || 'lksartpeintures@gmail.com'
    };

    // 1) EmailJS (envoie depuis la boîte de Léa, sans mention de tiers).
    if (typeof emailjs !== 'undefined' && CFG.EMAILJS_SERVICE_ID && CFG.EMAILJS_TEMPLATE_ID && CFG.EMAILJS_PUBLIC_KEY) {
      btn.disabled = true; btn.textContent = 'Envoi…';
      emailjs.send(CFG.EMAILJS_SERVICE_ID, CFG.EMAILJS_TEMPLATE_ID, vars, { publicKey: CFG.EMAILJS_PUBLIC_KEY })
        .then(function () { ok(); })
        .catch(function () { fail(); })
        .finally(done);
      return;
    }

    // 2) Repli : ancien endpoint HTTP (Formspree, Edge Function...).
    var endpoint = CFG.CONTACT_FORM_ENDPOINT;
    if (endpoint) {
      btn.disabled = true; btn.textContent = 'Envoi…';
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: f.n.value, email: f.e.value, message: f.m.value,
          _subject: 'Nouveau message depuis le site LKS ART'
        })
      }).then(function (r) { r.ok ? ok() : fail(); })
        .catch(fail).finally(done);
      return;
    }

    // 3) Dernier repli : ouverture de la messagerie du visiteur.
    var subject = encodeURIComponent('Message depuis le site LKS ART, ' + f.n.value);
    var body = encodeURIComponent(f.m.value + '\n\n' + f.n.value + ' (' + f.e.value + ')');
    window.location.href = 'mailto:' + (CFG.CONTACT_EMAIL || 'lksartpeintures@gmail.com') +
      '?subject=' + subject + '&body=' + body;
    showToast('Votre messagerie va s\'ouvrir pour finaliser l\'envoi.');
  });

  /* ---------- réglages issus de config.js ---------- */
  // Affiche la ligne téléphone (masquée par défaut) dès qu'un numéro est fourni.
  function showPhone(num) {
    var line = $('contactPhoneLine'), a = $('contactPhone');
    if (!line || !a || !num) return;
    a.textContent = num;
    a.href = 'tel:' + num.replace(/[^0-9+]/g, '');
    line.style.display = '';
  }

  function applyConfig() {
    if (CFG.CONTACT_EMAIL) {
      var em = $('contactEmail');
      em.textContent = CFG.CONTACT_EMAIL; em.href = 'mailto:' + CFG.CONTACT_EMAIL;
    }
    if (CFG.CONTACT_HOURS) $('contactHours').textContent = CFG.CONTACT_HOURS;
    if (CFG.CONTACT_PHONE) showPhone(CFG.CONTACT_PHONE);
    var fb = $('fbLink');
    if (CFG.FACEBOOK_URL) {
      fb.href = CFG.FACEBOOK_URL; fb.target = '_blank'; fb.rel = 'noopener'; fb.dataset.set = '1';
    }
    // Garde : tant qu'aucun lien réel n'est défini (ni config, ni « Mon site »),
    // un clic affiche un message au lieu de naviguer vers « # ».
    fb.addEventListener('click', function (e) {
      if (!fb.dataset.set) { e.preventDefault(); showToast('Lien Facebook à renseigner.'); }
    });
    // Chargement optionnel du SDK PayPal si l'identifiant est fourni.
    if (CFG.PAYPAL_CLIENT_ID) {
      var s = document.createElement('script');
      s.src = 'https://www.paypal.com/sdk/js?client-id=' + encodeURIComponent(CFG.PAYPAL_CLIENT_ID) +
              '&currency=' + encodeURIComponent(CFG.PAYPAL_CURRENCY || 'EUR');
      document.head.appendChild(s);
    }
  }

  /* ---------- modale mentions légales ---------- */
  var legal = $('legalModal');
  $('openLegal').addEventListener('click', function () { legal.classList.add('open'); });
  document.querySelector('[data-close-legal]').addEventListener('click', function () { legal.classList.remove('open'); });
  legal.addEventListener('click', function (e) { if (e.target === legal) legal.classList.remove('open'); });
  addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { legal.classList.remove('open'); buyModal.classList.remove('open'); }
  });

  /* ---------- navigation (scroll, menu mobile, ancres) ---------- */
  var nav = $('nav');
  addEventListener('scroll', function () { nav.classList.toggle('scrolled', scrollY > 40); });
  var toggle = $('navtoggle'), links = $('navlinks');
  function closeMenu() { links.classList.remove('open'); toggle.classList.remove('x'); }
  toggle.addEventListener('click', function (e) { e.stopPropagation(); links.classList.toggle('open'); toggle.classList.toggle('x'); });
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      var el = (id && id.length > 1) ? document.querySelector(id) : null;
      if (el) { e.preventDefault(); closeMenu(); el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); history.replaceState(null, '', id); }
    });
  });
  document.addEventListener('click', function (e) {
    if (links.classList.contains('open') && !links.contains(e.target) && !toggle.contains(e.target)) closeMenu();
  });

  /* ---------- protection des images (dissuasif) ---------- */
  document.addEventListener('contextmenu', function (e) {
    if (e.target && e.target.tagName === 'IMG') e.preventDefault();
  });
  document.addEventListener('dragstart', function (e) {
    if (e.target && e.target.tagName === 'IMG') e.preventDefault();
  });

  /* ---------- révélations au scroll ---------- */
  function setupReveal() {
    if (reduce) { document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: .12 });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  }

  /* ---------- init ---------- */
  window.addEventListener('load', function () { document.body.classList.add('loaded'); });

  applyConfig();
  setupReveal();
  loadAnnonces();
  loadPresse();
  // On charge le contenu personnalisé et les œuvres, puis on affiche.
  Promise.all([loadSiteContent(), loadWorks()]).then(function (results) {
    WORKS = results[1] || [];
    setHero();
    renderGallery();
  });
})();
