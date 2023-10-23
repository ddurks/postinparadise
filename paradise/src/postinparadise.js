import * as THREE from "three";

import { Paradise } from "./paradise.js";
import blueCrab from "../assets/textures/crabs/1da4ff.png";
import greenCrab from "../assets/textures/crabs/36d241.png";
import orangeCrab from "../assets/textures/crabs/ff9e00.png";
import pinkCrab from "../assets/textures/crabs/ff69b4.png";
import yellowCrab from "../assets/textures/crabs/fffb01.png";

const asciiArt = `
                 _     _                                   _ _          
                | |   (_)                                 | (_)         
 _ __   ___  ___| |_   _ _ __    _ __   __ _ _ __ __ _  __| |_ ___  ___ 
| '_ \\ / _ \\/ __| __| | | '_ \\  | '_ \\ / _\` | '__/ _\` |/ _\` | / __|/ _ \\
| |_) | (_) \\__ \\ |_  | | | | | | |_) | (_| | | | (_| | (_| | \\__ \\  __/
| .__/ \\___/|___/\\__| |_|_| |_| | .__/ \\__,_|_|  \\__,_|\\__,_|_|___/\\___|
| |                             | |                                     
|_|                             |_|                                     
`;
console.log(asciiArt);
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
    terminal.style.top = "-360px";
    document.getElementById("toggleTab").innerHTML = "⬇️ post in paradise ⬇️";
  } else {
    terminal.style.top = "50px";
    document.getElementById("toggleTab").innerHTML = "⬆️ close ⬆️";
  }
  paradise.updateHud();
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
const colorImg = document.getElementById("colorImg");

colors.forEach((color) => {
  const option = document.createElement("option");
  option.value = color.value;
  option.textContent = color.name;
  dropdown.appendChild(option);
});

dropdown.addEventListener("change", (event) => {
  document.body.style.backgroundColor = event.target.value;
  colorDisplay.style.backgroundColor = event.target.value;
  switch (event.target.value.replace("#", "")) {
    case "ff9e00":
      colorImg.src = orangeCrab;
      break;
    case "1da4ff":
      colorImg.src = blueCrab;
      break;
    case "ff69b4":
      colorImg.src = pinkCrab;
      break;
    case "36d241":
      colorImg.src = greenCrab;
      break;
    case "fffb01":
      colorImg.src = yellowCrab;
      break;
  }

  document.documentElement.style.setProperty(
    "--crab-color",
    event.target.value
  );
});
