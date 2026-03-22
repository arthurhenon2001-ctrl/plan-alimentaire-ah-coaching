// ============================================================================
// APP.JS — Orchestration principale — AH Coaching Plan Alimentaire
// ============================================================================

// ── ÉTAT GLOBAL ──
const state = {
  currentStep: 0,
  // Profil
  sex: 'female',
  age: null,
  height: null,
  weight: null,
  waist: null,
  neck: null,
  hips: null,
  bodyFatKnown: null,
  // Santé
  thyroid: 'none',
  menopause: 'no',
  yoyo: 'none',
  // Activité quotidienne
  stepsWork: 6000,
  stepsOff: 4000,
  walkPace: 'normal',
  elevation: 'never',
  jobType: 'sedentary',
  workHours: 8,
  workDays: 5,
  sittingHours: 8,
  microBreaks: 'never',
  walkTransport: 0,
  bikeTransport: 0,
  // Sport
  activities: [],
  // Récupération
  sleepHours: 7,
  sleepQuality: 7,
  stress: 4,
  water: 2,
  alcohol: 'none',
  // Objectif
  dietType: 'mixed',
  goal: 'cut',
  deficitIntensity: 'moderate',
  targetWeight: null,
  weeks: 12,
  // Préférences alimentaires
  allergies: [],
  diet: 'mixed',
  excludedFoods: [],
  // Plan alimentaire
  mealCount: 3,
  planMode: 'equivalence', // 'fixed' ou 'equivalence'
  planDays: 1, // 1 = jour type, 7 = semaine
  // Résultats calculés
  results: null,
  meals: null,
  weekMeals: null, // pour le plan semaine
  _currentDay: 0,  // jour affiché en mode semaine
};

// Getter: retourne les repas du jour actuel (semaine ou jour type)
function getCurrentMeals() {
  if (state.planDays === 7 && state.weekMeals) {
    return state.weekMeals[state._currentDay || 0];
  }
  return state.meals;
}

const TOTAL_STEPS = 5; // 0-based: 0=profil, 1=activité, 2=objectif, 3=préférences+config, 4=plan, 5=résumé/export
let activityCounter = 0;

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  const saved = Storage.load();
  if (saved) Object.assign(state, saved);
  buildUI();
  goToStep(state.currentStep);
});

function buildUI() {
  setupToggleListeners();
  setupInputListeners();
  setupAllergyCheckboxes();
  renderExcludedFoodsList();
  // Restore activities
  if (state.activities.length > 0) {
    state.activities.forEach(act => addActivityRow(act));
  }
  // Restore range values
  const sq = document.getElementById('sleepQuality');
  const st = document.getElementById('stress');
  if (sq) { sq.value = state.sleepQuality; document.getElementById('sleepQualityVal').textContent = state.sleepQuality; }
  if (st) { st.value = state.stress; document.getElementById('stressVal').textContent = state.stress; }
}

// ── NAVIGATION ──
function goToStep(n) {
  state.currentStep = n;
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  const step = document.querySelector(`[data-step="${n}"]`);
  if (step) step.classList.add('active');

  // Progress bar
  const pct = (n / TOTAL_STEPS) * 100;
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('stepIndicator').textContent = `Étape ${n + 1} / ${TOTAL_STEPS + 1}`;

  // Nav buttons
  document.getElementById('btnPrev').style.visibility = n === 0 ? 'hidden' : 'visible';
  const btnNext = document.getElementById('btnNext');
  if (n === 3) {
    btnNext.textContent = 'Générer mon plan →';
  } else if (n >= TOTAL_STEPS) {
    btnNext.style.display = 'none';
  } else {
    btnNext.style.display = '';
    btnNext.textContent = 'Suivant →';
  }

  // On step 4 (plan), compute and render
  if (n === 4) {
    computeAndRenderPlan();
  }
  // On step 5 (export), show summary
  if (n === 5) {
    renderSummary();
  }

  // Scroll vers le titre du step (pas tout en haut)
  const title = step?.querySelector('.step-title');
  if (title) {
    setTimeout(() => title.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }

  Storage.save(state);
}

function nextStep() {
  // Validation avant de passer à l'étape suivante
  if (state.currentStep === 0) {
    const age = parseInt(document.getElementById('age')?.value);
    const weight = parseFloat(document.getElementById('weight')?.value);
    const height = parseFloat(document.getElementById('height')?.value);
    if (!age || !weight || !height) {
      showToast('Remplis au minimum ton âge, poids et taille pour continuer.');
      return;
    }
  }
  if (state.currentStep <= TOTAL_STEPS) goToStep(state.currentStep + 1);
}

function showToast(msg) {
  let toast = document.getElementById('appToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'appToast';
    toast.className = 'app-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 4000);
}

function prevStep() {
  if (state.currentStep > 0) goToStep(state.currentStep - 1);
}

// ── TOGGLE BUTTONS (sex, goal, etc.) ──
function setupToggleListeners() {
  document.querySelectorAll('.toggle-btn[data-field]').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.field;
      const value = btn.dataset.value;
      state[field] = value;
      btn.parentElement.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Show/hide hips field for female
      if (field === 'sex') {
        const hipsGroup = document.getElementById('hipsGroup');
        if (hipsGroup) hipsGroup.style.display = value === 'female' ? '' : 'none';
        const menopauseGroup = document.getElementById('menopauseGroup');
        if (menopauseGroup) menopauseGroup.style.display = value === 'female' ? '' : 'none';
      }
      // Show/hide deficit intensity for cut
      if (field === 'goal') {
        const defGroup = document.getElementById('deficitIntensityGroup');
        if (defGroup) defGroup.style.display = value === 'cut' ? '' : 'none';
      }

      Storage.save(state);
    });
    // Restore active state
    if (state[btn.dataset.field] === btn.dataset.value) {
      btn.classList.add('active');
    }
  });
}

// ── INPUT LISTENERS ──
function setupInputListeners() {
  const fields = {
    age: 'age', height: 'height', weight: 'weight',
    waist: 'waist', neck: 'neck', hips: 'hips', bodyFatKnown: 'bodyFatKnown',
    stepsWork: 'stepsWork', stepsOff: 'stepsOff',
    workHours: 'workHours', workDays: 'workDays',
    sittingHours: 'sittingHours',
    walkTransport: 'walkTransport', bikeTransport: 'bikeTransport',
    sleepHours: 'sleepHours', water: 'water',
    targetWeight: 'targetWeight',
  };
  Object.entries(fields).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) {
      if (state[key] !== null && state[key] !== undefined) el.value = state[key];
      el.addEventListener('input', () => {
        state[key] = parseFloat(el.value) || null;
        Storage.save(state);
        // Trigger safety check when relevant fields change
        if (['targetWeight', 'weight', 'height', 'age'].includes(key)) {
          checkGoalSafety();
        }
      });
    }
  });

  // Selects
  ['walkPace', 'jobType', 'alcohol', 'dietType', 'microBreaks', 'elevation', 'weeks'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (state[id]) el.value = state[id];
      el.addEventListener('change', () => {
        state[id] = el.value;
        if (id === 'weeks') state.weeks = parseInt(el.value);
        Storage.save(state);
        if (id === 'weeks') checkGoalSafety();
      });
    }
  });

  // Ranges
  const sleepQ = document.getElementById('sleepQuality');
  if (sleepQ) sleepQ.oninput = () => {
    state.sleepQuality = parseInt(sleepQ.value);
    document.getElementById('sleepQualityVal').textContent = sleepQ.value;
    Storage.save(state);
  };
  const stressR = document.getElementById('stress');
  if (stressR) stressR.oninput = () => {
    state.stress = parseInt(stressR.value);
    document.getElementById('stressVal').textContent = stressR.value;
    Storage.save(state);
  };

  // Meal count & plan mode
  document.querySelectorAll('.meal-count-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.meal-count-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.mealCount = parseInt(btn.dataset.value);
      Storage.save(state);
    });
    if (state.mealCount === parseInt(btn.dataset.value)) btn.classList.add('active');
  });

  document.querySelectorAll('.plan-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.plan-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.planMode = btn.dataset.value;
      Storage.save(state);
    });
    if (state.planMode === btn.dataset.value) btn.classList.add('active');
  });

  // Plan duration buttons
  document.querySelectorAll('.plan-duration-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.plan-duration-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.planDays = parseInt(btn.dataset.value);
      Storage.save(state);
    });
    if (state.planDays === parseInt(btn.dataset.value)) btn.classList.add('active');
  });
}

// ── ALLERGIES ──
function setupAllergyCheckboxes() {
  document.querySelectorAll('.allergy-check').forEach(cb => {
    cb.checked = state.allergies.includes(cb.value);
    cb.addEventListener('change', () => {
      if (cb.checked) {
        if (!state.allergies.includes(cb.value)) state.allergies.push(cb.value);
      } else {
        state.allergies = state.allergies.filter(a => a !== cb.value);
      }
      Storage.save(state);
    });
  });

  // Diet preference
  document.querySelectorAll('.diet-radio').forEach(radio => {
    radio.checked = state.diet === radio.value;
    radio.addEventListener('change', () => {
      state.diet = radio.value;
      Storage.save(state);
    });
  });
}

