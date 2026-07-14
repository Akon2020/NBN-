import { ROLES } from '@/constants/roles';

// MOBILE-G01 : vérifie que les trois arborescences de navigation par rôle
// restent bien distinctes et pointent vers un écran d'entrée valide.
// Module pur (aucune dépendance React Native) : évite le rendu de
// composants sous Jest, actuellement incompatible avec cette pile
// (voir walkthrough.md — RN Text mock + Jest sous Node 22+/babel-preset-expo).
describe('ROLES', () => {
  it('expose exactement trois profils', () => {
    expect(ROLES).toHaveLength(3);
  });

  it('a des libellés et des routes uniques', () => {
    const labels = ROLES.map((role) => role.label);
    const hrefs = ROLES.map((role) => role.href);
    expect(new Set(labels).size).toBe(ROLES.length);
    expect(new Set(hrefs).size).toBe(ROLES.length);
  });

  it("pointe chaque rôle vers sa propre arborescence de groupe de routes", () => {
    expect(ROLES.find((r) => r.label === 'Commissionnaire')?.href).toBe(
      '/(commissionnaire)/missions'
    );
    expect(ROLES.find((r) => r.label === 'Client')?.href).toBe('/(client)/recherche');
    expect(ROLES.find((r) => r.label === 'Interne (agent / admin)')?.href).toBe(
      '/(interne)/dashboard'
    );
  });
});
