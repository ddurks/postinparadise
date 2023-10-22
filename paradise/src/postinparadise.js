import * as THREE from "three";

import { Paradise } from "./paradise.js";

const paradise = new Paradise();

const animate = () => {
  requestAnimationFrame(animate);
  if (paradise.bgLoaded) {
    paradise.render();
    paradise.animate(paradise.clock.getDelta());
  }
};

var isAnimating = false;
THREE.DefaultLoadingManager.onLoad = () => {
  if (document.getElementById("loading")) {
    document.getElementById("loading").outerHTML = "";
  }
  if (!isAnimating) {
    animate();
    isAnimating = true;
  }
};

document.addEventListener("visibilitychange", function () {
  if (document.hidden) {
    isAnimating = false;
    paradise.clock.stop();
  } else {
    isAnimating = true;
    paradise.clock.start();
  }
});

const terminal = document.getElementById("terminal");
const toggleTab = document.getElementById("toggleTab");

let terminalVisible = false;

toggleTab.addEventListener("click", function () {
  if (terminalVisible) {
    terminal.style.top = "-120px";
    document.getElementById("toggleTab").innerHTML = "⬇️ post in paradise ⬇️";
  } else {
    terminal.style.top = "50px";
    document.getElementById("toggleTab").innerHTML = "⬆️ close ⬆️";
  }
  terminalVisible = !terminalVisible;
});