// ── EXCLUDED FOODS ──
function renderExcludedFoodsList() {
  const container = document.getElementById('excludedFoodsList');
  if (!container) return;

  // Grouper les aliments par catégorie lisible
  const FOOD_GROUPS = [
    { label: 'Volailles', ids: ['poulet', 'dinde', 'cuisse_poulet', 'canard'] },
    { label: 'Viandes rouges', ids: ['boeuf_5', 'boeuf_bavette', 'boeuf_rumsteck', 'veau', 'agneau'] },
    { label: 'Porc & charcuterie', ids: ['porc_filet', 'jambon'] },
    { label: 'Poissons', ids: NUTRITION_DB.protein.filter(f => f.tags.includes('poisson')).map(f => f.id) },
    { label: 'Crustacés & fruits de mer', ids: NUTRITION_DB.protein.filter(f => f.tags.includes('crustace')).map(f => f.id) },
    { label: 'Œufs', ids: ['oeuf', 'blanc_oeuf'] },
    { label: 'Produits laitiers', ids: ['fromage_blanc', 'skyr', 'yaourt_grec', 'cottage', 'fromage_rape', 'mozzarella', 'chevre', 'feta', 'creme_fraiche', 'beurre', 'whey'] },
    { label: 'Protéines végétales', ids: ['tofu', 'tempeh', 'seitan', 'edamame'] },
    { label: 'Féculents & céréales', ids: NUTRITION_DB.carb.map(f => f.id) },
    { label: 'Matières grasses', ids: NUTRITION_DB.fat.filter(f => !['fromage_rape','mozzarella','chevre','feta','creme_fraiche','beurre'].includes(f.id)).map(f => f.id) },
    { label: 'Fruits', ids: NUTRITION_DB.fruit.map(f => f.id) },
  ];

  const allFoodsMap = {};
  ['protein', 'carb', 'fat', 'fruit'].forEach(cat => {
    NUTRITION_DB[cat].forEach(f => { allFoodsMap[f.id] = f; });
  });

  container.innerHTML = '';

  // Search input
  const searchWrap = document.createElement('div');
  searchWrap.className = 'excluded-search-wrap';
  searchWrap.innerHTML = '<input type="text" id="excludeSearch" placeholder="Rechercher un aliment (ex: saumon, riz, avocat...)" class="form-input">';
  container.appendChild(searchWrap);

  const listWrap = document.createElement('div');
  listWrap.className = 'excluded-list';
  listWrap.id = 'excludeListInner';
  container.appendChild(listWrap);

  function renderList(filter = '') {
    let html = '';

    FOOD_GROUPS.forEach(group => {
      const foods = group.ids
        .map(id => allFoodsMap[id])
        .filter(f => f)
        .filter(f => !filter || f.name.toLowerCase().includes(filter.toLowerCase()) || group.label.toLowerCase().includes(filter.toLowerCase()));

      if (foods.length === 0) return;

      // Check if all in group are excluded
      const allExcluded = foods.every(f => state.excludedFoods.includes(f.id));
      const someExcluded = foods.some(f => state.excludedFoods.includes(f.id));

      html += `<div class="exclude-group">
        <label class="exclude-group-header ${allExcluded ? 'active' : ''}">
          <input type="checkbox" class="exclude-group-check" data-group="${group.label}" ${allExcluded ? 'checked' : ''}>
          <strong>${group.label}</strong>
          <span class="exclude-group-count">${foods.length} aliments</span>
        </label>
        <div class="exclude-group-items">`;

      foods.forEach(food => {
        const checked = state.excludedFoods.includes(food.id) ? 'checked' : '';
        html += `<label class="exclude-item ${checked ? 'active' : ''}">
          <input type="checkbox" value="${food.id}" ${checked} class="exclude-check">
          <span>${food.name}</span>
        </label>`;
      });

      html += '</div></div>';
    });

    listWrap.innerHTML = html;

    // Individual food checkboxes
    listWrap.querySelectorAll('.exclude-check').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) {
          if (!state.excludedFoods.includes(cb.value)) state.excludedFoods.push(cb.value);
        } else {
          state.excludedFoods = state.excludedFoods.filter(id => id !== cb.value);
        }
        cb.parentElement.classList.toggle('active', cb.checked);
        // Update group header checkbox state
        updateGroupHeaders();
        Storage.save(state);
      });
    });

    // Group header checkboxes (select/deselect all in group)
    listWrap.querySelectorAll('.exclude-group-check').forEach(gcb => {
      gcb.addEventListener('change', () => {
        const groupLabel = gcb.dataset.group;
        const group = FOOD_GROUPS.find(g => g.label === groupLabel);
        if (!group) return;
        const groupFoods = group.ids.filter(id => allFoodsMap[id]);

        if (gcb.checked) {
          groupFoods.forEach(id => {
            if (!state.excludedFoods.includes(id)) state.excludedFoods.push(id);
          });
        } else {
          state.excludedFoods = state.excludedFoods.filter(id => !groupFoods.includes(id));
        }

        // Re-render to update individual checkboxes
        renderList(filter);
        Storage.save(state);
      });
    });
  }

  function updateGroupHeaders() {
    listWrap.querySelectorAll('.exclude-group-check').forEach(gcb => {
      const groupLabel = gcb.dataset.group;
      const group = FOOD_GROUPS.find(g => g.label === groupLabel);
      if (!group) return;
      const groupFoods = group.ids.filter(id => allFoodsMap[id]);
      const allExcluded = groupFoods.every(id => state.excludedFoods.includes(id));
      gcb.checked = allExcluded;
      gcb.parentElement.classList.toggle('active', allExcluded);
    });
  }

  renderList();

  document.getElementById('excludeSearch').addEventListener('input', e => {
    renderList(e.target.value);
  });
}

// ── ACTIVITIES ──
function addActivity(existing) {
  activityCounter++;
  const id = activityCounter;
  const container = document.getElementById('activities');
  addActivityRow(existing, id);
}

function addActivityRow(existing, forceId) {
  activityCounter++;
  const id = forceId || activityCounter;
  const container = document.getElementById('activities');
  const div = document.createElement('div');
  div.className = 'activity-item';
  div.id = `activity-${id}`;

  const options = ACTIVITY_TYPES.map(a =>
    `<option value="${a.value}" ${existing && existing.type === a.value ? 'selected' : ''}>${a.label}</option>`
  ).join('');

  div.innerHTML = `
    <button class="activity-remove" onclick="removeActivity(${id})">×</button>
    <div class="form-grid">
      <div class="form-group full-width">
        <label>Type</label>
        <select class="form-select" id="actType-${id}" onchange="updateActivities()">${options}</select>
      </div>
      <div class="form-group">
        <label>Durée (min)</label>
        <input type="number" class="form-input" id="actDuration-${id}" min="10" max="300" step="5" value="${existing ? existing.duration : 60}" onchange="updateActivities()">
      </div>
      <div class="form-group">
        <label>Fréquence (x/sem)</label>
        <input type="number" class="form-input" id="actFreq-${id}" min="1" max="14" step="1" value="${existing ? existing.freq : 3}" onchange="updateActivities()">
      </div>
      <div class="form-group">
        <label>Intensité</label>
        <select class="form-select" id="actIntensity-${id}" onchange="updateActivities()">
          <option value="light" ${existing && existing.intensity === 'light' ? 'selected' : ''}>Légère</option>
          <option value="moderate" ${!existing || existing.intensity === 'moderate' ? 'selected' : ''}>Modérée</option>
          <option value="hard" ${existing && existing.intensity === 'hard' ? 'selected' : ''}>Intense</option>
          <option value="very_hard" ${existing && existing.intensity === 'very_hard' ? 'selected' : ''}>Très intense</option>
        </select>
      </div>
    </div>
  `;
  container.appendChild(div);
}

function removeActivity(id) {
  const el = document.getElementById(`activity-${id}`);
  if (el) el.remove();
  updateActivities();
}

function updateActivities() {
  const activities = [];
  document.querySelectorAll('.activity-item').forEach(item => {
    const id = item.id.split('-')[1];
    const type = document.getElementById(`actType-${id}`)?.value;
    const duration = parseFloat(document.getElementById(`actDuration-${id}`)?.value) || 60;
    const freq = parseFloat(document.getElementById(`actFreq-${id}`)?.value) || 3;
    const intensity = document.getElementById(`actIntensity-${id}`)?.value || 'moderate';
    const found = ACTIVITY_TYPES.find(a => a.value === type);
    const met = found ? found.met : 5;
    activities.push({ type, duration, freq, met, intensity });
  });
  state.activities = activities;
  Storage.save(state);
}

