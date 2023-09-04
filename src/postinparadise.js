import * as THREE from "three";

import { Paradise } from './paradise.js';

THREE.DefaultLoadingManager.onLoad = () => {
  document.getElementById("loading").outerHTML = "";
  animate();
};

const clock = new THREE.Clock();
const paradise = new Paradise();

const animate = () => {
  let delta = clock.getDelta();
  requestAnimationFrame(animate);
  render();
  paradise.animate(delta);
};

const render = () => {
  paradise.render();
};
