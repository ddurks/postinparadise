import * as THREE from "three";
import * as CANNON from "cannon";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Water } from "three/addons/objects/Water.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Crab } from "./crab.js";
import waterNormals from "../assets/textures/waternormals.jpg";
import paradiseGlb from "../assets/3d/paradise.glb";
import { ClientService } from "./service.js";
import blueCrab from "../assets/textures/crabs/1da4ff.png";
import greenCrab from "../assets/textures/crabs/36d241.png";
import orangeCrab from "../assets/textures/crabs/ff9e00.png";
import pinkCrab from "../assets/textures/crabs/ff69b4.png";
import yellowCrab from "../assets/textures/crabs/fffb01.png";
import hdriSky from "../assets/3d/puresky.hdr";
import marker1 from "../assets/textures/you1.png";
import marker2 from "../assets/textures/you2.png";
import marker3 from "../assets/textures/you3.png";
import marker4 from "../assets/textures/you4.png";

const Colors = {
  ORANGE: "ff9e00",
  BLUE: "1da4ff",
  PINK: "ff69b4",
  GREEN: "36d241",
  YELLOW: "fffb01",
};

const colors = Object.values(Colors).map((color) => ({ value: `#${color}` }));

const POST_LIMIT_ERROR = "Error: Only one post allowed each day.";

const isMobileDevice = () => {
  return window.innerWidth <= 768; // You can adjust the width threshold as needed
};

