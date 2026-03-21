// ============================================================================
// CALCULATEUR MÉTABOLIQUE — AH Coaching
// Reprise et enrichissement de calculateur-metabolisme-ah/app.js
// ============================================================================

const ACTIVITY_TYPES = [
  { value: 'musculation',     label: 'Musculation',           met: 5.0 },
  { value: 'hiit',            label: 'HIIT',                  met: 8.0 },
  { value: 'crossfit',        label: 'CrossFit',              met: 8.0 },
  { value: 'running_easy',    label: 'Course (facile)',       met: 7.0 },
  { value: 'running_moderate',label: 'Course (modérée)',      met: 9.8 },
  { value: 'running_intense', label: 'Course (intense)',      met: 12.0 },
  { value: 'cycling_easy',    label: 'Vélo (facile)',         met: 4.0 },
  { value: 'cycling_moderate',label: 'Vélo (modéré)',         met: 6.8 },
  { value: 'cycling_intense', label: 'Vélo (intense)',        met: 10.0 },
  { value: 'swimming',        label: 'Natation',              met: 6.0 },
  { value: 'yoga',            label: 'Yoga',                  met: 2.5 },
  { value: 'pilates',         label: 'Pilates',               met: 3.0 },
  { value: 'walking_sport',   label: 'Randonnée',             met: 5.3 },
  { value: 'boxing',          label: 'Boxe / Arts martiaux', met: 7.8 },
  { value: 'dance',           label: 'Danse',                 met: 5.0 },
  { value: 'climbing',        label: 'Escalade',              met: 5.8 },
  { value: 'rowing',          label: 'Rameur / Aviron',       met: 7.0 },
  { value: 'tennis',          label: 'Tennis / Padel',        met: 7.3 },
  { value: 'football',        label: 'Football / Rugby',     met: 7.0 },
  { value: 'basketball',      label: 'Basketball',            met: 6.5 },
  { value: 'other',           label: 'Autre',                 met: 5.0 },
];

