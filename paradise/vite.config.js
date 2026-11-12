// vite.config.js
export default {
  base: "/code/postinparadise/",
  assetsInclude: ["**/*.glb", "**/*.hdr"],
  build: {
    outDir: "../paradiseengine/dist",
    assetsInlineLimit: 10000,
  },
};
