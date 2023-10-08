import * as THREE from "three";
import * as CANNON from "cannon";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Water } from "three/addons/objects/Water.js";
import { Sky } from "three/addons/objects/Sky.js";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Crab } from "./crab.js";
import waterNormals from "../assets/textures/waternormals.jpg";
import paradiseGlb from "../assets/3d/paradise.glb";
import { ClientService } from "./service.js";

export const Paradise = class {
  constructor() {
    this.clock = new THREE.Clock();
    this.animationsMap = new Map();
    this.crabs = [];
    this.container = document.getElementById("container");
    this.lastCrabSpawn = performance.now();
    this.crabSpawnInterval = 1000;
    this.clonedCrab = null;
    this.currentImage = 0;

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.5;
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.world = new CANNON.World();
    this.world.gravity.set(0, -20, 0);
    const floorShape = new CANNON.Plane();
    this.floorBody = new CANNON.Body({ mass: 0 });
    this.floorBody.addShape(floorShape);
    this.floorBody.quaternion.setFromAxisAngle(
      new CANNON.Vec3(1, 0, 0),
      -Math.PI / 2
    );
    this.floorBody.position.set(0, 1.5, 0);
    this.world.addBody(this.floorBody);
    console.log("GET POSTS");
    // ClientService.addPost("welcome to paradise. created by drawvid").then(postId => {
    //   console.log('Post added with ID:', postId);
    // })
    // .catch(error => {
    //     console.error('Error adding post:', error);
    // });
    this.crabList = document.getElementById("crabList");
    ClientService.getPosts()
      .then((postsData) => {
        console.log(postsData.posts.length);
        postsData.posts.forEach((post, index) => {
          let range = 15;
          this.crabs.push(
            new Crab(
              this.gltfLoader,
              this.scene,
              this.world,
              {
                x: this.getRandomInt(-range, range),
                y: 3,
                z: this.getRandomInt(-range, range),
              },
              post.content,
              index
            )
          );
          let img = document.createElement("img");
          img.src = "assets/textures/crab.png";
          this.crabList.appendChild(img);
          console.log(this.crabs.length, this.crabList.children.length);
          document
            .getElementById("crabList")
            .addEventListener("click", (event) => {
              event.stopPropagation();

              console.log(this.crabs.length, this.crabList.children.length);
              this.crabs.forEach((crab, index) => {
                crab.setSelected(false);
                if (this.crabList.children[index]) {
                  this.crabList.children[index].classList.remove("selected");
                }
              });
              const index = Array.from(event.currentTarget.children).indexOf(
                event.target
              );
              this.crabList.children[index].classList.add("selected");
              this.crabs[index].setSelected(true);
            });
        });
      })
      .catch((error) => {
        console.error("Error adding post:", error);
      });

    this.camera = new THREE.PerspectiveCamera(
      25,
      window.innerWidth / window.innerHeight,
      1,
      1000
    );
    this.camera.position.set(0, 4, 40);

    this.sun = new THREE.Vector3();
    const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
    this.water = new Water(waterGeometry, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load(waterNormals, (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      }),
      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      fog: this.scene.fog !== undefined,
    });

    this.water.rotation.x = -Math.PI / 2;
    this.scene.add(this.water);

    this.sky = new Sky();
    this.sky.scale.setScalar(10000);
    this.scene.add(this.sky);

    const skyUniforms = this.sky.material.uniforms;
    skyUniforms["turbidity"].value = 10;
    skyUniforms["rayleigh"].value = 2;
    skyUniforms["mieCoefficient"].value = 0.005;
    skyUniforms["mieDirectionalG"].value = 0.8;

    this.gltfLoader = new GLTFLoader();
    var islandX = 0,
      islandY = 0,
      islandZ = 0;
    this.gltfLoader.load(paradiseGlb, (gltf) => {
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
      this.island.position.set(islandX, islandY - 0.8, islandZ);
      this.island.scale.set(10, 2, 10);
      this.scene.add(this.island);
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

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    window.addEventListener("resize", this.onWindowResize);
    window.addEventListener("click", this.onMouseClick, false);
    const scrollAmount = window.innerWidth * 0.5;
    document.getElementById("leftArrow").addEventListener("click", (event) => {
      event.stopPropagation();
      this.crabList.scrollLeft -= scrollAmount;
    });
    document.getElementById("rightArrow").addEventListener("click", (event) => {
      event.stopPropagation();
      this.crabList.scrollLeft += scrollAmount;
    });
  }

  showOverlay = (visible) => {
    const overlay = document.getElementById("crabListOverlay");
    overlay.style.display = visible ? "block" : "none";
  };

  onMouseClick = (event) => {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(
      this.crabs.map((crab) => crab.crabObject)
    );

    if (intersects.length > 0) {
      const selectedObject = intersects[0].object;
      this.handleObjectClick(selectedObject);
    } else {
      this.handleObjectClick(null);
    }
  };

  handleObjectClick(selectedObject) {
    if (selectedObject) {
      this.showOverlay(true);
      this.crabs.forEach((crab) => crab.setSelected(false));
      [...this.crabList.children].forEach((crabImage) => {
        crabImage.classList.remove("selected");
      });
      this.crabs[selectedObject.index].setSelected(true);
      this.crabList.children[selectedObject.index].classList.add("selected");

      const selectedImage = this.crabList.querySelector("img.selected");
      if (selectedImage) {
        selectedImage.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
      console.log(selectedObject.postContent);
    } else {
      this.showOverlay(false);
      this.crabs.forEach((crab) => crab.setSelected(false));
    }
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

  spawnCrab = (position) => {
    if (this.crabs.length < 5) {
      this.crabs.push(
        new Crab(
          this.gltfLoader,
          this.scene,
          this.world,
          position,
          "hi my name is david it is so very nice to be online, right?"
        )
      );
      console.log("new crab. crab count: ", this.crabs.length);
    }
  };

  updateCrabs = (delta) => {
    if (performance.now() - this.lastCrabSpawn > this.crabSpawnInterval) {
      let range = 15;
      // this.spawnCrab({x: this.getRandomInt(-range,range), y: 3, z: this.getRandomInt(-range,range)});
      this.lastCrabSpawn = performance.now();
    }

    // if (this.clonedCrab && this.clonedCrab.crabObject) {
    //   this.clonedCrab.crabObject.position.set(this.camera.position.x,  this.camera.position.y - 2,  this.camera.position.z - 5);
    // }
    if (this.crabs.length > 0) {
      this.crabs.forEach((crab) => {
        crab.updateCrab(delta);
      });
    }
  };

  animate = (delta) => {
    this.world.step(delta);
    this.updateCrabs(delta);
  };

  render = () => {
    this.water.material.uniforms["time"].value += 1.0 / 60.0;
    this.renderer.render(this.scene, this.camera);
  };
};