const Calculator = {

  estimateBodyFat(state) {
    const { sex, age, weight, height, waist, neck, hips, bodyFatKnown } = state;
    if (bodyFatKnown && bodyFatKnown > 0) return bodyFatKnown;

    // US Navy method
    if (waist && neck && (sex === 'male' || hips)) {
      if (sex === 'male') {
        const bf = 86.010 * Math.log10(waist - neck) - 70.041 * Math.log10(height) + 36.76;
        return Math.max(3, Math.min(50, bf));
      } else {
        const bf = 163.205 * Math.log10(waist + hips - neck) - 97.684 * Math.log10(height) - 78.387;
        return Math.max(8, Math.min(55, bf));
      }
    }

    // BMI-based fallback
    const bmi = weight / ((height / 100) ** 2);
    let bf;
    if (sex === 'male') {
      bf = 1.20 * bmi + 0.23 * age - 16.2;
    } else {
      bf = 1.20 * bmi + 0.23 * age - 5.4;
    }
    return Math.max(sex === 'male' ? 5 : 10, Math.min(50, bf));
  },

  calculateBMR(state, bodyFat, leanMass) {
    const { sex, age, height, weight, waist, neck, bodyFatKnown } = state;
    const hasBodyComp = bodyFatKnown || (waist && neck);

    // Mifflin-St Jeor
    let bmrMifflin;
    if (sex === 'male') {
      bmrMifflin = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmrMifflin = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // Katch-McArdle
    const bmrKatch = 370 + 21.6 * leanMass;

    let bmr;
    if (hasBodyComp) {
      bmr = bmrKatch * 0.7 + bmrMifflin * 0.3;
    } else {
      bmr = bmrMifflin;
    }

    // Health adjustments
    if (state.thyroid === 'hypo') bmr *= 0.92;
    else if (state.thyroid === 'hyper') bmr *= 1.08;
    if (state.menopause === 'yes') bmr *= 0.95;
    if (state.yoyo === 'some') bmr *= 0.97;
    else if (state.yoyo === 'many') bmr *= 0.93;

    return Math.round(bmr);
  },

  calculateNEAT(state) {
    const { stepsWork, stepsOff, workDays, walkPace, elevation, jobType, workHours, sittingHours, microBreaks, walkTransport, bikeTransport, weight } = state;
    const w = workDays || 5;
    const avgSteps = ((stepsWork || 0) * w + (stepsOff || 0) * (7 - w)) / 7;

    const paceMultiplier = { slow: 0.035, normal: 0.04, fast: 0.05 };
    const stepsCalories = avgSteps * (paceMultiplier[walkPace] || 0.04) * (weight / 70);

    const elevBonus = { never: 0, sometimes: 30, often: 70 };
    const elevCals = elevBonus[elevation] || 0;

    const jobMultipliers = { sedentary: 1.0, standing: 1.5, mix: 1.8, lightManual: 2.5, heavyManual: 3.5 };
    const jobMET = jobMultipliers[jobType] || 1.0;
    const jobHours = (workHours || 8) * (w / 7);
    const jobCalories = (jobMET - 1) * 1.05 * weight * jobHours / 7 * w / 7;

    const sittingPenalty = Math.max(0, ((sittingHours || 8) - 6) * 15);
    const breakBonus = { 'never': 0, '1-2': 15, '3-5': 35, '6+': 60 };
    const breakCals = breakBonus[microBreaks] || 0;

    const walkTransCals = (walkTransport || 0) * 3.5 * weight / 200;
    const bikeTransCals = (bikeTransport || 0) * 5.5 * weight / 200;

    return Math.round(stepsCalories + elevCals + jobCalories - sittingPenalty + breakCals + walkTransCals + bikeTransCals);
  },

  calculateEAT(state) {
    const { activities, weight } = state;
    if (!activities || activities.length === 0) return 0;
    let totalWeekly = 0;
    activities.forEach(act => {
      const intensityMultiplier = { light: 0.85, moderate: 1.0, hard: 1.15, very_hard: 1.3 };
      let met = act.met * (intensityMultiplier[act.intensity] || 1);
      totalWeekly += (met - 1) * weight * (act.duration / 60) * act.freq;
    });
    return Math.round(totalWeekly / 7);
  },

  calculateTEF(subtotal, dietType) {
    const tefPct = { mixed: 0.10, highProtein: 0.14, vegetarian: 0.09, vegan: 0.08, keto: 0.11, processed: 0.07 };
    return Math.round(subtotal * (tefPct[dietType] || 0.10));
  },

  calculateSleepAdjustment(bmr, sleepHours, sleepQuality) {
    let adj = 0;
    if (sleepHours < 6) adj -= bmr * 0.04;
    else if (sleepHours < 7) adj -= bmr * 0.015;
    else if (sleepHours > 9) adj -= bmr * 0.01;
    if (sleepQuality < 4) adj -= bmr * 0.02;
    else if (sleepQuality < 6) adj -= bmr * 0.01;
    return Math.round(adj);
  },

  calculateStressAdjustment(bmr, stress) {
    if (stress >= 8) return Math.round(bmr * 0.02);
    if (stress >= 6) return Math.round(bmr * 0.01);
    return 0;
  },

  /**
   * Calcule les calories cibles avec sécurités robustes
   * Règle n°1 : JAMAIS en dessous du BMR
   * Règle n°2 : Perte max adaptée au profil (sexe, poids)
   * Règle n°3 : Si trop bas → message prévention (augmenter activité)
   */
  calculateTargetCalories(tdee, goal, sex, weight, targetWeight, weeks, bmr) {
    if (goal === 'maintain') {
      return { targetCals: tdee, deficitPct: 0, warnings: [] };
    }
    if (goal === 'recomp') {
      return { targetCals: Math.round(tdee * 0.95), deficitPct: -5, warnings: [] };
    }

    const warnings = [];

    // Perte max par semaine selon le profil
    // Femmes : max 0.5-0.7% du poids/semaine
    // Hommes : max 0.7-1% du poids/semaine
    // Obèses (BMI>30) : peuvent aller un peu plus haut
    const bmi = weight / ((170 / 100) ** 2); // approximation si height non dispo
    let maxWeeklyLossPct;
    if (sex === 'female') {
      maxWeeklyLossPct = weight > 100 ? 0.007 : (weight > 80 ? 0.006 : 0.005);
    } else {
      maxWeeklyLossPct = weight > 110 ? 0.01 : (weight > 90 ? 0.008 : 0.007);
    }
    const maxWeeklyLoss = weight * maxWeeklyLossPct; // kg/semaine

    if (targetWeight && weeks) {
      const weeksDuration = parseInt(weeks) || 12;
      let weeklyChange = (weight - targetWeight) / weeksDuration; // positive = loss

      // Vérifier si la perte est trop rapide
      if (weeklyChange > maxWeeklyLoss && goal === 'cut') {
        const suggestedWeeks = Math.ceil((weight - targetWeight) / maxWeeklyLoss);
        warnings.push({
          type: 'too_aggressive',
          message: `Objectif trop rapide ! Perdre ${weeklyChange.toFixed(2)} kg/semaine est risqué pour ta santé${sex === 'female' ? ' (surtout pour les femmes)' : ''}. On recommande max ${maxWeeklyLoss.toFixed(2)} kg/semaine pour ton profil. Durée idéale : ${suggestedWeeks} semaines minimum.`,
          suggestedWeeks,
        });
        // Cap la perte au maximum sûr
        weeklyChange = maxWeeklyLoss;
      }

      const dailyDeficit = (weeklyChange * 7700) / 7;
      let targetCals = Math.round(tdee - dailyDeficit);

      // Plancher minimum viable : le plus haut entre (BMR + 200) et le minimum absolu
      const absoluteMin = sex === 'female' ? 1200 : 1400;
      const safeFloor = Math.max(absoluteMin, bmr + 200);

      if (targetCals < safeFloor && goal === 'cut') {
        // Calculer ce qui est réellement possible avec ce plancher
        const maxPossibleDeficit = tdee - safeFloor;
        const maxPossibleWeeklyLoss = (maxPossibleDeficit * 7) / 7700;

        if (maxPossibleDeficit <= 0) {
          // TDEE trop bas — impossible de créer un déficit sûr
          targetCals = tdee;
          warnings.push({
            type: 'impossible',
            message: `Cet objectif n'est pas réalisable dans tes conditions actuelles. Ta dépense (${tdee} kcal) est trop proche de ton métabolisme de base (${bmr} kcal) pour créer un déficit en sécurité. Tu dois d'abord augmenter ton activité physique (plus de pas, plus de séances, moins de sédentarité) pour augmenter ta dépense, et ensuite on pourra créer un déficit confortable.`,
          });
        } else {
          targetCals = safeFloor;
          const suggestedWeeksFromFloor = Math.ceil((weight - targetWeight) / maxPossibleWeeklyLoss);
          warnings.push({
            type: 'below_bmr',
            message: `Ton objectif initial nécessitait de manger en dessous de ton métabolisme de base (${bmr} kcal), ce qui est dangereux et contre-productif. On t'a mis à ${safeFloor} kcal (minimum viable). À ce rythme, tu peux perdre ~${maxPossibleWeeklyLoss.toFixed(2)} kg/semaine, soit ${suggestedWeeksFromFloor} semaines pour atteindre ton objectif. Pour aller plus vite, augmente ta dépense : ajoute 2 000 à 4 000 pas/jour ou une séance supplémentaire.`,
          });
        }
      }

      // Safety cap for bulk: never more than +25% TDEE
      if (goal === 'bulk') {
        targetCals = Math.min(Math.round(tdee * 1.25), targetCals);
      }

      const deficitPct = ((targetCals - tdee) / tdee) * 100;
      return { targetCals, deficitPct, warnings };
    }

    // Fallback: default -20% for cut, +10% for bulk
    if (goal === 'bulk') {
      const pct = sex === 'male' ? 0.10 : 0.08;
      return { targetCals: Math.round(tdee * (1 + pct)), deficitPct: pct * 100, warnings };
    }

    let fallbackCals = Math.round(tdee * 0.80);
    const fallbackFloor = Math.max(sex === 'female' ? 1200 : 1400, bmr + 200);
    if (fallbackCals < fallbackFloor) {
      fallbackCals = fallbackFloor;
      warnings.push({
        type: 'below_bmr',
        message: `Calories remontées à ${fallbackFloor} kcal (minimum viable au-dessus de ton BMR de ${bmr} kcal). Augmente ton activité pour créer un déficit plus confortable.`,
      });
    }
    const deficitPct = ((fallbackCals - tdee) / tdee) * 100;
    return { targetCals: fallbackCals, deficitPct, warnings };
  },

  calculateMacros(targetCals, leanMass, bodyFat, weight, sex, goal) {
    // Protein
    let proteinPerKgLean;
    if (goal === 'cut') {
      proteinPerKgLean = sex === 'male' ? (bodyFat > 25 ? 2.2 : 2.5) : (bodyFat > 32 ? 2.0 : 2.3);
    } else if (goal === 'bulk') {
      proteinPerKgLean = sex === 'male' ? 2.2 : 2.0;
    } else if (goal === 'recomp') {
      proteinPerKgLean = sex === 'male' ? 2.4 : 2.2;
    } else {
      proteinPerKgLean = sex === 'male' ? 1.8 : 1.6;
    }
    const protein = Math.round(proteinPerKgLean * leanMass);
    const proteinCals = protein * 4;

    // Fat
    let fatPerKg = sex === 'female' ? 1.0 : 0.9;
    if (goal === 'cut') fatPerKg = sex === 'female' ? 0.9 : 0.8;
    const fat = Math.round(fatPerKg * weight);
    const fatCals = fat * 9;

    // Carbs (remainder)
    const carbCals = Math.max(0, targetCals - proteinCals - fatCals);
    const carbs = Math.round(carbCals / 4);

    return { protein, fat, carbs, proteinCals, fatCals, carbCals };
  },

  /**
   * Calcul complet — point d'entrée principal
   * @returns {Object} Tous les résultats
   */
  compute(state) {
    const { sex, age, height, weight, goal, targetWeight, weeks, dietType, sleepHours, sleepQuality, stress } = state;
    if (!age || !height || !weight) return null;

    const bodyFat = this.estimateBodyFat(state);
    const leanMass = weight * (1 - bodyFat / 100);
    const fatMass = weight * (bodyFat / 100);

    const bmr = this.calculateBMR(state, bodyFat, leanMass);
    const neat = this.calculateNEAT(state);
    const eat = this.calculateEAT(state);
    const tef = this.calculateTEF(bmr + neat + eat, dietType);
    const sleepAdj = this.calculateSleepAdjustment(bmr, sleepHours || 7, sleepQuality || 7);
    const stressAdj = this.calculateStressAdjustment(bmr, stress || 4);

    const tdee = Math.round(bmr + neat + eat + tef + sleepAdj + stressAdj);
    const { targetCals, deficitPct, warnings } = this.calculateTargetCalories(tdee, goal, sex, weight, targetWeight, weeks, bmr);
    const macros = this.calculateMacros(targetCals, leanMass, bodyFat, weight, sex, goal);

    return {
      bodyFat, leanMass, fatMass,
      bmr, neat, eat, tef, sleepAdj, stressAdj,
      tdee, targetCals, deficitPct,
      macros, warnings: warnings || [],
      bmi: weight / ((height / 100) ** 2),
    };
  },
};
