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

const colors = [
  { name: "Orange", value: "#ff9e00" },
  { name: "Blue", value: "#1da4ff" },
  { name: "Pink", value: "#ff69b4" },
  { name: "Green", value: "#36d241" },
  { name: "Yellow", value: "#fffb01" },
];

const dropdown = document.getElementById("colorDropdown");
const colorDisplay = document.querySelector(".color-display");

colors.forEach((color) => {
  const option = document.createElement("option");
  option.value = color.value;
  option.textContent = color.name;
  dropdown.appendChild(option);
});

dropdown.addEventListener("change", function () {
  document.body.style.backgroundColor = this.value;
  colorDisplay.style.backgroundColor = this.value;
});

// Initial color display
colorDisplay.style.backgroundColor = dropdown.value;
