import * as THREE from "three";

const textureLoader = new THREE.TextureLoader();

function loadTexture(path) {
  const texture = textureLoader.load(path); //should be async
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  return texture;
}

export const textures = {
  dirt: loadTexture("textures/dirt.png"),
  grass: loadTexture("textures/grass.png"),
  grassSide: loadTexture("textures/grass_side.png"),
  stone: loadTexture("textures/stone.png"),
  coalOre: loadTexture("textures/coal_ore.png"),
  ironOre: loadTexture("textures/iron_ore.png"),
  leaves: loadTexture("textures/leaves.png"),
  treeSide: loadTexture("textures/tree_side.png"),
  treeTop: loadTexture("textures/tree_top.png"),
  sand: loadTexture("textures/sand.png"),
};

export const blocks = {
  empty: {
    id: 0,
    name: "empty",
  },
  grass: {
    id: 1,
    name: "grass",
    color: 0x55ca20,
    material: [
      //max 6 materials
      new THREE.MeshLambertMaterial({ map: textures.grassSide }), //right
      new THREE.MeshLambertMaterial({ map: textures.grassSide }), //left
      new THREE.MeshLambertMaterial({ map: textures.grass }), //top
      new THREE.MeshLambertMaterial({ map: textures.dirt }), //bot
      new THREE.MeshLambertMaterial({ map: textures.grassSide }), //front
      new THREE.MeshLambertMaterial({ map: textures.grassSide }), //back
    ],
  },
  dirt: {
    id: 2,
    name: "dirt",
    color: 0x847020,
    material: new THREE.MeshLambertMaterial({ map: textures.dirt }),
  },
  stone: {
    id: 3,
    name: "stone",
    color: 0x808080,
    scale: { x: 30, y: 30, z: 30 },
    scarcity: 0.5,
    material: new THREE.MeshLambertMaterial({ map: textures.stone }),
  },
  coalOre: {
    id: 4,
    name: "coalOre",
    color: 0x202020,
    scale: { x: 20, y: 20, z: 20 },
    scarcity: 0.8,
    material: new THREE.MeshLambertMaterial({ map: textures.coalOre }),
  },
  ironOre: {
    id: 5,
    name: "ironOre",
    color: 0x806060,
    scale: { x: 60, y: 60, z: 60 },
    scarcity: 0.8,
    material: new THREE.MeshLambertMaterial({ map: textures.ironOre }),
  },
  tree: {
    id: 6,
    name: "tree",
    material: [
      new THREE.MeshLambertMaterial({ map: textures.treeSide }),
      new THREE.MeshLambertMaterial({ map: textures.treeSide }),
      new THREE.MeshLambertMaterial({ map: textures.treeTop }),
      new THREE.MeshLambertMaterial({ map: textures.treeTop }),
      new THREE.MeshLambertMaterial({ map: textures.treeSide }),
      new THREE.MeshLambertMaterial({ map: textures.treeSide }),
    ],
  },
  leaves: {
    id: 7,
    name: "leaves",
    material: new THREE.MeshLambertMaterial({ map: textures.leaves }),
  },
  //TRANSPARENT LEAVES (TEST)
  // leaves: {
  //     id: 7,
  //     name: "leaves",
  //     material: new THREE.MeshLambertMaterial({
  //         map: textures,
  //         transparent: true,
  //         // A lower alphaTest prevents thin edges from being cut off too aggressively;
  //         // try 0.05-0.2 depending on your PNG
  //         alphaTest: 0.1,
  //         side: THREE.DoubleSide
  //     }),
  // },
  sand: {
    id: 8,
    name: "sand",
    material: new THREE.MeshLambertMaterial({ map: textures.sand }),
  },
  cloud: {
    id: 9,
    name: "cloud",
    material: new THREE.MeshBasicMaterial({ color: 0xf0f0f0 }),
  },
};

export const resources = [blocks.stone, blocks.coalOre, blocks.ironOre];
