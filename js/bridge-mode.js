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

  // ── 2. Hook DOMContentLoaded pour activer le mode bridge ──
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

  // ── 3. Activation du mode bridge ──
  function activateBridgeMode(data) {
    // 3.1 — Override Calculator.compute pour bypass le calcul
    if (typeof window.Calculator === 'object' && typeof window.Calculator.compute === 'function') {
      window.Calculator.compute = function () {
        return {
          targetCals: data.cal,
          macros: {
            protein: data.prot,
            carbs: data.gluc,
            fat: data.lip,
          },
          // Champs additionnels au cas ou le code existant les lit.
          // Valeurs raisonnables qui ne s'affichent pas en mode bridge
          // (bandeau prioritaire) mais evitent des undefined.
          tdee: data.cal,
          bmr: Math.round(data.cal * 0.65),
          deficit: 0,
          warnings: [],
          _bridge: true,
        };
      };
    }

    // 3.2 — Setter le state.results directement (si state est accessible)
    if (typeof window.state === 'object' && window.state) {
      window.state.results = {
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
    }

    // 3.3 — Injecter le bandeau coach
    injectBridgeBanner(data);

    // 3.4 — Forcer le saut a l'etape 3 (preferences alimentaires)
    if (typeof window.goToStep === 'function') {
      window.goToStep(3);
    }

    // 3.5 — Bloquer le bouton "Precedent" pour empecher de remonter
    // aux etapes calcul metabo. On wrappe prevStep, on ne le casse pas.
    if (typeof window.prevStep === 'function') {
      const originalPrev = window.prevStep;
      window.prevStep = function () {
        if (window.state && typeof window.state.currentStep === 'number' && window.state.currentStep <= 3) {
          // Bloque : pas de retour avant l'etape 3
          return;
        }
        try { originalPrev(); } catch (_) {}
      };
    }
  }

  // ── 4. Bandeau coach ──
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

    const greeting = data.name ? `${escapeHtml(data.name)}, t` : 'T';
    banner.innerHTML = `
      <div style="font-weight:700;font-size:14px;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
        <span style="font-size:16px;">🔒</span>
        <span>${greeting}es macros sont calibrées par ton coach Arthur</span>
      </div>
      <div style="opacity:0.92;font-weight:500;">
        <strong>${data.cal} kcal</strong>
        &nbsp;·&nbsp; ${data.prot}&nbsp;g protéines
        &nbsp;·&nbsp; ${data.gluc}&nbsp;g glucides
        &nbsp;·&nbsp; ${data.lip}&nbsp;g lipides
      </div>
      <div style="margin-top:8px;font-size:12px;opacity:0.78;line-height:1.4;">
        Ces valeurs sont fixes. Ajuste seulement tes préférences (allergies, nombre de repas, régime) ci-dessous pour personnaliser le plan.
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
