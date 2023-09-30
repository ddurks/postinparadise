import * as THREE from "three";

import { Paradise } from './paradise.js';

var isAnimating = false;
THREE.DefaultLoadingManager.onLoad = () => {
  if (document.getElementById("loading")) {
    document.getElementById("loading").outerHTML = "";
  }
  if(!isAnimating) {
    animate();
    isAnimating = true;
  }
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