// ── GOAL SAFETY CHECKS ──
function checkGoalSafety() {
  const alertsEl = document.getElementById('goalAlerts');
  if (!alertsEl) return;

  const { weight, targetWeight, height, age, sex, goal, weeks } = state;
  const alerts = [];

  // Need both weight and target to check
  if (!weight || !targetWeight || !height) {
    alertsEl.innerHTML = '';
    return;
  }

  const weightDiff = Math.abs(weight - targetWeight);
  const weeksDuration = parseInt(weeks) || 12;
  const weeklyChange = weightDiff / weeksDuration;

  if (goal === 'cut' || (goal !== 'bulk' && targetWeight < weight)) {
    // ── PERTE DE POIDS ──

    // 1. Vitesse de perte trop rapide (> 1% du poids/semaine = agressif, > 1.5% = dangereux)
    const pctPerWeek = (weeklyChange / weight) * 100;

    if (pctPerWeek > 1.5) {
      const safeWeeks = Math.ceil(weightDiff / (weight * 0.008));
      alerts.push({
        type: 'danger',
        title: 'Objectif dangereux pour ta santé',
        text: `Perdre ${weightDiff.toFixed(1)} kg en ${weeksDuration} semaines = ${weeklyChange.toFixed(1)} kg/semaine (${pctPerWeek.toFixed(1)}% de ton poids). C'est beaucoup trop rapide. Tu risques une perte musculaire massive, des carences, des troubles hormonaux et un effet yo-yo.`,
        suggestion: `Durée recommandée : au moins ${safeWeeks} semaines (~${(weeklyChange * weeksDuration / safeWeeks).toFixed(1)} kg/semaine).`,
      });
    } else if (pctPerWeek > 1) {
      alerts.push({
        type: 'warning',
        title: 'Rythme de perte agressif',
        text: `${weeklyChange.toFixed(1)} kg/semaine (${pctPerWeek.toFixed(1)}% de ton poids). C'est faisable mais agressif — tu risques de perdre du muscle et d'avoir faim. Augmente la durée si possible.`,
      });
    } else if (pctPerWeek >= 0.5) {
      alerts.push({
        type: 'info',
        title: 'Rythme de perte raisonnable',
        text: `${weeklyChange.toFixed(1)} kg/semaine — c'est un bon rythme pour préserver ton muscle et tenir sur la durée.`,
      });
    }

    // 2. Poids cible trop bas (IMC < 18.5)
    const targetBMI = targetWeight / ((height / 100) ** 2);
    if (targetBMI < 18.5) {
      alerts.push({
        type: 'danger',
        title: 'Poids cible trop bas',
        text: `À ${targetWeight} kg pour ${height} cm, ton IMC serait de ${targetBMI.toFixed(1)} (sous-poids). C'est dangereux pour ta santé. Le minimum recommandé est ~${Math.ceil(18.5 * (height / 100) ** 2)} kg.`,
      });
    }

    // 3. Calories qui seraient trop basses
    if (weight && age && height) {
      const roughBMR = sex === 'male'
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;
      const deficitForRate = weeklyChange * 7700 / 7; // kcal/day deficit needed
      const roughTDEE = roughBMR * 1.4; // rough estimate
      const estimatedCals = roughTDEE - deficitForRate;
      const minCals = sex === 'female' ? 1200 : 1500;

      if (estimatedCals < minCals) {
        alerts.push({
          type: 'danger',
          title: 'Calories trop basses',
          text: `Pour perdre à ce rythme, il faudrait descendre à ~${Math.round(estimatedCals)} kcal/jour, ce qui est en dessous du minimum recommandé de ${minCals} kcal. Cela entraîne des carences, une baisse du métabolisme et des troubles hormonaux.`,
          suggestion: `Augmente la durée pour rester au-dessus de ${minCals} kcal/jour.`,
        });
      }
    }
  }

  if (goal === 'bulk' || (goal !== 'cut' && targetWeight > weight)) {
    // ── PRISE DE MASSE ──

    // Prise trop rapide (> 0.5 kg/semaine = trop de gras)
    if (weeklyChange > 0.5) {
      alerts.push({
        type: 'warning',
        title: 'Prise de masse trop rapide',
        text: `${weeklyChange.toFixed(1)} kg/semaine — au-delà de 0.3-0.5 kg/semaine, l'excédent se transforme principalement en gras. Allonge la durée pour une prise plus propre.`,
      });
    }

    // Prise de poids énorme
    if (weightDiff > weight * 0.2) {
      alerts.push({
        type: 'warning',
        title: 'Objectif de prise très ambitieux',
        text: `+${weightDiff.toFixed(1)} kg, c'est +${((weightDiff / weight) * 100).toFixed(0)}% de ton poids. Assure-toi que c'est réaliste et accompagné d'un programme de musculation adapté.`,
      });
    }
  }

  // Render alerts
  if (alerts.length === 0) {
    alertsEl.innerHTML = '';
    return;
  }

  alertsEl.innerHTML = alerts.map(a => `
    <div class="goal-alert ${a.type}">
      <strong>${a.title}</strong>
      ${a.text}
      ${a.suggestion ? `<div class="suggested">${a.suggestion}</div>` : ''}
    </div>
  `).join('');
}

// ── COMPUTE & RENDER PLAN ──
const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

function computeAndRenderPlan() {
  // 1. Run calculator
  const results = Calculator.compute(state);
  if (!results) {
    document.getElementById('planContent').innerHTML = '<div class="error-msg">Remplis d\'abord ton profil (âge, taille, poids) pour calculer ton plan.</div>';
    return;
  }
  state.results = results;

  const constraints = {
    allergies: state.allergies,
    diet: state.diet,
    excludedIds: state.excludedFoods,
  };

  // 2. Build meal structure(s)
  if (state.planDays === 7) {
    // Plan semaine : 7 jours variés
    state.weekMeals = [];
    for (let d = 0; d < 7; d++) {
      const dayMeals = MealPlanner.buildMealStructure(results.macros, state.mealCount);
      if (state.planMode === 'fixed') {
        MealPlanner.generateFixedPlan(dayMeals, constraints);
      }
      state.weekMeals.push(dayMeals);
    }
    state.meals = state.weekMeals[0]; // current day shown
  } else {
    // Jour type
    const meals = MealPlanner.buildMealStructure(results.macros, state.mealCount);
    if (state.planMode === 'fixed') {
      MealPlanner.generateFixedPlan(meals, constraints);
    }
    state.meals = meals;
    state.weekMeals = null;
  }

  // 3. Render
  renderMetaboResults(results);

  if (state.planDays === 7) {
    renderWeekPlan(constraints);
  } else {
    renderPlan(state.meals, constraints);
  }

  // Show/hide regen all button
  const regenWrap = document.getElementById('regenAllWrap');
  if (regenWrap) regenWrap.style.display = state.planMode === 'fixed' ? 'block' : 'none';

  Storage.save(state);
}

function renderMetaboResults(r) {
  const el = document.getElementById('metaboSummary');
  if (!el) return;
  el.innerHTML = `
    <div class="metabo-grid">
      <div class="metabo-card">
        <div class="metabo-label">Métabolisme de base</div>
        <div class="metabo-value">${r.bmr.toLocaleString('fr-FR')}</div>
        <div class="metabo-unit">kcal/jour</div>
      </div>
      <div class="metabo-card accent">
        <div class="metabo-label">Dépense totale (TDEE)</div>
        <div class="metabo-value">${r.tdee.toLocaleString('fr-FR')}</div>
        <div class="metabo-unit">kcal/jour</div>
      </div>
      <div class="metabo-card highlight">
        <div class="metabo-label">Calories cibles</div>
        <div class="metabo-value">${r.targetCals.toLocaleString('fr-FR')}</div>
        <div class="metabo-unit">kcal/jour</div>
      </div>
    </div>
    <div class="macro-summary">
      <div class="macro-pill prot"><span>${r.macros.protein}g</span> Protéines</div>
      <div class="macro-pill gluc"><span>${r.macros.carbs}g</span> Glucides</div>
      <div class="macro-pill lip"><span>${r.macros.fat}g</span> Lipides</div>
    </div>
    ${r.deficitPct < 0 ? `<div class="deficit-info">Déficit de ${Math.abs(r.deficitPct).toFixed(0)}% (−${Math.abs(r.tdee - r.targetCals)} kcal/jour)</div>` : ''}
    ${r.deficitPct > 0 ? `<div class="deficit-info">Surplus de +${r.deficitPct.toFixed(0)}% (+${r.targetCals - r.tdee} kcal/jour)</div>` : ''}
    ${state.targetWeight ? `<div class="deficit-info" style="margin-top:6px">Objectif : ${state.weight} kg → ${state.targetWeight} kg en ${state.weeks} semaines</div>` : ''}
    ${(r.warnings && r.warnings.length > 0) ? r.warnings.map(w => {
      const isDanger = ['impossible', 'below_bmr', 'too_aggressive'].includes(w.type);
      const icons = { impossible: '🚫', below_bmr: '⛔', too_aggressive: '⚠️', low_calories: '💡' };
      const titles = { impossible: 'Objectif non réalisable', below_bmr: 'Protection métabolique', too_aggressive: 'Objectif trop ambitieux', low_calories: 'Conseil' };
      return `<div class="warning-box ${isDanger ? 'warning-danger' : 'warning-info'}">
        <strong>${icons[w.type] || '💡'} ${titles[w.type] || 'Info'}</strong>
        <p>${w.message}</p>
      </div>`;
    }).join('') : ''}
  `;
}

function renderPlan(meals, constraints) {
  const container = document.getElementById('planContent');
  container.innerHTML = '';

  // Recap bar
  updateRecapBar(meals);

  meals.forEach((meal, mi) => {
    const card = document.createElement('div');
    card.className = 'meal-card';
    card.innerHTML = buildMealCardHTML(meal, mi, constraints);
    container.appendChild(card);
  });

  // Wire up event listeners
  if (state.planMode === 'equivalence') {
    container.querySelectorAll('.food-select').forEach(sel => {
      sel.addEventListener('change', onFoodSelectChange);
    });
  }
}

function renderWeekPlan(constraints) {
  const container = document.getElementById('planContent');
  container.innerHTML = '';
  updateRecapBar(state.weekMeals[0]);

  // Day tabs
  const tabs = document.createElement('div');
  tabs.className = 'day-tabs';
  tabs.innerHTML = DAY_NAMES.map((name, i) =>
    `<button class="day-tab ${i === 0 ? 'active' : ''}" onclick="switchDay(${i})">${name.substring(0, 3)}</button>`
  ).join('');
  container.appendChild(tabs);

  // Day content wrapper
  const dayContent = document.createElement('div');
  dayContent.id = 'dayContent';
  container.appendChild(dayContent);

  renderDayContent(0, constraints);
}

