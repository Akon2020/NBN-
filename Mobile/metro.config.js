const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Depuis Expo SDK 53+, Metro résout par défaut la carte `package.json#exports`
// (`unstable_enablePackageExports`). `engine.io-client` (dépendance de
// socket.io-client, MOBILE-G05) n'y est pas encore correctement adapté :
// ses imports relatifs internes (ex. "./contrib/parseuri.js") ne sont pas
// couverts par sa propre carte `exports`, ce que Metro refuse de résoudre
// une fois la fonctionnalité activée — incompatibilité connue et
// documentée (expo/expo discussion #36551). Désactivé globalement, comme
// recommandé par la communauté Expo, en attendant que ces paquets publient
// une carte `exports` correcte.
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: "./global.css" });