export const Paradise = class {
  constructor() {
    this.bgLoaded = false;
    this.clock = new THREE.Clock();
    this.animationsMap = new Map();
    this.crabs = [];
    this.container = document.getElementById("container");

    this.currentFrame = 0;
    this.frameRate = 4;
    this.frameDuration = 1000 / this.frameRate;
    this.lastFrameChangeTime = Date.now();

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
    this.crabList = document.getElementById("crabList");
    this.loadPosts();

    this.camera = new THREE.PerspectiveCamera(
      25,
      window.innerWidth / window.innerHeight,
      1,
      1000
    );
    this.camera.position.set(0, 4, 40);

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

    this.gltfLoader = new GLTFLoader();
    var islandX = 0,
      islandY = 0,
      islandZ = 0;
    this.gltfLoader.load(paradiseGlb, (gltf) => {
      gltf.scene.traverse((object) => {
        if (object.isMesh) object.castShadow = true;
      });
      this.leaves = gltf.scene.getObjectByName("Armature");
      this.leaves.position.set(islandX, islandY + 8, islandZ);
      this.scene.add(this.leaves);
      this.leavesMixer = new THREE.AnimationMixer(this.leaves);
      gltf.animations.forEach((a) => {
        this.animationsMap.set(a.name, this.leavesMixer.clipAction(a));
      });
      this.animationsMap.get("ArmatureAction.002").fadeIn(1).play();
      this.tree = gltf.scene.getObjectByName("tree");
      this.tree.position.set(islandX - 1, islandY + 4.4, islandZ);
      const treeShape = new CANNON.Box(new CANNON.Vec3(1, 5, 1));
      const slipperyMaterial = new CANNON.Material("slippery");
      slipperyMaterial.friction = 0;
      const treeBody = new CANNON.Body({
        mass: 0,
        material: slipperyMaterial,
      });
      treeBody.addShape(treeShape);
      treeBody.position.copy(this.tree.position);
      this.world.add(treeBody);
      this.scene.add(this.tree);
      this.island = gltf.scene.getObjectByName("island");
      this.island.position.set(islandX, islandY - 0.9, islandZ);
      this.island.scale.set(20, 3.1, 20);
      this.scene.add(this.island);
    });

    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();

    new RGBELoader().load(hdriSky, (texture) => {
      let envMap = this.pmremGenerator.fromEquirectangular(texture).texture;
      this.scene.background = envMap;
      this.scene.environment = envMap;

      texture.dispose();
      this.pmremGenerator.dispose();
      this.bgLoaded = true;
    });

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.target.set(0, 3, 0);
    this.controls.minDistance = 5;
    this.controls.maxDistance = 200.0;
    this.controls.update();

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    const textureLoader = new THREE.TextureLoader();
    this.frameTextures = [
      textureLoader.load(marker1),
      textureLoader.load(marker2),
      textureLoader.load(marker3),
      textureLoader.load(marker4),
    ];
    this.spriteMaterial = new THREE.SpriteMaterial({
      map: this.frameTextures[0],
      transparent: true,
    });
    this.markerGif = new THREE.Sprite(this.spriteMaterial);
    this.markerGif.scale.set(2, 2, 2);
    this.scene.add(this.markerGif);

    window.addEventListener("resize", this.onWindowResize);
    window.addEventListener("click", this.onMouseClick, false);
    window.addEventListener("touchstart", this.onTouchStart, false);
    this.scrollAmount = window.innerWidth * 0.5;
    document
      .getElementById("leftArrow")
      .addEventListener("click", this.scrollLeft);
    document
      .getElementById("leftArrow")
      .addEventListener("touchstart", this.scrollLeft);
    document
      .getElementById("rightArrow")
      .addEventListener("click", this.scrollRight);
    document
      .getElementById("rightArrow")
      .addEventListener("touchStart", this.scrollRight);
    document
      .getElementById("crabList")
      .addEventListener("click", this.crabListSelect);
    document
      .getElementById("crabList")
      .addEventListener("touchstart", this.crabListSelect);
    document
      .getElementById("publishBtn")
      .addEventListener("click", this.publishPost);
  }

  publishPost = async () => {
    let postInput = document.getElementById("postInput");
    if (postInput.value != POST_LIMIT_ERROR) {
      const newPost = {
        content: postInput.value,
        color: document.getElementById("colorDropdown").value.replace("#", ""),
        updateType: "create",
      };
      await this.createPost(newPost);
    }
  };

  crabListSelect = (event) => {
    event.stopPropagation();

    this.crabs.forEach((crab, index) => {
      crab.setSelected(false);
      if (this.crabList.children[index]) {
        this.crabList.children[index].classList.remove("selected");
      }
    });
    if (event.target.tagName === "IMG") {
      const imgWrapper = event.target.parentElement;
      const index = Array.from(event.currentTarget.children).indexOf(
        imgWrapper
      );
      this.crabList.children[index].classList.add("selected");
      this.crabs[index].setSelected(true);
    }
  };

  scrollLeft = (event) => {
    event.stopPropagation();
    this.crabList.scrollLeft -= this.scrollAmount;
  };

  scrollRight = (event) => {
    event.stopPropagation();
    this.crabList.scrollLeft += this.scrollAmount;
  };

  createPost = async (newPost) => {
    let publishBtn = document.getElementById("publishBtn");
    publishBtn.disabled = true;
    publishBtn.innerHTML = "posting...";
    await ClientService.addPost(newPost)
      .then((resp) => {
        console.log("Posted to Paradise: ", resp);
        if (resp) {
          if (resp.tweetUrl) {
            window.location.href = resp.tweetUrl;
          }
        } else {
          document.getElementById("postInput").value = POST_LIMIT_ERROR;
        }
      })
      .catch((error) => {
        console.error("Error adding post:", error);
      });
    publishBtn.innerHTML = "publish 🌴";
    publishBtn.disabled = false;
  };

  getCookie = (name) => {
    let cookieArr = document.cookie.split(";");

    for (let i = 0; i < cookieArr.length; i++) {
      let cookiePair = cookieArr[i].split("=");

      if (name == cookiePair[0].trim()) {
        return decodeURIComponent(cookiePair[1]);
      }
    }

    return null;
  };

  updateHud = () => {
    const dropdown = document.getElementById("colorDropdown");
    const colorDisplay = document.querySelector(".color-display");
    const colorImg = document.getElementById("colorImg");
    const faqImg = document.getElementById("faqImg");
    const cookieColor = this.getCookie("crabColor");
    var hudColor;
    if (cookieColor) {
      hudColor = cookieColor;
    } else {
      hudColor = colors[Math.floor(Math.random() * colors.length)].value;
    }
    dropdown.value = hudColor;
    switch (hudColor.replace("#", "")) {
      case Colors.ORANGE:
        colorImg.src = orangeCrab;
        faqImg.src = orangeCrab;
        break;
      case Colors.BLUE:
        colorImg.src = blueCrab;
        faqImg.src = blueCrab;
        break;
      case Colors.PINK:
        colorImg.src = pinkCrab;
        faqImg.src = pinkCrab;
        break;
      case Colors.GREEN:
        colorImg.src = greenCrab;
        faqImg.src = greenCrab;
        break;
      case Colors.YELLOW:
        colorImg.src = yellowCrab;
        faqImg.src = yellowCrab;
        break;
    }

    // Initial color display
    colorDisplay.style.backgroundColor = hudColor;
    document.documentElement.style.setProperty("--crab-color", hudColor);
  };

  gethudColor = () => {
    let color = 0xff9e00;
    switch (this.getRandomInt(0, 5)) {
    }
    return color;
  };

  loadPosts = () => {
    ClientService.getPosts()
      .then((postsData) => {
        postsData.forEach((post, index) => {
          let range = 15;
          let scaleIncrease = post.likes * 0.1;
          this.crabs.push(
            new Crab(
              this.gltfLoader,
              this.scene,
              this.world,
              this.camera,
              {
                x: this.getRandomInt(-range, range),
                y: 3,
                z: this.getRandomInt(-range, range),
              },
              post.content,
              index,
              post.color,
              1 + scaleIncrease,
              post.you
            )
          );
          let imgDiv = document.createElement("div");
          imgDiv.className = "imageWrapper";
          imgDiv.style.width = isMobileDevice() ? "85%" : "30%";
          let img = document.createElement("img");
          switch (post.color) {
            case Colors.ORANGE:
              img.src = orangeCrab;
              break;
            case Colors.BLUE:
              img.src = blueCrab;
              break;
            case Colors.PINK:
              img.src = pinkCrab;
              break;
            case Colors.GREEN:
              img.src = greenCrab;
              break;
            case Colors.YELLOW:
              img.src = yellowCrab;
              break;
          }
          img.className = "responsiveImage";
          imgDiv.append(img);
          let text = document.createElement("div");
          text.textContent = post.content;
          text.className = "responsiveText";
          imgDiv.append(text);
          let likesCount = document.createElement("div");
          likesCount.textContent = "💚" + post.likes;
          likesCount.className = "likesCount";
          imgDiv.append(likesCount);
          likesCount.onclick = () => {
            ClientService.addLike(post.postId)
              .then((result) => {
                if (result) {
                  let newPostLikes = post.likes + 1;
                  likesCount.textContent = "💚" + newPostLikes;
                }
              })
              .catch((error) => {
                console.error("Error adding like: ", error);
              });
          };
          this.crabList.appendChild(imgDiv);
        });
      })
      .catch((error) => {
        console.error("Error loading posts: ", error);
      });
  };

  showOverlay = (visible) => {
    const overlay = document.getElementById("crabListOverlay");
    overlay.style.display = visible ? "block" : "none";
  };

  onMouseClick = (event) => {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.handleSceneClick();
  };

  onTouchStart = (event) => {
    const touch = event.touches[0];

    this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;

    this.handleSceneClick();
  };

  handleSceneClick = () => {
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

      const selectedImage = this.crabList.querySelector(
        "div.imageWrapper.selected"
      );
      if (selectedImage) {
        selectedImage.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
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

  updateCrabs = (delta) => {
    if (this.crabs.length > 0) {
      this.crabs.forEach((crab) => {
        if (crab.you) {
          this.updateGif(crab);
        }
        crab.updateCrab(delta);
      });
    }
  };

  updateGif = (crab) => {
    if (crab.crabObject) {
      this.markerGif.position.set(
        crab.crabBody.position.x,
        crab.crabBody.position.y + 3 * crab.crabObject.scale.y,
        crab.crabBody.position.z
      );
      const now = Date.now();
      if (now - this.lastFrameChangeTime > this.frameDuration) {
        this.lastFrameChangeTime = now;

        this.currentFrame = (this.currentFrame + 1) % this.frameTextures.length;
        this.spriteMaterial.map = this.frameTextures[this.currentFrame];
        this.spriteMaterial.needsUpdate = true;
      }
    }
  };

  animate = (delta) => {
    this.world.step(delta);
    this.leavesMixer.update(delta);
    this.updateCrabs(delta);
  };

  render = () => {
    this.water.material.uniforms["time"].value += 1.0 / 60.0;
    this.renderer.render(this.scene, this.camera);
  };
};