function switchDay(dayIndex) {
  state._currentDay = dayIndex;
  document.querySelectorAll('.day-tab').forEach((t, i) => t.classList.toggle('active', i === dayIndex));
  state.meals = state.weekMeals[dayIndex];
  updateRecapBar(state.meals);
  const constraints = {
    allergies: state.allergies,
    diet: state.diet,
    excludedIds: state.excludedFoods,
  };
  renderDayContent(dayIndex, constraints);
}

function renderDayContent(dayIndex, constraints) {
  const container = document.getElementById('dayContent');
  container.innerHTML = '';
  const meals = state.weekMeals[dayIndex];

  meals.forEach((meal, mi) => {
    const card = document.createElement('div');
    card.className = 'meal-card';
    card.innerHTML = buildMealCardHTML(meal, mi, constraints, dayIndex);
    container.appendChild(card);
  });

  if (state.planMode === 'equivalence') {
    container.querySelectorAll('.food-select').forEach(sel => {
      sel.addEventListener('change', onFoodSelectChange);
    });
  }
}

function buildMealCardHTML(meal, mealIndex, constraints, dayIndex) {
  let html = '';

  // Header
  html += `<div class="meal-header">
    <div class="meal-name">${meal.icon} ${meal.name}</div>
    <div class="meal-kcal-badge">~${meal.kcal} kcal</div>
  </div>`;
  html += `<div class="meal-time">${meal.time}</div>`;

  // Macro targets
  html += `<div class="meal-targets">
    <div class="meal-targets-label">Ce repas doit t'apporter :</div>`;
  const parts = [];
  if (meal.macroDisplay.prot > 0) parts.push(`<span class="target-pill"><span class="target-dot" style="background:var(--red)"></span>${meal.macroDisplay.prot}g protéines</span>`);
  if (meal.macroDisplay.gluc > 0) parts.push(`<span class="target-pill"><span class="target-dot" style="background:var(--gold)"></span>${meal.macroDisplay.gluc}g glucides</span>`);
  if (meal.macroDisplay.lip > 0)  parts.push(`<span class="target-pill"><span class="target-dot" style="background:var(--brown-light)"></span>${meal.macroDisplay.lip}g lipides</span>`);
  html += parts.join('<span class="target-sep">&middot;</span>');
  html += '</div>';

  // Slots
  meal.slots.forEach((slot, si) => {
    const isSkipped = slot.skipped === true;
    const canSkip = slot.type !== 'protein'; // On ne peut pas skip la protéine

    // Ratio slider : affiché AVANT le 2e slot d'une paire (entre les 2 sources)
    if (slot.siblingIndex !== null && slot.siblingIndex !== undefined && slot.siblingIndex < si) {
      const firstSlot = meal.slots[slot.siblingIndex];
      const pct = firstSlot.splitPct || 50;
      html += `<div class="ratio-slider-wrap">
        <div class="ratio-labels">
          <span class="ratio-label-left">${firstSlot.label}</span>
          <span class="ratio-value" id="ratio-val-${mealIndex}-${slot.siblingIndex}">${pct}% / ${100 - pct}%</span>
          <span class="ratio-label-right">${slot.label}</span>
        </div>
        <input type="range" class="ratio-slider" min="20" max="80" step="5" value="${pct}"
          data-meal="${mealIndex}" data-slot="${slot.siblingIndex}"
          oninput="onRatioChange(this)">
      </div>`;
    }

    html += `<div class="slot ${isSkipped ? 'slot-skipped' : ''}">`;
    html += `<div class="slot-header">
      <span class="slot-dot" style="background:${slot.color}"></span>
      <span class="slot-label">${slot.label}</span>`;
    if (!slot.isVeg && !isSkipped && slot.target > 0) {
      const macroName = slot.macro === 'prot' ? 'protéines' : (slot.macro === 'gluc' ? 'glucides' : 'lipides');
      html += `<span class="slot-target-badge">${slot.target}g de ${macroName}</span>`;
    }
    if (canSkip) {
      html += `<button class="skip-btn ${isSkipped ? 'skipped' : ''}" onclick="toggleSkipSlot(${mealIndex}, ${si})" title="${isSkipped ? 'Réactiver' : 'Retirer du repas'}">${isSkipped ? '+ Ajouter' : '✕'}</button>`;
    }
    html += '</div>';

    if (isSkipped) {
      html += `<div class="skipped-msg">Retiré — macros redistribuées sur les autres aliments</div>`;
    } else if (slot.isVeg) {
      html += `<div class="legumes-box">
        <div class="legumes-title">200g minimum — à volonté</div>
        <div class="legumes-text">Courgettes, brocolis, haricots verts, épinards, tomates, poivrons, salade, carottes, champignons…</div>
      </div>`;
    } else if (state.planMode === 'fixed') {
      // Mode fixe : afficher l'aliment sélectionné avec bouton swap + macros
      if (slot.selectedFood) {
        html += buildResultBoxHTML(slot, mealIndex, si, true);
      }
    } else {
      // Mode équivalences : dropdown
      const selectId = `select-${mealIndex}-${si}`;
      html += buildFoodDropdown(slot, selectId, mealIndex, si, meal, constraints);
      html += `<div class="result-box" id="result-${mealIndex}-${si}" style="display:none"></div>`;

      // Bouton "+" pour ajouter une 2e source (seulement si pas déjà un sibling)
      if (slot.siblingIndex === null || slot.siblingIndex === undefined) {
        html += `<button class="add-source-btn" onclick="addSecondSource(${mealIndex}, ${si})">+ Ajouter une 2e source</button>`;
      }
    }

    html += '</div>';
  });

  // Regenerate button for fixed mode
  if (state.planMode === 'fixed') {
    html += `<button class="regen-meal-btn" onclick="regenerateMeal(${mealIndex})">↻ Régénérer ce repas</button>`;
  }

  return html;
}

/**
 * Génère le HTML du result-box avec macros détaillées
 */
/**
 * Construit le dropdown pour un slot (avec optgroups pour glucides et protéines)
 */
function buildFoodDropdown(slot, selectId, mealIndex, si, meal, constraints) {
  let html = `<select class="food-select" id="${selectId}" data-meal="${mealIndex}" data-slot="${si}">`;
  html += '<option value="">Choisis un aliment…</option>';

  if (slot.dbCategory === 'gluc') {
    // Glucides : séparer féculents et fruits en optgroups
    const carbs = filterFoods('carb', constraints);
    const fruits = filterFoods('fruit', constraints);
    html += '<optgroup label="Féculents & céréales">';
    carbs.forEach(f => { html += `<option value="${f.id}">${f.name}</option>`; });
    html += '</optgroup><optgroup label="Fruits">';
    fruits.forEach(f => { html += `<option value="${f.id}">${f.name}</option>`; });
    html += '</optgroup>';
  } else if (slot.dbCategory === 'protein') {
    // Protéines : laitier/œufs en premier pour tous les repas
    const dairyIds = ['skyr', 'fromage_blanc', 'yaourt_grec', 'cottage', 'oeuf', 'blanc_oeuf', 'whey'];
    const foods = filterFoods('protein', constraints);
    const dairy = foods.filter(f => dairyIds.includes(f.id));
    const others = foods.filter(f => !dairyIds.includes(f.id));
    html += '<optgroup label="Laitiers / Œufs / Whey">';
    dairy.forEach(f => { html += `<option value="${f.id}">${f.name}</option>`; });
    html += '</optgroup><optgroup label="Viandes & Poissons">';
    others.forEach(f => { html += `<option value="${f.id}">${f.name}</option>`; });
    html += '</optgroup>';
  } else {
    const foods = filterFoods(slot.dbCategory, constraints);
    foods.forEach(f => { html += `<option value="${f.id}">${f.name}</option>`; });
  }

  html += '</select>';
  return html;
}

/**
 * Ajoute une 2e source de macro dans un repas
 */
function addSecondSource(mealIndex, slotIndex) {
  const meal = state.meals[mealIndex];
  const newIdx = MealPlanner.addSecondSource(meal, slotIndex);
  if (newIdx < 0) return;

  // Re-render le plan complet
  const constraints = { allergies: state.allergies, diet: state.diet, excludedIds: state.excludedFoods };
  if (state.planDays === 7) {
    renderWeekPlan(constraints);
  } else {
    renderPlan(state.meals, constraints);
  }
  updateRecapBar(state.meals);
  Storage.save(state);
}

/**
 * Callback quand le ratio slider change
 */
function onRatioChange(slider) {
  const mi = parseInt(slider.dataset.meal);
  const si = parseInt(slider.dataset.slot);
  const pct = parseInt(slider.value);
  const meal = state.meals[mi];

  MealPlanner.updateSplitRatio(meal, si, pct);

  // Update label
  const label = document.getElementById(`ratio-val-${mi}-${si}`);
  if (label) label.textContent = `${pct}% / ${100 - pct}%`;

  // Update badges
  const slot = meal.slots[si];
  const sibling = meal.slots[slot.siblingIndex];
  const macroName = slot.macro === 'prot' ? 'protéines' : (slot.macro === 'gluc' ? 'glucides' : 'lipides');

  // Update target badges in DOM
  const badges = document.querySelectorAll(`[data-meal="${mi}"] .slot`);
  // Simpler: just recalc quantities and re-render result boxes
  if (slot.selectedFood) {
    slot.quantity = MealPlanner.calculateQuantity(slot.selectedFood, slot.macro, slot.target);
    updateMealSlotDisplays(mi);
  }
  if (sibling && sibling.selectedFood) {
    sibling.quantity = MealPlanner.calculateQuantity(sibling.selectedFood, sibling.macro, sibling.target);
    updateMealSlotDisplays(mi);
  }

  // Re-render for clean state
  const constraints = { allergies: state.allergies, diet: state.diet, excludedIds: state.excludedFoods };
  if (state.planDays === 7) {
    renderWeekPlan(constraints);
  } else {
    renderPlan(state.meals, constraints);
  }
  updateRecapBar(state.meals);
  Storage.save(state);
}

