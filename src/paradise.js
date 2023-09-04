import * as THREE from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Water } from "three/addons/objects/Water.js";
import { Sky } from "three/addons/objects/Sky.js";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Crab } from "./crab.js";

export const Paradise = class {
  constructor() {
    this.animationsMap = new Map();
    this.walkTime = 0;
    this.walkPath = [];
    this.container = document.getElementById("container");

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.5;
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      25,
      window.innerWidth / window.innerHeight,
      1,
      1000
    );
    this.camera.position.set(0, 4, 40);

    this.sun = new THREE.Vector3();

    // Water

    const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

    this.water = new Water(waterGeometry, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load(
        "textures/waternormals.jpg",
        (texture) => {
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        }
      ),
      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      fog: this.scene.fog !== undefined,
    });

    this.water.rotation.x = -Math.PI / 2;

    this.scene.add(this.water);

    // Skybox

    this.sky = new Sky();
    this.sky.scale.setScalar(10000);
    this.scene.add(this.sky);

    const skyUniforms = this.sky.material.uniforms;

    skyUniforms["turbidity"].value = 10;
    skyUniforms["rayleigh"].value = 2;
    skyUniforms["mieCoefficient"].value = 0.005;
    skyUniforms["mieDirectionalG"].value = 0.8;

    // Meshes
    var gltfLoader = new GLTFLoader();
    var islandX = 0,
      islandY = 0,
      islandZ = 0;
    gltfLoader.load("./glb/paradise.glb", (gltf) => {
      gltf.scene.traverse((object) => {
        if (object.isMesh) object.castShadow = true;
      });
      this.leaves = gltf.scene.getObjectByName("Armature");
      this.leaves.position.set(islandX, islandY + 8.5, islandZ);
      this.scene.add(this.leaves);
      this.tree = gltf.scene.getObjectByName("tree");
      this.tree.position.set(islandX - 1, islandY + 5, islandZ);
      this.scene.add(this.tree);
      this.island = gltf.scene.getObjectByName("island");
      this.island.position.set(islandX, islandY - 0.6, islandZ);
      this.island.scale.set(5, 2, 5);
      this.scene.add(this.island);

      // Set up raycaster for detecting the surface position
      this.raycaster = new THREE.Raycaster();
      this.crab = new Crab(gltfLoader, this.scene, this.island);
    });

    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    let renderTarget;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.target.set(0, 3, 0);
    this.controls.minDistance = 5;
    this.controls.maxDistance = 200.0;
    this.controls.update();

    this.sun.setFromSphericalCoords(1, Math.PI / 2, 0);

    this.sky.material.uniforms["sunPosition"].value.copy(this.sun);
    this.water.material.uniforms["sunDirection"].value
      .copy(this.sun)
      .normalize();

    if (renderTarget !== undefined) renderTarget.dispose();

    renderTarget = this.pmremGenerator.fromScene(this.sky);

    this.scene.environment = renderTarget.texture;

    window.addEventListener("resize", this.onWindowResize);
  }

  onWindowResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  animate = (delta) => {
    if (this.crab && this.island) {
      this.crab.updateCrab(this.raycaster, delta);
    }
  };

  render = () => {
    const time = performance.now() * 0.001;

    this.water.material.uniforms["time"].value += 1.0 / 60.0;

    this.renderer.render(this.scene, this.camera);
  };
};
