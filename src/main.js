import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { World } from './js/world.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { createUI } from './js/ui.js';

const stats = new Stats();
document.body.appendChild(stats.dom);

/**
 * Renderer setup
 */
const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x80a0ef); //sky blue
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
world.generateTerrain();
world.generateMeshes();
scene.add(world);

//add light
const setupLights = () => {
    const l1 = new THREE.DirectionalLight();
    l1.position.set(1, 1, 1);
    scene.add(l1);

    const l2 = new THREE.DirectionalLight();
    l2.position.set(-1, 1, -0.5);
    scene.add(l2);

    const ambient = new THREE.AmbientLight();
    ambient.intensity = 0.1;
    scene.add(ambient);
};

/**
 * Render loop
 */
const animate = () => {
    requestAnimationFrame(animate);
    // cube.rotation.x += 0.01;
    // cube.rotation.y += 0.01;
    // cube.rotation.z += 0.01;
    renderer.render(scene, camera);
    stats.update();
};

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


// -- init --
setupLights();
createUI(world);
animate();