function buildResultBoxHTML(slot, mealIndex, slotIndex, showSwap) {
  const food = slot.selectedFood;
  const quantity = slot.quantity;

  // Si quantité = 0, les macros sont déjà couvertes par les autres aliments
  if (quantity <= 0) {
    return `<div class="result-box result-box-skipped">
      <div class="result-label">Pas nécessaire</div>
      <div class="result-food-name" style="font-size:12px;color:var(--gray)">Déjà couvert par les autres aliments du repas</div>
      ${showSwap ? `<button class="swap-btn" onclick="swapFood(${mealIndex}, ${slotIndex})">↻ Changer</button>` : ''}
    </div>`;
  }

  const displayQty = MealPlanner.formatQuantity(food, quantity);
  const foodName = food.name.toLowerCase();
  const vowels = 'aeiouyàâéèêëïîôùûüœæ';
  const prefix = vowels.indexOf(foodName.charAt(0)) >= 0 ? "d'" : 'de ';

  const actual = MealPlanner.computeActualMacros(food, quantity);

  return `<div class="result-box">
    <div class="result-label">Pèse :</div>
    <div class="result-quantity">${displayQty}</div>
    <div class="result-food-name">${prefix}${foodName}</div>
    <div class="result-macros">
      <span class="rm-item rm-kcal">${Math.round(actual.kcal)} kcal</span>
      <span class="rm-item rm-prot">${actual.prot.toFixed(1)}g P</span>
      <span class="rm-item rm-gluc">${actual.gluc.toFixed(1)}g G</span>
      <span class="rm-item rm-lip">${actual.lip.toFixed(1)}g L</span>
    </div>
    ${showSwap ? `<button class="swap-btn" onclick="swapFood(${mealIndex}, ${slotIndex})">↻ Changer</button>` : ''}
  </div>`;
}

// ── EVENT: Food select change (equivalence mode) ──
function onFoodSelectChange(e) {
  const sel = e.target;
  const mi = parseInt(sel.dataset.meal);
  const si = parseInt(sel.dataset.slot);
  const slot = state.meals[mi].slots[si];
  const resultEl = document.getElementById(`result-${mi}-${si}`);

  if (sel.value === '') {
    slot.selectedFood = null;
    slot.quantity = 0;
    resultEl.style.display = 'none';
    // Recalculate other slots of this meal
    recalcMealSlots(mi);
    updateRecapBar(state.meals);
    return;
  }

  const foods = filterFoods(slot.dbCategory, {
    allergies: state.allergies,
    diet: state.diet,
    excludedIds: state.excludedFoods,
  });
  const food = foods.find(f => f.id === sel.value);
  if (!food) return;

  slot.selectedFood = food;
  // Initial quantity (will be adjusted)
  slot.quantity = MealPlanner.calculateQuantity(food, slot.macro, slot.target);

  // Recalculate all slots of this meal for cross-macro compensation
  recalcMealSlots(mi);

  // Update display for all slots of this meal
  updateMealSlotDisplays(mi);

  updateRecapBar(state.meals);
  Storage.save(state);
}

/**
 * Recalcule les quantités de tous les slots d'un repas
 * en tenant compte des contributions croisées entre macros
 */
function recalcMealSlots(mealIndex) {
  const meal = state.meals[mealIndex];
  const activeSlots = meal.slots.filter(s => !s.isVeg && s.selectedFood);
  if (activeSlots.length === 0) return;
  MealPlanner._solveQuantities(activeSlots, meal);
}

/**
 * Met à jour l'affichage de tous les result-box d'un repas
 */
function updateMealSlotDisplays(mealIndex) {
  const meal = state.meals[mealIndex];

  meal.slots.forEach((slot, si) => {
    if (slot.isVeg) return;
    const resultEl = document.getElementById(`result-${mealIndex}-${si}`);
    if (!resultEl) return;

    if (!slot.selectedFood) {
      resultEl.style.display = 'none';
      return;
    }

    // Use the same helper as fixed mode but without swap button
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = buildResultBoxHTML(slot, mealIndex, si, false);
    const newBox = tempDiv.firstElementChild;

    resultEl.innerHTML = newBox.innerHTML;
    resultEl.style.display = 'block';
    resultEl.style.animation = 'none';
    resultEl.offsetHeight;
    resultEl.style.animation = '';
  });
}

// ── SWAP / REGENERATE (fixed mode) ──
/**
 * Skip/unskip un slot et redistribue les macros sur les autres slots du repas
 */
function toggleSkipSlot(mealIndex, slotIndex) {
  const meals = getCurrentMeals();
  if (!meals || !meals[mealIndex]) return;
  const meal = meals[mealIndex];
  const slot = meal.slots[slotIndex];
  slot.skipped = !slot.skipped;

  if (slot.skipped) {
    // Redistribuer les macros de ce slot sur les autres slots actifs du même type
    slot.selectedFood = null;
    slot.quantity = 0;
  }

  // Recalculer les targets en excluant les slots skippés
  redistributeMealMacros(meal);

  // Recalculer les quantités
  const activeSlots = meal.slots.filter(s => !s.isVeg && !s.skipped && s.selectedFood);
  MealPlanner._solveQuantities(activeSlots, meal);

  // En mode fixe, regénérer les aliments pour les slots non-skippés qui n'ont pas d'aliment
  if (state.planMode === 'fixed') {
    const constraints = { allergies: state.allergies, diet: state.diet, excludedIds: state.excludedFoods };
    meal.slots.forEach(s => {
      if (!s.isVeg && !s.skipped && !s.selectedFood) {
        MealPlanner.regenerateSlot(s, constraints, null);
      }
    });
    // Re-solve after regeneration
    const newActive = meal.slots.filter(s => !s.isVeg && !s.skipped && s.selectedFood);
    MealPlanner._solveQuantities(newActive, meal);
  }

  // Re-render
  const constraints = { allergies: state.allergies, diet: state.diet, excludedIds: state.excludedFoods };
  if (state.planDays === 7 && state.weekMeals) {
    renderDayContent(state._currentDay || 0, constraints);
  } else {
    renderPlan(state.meals, constraints);
  }
  updateRecapBar(meals);
  Storage.save(state);
}

/**
 * Redistribue les macros d'un repas quand des slots sont skippés.
 * Recalcule TOUT depuis les targets originaux du repas pour éviter les dérives.
 */
function redistributeMealMacros(meal) {
  // D'abord, reset les targets depuis les originaux du repas
  const totalProt = meal.macroDisplay.prot;
  const totalGluc = meal.macroDisplay.gluc;
  const totalLip = meal.macroDisplay.lip;

  // Compter les slots actifs par macro
  const activeByMacro = { prot: [], gluc: [], lip: [] };
  const skippedByMacro = { prot: 0, gluc: 0, lip: 0 };

  meal.slots.forEach(slot => {
    if (slot.isVeg) return;
    if (slot.skipped) {
      if (slot.macro) skippedByMacro[slot.macro] += slot._originalTarget || slot.target;
    } else {
      if (slot.macro) activeByMacro[slot.macro].push(slot);
    }
  });

  // Redistribuer chaque macro sur les slots actifs
  ['prot', 'gluc', 'lip'].forEach(macro => {
    const total = macro === 'prot' ? totalProt : macro === 'gluc' ? totalGluc : totalLip;
    const active = activeByMacro[macro];

    if (active.length > 0) {
      const perSlot = Math.round(total / active.length);
      active.forEach(slot => { slot.target = perSlot; });
    } else {
      // Tous les slots de ce macro sont skippés → convertir en calories sur un autre macro
      const kcalFreed = macro === 'lip' ? total * 9 : total * 4;
      // Préférer les glucides, sinon les lipides
      const fallbackMacro = macro === 'gluc' ? 'lip' : 'gluc';
      const fallbackSlots = activeByMacro[fallbackMacro];
      if (fallbackSlots.length > 0) {
        const extraPerSlot = Math.round((kcalFreed / (fallbackMacro === 'lip' ? 9 : 4)) / fallbackSlots.length);
        fallbackSlots.forEach(slot => { slot.target += extraPerSlot; });
      }
    }
  });
}

function _reRender(constraints) {
  if (state.planDays === 7 && state.weekMeals) {
    const day = state._currentDay || 0;
    updateRecapBar(state.weekMeals[day]);
    renderDayContent(day, constraints);
  } else {
    updateRecapBar(state.meals);
    renderPlan(state.meals, constraints);
  }
  Storage.save(state);
}

function swapFood(mealIndex, slotIndex) {
  const meals = getCurrentMeals();
  if (!meals || !meals[mealIndex]) return;
  const meal = meals[mealIndex];
  const slot = meal.slots[slotIndex];
  if (!slot) return;
  const oldId = slot.selectedFood ? slot.selectedFood.id : null;
  const constraints = {
    allergies: state.allergies,
    diet: state.diet,
    excludedIds: state.excludedFoods,
  };
  MealPlanner.regenerateSlot(slot, constraints, oldId);
  const activeSlots = meal.slots.filter(s => !s.isVeg && !s.skipped && s.selectedFood);
  MealPlanner._solveQuantities(activeSlots, meal);
  _reRender(constraints);
}

