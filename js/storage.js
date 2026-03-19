// ============================================================================
// GESTION LOCALSTORAGE — AH Coaching
// ============================================================================

const STORAGE_KEY = 'ahPlanAlimentaire';

const Storage = {
  save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* quota exceeded or private browsing */ }
  },

  load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  },

  clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  },
};
