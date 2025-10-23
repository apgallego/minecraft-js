import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { World } from './js/world.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { createUI } from './js/ui.js';
import { shadow } from 'three/tsl';
import { Player } from './js/player.js';

const stats = new Stats();
document.body.appendChild(stats.dom);

/**
 * Renderer setup
 */
const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x80a0ef); //sky blue
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

/**
 * Camera setup
 */
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight);
camera.position.set(2, 2, 2);
camera.lookAt(0, 0, 0);

//camera controls setup
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(16, 0, 16);
controls.update();

/**
 * Scene setup
 */
const scene = new THREE.Scene();
const world = new World();
world.generate();
scene.add(world);

const player = new Player(scene);

//add light
const setupLights = () => {
    const sun = new THREE.DirectionalLight();
    sun.position.set(50, 50, 50);
    sun.castShadow = true;
    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.bottom = -50;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.near = 0.1;
    sun.shadow.camera.far = 100;
    sun.shadow.bias = -0.0005;
    sun.shadow.mapSize = new THREE.Vector2(1024, 1024);

    scene.add(sun);

    // shows the light source (for debugging)
    // const shadowHelper = new THREE.CameraHelper(sun.shadow.camera);
    // scene.add(shadowHelper);

    const ambient = new THREE.AmbientLight();
    ambient.intensity = 0.1;
    scene.add(ambient);
};

/**
 * Render loop
 */
let previousTime = performance.now();
const animate = () => {
    let currentTime = performance.now();
    let deltaTime = (currentTime - previousTime) / 1000;

    requestAnimationFrame(animate);
    player.applyInputs(deltaTime);
    renderer.render(scene, player.camera);
    stats.update();

    previousTime = currentTime;
};

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


// -- init --
setupLights();
createUI(world, player);
animate();