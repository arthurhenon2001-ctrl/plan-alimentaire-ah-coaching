// ============================================================================
// BRIDGE-MODE.JS — Mode "coach" optionnel du Plan Alimentaire AH Coaching
// ============================================================================
//
// Ce fichier est COMPLEMENTAIRE. Il ne s'active QUE si l'URL contient des
// parametres macros pre-calcules (?cal=X&prot=Y&gluc=Z&lip=W). Dans tous
// les autres cas, ce fichier ne fait STRICTEMENT RIEN — le site reste 100%
// identique en mode autonome.
//
// Quand actif :
//   - Court-circuite Calculator.compute() pour utiliser les macros des params
//   - Force le saut direct a l'etape 3 (preferences alimentaires)
//   - Affiche un bandeau "Macros calibrees par ton coach"
//   - Bloque le retour aux etapes calcul metabolisme
//
// CONTRAT DEFENSIF :
//   - Toutes les operations sont enrobees dans try/catch
//   - Si quoi que ce soit echoue, on retombe SILENCIEUSEMENT en mode
//     autonome (le site fonctionne exactement comme avant)
//   - Aucune modification des fichiers existants (calculator.js, app.js, etc.)
//   - Aucune dependance externe
//   - Doit etre charge APRES app.js dans index.html
// ============================================================================

