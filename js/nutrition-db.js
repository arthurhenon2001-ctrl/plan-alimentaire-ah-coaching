// ============================================================================
// BASE DE DONNÉES NUTRITIONNELLE — Plan Alimentaire AH Coaching
// Valeurs pour 100g — Sources : USDA FoodData Central, CIQUAL (ANSES)
// ============================================================================

const NUTRITION_DB = {

  // ── PROTÉINES ──
  protein: [
    // Volailles
    { id: 'poulet',         name: 'Blanc de poulet',           prot: 31,   gluc: 0,    lip: 3.6,  kcal: 165, tags: [] },
    { id: 'dinde',          name: 'Escalope de dinde',         prot: 29.3, gluc: 0,    lip: 1.5,  kcal: 135, tags: [] },
    { id: 'cuisse_poulet',  name: 'Cuisse de poulet (sans peau)', prot: 26, gluc: 0,   lip: 5.7,  kcal: 161, tags: [] },
    { id: 'canard',         name: 'Filet de canard (sans peau)',prot: 24,   gluc: 0,    lip: 4,    kcal: 135, tags: [] },
    // Viandes rouges
    { id: 'boeuf_5',       name: 'Steak haché 5%',            prot: 21.4, gluc: 0,    lip: 5,    kcal: 137, tags: [] },
    { id: 'boeuf_bavette', name: 'Bœuf (bavette)',            prot: 22,   gluc: 0,    lip: 4,    kcal: 124, tags: [] },
    { id: 'boeuf_rumsteck', name: 'Rumsteck',                  prot: 28.4, gluc: 0,    lip: 3.5,  kcal: 148, tags: [] },
    { id: 'veau',          name: 'Escalope de veau',           prot: 24.4, gluc: 0,    lip: 2.7,  kcal: 124, tags: [] },
    { id: 'agneau',        name: 'Gigot d\'agneau',            prot: 25,   gluc: 0,    lip: 8,    kcal: 175, tags: [] },
    // Porc
    { id: 'porc_filet',    name: 'Filet de porc',              prot: 26,   gluc: 0,    lip: 3.5,  kcal: 143, tags: ['porc'] },
    { id: 'jambon',        name: 'Jambon blanc',               prot: 19,   gluc: 0.8,  lip: 3.5,  kcal: 115, tags: ['porc'] },
    // Œufs
    { id: 'oeuf',          name: 'Œufs entiers',              prot: 12.6, gluc: 0.7,  lip: 9.5,  kcal: 143, tags: ['oeuf'], unit: 'egg', unitWeight: 55 },
    { id: 'blanc_oeuf',    name: 'Blanc d\'œuf',              prot: 10.9, gluc: 0.7,  lip: 0.2,  kcal: 52,  tags: ['oeuf'], unit: 'egg', unitWeight: 33 },
    // Produits laitiers protéinés
    { id: 'fromage_blanc', name: 'Fromage blanc 0%',           prot: 7.5,  gluc: 3.8,  lip: 0.2,  kcal: 46,  tags: ['laitier'] },
    { id: 'skyr',          name: 'Skyr nature 0%',             prot: 10,   gluc: 3.6,  lip: 0.2,  kcal: 59,  tags: ['laitier'] },
    { id: 'yaourt_grec',   name: 'Yaourt grec nature',         prot: 9,    gluc: 3.6,  lip: 5,    kcal: 97,  tags: ['laitier'] },
    { id: 'cottage',       name: 'Cottage cheese',             prot: 11.1, gluc: 3.4,  lip: 4.3,  kcal: 98,  tags: ['laitier'] },
    // Protéines végétales
    { id: 'tofu',          name: 'Tofu ferme',                 prot: 15.6, gluc: 2.3,  lip: 8.7,  kcal: 144, tags: ['vegan', 'soja'] },
    { id: 'tempeh',        name: 'Tempeh',                     prot: 20,   gluc: 7.6,  lip: 10.8, kcal: 192, tags: ['vegan', 'soja'] },
    { id: 'seitan',        name: 'Seitan',                     prot: 28,   gluc: 6,    lip: 1,    kcal: 150, tags: ['vegan', 'gluten'] },
    { id: 'edamame',       name: 'Edamame (cuits)',             prot: 11.9, gluc: 8.6,  lip: 5.2,  kcal: 122, tags: ['vegan', 'soja'] },
    // Poissons
    { id: 'thon',          name: 'Thon en conserve (naturel)', prot: 25.5, gluc: 0,    lip: 1,    kcal: 116, tags: ['poisson'] },
    { id: 'saumon',        name: 'Saumon (filet)',             prot: 20,   gluc: 0,    lip: 13.4, kcal: 208, tags: ['poisson'] },
    { id: 'cabillaud',     name: 'Cabillaud (filet)',          prot: 17.8, gluc: 0,    lip: 0.7,  kcal: 82,  tags: ['poisson'] },
    { id: 'truite',        name: 'Truite',                     prot: 20,   gluc: 0,    lip: 6.6,  kcal: 141, tags: ['poisson'] },
    { id: 'sardines',      name: 'Sardines en conserve',        prot: 24.6, gluc: 0,    lip: 11.5, kcal: 208, tags: ['poisson'] },
    { id: 'colin',         name: 'Colin / Merlu',               prot: 18.3, gluc: 0,    lip: 0.9,  kcal: 82,  tags: ['poisson'] },
    { id: 'maquereau',     name: 'Maquereau',                   prot: 18.6, gluc: 0,    lip: 13.9, kcal: 205, tags: ['poisson'] },
    { id: 'bar',           name: 'Bar / Loup de mer',           prot: 18.4, gluc: 0,    lip: 2.3,  kcal: 97,  tags: ['poisson'] },
    { id: 'sole',          name: 'Sole',                        prot: 17.5, gluc: 0,    lip: 1.2,  kcal: 86,  tags: ['poisson'] },
    { id: 'dorade',        name: 'Dorade',                      prot: 19.7, gluc: 0,    lip: 2.7,  kcal: 105, tags: ['poisson'] },
    { id: 'saumon_fume',   name: 'Saumon fumé',                 prot: 22.5, gluc: 0,    lip: 8.4,  kcal: 171, tags: ['poisson'] },
    { id: 'thon_frais',    name: 'Thon frais (steak)',          prot: 23.3, gluc: 0,    lip: 4.9,  kcal: 144, tags: ['poisson'] },
    // Crustacés & fruits de mer
    { id: 'crevettes',     name: 'Crevettes cuites',           prot: 20.9, gluc: 0.2,  lip: 1.7,  kcal: 99,  tags: ['crustace'] },
    { id: 'gambas',        name: 'Gambas',                     prot: 18,   gluc: 0,    lip: 1.2,  kcal: 85,  tags: ['crustace'] },
    { id: 'moules',        name: 'Moules cuites',              prot: 12,   gluc: 3.7,  lip: 2.2,  kcal: 86,  tags: ['crustace'] },
    { id: 'calamar',       name: 'Calamar',                    prot: 15.6, gluc: 3.1,  lip: 1.4,  kcal: 92,  tags: ['crustace'] },
    { id: 'noix_stj',      name: 'Noix de Saint-Jacques',       prot: 16.8, gluc: 3.2,  lip: 0.8,  kcal: 88,  tags: ['crustace'] },
    { id: 'homard',        name: 'Homard',                      prot: 20.5, gluc: 0,    lip: 1.5,  kcal: 97,  tags: ['crustace'] },
    { id: 'crabe',         name: 'Crabe',                       prot: 18.1, gluc: 0,    lip: 1.1,  kcal: 83,  tags: ['crustace'] },
    // Compléments
    { id: 'whey',          name: 'Whey protéine (1 dose)',     prot: 80,   gluc: 6.7,  lip: 5,    kcal: 400, tags: ['laitier'], unit: 'dose', unitWeight: 30 },
  ],

  // ── FÉCULENTS / GLUCIDES ──
  carb: [
    { id: 'riz_blanc',     name: 'Riz basmati (cuit)',        prot: 2.7,  gluc: 28.2, lip: 0.3, kcal: 130, tags: [] },
    { id: 'riz_complet',   name: 'Riz complet (cuit)',        prot: 2.7,  gluc: 25.6, lip: 1,   kcal: 123, tags: [] },
    { id: 'pates',         name: 'Pâtes (cuites)',            prot: 5.8,  gluc: 30.6, lip: 0.9, kcal: 158, tags: ['gluten'] },
    { id: 'pdt',           name: 'Pommes de terre (cuites)',   prot: 1.9,  gluc: 20.1, lip: 0.1, kcal: 87,  tags: [] },
    { id: 'patate_douce',  name: 'Patate douce (cuite)',       prot: 2,    gluc: 20.7, lip: 0.1, kcal: 90,  tags: [] },
    { id: 'quinoa',        name: 'Quinoa (cuit)',              prot: 4.4,  gluc: 21.3, lip: 1.9, kcal: 120, tags: [] },
    { id: 'semoule',       name: 'Couscous / Semoule (cuit)', prot: 3.8,  gluc: 23.2, lip: 0.2, kcal: 112, tags: ['gluten'] },
    { id: 'boulgour',      name: 'Boulgour (cuit)',            prot: 3.1,  gluc: 18.6, lip: 0.2, kcal: 83,  tags: ['gluten'] },
    { id: 'pain_complet',  name: 'Pain complet',               prot: 9.7,  gluc: 43.1, lip: 3.4, kcal: 247, tags: ['gluten'] },
    { id: 'pain_mie',      name: 'Pain de mie complet',        prot: 9.5,  gluc: 42,   lip: 4.2, kcal: 248, tags: ['gluten'], unit: 'tranche', unitWeight: 28 },
    { id: 'avoine',        name: 'Flocons d\'avoine (sec)',   prot: 13.2, gluc: 67.7, lip: 6.5, kcal: 379, tags: ['gluten'] },
    { id: 'tortilla',      name: 'Tortilla de blé complet',    prot: 8.8,  gluc: 44,   lip: 8.5, kcal: 295, tags: ['gluten'], unit: 'tortilla', unitWeight: 45 },
    { id: 'galette_sarrasin', name: 'Galette de sarrasin',     prot: 6,    gluc: 30,   lip: 1.5, kcal: 160, tags: [], unit: 'galette', unitWeight: 50 },
    { id: 'lentilles',     name: 'Lentilles (cuites)',         prot: 9,    gluc: 20.1, lip: 0.4, kcal: 116, tags: ['legumineuse'] },
    { id: 'pois_chiches',  name: 'Pois chiches (cuits)',       prot: 8.9,  gluc: 27.4, lip: 2.6, kcal: 164, tags: ['legumineuse'] },
    { id: 'haricots_rouges', name: 'Haricots rouges (cuits)', prot: 8.7,  gluc: 22.8, lip: 0.5, kcal: 127, tags: ['legumineuse'] },
    { id: 'haricots_noirs', name: 'Haricots noirs (cuits)',    prot: 8.9,  gluc: 23.7, lip: 0.5, kcal: 132, tags: ['legumineuse'] },
    { id: 'pain_pita',     name: 'Pain pita complet',          prot: 9.8,  gluc: 55,   lip: 1.2, kcal: 266, tags: ['gluten'], unit: 'pita', unitWeight: 60 },
    { id: 'vermicelles',   name: 'Vermicelles de riz (cuits)', prot: 0.9,  gluc: 25.9, lip: 0.2, kcal: 109, tags: [] },
    { id: 'soba',          name: 'Nouilles soba (cuites)',     prot: 5.1,  gluc: 21.4, lip: 0.1, kcal: 99,  tags: ['gluten'] },
    { id: 'mais',          name: 'Maïs (cuit)',                prot: 3.4,  gluc: 19,   lip: 1.5, kcal: 96,  tags: [] },
    { id: 'muesli',        name: 'Muesli sans sucre ajouté',   prot: 10,   gluc: 63,   lip: 7.5, kcal: 363, tags: ['gluten'] },
    { id: 'sarrasin',      name: 'Sarrasin (cuit)',             prot: 3.4,  gluc: 19.9, lip: 0.6, kcal: 92,  tags: [] },
    { id: 'ble_ebly',      name: 'Blé type Ebly (cuit)',       prot: 4.7,  gluc: 25.5, lip: 0.5, kcal: 126, tags: ['gluten'] },
  ],

  // ── MATIÈRES GRASSES ──
  fat: [
    { id: 'huile_olive',   name: 'Huile d\'olive',            prot: 0,    gluc: 0,    lip: 100, kcal: 884, tags: ['vegan'] },
    { id: 'huile_coco',    name: 'Huile de coco',              prot: 0,    gluc: 0,    lip: 100, kcal: 900, tags: ['vegan'] },
    { id: 'beurre',        name: 'Beurre',                     prot: 0.5,  gluc: 0.5,  lip: 82,  kcal: 745, tags: ['laitier'] },
    { id: 'puree_amande',  name: 'Purée d\'amande',           prot: 21.2, gluc: 9,    lip: 54,  kcal: 600, tags: ['fruits_a_coque', 'vegan'] },
    { id: 'amandes',       name: 'Amandes entières',           prot: 21.2, gluc: 21.7, lip: 49.9, kcal: 579, tags: ['fruits_a_coque', 'vegan'] },
    { id: 'noix',          name: 'Noix',                       prot: 15.2, gluc: 13.7, lip: 65.2, kcal: 654, tags: ['fruits_a_coque', 'vegan'] },
    { id: 'beurre_cacahuete', name: 'Beurre de cacahuète',    prot: 25.1, gluc: 20,   lip: 50.4, kcal: 588, tags: ['arachide', 'vegan'] },
    { id: 'avocat',        name: 'Avocat',                     prot: 2,    gluc: 8.5,  lip: 14.7, kcal: 160, tags: ['vegan'] },
    { id: 'fromage_rape',  name: 'Emmental râpé',              prot: 27.4, gluc: 0.5,  lip: 29.7, kcal: 380, tags: ['laitier'] },
    { id: 'mozzarella',    name: 'Mozzarella',                 prot: 22.2, gluc: 2.2,  lip: 20.3, kcal: 280, tags: ['laitier'] },
    { id: 'chevre',        name: 'Chèvre frais',               prot: 12.8, gluc: 1,    lip: 17,   kcal: 209, tags: ['laitier'] },
    { id: 'feta',          name: 'Feta',                        prot: 14.2, gluc: 4.1,  lip: 21.3, kcal: 264, tags: ['laitier'] },
    { id: 'creme_fraiche', name: 'Crème fraîche 15%',          prot: 2.6,  gluc: 3.5,  lip: 15,   kcal: 161, tags: ['laitier'] },
    { id: 'graines_chia',  name: 'Graines de chia',             prot: 16.5, gluc: 42.1, lip: 30.7, kcal: 486, tags: ['vegan'] },
    { id: 'graines_lin',   name: 'Graines de lin',              prot: 18.3, gluc: 28.9, lip: 42.2, kcal: 534, tags: ['vegan'] },
    { id: 'coco_rapee',    name: 'Noix de coco râpée',          prot: 6.9,  gluc: 23.7, lip: 64.5, kcal: 660, tags: ['vegan'] },
  ],

  // ── FRUITS ──
  fruit: [
    { id: 'pomme',         name: 'Pomme',                      prot: 0.3, gluc: 13.8, lip: 0.2, kcal: 52,  tags: [] },
    { id: 'banane',        name: 'Banane',                     prot: 1.1, gluc: 22.8, lip: 0.3, kcal: 89,  tags: [] },
    { id: 'orange',        name: 'Orange',                     prot: 0.9, gluc: 11.8, lip: 0.1, kcal: 47,  tags: [] },
    { id: 'clementine',    name: 'Clémentines',                prot: 0.7, gluc: 12,   lip: 0.2, kcal: 47,  tags: [] },
    { id: 'poire',         name: 'Poire',                      prot: 0.4, gluc: 12,   lip: 0.1, kcal: 50,  tags: [] },
    { id: 'fraises',       name: 'Fraises',                    prot: 0.7, gluc: 7.7,  lip: 0.3, kcal: 32,  tags: [] },
    { id: 'fruits_rouges', name: 'Fruits rouges (mélange)',    prot: 0.9, gluc: 10.2, lip: 0.3, kcal: 45,  tags: [] },
    { id: 'myrtilles',     name: 'Myrtilles',                  prot: 0.7, gluc: 14.5, lip: 0.3, kcal: 57,  tags: [] },
    { id: 'mangue',        name: 'Mangue',                     prot: 0.8, gluc: 15,   lip: 0.4, kcal: 60,  tags: [] },
    { id: 'ananas',        name: 'Ananas',                     prot: 0.5, gluc: 13.1, lip: 0.1, kcal: 50,  tags: [] },
    { id: 'kiwi',          name: 'Kiwi',                       prot: 1.1, gluc: 14.7, lip: 0.5, kcal: 61,  tags: [] },
    { id: 'raisin',        name: 'Raisin',                     prot: 0.6, gluc: 17,   lip: 0.2, kcal: 70,  tags: [] },
    { id: 'compote',       name: 'Compote sans sucre ajouté',  prot: 0.3, gluc: 11,   lip: 0.2, kcal: 46,  tags: [] },
  ],

  // ── LÉGUMES (à volonté — pas de calcul macro) ──
  vegetable: [
    { id: 'brocoli',       name: 'Brocoli',                    prot: 2.8, gluc: 7,    lip: 0.4, kcal: 34, tags: [] },
    { id: 'courgette',     name: 'Courgette',                  prot: 1.2, gluc: 3.1,  lip: 0.3, kcal: 17, tags: [] },
    { id: 'haricots_verts', name: 'Haricots verts',            prot: 1.8, gluc: 7,    lip: 0.1, kcal: 31, tags: [] },
    { id: 'epinards',      name: 'Épinards',                   prot: 2.9, gluc: 3.6,  lip: 0.4, kcal: 23, tags: [] },
    { id: 'tomate',        name: 'Tomate',                     prot: 0.9, gluc: 3.9,  lip: 0.2, kcal: 18, tags: [] },
    { id: 'poivron',       name: 'Poivron rouge',              prot: 1,   gluc: 6,    lip: 0.3, kcal: 31, tags: [] },
    { id: 'carotte',       name: 'Carotte',                    prot: 0.9, gluc: 9.6,  lip: 0.2, kcal: 41, tags: [] },
    { id: 'champignon',    name: 'Champignons',                prot: 3.1, gluc: 3.3,  lip: 0.3, kcal: 22, tags: [] },
    { id: 'concombre',     name: 'Concombre',                  prot: 0.6, gluc: 2.2,  lip: 0.2, kcal: 12, tags: [] },
    { id: 'salade',        name: 'Salade verte',               prot: 1.4, gluc: 2.9,  lip: 0.2, kcal: 15, tags: [] },
    { id: 'aubergine',     name: 'Aubergine',                  prot: 1,   gluc: 5.9,  lip: 0.2, kcal: 25, tags: [] },
    { id: 'chou_fleur',    name: 'Chou-fleur',                 prot: 1.9, gluc: 5,    lip: 0.3, kcal: 25, tags: [] },
    { id: 'asperges',      name: 'Asperges',                   prot: 2.2, gluc: 3.9,  lip: 0.1, kcal: 20, tags: [] },
    { id: 'oignon',        name: 'Oignon',                     prot: 1.1, gluc: 9.3,  lip: 0.1, kcal: 40, tags: [] },
    { id: 'fenouil',       name: 'Fenouil',                    prot: 1.2, gluc: 7.3,  lip: 0.2, kcal: 31, tags: [] },
    { id: 'poireaux',      name: 'Poireaux',                   prot: 1.5, gluc: 7.3,  lip: 0.3, kcal: 31, tags: [] },
  ],
};