function regenerateMeal(mealIndex) {
  const meals = getCurrentMeals();
  if (!meals || !meals[mealIndex]) return;
  const meal = meals[mealIndex];
  const constraints = {
    allergies: state.allergies,
    diet: state.diet,
    excludedIds: state.excludedFoods,
  };
  meal.slots.forEach(slot => {
    if (!slot.isVeg && !slot.skipped) {
      MealPlanner.regenerateSlot(slot, constraints, null);
    }
  });
  const activeSlots = meal.slots.filter(s => !s.isVeg && !s.skipped && s.selectedFood);
  MealPlanner._solveQuantities(activeSlots, meal);
  _reRender(constraints);
}

function regenerateAll() {
  const constraints = {
    allergies: state.allergies,
    diet: state.diet,
    excludedIds: state.excludedFoods,
  };
  if (state.planDays === 7 && state.weekMeals) {
    state.weekMeals.forEach(dayMeals => {
      MealPlanner.generateFixedPlan(dayMeals, constraints);
    });
  } else {
    MealPlanner.generateFixedPlan(state.meals, constraints);
  }
  _reRender(constraints);
}

// ── RECAP BAR ──
function updateRecapBar(meals) {
  if (!state.results) return;
  const totals = MealPlanner.computeDayTotals(meals);
  const targets = {
    kcal: state.results.targetCals,
    prot: state.results.macros.protein,
    gluc: state.results.macros.carbs,
    lip: state.results.macros.fat,
  };

  ['kcal', 'prot', 'gluc', 'lip'].forEach(key => {
    const valEl = document.getElementById('recap-' + key);
    const barEl = document.getElementById('bar-' + key);
    const targetEl = document.getElementById('target-' + key);
    if (valEl) {
      valEl.textContent = totals[key];
      valEl.className = 'recap-value' + (totals[key] === 0 ? ' empty' : '');
    }
    if (barEl) {
      const pct = Math.min(100, Math.round((totals[key] / targets[key]) * 100));
      barEl.style.width = pct + '%';
    }
    if (targetEl) {
      targetEl.textContent = '/ ' + targets[key] + (key === 'kcal' ? '' : 'g');
    }
  });
}

// ── SUMMARY (Step 5) ──
function renderSummary() {
  if (!state.results || !state.meals) return;
  const r = state.results;
  const totals = MealPlanner.computeDayTotals(state.meals);

  const summaryEl = document.getElementById('summaryContent');
  if (!summaryEl) return;

  let html = `<div class="summary-section">
    <h3>Ton profil</h3>
    <div class="summary-row"><span>Sexe</span><strong>${state.sex === 'male' ? 'Homme' : 'Femme'}</strong></div>
    <div class="summary-row"><span>Âge</span><strong>${state.age} ans</strong></div>
    <div class="summary-row"><span>Taille</span><strong>${state.height} cm</strong></div>
    <div class="summary-row"><span>Poids</span><strong>${state.weight} kg</strong></div>
    <div class="summary-row"><span>Masse grasse estimée</span><strong>${r.bodyFat.toFixed(1)}%</strong></div>
  </div>`;

  html += `<div class="summary-section">
    <h3>Tes résultats métaboliques</h3>
    <div class="summary-row"><span>Métabolisme de base (BMR)</span><strong>${r.bmr.toLocaleString('fr-FR')} kcal</strong></div>
    <div class="summary-row"><span>Dépense totale (TDEE)</span><strong>${r.tdee.toLocaleString('fr-FR')} kcal</strong></div>
    <div class="summary-row accent"><span>Calories cibles</span><strong>${r.targetCals.toLocaleString('fr-FR')} kcal</strong></div>
    <div class="summary-row"><span>Protéines</span><strong>${r.macros.protein}g</strong></div>
    <div class="summary-row"><span>Glucides</span><strong>${r.macros.carbs}g</strong></div>
    <div class="summary-row"><span>Lipides</span><strong>${r.macros.fat}g</strong></div>
  </div>`;

  html += `<div class="summary-section">
    <h3>Ton plan alimentaire</h3>
    <div class="summary-row"><span>Mode</span><strong>${state.planMode === 'fixed' ? 'Plan fixe' : 'Équivalences (flexible)'}</strong></div>
    <div class="summary-row"><span>Nombre de repas</span><strong>${state.mealCount} repas/jour</strong></div>
  </div>`;

  // Meal details
  function renderMealsSummary(meals, dayLabel) {
    let mhtml = '';
    if (dayLabel) {
      mhtml += `<div class="summary-section"><h3>${dayLabel}</h3>`;
    }
    meals.forEach(meal => {
      mhtml += `<div class="summary-meal">
        <h4>${meal.icon} ${meal.name}</h4>`;
      meal.slots.forEach(slot => {
        if (slot.isVeg) {
          mhtml += `<div class="summary-food"><span class="slot-dot-small" style="background:${slot.color}"></span> Légumes — 200g minimum</div>`;
        } else if (slot.selectedFood) {
          const qty = MealPlanner.formatQuantity(slot.selectedFood, slot.quantity);
          mhtml += `<div class="summary-food"><span class="slot-dot-small" style="background:${slot.color}"></span> ${qty} ${slot.selectedFood.name}</div>`;
        }
      });
      mhtml += '</div>';
    });
    if (dayLabel) mhtml += '</div>';
    return mhtml;
  }

  if (state.planDays === 7 && state.weekMeals) {
    for (let d = 0; d < 7; d++) {
      html += renderMealsSummary(state.weekMeals[d], DAY_NAMES[d]);
    }
  } else {
    html += renderMealsSummary(state.meals, null);
  }

  summaryEl.innerHTML = html;

  // Générer la liste de courses
  renderShoppingList();
}

// ── LISTE DE COURSES ──
const SHOPPING_CATEGORIES = {
  protein: { label: 'Viandes, poissons & protéines', icon: '🥩', order: 1 },
  carb:    { label: 'Féculents & céréales',          icon: '🌾', order: 2 },
  fruit:   { label: 'Fruits',                         icon: '🍎', order: 3 },
  vegetable: { label: 'Légumes',                      icon: '🥬', order: 4 },
  fat:     { label: 'Matières grasses & fromages',    icon: '🧈', order: 5 },
  other:   { label: 'Autres',                          icon: '📦', order: 6 },
};

function renderShoppingList() {
  const wrap = document.getElementById('shoppingListWrap');
  const listEl = document.getElementById('shoppingList');
  if (!wrap || !listEl) return;

  const allMeals = state.planDays === 7 && state.weekMeals
    ? state.weekMeals.flat()
    : state.meals;

  if (!allMeals || allMeals.length === 0) { wrap.style.display = 'none'; return; }

  // Agréger les aliments par ID
  const items = {};
  const multiplier = state.planDays === 7 ? 1 : 7; // Si jour type, multiplier par 7

  allMeals.forEach(meal => {
    meal.slots.forEach(slot => {
      if (slot.isVeg) {
        // Légumes : juste rappeler d'en acheter
        if (!items['legumes_variés']) {
          items['legumes_variés'] = {
            name: 'Légumes variés (à volonté)',
            category: 'vegetable',
            totalQty: 0,
            unit: '',
            note: 'Brocoli, courgette, haricots verts, épinards, tomates, poivrons...'
          };
        }
        return;
      }
      if (!slot.selectedFood) return;

      const id = slot.selectedFood.id;
      if (!items[id]) {
        items[id] = {
          name: slot.selectedFood.name,
          category: slot.dbCategory || 'other',
          totalQty: 0,
          unit: slot.selectedFood.unit || 'g',
          unitWeight: slot.selectedFood.unitWeight || null,
        };
      }
      items[id].totalQty += slot.quantity;
    });
  });

  // Multiplier par 7 si plan jour type
  if (state.planDays !== 7) {
    Object.values(items).forEach(item => {
      if (item.totalQty > 0) item.totalQty *= 7;
    });
  }

  // Grouper par catégorie
  const groups = {};
  Object.entries(items).forEach(([id, item]) => {
    const cat = item.category;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push({ id, ...item });
  });

  // Trier les groupes par ordre
  const sortedCats = Object.keys(groups).sort((a, b) =>
    (SHOPPING_CATEGORIES[a]?.order || 99) - (SHOPPING_CATEGORIES[b]?.order || 99)
  );

  let html = '';
  sortedCats.forEach(cat => {
    const catInfo = SHOPPING_CATEGORIES[cat] || SHOPPING_CATEGORIES.other;
    html += `<div class="shop-category">
      <div class="shop-cat-header">${catInfo.icon} ${catInfo.label}</div>`;

    groups[cat].sort((a, b) => a.name.localeCompare(b.name));
    groups[cat].forEach(item => {
      let qtyDisplay = '';
      if (item.totalQty > 0) {
        if (item.unitWeight && item.unit !== 'g') {
          const units = Math.ceil(item.totalQty / item.unitWeight);
          const unitLabel = item.unit === 'egg' ? (units > 1 ? 'oeufs' : 'oeuf') :
                           item.unit === 'dose' ? (units > 1 ? 'doses' : 'dose') :
                           item.unit + (units > 1 ? 's' : '');
          qtyDisplay = `~${Math.round(item.totalQty)}g (${units} ${unitLabel})`;
        } else {
          // Arrondir aux 50g pour des courses réalistes
          const rounded = Math.ceil(item.totalQty / 50) * 50;
          qtyDisplay = `~${rounded}g`;
        }
      }

      html += `<label class="shop-item">
        <input type="checkbox" class="shop-check">
        <span class="shop-name">${item.name}</span>
        ${qtyDisplay ? `<span class="shop-qty">${qtyDisplay}</span>` : ''}
        ${item.note ? `<span class="shop-note">${item.note}</span>` : ''}
      </label>`;
    });

    html += '</div>';
  });

  listEl.innerHTML = html;
  wrap.style.display = 'block';
}

