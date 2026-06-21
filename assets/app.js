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

  /* ---------- client Supabase (si configuré) ---------- */
  var sb = null;
  function configured() {
    return CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY &&
           CFG.SUPABASE_URL.indexOf('VOTRE') === -1 &&
           CFG.SUPABASE_ANON_KEY.indexOf('VOTRE') === -1;
  }
  if (configured() && window.supabase) {
    try { sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY); }
    catch (e) { sb = null; }
  }

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
      // Supabase fournit image_url ; le repli local fournit image_file.
      image: fromFallback ? (row.image_file || row.image_url) : (row.image_url || row.image_file)
    };
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
    if (!sb) return loadFallback();
    return sb.from('paintings').select('*').order('sort_order', { ascending: true })
      .then(function (res) {
        if (res.error || !res.data || !res.data.length) return loadFallback();
        return res.data.map(function (r) { return normalize(r, false); });
      })
      .catch(function () { return loadFallback(); });
  }

  /* ---------- rendu de la galerie ---------- */
  function renderGallery() {
    var grid = $('grid'), state = $('galleryState');
    grid.innerHTML = '';
    if (!WORKS.length) {
      state.innerHTML = "La galerie sera bientôt enrichie de nouvelles toiles.";
      state.style.display = '';
      return;
    }
    state.style.display = 'none';

    WORKS.forEach(function (w, i) {
      var card = document.createElement('article');
      card.className = 'card reveal in';
      card.setAttribute('data-cat', w.category);
      card.setAttribute('data-index', i);
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', 'Voir ' + w.title);

      var html = '';
      if (w.sold) html += '<span class="card__sold">Vendu</span>';
      html += '<span class="card__wm">LKS ART</span>';
      html += '<img src="' + esc(w.image) + '" alt="' + esc(w.title) + '" loading="lazy">';
      html += '<div class="card__cap"><span class="card__title">' + esc(w.title) +
              '</span><span class="card__see">Voir</span></div>';
      card.innerHTML = html;
      grid.appendChild(card);
    });
    applyFilter(currentFilter);
  }

  /* set hero image from first available work */
  function setHero() {
    var hero = $('heroImg');
    if (!hero) return;
    if (WORKS.length) {
      hero.style.backgroundImage = "url('" + WORKS[0].image + "')";
    } else {
      hero.style.backgroundImage = "url('images/01-serre-poncon.jpg')";
    }
  }

  /* ---------- filtres ---------- */
  var currentFilter = 'all';
  function applyFilter(f) {
    currentFilter = f;
    document.querySelectorAll('#grid .card').forEach(function (c) {
      c.style.display = (f === 'all' || c.getAttribute('data-cat') === f) ? '' : 'none';
    });
  }
  $('filters').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    document.querySelectorAll('#filters button').forEach(function (x) { x.classList.remove('active'); });
    b.classList.add('active');
    applyFilter(b.dataset.f);
  });

  /* ---------- lightbox / fiche détaillée ---------- */
  var lb = $('lb'), lbImg = $('lbImg');

  function visibleIndexes() {
    return Array.prototype.slice.call(document.querySelectorAll('#grid .card'))
      .filter(function (c) { return c.style.display !== 'none'; })
      .map(function (c) { return +c.getAttribute('data-index'); });
  }

  function openLB(index) {
    curIndex = index;
    var w = WORKS[index];
    lbImg.src = w.image; lbImg.alt = w.title;
    $('lbCat').textContent = capitalize(w.category);
    $('lbTitle').textContent = w.title;
    $('lbDesc').textContent = w.description || '';
    $('lbDesc').style.display = w.description ? '' : 'none';
    $('lbMedium').textContent = w.medium;
    $('lbDims').textContent = w.dimensions || '—';

    var price = formatPrice(w.price);
    var priceEl = $('lbPrice'), soldEl = $('lbSold'), buyBtn = $('lbBuy'),
        sdkEl = $('lbPaypalSdk'), noteEl = $('lbNote');
    sdkEl.innerHTML = '';

    if (w.sold) {
      priceEl.textContent = price || '';
      priceEl.style.display = price ? '' : 'none';
      soldEl.style.display = '';
      buyBtn.style.display = 'none';
      noteEl.textContent = "Cette œuvre a trouvé preneur. Écrivez à Léa pour une pièce similaire ou une commande sur mesure.";
    } else if (price) {
      priceEl.textContent = price;
      priceEl.style.display = '';
      soldEl.style.display = 'none';
      setupPurchase(w, price);
    } else {
      // Prix optionnel : aucune valeur => aucun prix affiché, on oriente vers le contact.
      priceEl.textContent = 'Prix sur demande';
      priceEl.style.display = '';
      soldEl.style.display = 'none';
      buyBtn.style.display = 'none';
      noteEl.textContent = "Le prix de cette œuvre est communiqué sur demande. Contactez Léa pour toute information.";
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
                description: w.title + ' — ' + w.medium,
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
      // Mode démonstration tant que l'identifiant PayPal n'est pas renseigné.
      buyBtn.style.display = '';
      noteEl.textContent = "Démonstration. Le paiement s'effectuera via le compte PayPal Business de LKS ART une fois l'identifiant renseigné.";
    }
  }

  function stepLB(d) {
    var vis = visibleIndexes(); if (!vis.length) return;
    var pos = vis.indexOf(curIndex);
    if (pos === -1) pos = 0;
    pos = (pos + d + vis.length) % vis.length;
    openLB(vis[pos]);
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
    $('buyWork').textContent = '« ' + w.title + ' » — ' + w.medium + (w.dimensions ? ', ' + w.dimensions : '');
    $('buyPrice').textContent = formatPrice(w.price) || '';
    buyModal.classList.add('open');
  });
  document.querySelector('[data-close-buy]').addEventListener('click', function () { buyModal.classList.remove('open'); });
  buyModal.addEventListener('click', function (e) { if (e.target === buyModal) buyModal.classList.remove('open'); });

  /* ---------- annonces ---------- */
  function loadAnnonces() {
    if (!sb) return;
    sb.from('annonces').select('*').order('created_at', { ascending: false })
      .then(function (res) {
        if (res.error || !res.data || !res.data.length) return;
        var tl = $('timeline');
        tl.innerHTML = '';
        res.data.forEach(function (a) {
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
    if (!sb) return;
    sb.from('presse').select('*').order('created_at', { ascending: false })
      .then(function (res) {
        if (res.error || !res.data || !res.data.length) return;
        var list = $('pressList'), state = $('pressState');
        list.innerHTML = '';
        res.data.forEach(function (p) {
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
    var endpoint = CFG.CONTACT_FORM_ENDPOINT;
    if (!endpoint) {
      // Pas de service email configuré : repli sur le client mail du visiteur.
      var subject = encodeURIComponent('Message depuis le site LKS ART — ' + f.n.value);
      var body = encodeURIComponent(f.m.value + '\n\n— ' + f.n.value + ' (' + f.e.value + ')');
      window.location.href = 'mailto:' + (CFG.CONTACT_EMAIL || 'lksartpeinturekalck@gmail.com') +
        '?subject=' + subject + '&body=' + body;
      showToast('Votre messagerie va s\'ouvrir pour finaliser l\'envoi.');
      return;
    }

    var btn = $('contactSubmit'); btn.disabled = true; btn.textContent = 'Envoi…';
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: f.n.value, email: f.e.value, message: f.m.value })
    }).then(function (r) {
      if (r.ok) { showToast('Message envoyé — Léa vous répondra bientôt.'); f.reset(); }
      else { showToast("L'envoi a échoué. Réessayez ou écrivez directement par e-mail.", true); }
    }).catch(function () {
      showToast("L'envoi a échoué. Réessayez ou écrivez directement par e-mail.", true);
    }).finally(function () {
      btn.disabled = false; btn.textContent = 'Envoyer le message';
    });
  });

  /* ---------- réglages issus de config.js ---------- */
  function applyConfig() {
    if (CFG.CONTACT_EMAIL) {
      var em = $('contactEmail');
      em.textContent = CFG.CONTACT_EMAIL; em.href = 'mailto:' + CFG.CONTACT_EMAIL;
    }
    if (CFG.CONTACT_HOURS) $('contactHours').textContent = CFG.CONTACT_HOURS;
    var fb = $('fbLink');
    if (CFG.FACEBOOK_URL) {
      fb.href = CFG.FACEBOOK_URL; fb.target = '_blank'; fb.rel = 'noopener';
    } else {
      fb.addEventListener('click', function (e) { e.preventDefault(); showToast('Lien Facebook à renseigner.'); });
    }
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
  loadWorks().then(function (works) {
    WORKS = works;
    setHero();
    renderGallery();
  });
})();
