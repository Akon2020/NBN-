import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // bcrypt (volontairement coûteux) + envoi SMTP réel + I/O DB peuvent
    // dépasser le défaut de 5s sous charge — vu en pratique sur cette base
    // de tests d'intégration réelle (pas de mocks, cf. plan.md QA-G01/G02).
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
