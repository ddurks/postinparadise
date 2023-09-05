import * as THREE from "three";

import { Paradise } from './paradise.js';

THREE.DefaultLoadingManager.onLoad = () => {
  if (document.getElementById("loading")) {
    document.getElementById("loading").outerHTML = "";
  }
  animate();
};

const paradise = new Paradise();

const animate = () => {
  requestAnimationFrame(animate);
  render();
  paradise.animate(paradise.clock.getDelta());
};

const render = () => {
  paradise.render();
};