(function () {
  'use strict';

  // ── 1. Parser les params URL ──
  let bridgeData = null;
  try {
    const url = new URL(window.location.href);
    const cal = parseFloat(url.searchParams.get('cal'));
    const prot = parseFloat(url.searchParams.get('prot'));
    const gluc = parseFloat(url.searchParams.get('gluc'));
    const lip = parseFloat(url.searchParams.get('lip'));
    const name = (url.searchParams.get('name') || '').trim().slice(0, 50);

    // Validation STRICTE : tous les 4 macros doivent etre des nombres
    // raisonnables (eviter qu'un client bidouille avec 99999 kcal).
    const ok =
      Number.isFinite(cal) && cal >= 800 && cal <= 6000 &&
      Number.isFinite(prot) && prot >= 30 && prot <= 400 &&
      Number.isFinite(gluc) && gluc >= 30 && gluc <= 800 &&
      Number.isFinite(lip) && lip >= 15 && lip <= 250;

    if (ok) {
      bridgeData = {
        cal: Math.round(cal),
        prot: Math.round(prot),
        gluc: Math.round(gluc),
        lip: Math.round(lip),
        name: name,
      };
    }
  } catch (e) {
    // URL bizarre, params absents, etc. → mode autonome
    return;
  }

  // Pas de params bridge → on ne fait RIEN, mode autonome inchange
  if (!bridgeData) return;

  // Stockage global pour debug + acces depuis ailleurs si besoin
  window.__BRIDGE_MODE__ = bridgeData;

  // ── 2. Override IMMEDIAT de Calculator.compute (top-level) ──
  // CRITIQUE : on doit override AVANT que app.js declenche son
  // DOMContentLoaded qui appelle goToStep(state.currentStep) qui
  // peut appeler computeAndRenderPlan → Calculator.compute(state).
  //
  // IMPORTANT : Calculator est declare avec `const` dans calculator.js,
  // donc il n'est PAS attache a window (uniquement `var` au top-level
  // l'est). Mais il reste accessible globalement comme variable libre.
  // On utilise donc `Calculator` directement (pas `window.Calculator`).
  // Idem pour state/goToStep/prevStep dans la section 4.
  try {
    if (typeof Calculator !== 'undefined' && typeof Calculator.compute === 'function') {
      Calculator.compute = function () {
        return {
          targetCals: bridgeData.cal,
          macros: {
            protein: bridgeData.prot,
            carbs: bridgeData.gluc,
            fat: bridgeData.lip,
          },
          tdee: bridgeData.cal,
          bmr: Math.round(bridgeData.cal * 0.65),
          deficit: 0,
          warnings: [],
          _bridge: true,
        };
      };
    } else {
      console.warn('[bridge-mode] Calculator introuvable au top-level, override impossible');
    }
  } catch (e) {
    console.warn('[bridge-mode] Override Calculator.compute echoue', e);
  }

  // ── 3. Hook DOMContentLoaded pour activer le mode bridge ──
  // On attend que app.js ait fini son init avant d'override quoi que ce soit.
  // Utilise un setTimeout 0 dans le DOMContentLoaded pour passer APRES le
  // handler de app.js (les handlers s'executent dans l'ordre de declaration,
  // et app.js declare le sien en premier puisqu'il est charge avant nous).
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
      try {
        activateBridgeMode(bridgeData);
      } catch (e) {
        console.warn('[bridge-mode] Activation echouee, fallback autonome', e);
        // Si on plante apres init, on essaie au moins de retirer le bandeau
        // pour ne pas laisser un truc bizarre a l'ecran.
        try {
          const banner = document.getElementById('bridge-banner');
          if (banner) banner.remove();
        } catch (_) {}
      }
    }, 50);
  });

  // ── 4. Activation du mode bridge ──
  // Note : l'override de Calculator.compute est deja fait au top-level
  // (section 2). Ici on s'occupe juste de state, navigation, banner.
  function activateBridgeMode(data) {
    // 4.1 — Setter le state.results directement.
    // state est `const` dans app.js → utilise variable globale, pas window.state
    try {
      if (typeof state !== 'undefined' && state) {
        state.results = {
          targetCals: data.cal,
          macros: {
            protein: data.prot,
            carbs: data.gluc,
            fat: data.lip,
          },
          tdee: data.cal,
          bmr: Math.round(data.cal * 0.65),
          deficit: 0,
          warnings: [],
          _bridge: true,
        };
        // Injecter aussi des valeurs profil dummy si vide, pour eviter qu'un
        // autre code (validation cachee) plante. Ces valeurs ne sont JAMAIS
        // utilisees pour le calcul (Calculator.compute est deja override),
        // c'est juste pour satisfaire d'eventuelles verifs internes.
        if (!state.age) state.age = 30;
        if (!state.weight) state.weight = 70;
        if (!state.height) state.height = 170;
      }
    } catch (e) {
      console.warn('[bridge-mode] state setup failed', e);
    }

    // 4.2 — Injecter le bandeau coach
    injectBridgeBanner(data);

    // 4.3 — Forcer le saut a l'etape 3 (preferences alimentaires)
    // Les function declarations (function goToStep()) sont attachees a
    // window dans un script classique → window.goToStep est accessible.
    try {
      if (typeof window.goToStep === 'function') {
        window.goToStep(3);
      }
    } catch (e) {
      console.warn('[bridge-mode] goToStep(3) failed', e);
    }

    // 4.4 — Bloquer le bouton "Precedent" pour empecher de remonter
    // aux etapes calcul metabo. On wrappe prevStep, on ne le casse pas.
    try {
      if (typeof window.prevStep === 'function') {
        const originalPrev = window.prevStep;
        window.prevStep = function () {
          if (typeof state !== 'undefined' && state && typeof state.currentStep === 'number' && state.currentStep <= 3) {
            return;
          }
          try { originalPrev(); } catch (_) {}
        };
      }
    } catch (e) {
      console.warn('[bridge-mode] prevStep override failed', e);
    }
  }

  // ── 5. Bandeau coach ──
  function injectBridgeBanner(data) {
    if (document.getElementById('bridge-banner')) return; // deja injecte

    const banner = document.createElement('div');
    banner.id = 'bridge-banner';
    banner.style.cssText = [
      'background: linear-gradient(135deg, #c8a960 0%, #a88842 100%)',
      'color: #1a1a1a',
      'padding: 14px 18px',
      'margin: 0 auto 18px auto',
      'max-width: 720px',
      'border-radius: 14px',
      'font-family: "DM Sans", sans-serif',
      'font-size: 13.5px',
      'line-height: 1.5',
      'box-shadow: 0 2px 12px rgba(0,0,0,0.15)',
      'position: relative',
      'z-index: 10',
    ].join(';');

    const greeting = data.name ? `Salut ${escapeHtml(data.name)} 👋` : 'Bonjour 👋';
    banner.innerHTML = `
      <div style="font-weight:700;font-size:14px;margin-bottom:8px;">
        ${greeting}
      </div>
      <div style="font-weight:500;font-size:13px;margin-bottom:8px;">
        Ton objectif de calories et macronutriments :
      </div>
      <div style="font-weight:500;line-height:1.7;">
        <strong style="font-size:15px;">${data.cal} kcal</strong>
        &nbsp;·&nbsp; ${data.prot}&nbsp;g protéines
        &nbsp;·&nbsp; ${data.gluc}&nbsp;g glucides
        &nbsp;·&nbsp; ${data.lip}&nbsp;g lipides
      </div>
      <div style="margin-top:10px;font-size:12px;opacity:0.78;line-height:1.4;">
        Défini sur ton application AH Coaching. Ajuste tes préférences ci-dessous (allergies, régime, nombre de repas) pour personnaliser le plan.
      </div>
    `;

    // Injection : juste apres le progress bar, avant les steps
    const progressWrap = document.querySelector('.progress-wrap');
    if (progressWrap && progressWrap.parentNode) {
      progressWrap.parentNode.insertBefore(banner, progressWrap.nextSibling);
    } else {
      // Fallback : top du body
      document.body.insertBefore(banner, document.body.firstChild);
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();
