/* =====================================================================
   LKS ART — Couche de données unique (store)
   Bascule automatiquement entre deux modes :
   - "supabase" : quand assets/config.js contient de vraies clés → données
     réelles, partagées par tous les visiteurs.
   - "demo"     : tant que Supabase n'est pas configuré → l'espace privé est
     utilisable immédiatement, les données vivent dans le navigateur (sur cet
     appareil seulement). Permet de tester l'interface et le principe
     "je modifie → ça change" avant la mise en ligne.

   app.js (site public) et admin.js (espace privé) passent tous les deux par
   window.LKS_STORE, sans savoir quel mode est actif.
   ===================================================================== */
(function () {
  "use strict";
  var CFG = window.LKS_CONFIG || {};
  var BUCKET = CFG.STORAGE_BUCKET || 'paintings';

  function configured() {
    return CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY &&
           CFG.SUPABASE_URL.indexOf('VOTRE') === -1 &&
           CFG.SUPABASE_ANON_KEY.indexOf('VOTRE') === -1;
  }
  function uid() {
    return (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  }

  /* Filet de sécurité : si Supabase est injoignable (projet en pause sur l'offre
     gratuite, coupure réseau), le site réaffiche les œuvres de contenu-initial.json
     plutôt qu'une galerie vide. Lecture seule, uniquement en cas d'erreur — une
     galerie réellement vide reste vide. */
  function fallbackPaintings() {
    return fetch('contenu-initial.json', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        return (d.paintings || []).map(function (p, i) {
          return {
            id: 'fallback-' + i, sort_order: (p.sort_order != null ? p.sort_order : i),
            title: p.title, category: p.category, description: p.description || '',
            dimensions: p.dimensions || '', medium: p.medium || 'Huile sur toile',
            price: (p.price == null ? null : p.price), sold: !!p.sold,
            availability: p.availability || (p.price == null ? 'request' : 'sale'),
            image_url: p.image_file || p.image_url, created_at: new Date().toISOString()
          };
        });
      })
      .catch(function () { return []; });
  }

  /* réduit une image choisie en une vignette base64 (mode démo, sans stockage) */
  function downscaleToDataURL(file, maxW, quality) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, maxW / img.naturalWidth);
        var cw = Math.round(img.naturalWidth * scale), ch = Math.round(img.naturalHeight * scale);
        var c = document.createElement('canvas'); c.width = cw; c.height = ch;
        c.getContext('2d').drawImage(img, 0, 0, cw, ch);
        URL.revokeObjectURL(url);
        try { resolve(c.toDataURL('image/jpeg', quality || .82)); }
        catch (e) { reject(e); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Image illisible')); };
      img.src = url;
    });
  }

  /* ====================================================================
     BACKEND SUPABASE (données réelles, partagées par tous)
     ==================================================================== */
  function supabaseStore() {
    var sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);

    function tableOps(name) {
      return {
        list: function () {
          return sb.from(name).select('*').order('created_at', { ascending: false })
            .then(function (r) { return r.error ? [] : (r.data || []); });
        },
        insert: function (rec) { return sb.from(name).insert(rec); },
        update: function (id, patch) { return sb.from(name).update(patch).eq('id', id); },
        remove: function (id) { return sb.from(name).delete().eq('id', id); }
      };
    }

    return {
      mode: 'supabase',
      auth: {
        getUser: function () { return sb.auth.getSession().then(function (r) { return (r.data && r.data.session) ? r.data.session.user : null; }); },
        signIn: function (email, pass) { return sb.auth.signInWithPassword({ email: email, password: pass }); },
        signOut: function () { return sb.auth.signOut(); }
      },
      paintings: {
        list: function () {
          return sb.from('paintings').select('*').order('sort_order', { ascending: true })
            .then(function (r) { return r.error ? fallbackPaintings() : (r.data || []); })
            .catch(function () { return fallbackPaintings(); });
        },
        insert: function (rec) { return sb.from('paintings').insert(rec); },
        update: function (id, patch) { return sb.from('paintings').update(patch).eq('id', id); },
        remove: function (id) { return sb.from('paintings').delete().eq('id', id); }
      },
      annonces: tableOps('annonces'),
      presse: tableOps('presse'),
      site: {
        get: function () {
          return sb.from('site_content').select('*').then(function (r) {
            var o = {}; if (!r.error && r.data) r.data.forEach(function (x) { o[x.key] = x.value; }); return o;
          });
        },
        setMany: function (obj) {
          var rows = Object.keys(obj).map(function (k) { return { key: k, value: obj[k] || '', updated_at: new Date().toISOString() }; });
          return sb.from('site_content').upsert(rows, { onConflict: 'key' });
        }
      },
      uploadImage: function (file) {
        var ext = ((file.name || 'jpg').split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        var name = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
        return sb.storage.from(BUCKET).upload(name, file, { cacheControl: '3600', upsert: false })
          .then(function (res) { if (res.error) throw res.error; return sb.storage.from(BUCKET).getPublicUrl(name).data.publicUrl; });
      },
      storagePathFromUrl: function (url) {
        if (!url) return null;
        var m = '/object/public/' + BUCKET + '/'; var i = url.indexOf(m);
        return i === -1 ? null : url.slice(i + m.length);
      },
      removeStorage: function (path) { if (path) sb.storage.from(BUCKET).remove([path]); }
    };
  }

  /* ====================================================================
     BACKEND DÉMO (navigateur, sur cet appareil seulement)
     ==================================================================== */
  function demoStore() {
    var K = { p: 'lks_demo_paintings', a: 'lks_demo_annonces', r: 'lks_demo_presse', s: 'lks_demo_site' };
    // À incrémenter quand le contenu de départ change : force la démo à se recharger sur l'appareil.
    var SEED_VERSION = '3';
    function read(k, def) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
    function write(k, val) { try { localStorage.setItem(k, JSON.stringify(val)); return true; } catch (e) { return false; } }
    var FULL = { error: { message: 'Mémoire de démonstration pleine. Supprimez un élément, ou connectez Supabase pour un stockage illimité.' } };

    function seedPaintings() {
      return fetch('contenu-initial.json', { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var arr = (d.paintings || []).map(function (p, i) {
            return {
              id: uid(), sort_order: (p.sort_order != null ? p.sort_order : i),
              title: p.title, category: p.category, description: p.description || '',
              dimensions: p.dimensions || '', medium: p.medium || 'Huile sur toile',
              price: (p.price == null ? null : p.price), sold: !!p.sold,
              availability: p.availability || (p.price == null ? 'request' : 'sale'),
              image_url: p.image_file || p.image_url, created_at: new Date().toISOString()
            };
          });
          write(K.p, arr); return arr;
        })
        .catch(function () { return []; });
    }
    function listP() {
      var v = read(K.p, null);
      var sv = read('lks_demo_seedv', null);
      // Si jamais semé, ou si le contenu de départ a changé, on (re)sème.
      if (v && sv === SEED_VERSION) {
        return Promise.resolve(v.slice().sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); }));
      }
      return seedPaintings().then(function (arr) { write('lks_demo_seedv', SEED_VERSION); return arr; });
    }
    function tableOps(key) {
      return {
        list: function () { return Promise.resolve(read(key, []).slice().sort(function (a, b) { return (b._ts || 0) - (a._ts || 0); })); },
        insert: function (rec) { var a = read(key, []); rec.id = uid(); rec._ts = Date.now(); rec.created_at = new Date().toISOString(); a.push(rec); return Promise.resolve(write(key, a) ? { error: null } : FULL); },
        update: function (id, patch) { var a = read(key, []).map(function (x) { return x.id === id ? Object.assign(x, patch) : x; }); return Promise.resolve(write(key, a) ? { error: null } : FULL); },
        remove: function (id) { var a = read(key, []).filter(function (x) { return x.id !== id; }); write(key, a); return Promise.resolve({ error: null }); }
      };
    }

    return {
      mode: 'demo',
      auth: {
        getUser: function () { return Promise.resolve({ email: 'Mode démonstration' }); },
        signIn: function () { return Promise.resolve({ error: null, data: { user: { email: 'Mode démonstration' } } }); },
        signOut: function () { return Promise.resolve({ error: null }); }
      },
      paintings: {
        list: function () { return listP(); },
        insert: function (rec) {
          return listP().then(function (arr) {
            rec.id = uid(); rec.created_at = new Date().toISOString();
            if (rec.sort_order == null) rec.sort_order = arr.reduce(function (m, p) { return Math.max(m, p.sort_order || 0); }, -1) + 1;
            arr.push(rec); return write(K.p, arr) ? { error: null } : FULL;
          });
        },
        update: function (id, patch) {
          return listP().then(function (arr) {
            arr = arr.map(function (x) { return x.id === id ? Object.assign(x, patch) : x; });
            return write(K.p, arr) ? { error: null } : FULL;
          });
        },
        remove: function (id) {
          return listP().then(function (arr) { write(K.p, arr.filter(function (x) { return x.id !== id; })); return { error: null }; });
        }
      },
      annonces: tableOps(K.a),
      presse: tableOps(K.r),
      site: {
        get: function () { return Promise.resolve(read(K.s, {})); },
        setMany: function (obj) { var cur = read(K.s, {}); Object.keys(obj).forEach(function (k) { cur[k] = obj[k]; }); return Promise.resolve(write(K.s, cur) ? { error: null } : FULL); }
      },
      uploadImage: function (file) { return downscaleToDataURL(file, 1280, .82); },
      storagePathFromUrl: function () { return null; },
      removeStorage: function () { }
    };
  }

  var useSupabase = configured() && window.supabase;
  window.LKS_STORE = useSupabase ? supabaseStore() : demoStore();
  window.LKS_STORE.isConfigured = !!useSupabase;
})();
