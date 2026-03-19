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
};

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

  window.scrollTo({ top: 0, behavior: 'smooth' });
  Storage.save(state);
}

function nextStep() {
  if (state.currentStep <= TOTAL_STEPS) goToStep(state.currentStep + 1);
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

  const allFoods = [
    ...NUTRITION_DB.protein,
    ...NUTRITION_DB.carb,
    ...NUTRITION_DB.fat,
    ...NUTRITION_DB.fruit,
  ].sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  container.innerHTML = '';

  // Search input
  const searchWrap = document.createElement('div');
  searchWrap.className = 'excluded-search-wrap';
  searchWrap.innerHTML = '<input type="text" id="excludeSearch" placeholder="Rechercher un aliment..." class="form-input">';
  container.appendChild(searchWrap);

  const listWrap = document.createElement('div');
  listWrap.className = 'excluded-list';
  listWrap.id = 'excludeListInner';
  container.appendChild(listWrap);

  function renderList(filter = '') {
    const filtered = filter
      ? allFoods.filter(f => f.name.toLowerCase().includes(filter.toLowerCase()))
      : allFoods;

    listWrap.innerHTML = filtered.map(food => {
      const checked = state.excludedFoods.includes(food.id) ? 'checked' : '';
      return `<label class="exclude-item ${checked ? 'active' : ''}">
        <input type="checkbox" value="${food.id}" ${checked} class="exclude-check">
        <span>${food.name}</span>
      </label>`;
    }).join('');

    listWrap.querySelectorAll('.exclude-check').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) {
          if (!state.excludedFoods.includes(cb.value)) state.excludedFoods.push(cb.value);
        } else {
          state.excludedFoods = state.excludedFoods.filter(id => id !== cb.value);
        }
        cb.parentElement.classList.toggle('active', cb.checked);
        Storage.save(state);
      });
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
    html += `<div class="slot">`;
    html += `<div class="slot-header">
      <span class="slot-dot" style="background:${slot.color}"></span>
      <span class="slot-label">${slot.label}</span>`;
    if (!slot.isVeg && slot.target > 0) {
      const macroName = slot.macro === 'prot' ? 'protéines' : (slot.macro === 'gluc' ? 'glucides' : 'lipides');
      html += `<span class="slot-target-badge">${slot.target}g de ${macroName}</span>`;
    }
    html += '</div>';

    if (slot.isVeg) {
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
      const foods = filterFoods(slot.dbCategory, constraints);
      const selectId = `select-${mealIndex}-${si}`;
      html += `<select class="food-select" id="${selectId}" data-meal="${mealIndex}" data-slot="${si}">`;
      html += '<option value="">Choisis un aliment…</option>';
      foods.forEach((food, fi) => {
        html += `<option value="${food.id}">${food.name}</option>`;
      });
      html += '</select>';
      html += `<div class="result-box" id="result-${mealIndex}-${si}" style="display:none"></div>`;
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
function buildResultBoxHTML(slot, mealIndex, slotIndex, showSwap) {
  const food = slot.selectedFood;
  const quantity = slot.quantity;
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
function swapFood(mealIndex, slotIndex) {
  const slot = state.meals[mealIndex].slots[slotIndex];
  const oldId = slot.selectedFood ? slot.selectedFood.id : null;
  const constraints = {
    allergies: state.allergies,
    diet: state.diet,
    excludedIds: state.excludedFoods,
  };
  MealPlanner.regenerateSlot(slot, constraints, oldId);
  renderPlan(state.meals, constraints);
  Storage.save(state);
}

function regenerateMeal(mealIndex) {
  const meal = state.meals[mealIndex];
  const constraints = {
    allergies: state.allergies,
    diet: state.diet,
    excludedIds: state.excludedFoods,
  };
  meal.slots.forEach(slot => {
    if (!slot.isVeg) {
      MealPlanner.regenerateSlot(slot, constraints, null);
    }
  });
  renderPlan(state.meals, constraints);
  Storage.save(state);
}

function regenerateAll() {
  const constraints = {
    allergies: state.allergies,
    diet: state.diet,
    excludedIds: state.excludedFoods,
  };
  MealPlanner.generateFixedPlan(state.meals, constraints);
  renderPlan(state.meals, constraints);
  Storage.save(state);
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
    <div class="summary-row"><span>Mode</span><strong>${state.planMode === 'fixed' ? 'Plan fixe (auto)' : 'Équivalences (flexible)'}</strong></div>
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

  // Suggestions de recettes
  renderRecipeSuggestions();
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

// ── SUGGESTIONS DE RECETTES ──
const RECIPE_SUGGESTIONS = [
  {
    id: 'overnight-oats-proteine',
    name: 'Overnight Oats Protéiné',
    emoji: '🥣',
    category: 'Petit-déjeuner',
    time: 5,
    tags: ['Meal prep', 'Perte de poids'],
    matchIngredients: ['skyr', 'avoine'],
    url: 'https://arthurhenon2001-ctrl.github.io/ah-coaching-recettes/recipe.html?id=overnight-oats-proteine'
  },
  {
    id: 'pancakes-banane-avoine',
    name: 'Pancakes Banane-Avoine',
    emoji: '🥞',
    category: 'Petit-déjeuner',
    time: 15,
    tags: ['Sans farine', 'Rapide'],
    matchIngredients: ['banane', 'avoine', 'oeuf'],
    url: 'https://arthurhenon2001-ctrl.github.io/ah-coaching-recettes/recipe.html?id=pancakes-banane-avoine'
  },
  {
    id: 'bowl-poulet-quinoa',
    name: 'Bowl Poulet Quinoa',
    emoji: '🥗',
    category: 'Déjeuner',
    time: 25,
    tags: ['Haute protéine', 'Batch cooking'],
    matchIngredients: ['poulet', 'quinoa'],
    url: 'https://arthurhenon2001-ctrl.github.io/ah-coaching-recettes/recipe.html?id=bowl-poulet-quinoa'
  },
  {
    id: 'saumon-patate-douce',
    name: 'Saumon & Patate douce',
    emoji: '🐟',
    category: 'Dîner',
    time: 30,
    tags: ['Oméga 3', 'Complet'],
    matchIngredients: ['saumon', 'patate_douce'],
    url: 'https://arthurhenon2001-ctrl.github.io/ah-coaching-recettes/recipe.html?id=saumon-patate-douce'
  },
  {
    id: 'wrap-dinde-avocat',
    name: 'Wrap Dinde Avocat',
    emoji: '🌯',
    category: 'Déjeuner',
    time: 10,
    tags: ['Express', 'À emporter'],
    matchIngredients: ['dinde', 'avocat', 'tortilla'],
    url: 'https://arthurhenon2001-ctrl.github.io/ah-coaching-recettes/recipe.html?id=wrap-dinde-avocat'
  },
  {
    id: 'porridge-proteine',
    name: 'Porridge Protéiné',
    emoji: '🥣',
    category: 'Petit-déjeuner',
    time: 10,
    tags: ['Chaud', 'Réconfortant'],
    matchIngredients: ['avoine', 'whey', 'banane'],
    url: 'https://arthurhenon2001-ctrl.github.io/ah-coaching-recettes/recipe.html?id=porridge-proteine'
  },
  {
    id: 'salade-lentilles-chevre',
    name: 'Salade Lentilles & Chèvre',
    emoji: '🥗',
    category: 'Déjeuner',
    time: 15,
    tags: ['Végétarien', 'Rassasiant'],
    matchIngredients: ['lentilles', 'chevre'],
    url: 'https://arthurhenon2001-ctrl.github.io/ah-coaching-recettes/recipe.html?id=salade-lentilles-chevre'
  },
  {
    id: 'omelette-legumes',
    name: 'Omelette aux légumes',
    emoji: '🥚',
    category: 'Dîner',
    time: 10,
    tags: ['Low carb', 'Express'],
    matchIngredients: ['oeuf', 'blanc_oeuf'],
    url: 'https://arthurhenon2001-ctrl.github.io/ah-coaching-recettes/recipe.html?id=omelette-legumes'
  },
  {
    id: 'riz-boeuf-haricots',
    name: 'Riz Bœuf Haricots',
    emoji: '🍛',
    category: 'Déjeuner',
    time: 25,
    tags: ['Haute protéine', 'Batch cooking'],
    matchIngredients: ['boeuf_5', 'boeuf_bavette', 'riz_blanc', 'riz_complet', 'haricots_rouges'],
    url: 'https://arthurhenon2001-ctrl.github.io/ah-coaching-recettes/recipe.html?id=riz-boeuf-haricots'
  },
  {
    id: 'smoothie-proteine',
    name: 'Smoothie Protéiné',
    emoji: '🥤',
    category: 'Collation',
    time: 5,
    tags: ['Post-training', 'Express'],
    matchIngredients: ['whey', 'banane', 'fruits_rouges'],
    url: 'https://arthurhenon2001-ctrl.github.io/ah-coaching-recettes/recipe.html?id=smoothie-proteine'
  },
  {
    id: 'poke-bowl-cabillaud',
    name: 'Poké Bowl Cabillaud',
    emoji: '🐠',
    category: 'Déjeuner',
    time: 20,
    tags: ['Frais', 'Complet'],
    matchIngredients: ['cabillaud', 'riz_blanc', 'avocat'],
    url: 'https://arthurhenon2001-ctrl.github.io/ah-coaching-recettes/recipe.html?id=poke-bowl-cabillaud'
  },
  {
    id: 'pates-poulet-pesto',
    name: 'Pâtes Poulet Pesto',
    emoji: '🍝',
    category: 'Déjeuner',
    time: 20,
    tags: ['Gourmand', 'Batch cooking'],
    matchIngredients: ['poulet', 'pates'],
    url: 'https://arthurhenon2001-ctrl.github.io/ah-coaching-recettes/recipe.html?id=pates-poulet-pesto'
  },
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
    html += `<a href="${recipe.url}" target="_blank" rel="noopener" class="recipe-card-link">
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
