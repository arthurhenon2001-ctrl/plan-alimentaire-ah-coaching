// ============================================================================
// GÉNÉRATEUR DE PLAN ALIMENTAIRE — AH Coaching
// ============================================================================

const MealPlanner = {

  // Répartition des macros par repas selon le nombre de repas
  DISTRIBUTIONS: {
    2: [
      { id: 'lunch',  name: 'Déjeuner', icon: '🍽', time: '12h — 13h', pct: 0.50, slots: ['protein', 'carb', 'vegetable', 'fat'] },
      { id: 'dinner', name: 'Dîner',    icon: '🌙', time: '19h — 20h30', pct: 0.50, slots: ['protein', 'carb', 'vegetable', 'fat'] },
    ],
    3: [
      { id: 'breakfast', name: 'Petit-déjeuner', icon: '☀️', time: '7h — 9h',     pct: 0.25, slots: ['protein', 'carb', 'fruit', 'fat'] },
      { id: 'lunch',     name: 'Déjeuner',       icon: '🍽', time: '12h — 13h',   pct: 0.40, slots: ['protein', 'carb', 'vegetable', 'fat'] },
      { id: 'dinner',    name: 'Dîner',           icon: '🌙', time: '19h — 20h30', pct: 0.35, slots: ['protein', 'carb', 'vegetable', 'fat'] },
    ],
    4: [
      { id: 'breakfast', name: 'Petit-déjeuner', icon: '☀️', time: '7h — 9h',     pct: 0.25, slots: ['protein', 'carb', 'fruit', 'fat'] },
      { id: 'lunch',     name: 'Déjeuner',       icon: '🍽', time: '12h — 13h',   pct: 0.35, slots: ['protein', 'carb', 'vegetable', 'fat'] },
      { id: 'snack',     name: 'Collation',       icon: '🍎', time: '16h — 17h',   pct: 0.10, slots: ['protein', 'fruit'] },
      { id: 'dinner',    name: 'Dîner',           icon: '🌙', time: '19h — 20h30', pct: 0.30, slots: ['protein', 'carb', 'vegetable', 'fat'] },
    ],
    5: [
      { id: 'breakfast',  name: 'Petit-déjeuner',  icon: '☀️', time: '7h — 9h',     pct: 0.20, slots: ['protein', 'carb', 'fruit', 'fat'] },
      { id: 'snack_am',   name: 'Collation matin', icon: '🥤', time: '10h — 10h30', pct: 0.10, slots: ['protein', 'fruit'] },
      { id: 'lunch',      name: 'Déjeuner',        icon: '🍽', time: '12h — 13h',   pct: 0.30, slots: ['protein', 'carb', 'vegetable', 'fat'] },
      { id: 'snack_pm',   name: 'Collation après-midi', icon: '🍎', time: '16h — 17h', pct: 0.10, slots: ['protein', 'fruit'] },
      { id: 'dinner',     name: 'Dîner',            icon: '🌙', time: '19h — 20h30', pct: 0.30, slots: ['protein', 'carb', 'vegetable', 'fat'] },
    ],
  },

  // Quel macro est ciblé par chaque type de slot
  SLOT_CONFIG: {
    protein:   { label: 'Protéine',        macro: 'prot', color: 'var(--red)',          dbCategory: 'protein' },
    carb:      { label: 'Féculent',        macro: 'gluc', color: 'var(--gold)',         dbCategory: 'carb' },
    fat:       { label: 'Matière grasse',  macro: 'lip',  color: 'var(--brown-light)',  dbCategory: 'fat' },
    fruit:     { label: 'Fruit',           macro: 'gluc', color: 'var(--green)',        dbCategory: 'fruit' },
    vegetable: { label: 'Légumes',         macro: null,   color: 'var(--green-dark)',   dbCategory: 'vegetable', isVeg: true },
  },

  /**
   * Construit la structure des repas avec les cibles macro par slot
   */
  buildMealStructure(macros, mealCount) {
    const dist = this.DISTRIBUTIONS[mealCount] || this.DISTRIBUTIONS[3];
    return dist.map(meal => {
      const mealProt = Math.round(macros.protein * meal.pct);
      const mealGluc = Math.round(macros.carbs * meal.pct);
      const mealLip  = Math.round(macros.fat * meal.pct);
      const mealKcal = mealProt * 4 + mealGluc * 4 + mealLip * 9;

      // Répartir les macros entre les slots du repas
      const slots = meal.slots.map(slotType => {
        const config = this.SLOT_CONFIG[slotType];
        let target = 0;

        if (config.isVeg) {
          target = 0; // légumes à volonté
        } else if (config.macro === 'prot') {
          target = mealProt;
        } else if (config.macro === 'gluc') {
          // Si le repas a fruit ET carb, on split les glucides
          const hasCarb = meal.slots.includes('carb');
          const hasFruit = meal.slots.includes('fruit');
          if (hasCarb && hasFruit) {
            target = slotType === 'carb' ? Math.round(mealGluc * 0.65) : Math.round(mealGluc * 0.35);
          } else {
            target = mealGluc;
          }
        } else if (config.macro === 'lip') {
          target = mealLip;
        }

        return {
          type: slotType,
          label: config.label,
          macro: config.macro,
          color: config.color,
          dbCategory: config.dbCategory,
          target,
          isVeg: config.isVeg || false,
          selectedFoodIndex: null,
          selectedFood: null,
          quantity: 0,
        };
      });

      return {
        ...meal,
        kcal: mealKcal,
        macroDisplay: { prot: mealProt, gluc: mealGluc, lip: mealLip },
        slots,
      };
    });
  },

  /**
   * Calcule la quantité d'un aliment pour atteindre un target de macro
   */
  calculateQuantity(food, macro, target) {
    const macroPer100 = macro === 'prot' ? food.prot : macro === 'gluc' ? food.gluc : food.lip;
    if (macroPer100 <= 0) return 0;
    return target / (macroPer100 / 100);
  },

  /**
   * Formate la quantité pour l'affichage (gère les unités spéciales)
   */
  formatQuantity(food, quantity) {
    if (food.unit === 'egg') {
      const count = Math.max(1, Math.round(quantity / food.unitWeight));
      return count + ' œuf' + (count > 1 ? 's' : '') + ' (~' + (count * food.unitWeight) + 'g)';
    }
    if (food.unit === 'dose') {
      const count = Math.max(1, Math.round(quantity / food.unitWeight));
      return count + ' dose' + (count > 1 ? 's' : '') + ' (~' + (count * food.unitWeight) + 'g)';
    }
    if (food.unit === 'tranche') {
      const count = Math.max(1, Math.round(quantity / food.unitWeight));
      return count + ' tranche' + (count > 1 ? 's' : '') + ' (~' + (count * food.unitWeight) + 'g)';
    }
    if (food.unit === 'tortilla') {
      const count = Math.max(1, Math.round(quantity / food.unitWeight));
      return count + ' tortilla' + (count > 1 ? 's' : '') + ' (~' + (count * food.unitWeight) + 'g)';
    }
    if (food.unit === 'galette') {
      const count = Math.max(1, Math.round(quantity / food.unitWeight));
      return count + ' galette' + (count > 1 ? 's' : '') + ' (~' + (count * food.unitWeight) + 'g)';
    }
    if (food.unit === 'pita') {
      const count = Math.max(1, Math.round(quantity / food.unitWeight));
      return count + ' pita' + (count > 1 ? 's' : '') + ' (~' + (count * food.unitWeight) + 'g)';
    }
    return Math.round(quantity) + 'g';
  },

  /**
   * Calcule les macros réels apportés par un aliment à une certaine quantité
   */
  computeActualMacros(food, quantity) {
    const ratio = quantity / 100;
    return {
      prot: food.prot * ratio,
      gluc: food.gluc * ratio,
      lip:  food.lip * ratio,
      kcal: food.kcal * ratio,
    };
  },

  // Quantités minimum par type de slot (en grammes d'aliment)
  MIN_QUANTITIES: {
    protein: 40,   // Au moins 40g de source protéinée
    carb: 30,      // Au moins 30g de féculent
    fat: 10,       // Au moins 10g de matière grasse (~1 c. à soupe)
    fruit: 80,     // Au moins 80g de fruit (~1 petit fruit)
  },

  /**
   * MODE FIXE : Génère automatiquement un plan avec des aliments aléatoires
   * Utilise un algorithme de résolution itérative qui garantit des quantités
   * réalistes et compense les macros croisées sans jamais descendre à 0g.
   */
  generateFixedPlan(meals, constraints) {
    const usedProteinIds = [];

    meals.forEach(meal => {
      // Passe 1 : sélection des aliments (sans calculer les quantités)
      const activeSlots = [];
      meal.slots.forEach(slot => {
        if (slot.isVeg) return;

        const availableFoods = filterFoods(slot.dbCategory, constraints)
          .filter(f => slot.dbCategory !== 'protein' || !usedProteinIds.includes(f.id));

        if (availableFoods.length === 0) return;

        const randomIndex = Math.floor(Math.random() * availableFoods.length);
        slot.selectedFood = availableFoods[randomIndex];

        if (slot.dbCategory === 'protein') {
          usedProteinIds.push(slot.selectedFood.id);
        }
        activeSlots.push(slot);
      });

      // Passe 2 : résolution itérative des quantités
      // On commence avec les quantités "naïves" puis on ajuste progressivement
      this._solveQuantities(activeSlots, meal);
    });

    return meals;
  },

  /**
   * Résout les quantités de chaque slot pour que les macros totaux du repas
   * correspondent aux cibles. Utilise une approche par priorité :
   * 1. D'abord le slot protéine (prioritaire)
   * 2. Puis compenser les macros secondaires (lip/gluc apportées par la protéine)
   * 3. Enfin ajuster les slots restants
   */
  _solveQuantities(activeSlots, meal) {
    if (activeSlots.length === 0) return;

    const targets = {
      prot: meal.macroDisplay.prot,
      gluc: meal.macroDisplay.gluc,
      lip: meal.macroDisplay.lip,
    };

    // Étape 1 : quantité initiale basée sur slot.target (déjà splitté pour carb/fruit)
    activeSlots.forEach(slot => {
      if (!slot.selectedFood) return;
      const food = slot.selectedFood;
      const macro = slot.macro;
      const macroPer100 = macro === 'prot' ? food.prot : macro === 'gluc' ? food.gluc : food.lip;

      if (macroPer100 <= 0) {
        slot.quantity = this.MIN_QUANTITIES[slot.type] || 10;
      } else {
        // Utiliser slot.target (qui respecte le split carb/fruit)
        slot.quantity = (slot.target / macroPer100) * 100;
        const minQ = this.MIN_QUANTITIES[slot.type] || 10;
        slot.quantity = Math.max(minQ, slot.quantity);
      }
    });

    // Étape 2 : compensation croisée itérative
    // Les protéines apportent souvent des lip/gluc → ajuster les autres slots
    for (let pass = 0; pass < 8; pass++) {
      const totals = { prot: 0, gluc: 0, lip: 0 };
      activeSlots.forEach(slot => {
        if (!slot.selectedFood || slot.quantity <= 0) return;
        const actual = this.computeActualMacros(slot.selectedFood, slot.quantity);
        totals.prot += actual.prot;
        totals.gluc += actual.gluc;
        totals.lip += actual.lip;
      });

      let converged = true;

      // Pour chaque macro en excès, réduire proportionnellement les slots qui le ciblent
      ['lip', 'gluc', 'prot'].forEach(macro => {
        const excess = totals[macro] - targets[macro];
        if (excess <= 2) return; // Tolérance 2g

        converged = false;
        const primarySlots = activeSlots.filter(s => s.macro === macro && s.quantity > 0);
        if (primarySlots.length === 0) return;

        // Répartir la réduction proportionnellement aux quantités actuelles
        const totalQty = primarySlots.reduce((sum, s) => sum + s.quantity, 0);
        primarySlots.forEach(slot => {
          const macroPer100 = macro === 'prot' ? slot.selectedFood.prot :
                              macro === 'gluc' ? slot.selectedFood.gluc : slot.selectedFood.lip;
          if (macroPer100 <= 0) return;

          const share = slot.quantity / totalQty;
          const reductionG = excess * share;
          const reductionQty = (reductionG / macroPer100) * 100;
          slot.quantity = Math.max(0, slot.quantity - reductionQty);
        });
      });

      if (converged) break;
    }

    // Étape 3 : arrondir et gérer les unités
    activeSlots.forEach(slot => {
      slot.quantity = Math.max(0, Math.round(slot.quantity));

      if (slot.selectedFood && slot.selectedFood.unitWeight && slot.quantity > 0) {
        const units = Math.max(1, Math.round(slot.quantity / slot.selectedFood.unitWeight));
        slot.quantity = units * slot.selectedFood.unitWeight;
      }
    });
  },

  /**
   * Régénère un slot individuel avec un aliment différent
   */
  regenerateSlot(slot, constraints, excludeId) {
    if (slot.isVeg) return slot;

    const availableFoods = filterFoods(slot.dbCategory, constraints)
      .filter(f => f.id !== excludeId);

    if (availableFoods.length === 0) return slot;

    const randomIndex = Math.floor(Math.random() * availableFoods.length);
    const food = availableFoods[randomIndex];
    const quantity = this.calculateQuantity(food, slot.macro, slot.target);

    slot.selectedFood = food;
    slot.quantity = quantity;
    return slot;
  },

  /**
   * Calcule le récap journalier (totaux)
   */
  computeDayTotals(meals) {
    const totals = { prot: 0, gluc: 0, lip: 0, kcal: 0 };
    meals.forEach(meal => {
      meal.slots.forEach(slot => {
        if (slot.isVeg || !slot.selectedFood) return;
        const actual = this.computeActualMacros(slot.selectedFood, slot.quantity);
        totals.prot += actual.prot;
        totals.gluc += actual.gluc;
        totals.lip  += actual.lip;
        totals.kcal += actual.kcal;
      });
    });
    return {
      prot: Math.round(totals.prot),
      gluc: Math.round(totals.gluc),
      lip:  Math.round(totals.lip),
      kcal: Math.round(totals.kcal),
    };
  },
};
