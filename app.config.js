// Extends app.json. On GitHub Pages the site lives under /<repo>/, so the
// deploy workflow sets EXPO_BASE_URL; locally it stays at the root.
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...config.experiments, baseUrl: process.env.EXPO_BASE_URL || '' },
});