// ── SYSTEME D'ALLERGIES & PREFERENCES ──
const ALLERGY_FILTERS = {
  gluten:          { label: 'Sans gluten',           excludeTags: ['gluten'] },
  lactose:         { label: 'Sans lactose',          excludeTags: ['laitier'] },
  fruits_a_coque:  { label: 'Sans fruits à coque',  excludeTags: ['fruits_a_coque'] },
  arachide:        { label: 'Sans arachide',         excludeTags: ['arachide'] },
  crustace:        { label: 'Sans crustacés',        excludeTags: ['crustace'] },
  poisson:         { label: 'Sans poisson',          excludeTags: ['poisson'] },
  oeuf:            { label: 'Sans œufs',             excludeTags: ['oeuf'] },
  soja:            { label: 'Sans soja',             excludeTags: ['soja'] },
  porc:            { label: 'Sans porc',             excludeTags: ['porc'] },
};

const DIET_FILTERS = {
  vegetarian: { label: 'Végétarien',  keepCategories: null, excludeCategories: null, keepTags: null,
    filter: (food, category) => {
      if (category !== 'protein') return true;
      return food.tags.includes('laitier') || food.tags.includes('vegan') || food.id === 'oeuf' || food.id === 'blanc_oeuf';
    }
  },
  vegan: { label: 'Végan', keepCategories: null, excludeCategories: null, keepTags: null,
    filter: (food, category) => {
      if (category === 'protein') return food.tags.includes('vegan');
      if (category === 'fat') return !food.tags.includes('laitier');
      return true;
    }
  },
  pescetarian: { label: 'Pescétarien', keepCategories: null, excludeCategories: null, keepTags: null,
    filter: (food, category) => {
      if (category !== 'protein') return true;
      return food.tags.includes('poisson') || food.tags.includes('crustace') || food.tags.includes('laitier') || food.tags.includes('vegan') || food.id === 'oeuf' || food.id === 'blanc_oeuf';
    }
  },
};

/**
 * Filtre les aliments d'une catégorie selon les contraintes
 * @param {string} category - 'protein', 'carb', 'fat', 'fruit', 'vegetable'
 * @param {Object} constraints - { allergies: [], diet: '', excludedIds: [] }
 * @returns {Array} aliments filtrés
 */
function filterFoods(category, constraints = {}) {
  const { allergies = [], diet = 'mixed', excludedIds = [] } = constraints;
  let foods = [...NUTRITION_DB[category]];

  // Exclure par ID (aliments que la personne n'aime pas)
  if (excludedIds.length > 0) {
    foods = foods.filter(f => !excludedIds.includes(f.id));
  }

  // Exclure par allergies
  allergies.forEach(allergy => {
    const filter = ALLERGY_FILTERS[allergy];
    if (filter) {
      foods = foods.filter(f => !f.tags.some(t => filter.excludeTags.includes(t)));
    }
  });

  // Appliquer le régime alimentaire
  const dietFilter = DIET_FILTERS[diet];
  if (dietFilter) {
    foods = foods.filter(f => dietFilter.filter(f, category));
  }

  return foods;
}
