// vite.config.js
export default {
  assetsInclude: ["**/*.glb", "**/*.hdr"],
  build: {
    outDir: "../paradiseengine/dist",
    assetsInlineLimit: 10000,
  },
};