function copyShoppingList() {
  const allMeals = state.planDays === 7 && state.weekMeals
    ? state.weekMeals.flat()
    : state.meals;

  const items = {};
  allMeals.forEach(meal => {
    meal.slots.forEach(slot => {
      if (slot.isVeg || !slot.selectedFood) return;
      const id = slot.selectedFood.id;
      if (!items[id]) items[id] = { name: slot.selectedFood.name, qty: 0 };
      items[id].qty += slot.quantity;
    });
  });

  if (state.planDays !== 7) {
    Object.values(items).forEach(i => { i.qty *= 7; });
  }

  let text = '🛒 LISTE DE COURSES — AH Coaching\n';
  text += `Plan ${state.planDays === 7 ? 'semaine' : 'jour type (x7)'}\n\n`;
  Object.values(items).sort((a, b) => a.name.localeCompare(b.name)).forEach(item => {
    const rounded = Math.ceil(item.qty / 50) * 50;
    text += `☐ ${item.name} — ~${rounded}g\n`;
  });
  text += '\n☐ Légumes variés — à volonté\n';
  text += '\nGénéré par AH Coaching\n';

  navigator.clipboard.writeText(text).then(() => {
    const fb = document.getElementById('shopCopyFeedback');
    fb.style.display = 'block';
    setTimeout(() => { fb.style.display = 'none'; }, 3000);
  });
}

// ── EXPORT PDF LISTE DE COURSES ──
function exportShoppingPDF() {
  const allMeals = state.planDays === 7 && state.weekMeals
    ? state.weekMeals.flat()
    : state.meals;

  // Collecter les items
  const items = {};
  allMeals.forEach(meal => {
    meal.slots.forEach(slot => {
      if (slot.isVeg || !slot.selectedFood || slot.skipped) return;
      const id = slot.selectedFood.id;
      if (!items[id]) {
        items[id] = {
          name: slot.selectedFood.name,
          category: slot.dbCategory || 'other',
          qty: 0,
          unit: slot.selectedFood.unit || 'g',
          unitWeight: slot.selectedFood.unitWeight || null,
        };
      }
      items[id].qty += slot.quantity;
    });
  });

  if (state.planDays !== 7) {
    Object.values(items).forEach(i => { i.qty *= 7; });
  }

  // Grouper par catégorie
  const groups = {};
  Object.values(items).forEach(item => {
    const cat = item.category;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  });

  const catOrder = ['protein', 'carb', 'fruit', 'vegetable', 'fat', 'other'];
  const catLabels = {
    protein: '🥩 Viandes, poissons & protéines',
    carb: '🌾 Féculents & céréales',
    fruit: '🍎 Fruits',
    vegetable: '🥬 Légumes',
    fat: '🧈 Matières grasses & fromages',
    other: '📦 Autres',
  };

  let tableRows = '';
  catOrder.forEach(cat => {
    if (!groups[cat]) return;
    tableRows += `<tr class="cat-row"><td colspan="3">${catLabels[cat] || cat}</td></tr>`;
    groups[cat].sort((a, b) => a.name.localeCompare(b.name)).forEach(item => {
      let qtyDisplay = '';
      if (item.qty > 0) {
        const rounded = Math.ceil(item.qty / 50) * 50;
        qtyDisplay = `~${rounded}g`;
        if (item.unitWeight && item.unit !== 'g') {
          const units = Math.ceil(item.qty / item.unitWeight);
          const unitLabel = item.unit === 'egg' ? (units > 1 ? 'oeufs' : 'oeuf') : item.unit + (units > 1 ? 's' : '');
          qtyDisplay += ` (${units} ${unitLabel})`;
        }
      }
      tableRows += `<tr><td class="check">☐</td><td>${item.name}</td><td class="qty">${qtyDisplay}</td></tr>`;
    });
  });
  // Légumes
  tableRows += `<tr class="cat-row"><td colspan="3">🥬 Légumes</td></tr>`;
  tableRows += `<tr><td class="check">☐</td><td>Légumes variés (à volonté)</td><td class="qty">Brocoli, courgette, épinards, tomates…</td></tr>`;

  const htmlContent = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Liste de courses — AH Coaching</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'DM Sans', sans-serif; padding: 40px; max-width: 700px; margin: 0 auto; color: #2C2420; }
  .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #6B4F3A; }
  .header h1 { font-family: 'Playfair Display', serif; font-size: 24px; color: #4A3628; }
  .header p { font-size: 13px; color: #6B4F3A; margin-top: 4px; }
  .header .meta { font-size: 11px; color: #9B9590; margin-top: 8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  tr { border-bottom: 1px solid #E8E0D8; }
  td { padding: 8px 6px; font-size: 13px; vertical-align: middle; }
  .check { width: 24px; font-size: 16px; text-align: center; }
  .qty { text-align: right; font-weight: 600; color: #6B4F3A; font-size: 12px; white-space: nowrap; }
  .cat-row td { font-weight: 700; font-size: 14px; color: #6B4F3A; padding-top: 18px; border-bottom: 2px solid #D4A574; background: #FDFBF9; }
  .footer { text-align: center; margin-top: 30px; padding-top: 16px; border-top: 1px solid #E8E0D8; font-size: 10px; color: #9B9590; }
  @media print { body { padding: 20px; } }
</style></head><body>
<div class="header">
  <h1>🛒 Liste de courses</h1>
  <p>AH Coaching — Arthur Hénon & Mathilde Vion</p>
  <div class="meta">Plan ${state.planDays === 7 ? 'semaine' : 'jour type (x7)'} · ${state.results?.targetCals || '—'} kcal/jour · Généré le ${new Date().toLocaleDateString('fr-FR')}</div>
</div>
<table>${tableRows}</table>
<div class="footer">
  <p>Coche chaque article au fur et à mesure de tes achats.</p>
  <p style="margin-top:4px">Ce document a été généré automatiquement par AH Coaching.</p>
</div>
</body></html>`;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.onload = () => { printWindow.print(); };
}

// ── SUGGESTIONS DE RECETTES ──
// matchIngredients = IDs from our nutrition-db.js that match the recipe
const RECIPE_BASE_URL = 'https://arthurhenon2001-ctrl.github.io/ah-coaching-recettes/recipe.html?id=';
const RECIPE_SUGGESTIONS = [
  { id: 'overnight-oats-proteine', name: 'Overnight Oats Protéiné', emoji: '🥣', category: 'Petit-déjeuner', time: 5, tags: ['Meal prep', 'Perte de poids'], matchIngredients: ['skyr', 'avoine'] },
  { id: 'pancakes-banane-avoine', name: 'Pancakes Banane-Avoine', emoji: '🥞', category: 'Petit-déjeuner', time: 15, tags: ['Sans farine', 'Rapide'], matchIngredients: ['banane', 'avoine', 'oeuf'] },
  { id: 'porridge-pomme-cannelle', name: 'Porridge Pomme Cannelle', emoji: '🥣', category: 'Petit-déjeuner', time: 10, tags: ['Chaud', 'Réconfortant'], matchIngredients: ['avoine', 'pomme'] },
  { id: 'french-toast-proteine', name: 'French Toast Protéiné', emoji: '🍞', category: 'Petit-déjeuner', time: 15, tags: ['Gourmand', 'Haute protéine'], matchIngredients: ['pain_complet', 'oeuf', 'blanc_oeuf'] },
  { id: 'bol-skyr-fruits-rouges', name: 'Bol Skyr Fruits Rouges', emoji: '🫐', category: 'Petit-déjeuner', time: 5, tags: ['Express', 'Sans cuisson'], matchIngredients: ['skyr', 'fruits_rouges', 'avoine'] },
  { id: 'omelette-express', name: 'Omelette Express', emoji: '🥚', category: 'Petit-déjeuner salé', time: 10, tags: ['Low carb', 'Express'], matchIngredients: ['oeuf', 'blanc_oeuf'] },
  { id: 'tartine-avocat-oeuf', name: 'Tartine Avocat Œuf', emoji: '🥑', category: 'Petit-déjeuner salé', time: 10, tags: ['Complet', 'Tendance'], matchIngredients: ['pain_complet', 'avocat', 'oeuf'] },
  { id: 'wrap-oeuf-dinde', name: 'Wrap Œuf Dinde', emoji: '🌯', category: 'Petit-déjeuner salé', time: 10, tags: ['Express', 'À emporter'], matchIngredients: ['tortilla', 'oeuf', 'dinde'] },
  { id: 'wrap-poulet-avocat', name: 'Wrap Poulet Avocat', emoji: '🌯', category: 'Déjeuner', time: 10, tags: ['Express', 'À emporter'], matchIngredients: ['tortilla', 'poulet', 'avocat', 'haricots_noirs'] },
  { id: 'poke-bowl-saumon', name: 'Poké Bowl Saumon', emoji: '🐟', category: 'Déjeuner', time: 20, tags: ['Frais', 'Oméga 3'], matchIngredients: ['saumon', 'riz_blanc', 'avocat'] },
  { id: 'buddha-bowl-quinoa', name: 'Buddha Bowl Quinoa', emoji: '🥗', category: 'Déjeuner', time: 25, tags: ['Veggie', 'Complet'], matchIngredients: ['quinoa', 'pois_chiches', 'avocat'] },
  { id: 'poulet-curry-riz', name: 'Poulet Curry Riz', emoji: '🍛', category: 'Déjeuner', time: 25, tags: ['Épicé', 'Batch cooking'], matchIngredients: ['poulet', 'riz_blanc', 'riz_complet'] },
  { id: 'pasta-bolognese', name: 'Pasta Bolognese', emoji: '🍝', category: 'Déjeuner', time: 30, tags: ['Classique', 'Batch cooking'], matchIngredients: ['pates', 'boeuf_5', 'boeuf_bavette'] },
  { id: 'salade-cesar-poulet', name: 'Salade César Poulet', emoji: '🥗', category: 'Déjeuner', time: 15, tags: ['Fraîche', 'Haute protéine'], matchIngredients: ['poulet', 'pain_complet', 'yaourt_grec'] },
  { id: 'wok-nouilles-poulet', name: 'Wok Nouilles Poulet', emoji: '🍜', category: 'Déjeuner', time: 20, tags: ['Asiatique', 'Rapide'], matchIngredients: ['soba', 'poulet'] },
  { id: 'chili-con-carne', name: 'Chili Con Carne', emoji: '🌶', category: 'Déjeuner', time: 30, tags: ['Épicé', 'Batch cooking'], matchIngredients: ['boeuf_5', 'haricots_rouges', 'haricots_noirs'] },
  { id: 'steak-patate-douce', name: 'Steak & Patate douce', emoji: '🥩', category: 'Dîner', time: 25, tags: ['Classique', 'Complet'], matchIngredients: ['boeuf_5', 'boeuf_bavette', 'patate_douce'] },
  { id: 'saumon-grille-brocoli', name: 'Saumon grillé Brocoli', emoji: '🐟', category: 'Dîner', time: 20, tags: ['Oméga 3', 'Simple'], matchIngredients: ['saumon', 'riz_blanc', 'riz_complet'] },
  { id: 'cabillaud-papillote', name: 'Cabillaud en papillote', emoji: '🐠', category: 'Dîner', time: 25, tags: ['Léger', 'Sain'], matchIngredients: ['cabillaud'] },
  { id: 'smoothie-proteine-banane', name: 'Smoothie Protéiné', emoji: '🥤', category: 'Collation', time: 5, tags: ['Post-training', 'Express'], matchIngredients: ['whey', 'banane', 'fruits_rouges'] },
  { id: 'energy-balls-chocolat', name: 'Energy Balls Chocolat', emoji: '🍫', category: 'Collation', time: 15, tags: ['Snack', 'Sans cuisson'], matchIngredients: ['avoine', 'beurre_cacahuete'] },
  { id: 'pudding-chia-coco', name: 'Pudding Chia Coco', emoji: '🥥', category: 'Collation', time: 5, tags: ['Meal prep', 'Vegan'], matchIngredients: ['graines_chia'] },
  { id: 'galette-sarrasin-complete', name: 'Galette Sarrasin Complète', emoji: '🥞', category: 'Dîner', time: 15, tags: ['Sans gluten', 'Français'], matchIngredients: ['galette_sarrasin', 'oeuf', 'jambon', 'fromage_rape'] },
  { id: 'bowl-sale-cottage', name: 'Bowl Salé Cottage', emoji: '🥗', category: 'Déjeuner', time: 10, tags: ['Express', 'Frais'], matchIngredients: ['cottage', 'avocat'] },
  { id: 'croque-monsieur-healthy', name: 'Croque-monsieur Healthy', emoji: '🥪', category: 'Dîner', time: 15, tags: ['Gourmand', 'Rapide'], matchIngredients: ['pain_mie', 'jambon', 'fromage_rape'] },
];

function renderRecipeSuggestions() {
  const wrap = document.getElementById('recipeSuggestionsWrap');
  const container = document.getElementById('recipeSuggestions');
  if (!wrap || !container) return;

  // Collecter les IDs d'aliments utilisés dans le plan
  const allMeals = state.planDays === 7 && state.weekMeals
    ? state.weekMeals.flat()
    : state.meals;

  const usedFoodIds = new Set();
  allMeals.forEach(meal => {
    meal.slots.forEach(slot => {
      if (slot.selectedFood) usedFoodIds.add(slot.selectedFood.id);
    });
  });

  // Scorer chaque recette par nombre d'ingrédients matchés
  const scored = RECIPE_SUGGESTIONS.map(recipe => {
    const matches = recipe.matchIngredients.filter(id => usedFoodIds.has(id));
    return { ...recipe, score: matches.length, matchCount: matches.length };
  }).filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  if (scored.length === 0) { wrap.style.display = 'none'; return; }

  let html = '<div class="recipe-grid">';
  scored.forEach(recipe => {
    html += `<a href="${RECIPE_BASE_URL}${recipe.id}" target="_blank" rel="noopener" class="recipe-card-link">
      <div class="recipe-suggest-card">
        <div class="recipe-emoji">${recipe.emoji}</div>
        <div class="recipe-info">
          <div class="recipe-name">${recipe.name}</div>
          <div class="recipe-meta">${recipe.category} · ${recipe.time} min</div>
          <div class="recipe-tags">${recipe.tags.map(t => `<span class="recipe-tag">${t}</span>`).join('')}</div>
        </div>
        <div class="recipe-match">${recipe.matchCount} aliment${recipe.matchCount > 1 ? 's' : ''} de ton plan</div>
      </div>
    </a>`;
  });
  html += '</div>';

  html += `<a href="https://arthurhenon2001-ctrl.github.io/ah-coaching-recettes/" target="_blank" rel="noopener" class="all-recipes-link">
    Voir toutes les recettes (50+) →
  </a>`;

  container.innerHTML = html;
  wrap.style.display = 'block';
}

// ── EXPORT : IMPRIMER (natif browser → PDF via "Enregistrer en PDF") ──
function printPlan() {
  window.print();
}

// ── EXPORT : COPIER EN TEXTE ──
function copyPlanText() {
  if (!state.results) return;
  const r = state.results;

  let text = `PLAN ALIMENTAIRE PERSONNALISÉ\nAH Coaching — Arthur Hénon & Mathilde Vion\n`;
  text += `Généré le ${new Date().toLocaleDateString('fr-FR')}\n\n`;
  text += `═══ PROFIL ═══\n`;
  text += `Sexe : ${state.sex === 'male' ? 'Homme' : 'Femme'}\n`;
  text += `Âge : ${state.age} ans | Taille : ${state.height} cm | Poids : ${state.weight} kg\n`;
  text += `Masse grasse estimée : ${r.bodyFat.toFixed(1)}%\n\n`;
  text += `═══ RÉSULTATS MÉTABOLIQUES ═══\n`;
  text += `BMR : ${r.bmr} kcal | TDEE : ${r.tdee} kcal | Cible : ${r.targetCals} kcal\n`;
  text += `Protéines : ${r.macros.protein}g | Glucides : ${r.macros.carbs}g | Lipides : ${r.macros.fat}g\n`;
  if (state.targetWeight) {
    text += `Objectif : ${state.weight} kg → ${state.targetWeight} kg en ${state.weeks} semaines\n`;
  }
  text += '\n';

  function formatMeals(meals, dayLabel) {
    let t = '';
    if (dayLabel) t += `═══ ${dayLabel.toUpperCase()} ═══\n`;
    meals.forEach(meal => {
      t += `\n── ${meal.name} (~${meal.kcal} kcal) ──\n`;
      meal.slots.forEach(slot => {
        if (slot.isVeg) {
          t += `  Légumes — 200g minimum (à volonté)\n`;
        } else if (slot.selectedFood) {
          const qty = MealPlanner.formatQuantity(slot.selectedFood, slot.quantity);
          const actual = MealPlanner.computeActualMacros(slot.selectedFood, slot.quantity);
          t += `  ${qty} ${slot.selectedFood.name} (${Math.round(actual.kcal)} kcal | P:${actual.prot.toFixed(1)}g G:${actual.gluc.toFixed(1)}g L:${actual.lip.toFixed(1)}g)\n`;
        }
      });
    });
    return t;
  }

  text += `═══ PLAN ALIMENTAIRE ═══\n`;
  text += `Mode : ${state.planMode === 'fixed' ? 'Plan fixe' : 'Équivalences'} | ${state.mealCount} repas/jour\n`;

  if (state.planDays === 7 && state.weekMeals) {
    for (let d = 0; d < 7; d++) {
      text += '\n' + formatMeals(state.weekMeals[d], DAY_NAMES[d]);
    }
  } else {
    text += formatMeals(state.meals, null);
  }

  text += `\n──────────────────────────────\nCe plan est indicatif. Consultez un professionnel de santé pour tout besoin médical.\n`;

  navigator.clipboard.writeText(text).then(() => {
    const fb = document.getElementById('copyFeedback');
    fb.style.display = 'block';
    setTimeout(() => { fb.style.display = 'none'; }, 3000);
  });
}

// ── RESET ──
function resetAll() {
  if (confirm('Réinitialiser toutes les données ? Tu perdras ton profil et ton plan.')) {
    Storage.clear();
    location.reload();
  }
}
