import * as THREE from 'three';
import { SimplexNoise } from 'three/examples/jsm/Addons.js';
import { RNG } from './rng.js';
import { blocks, resources } from './blocks.js';
import { instancedMesh } from 'three/tsl';

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshLambertMaterial();

export class WorldChunk extends THREE.Group {
    /**
     * @type {{id: number, instanceId: number}[][][]}
     */
    data = [];

    constructor(size, params, dataStore) {
        super();
        this.loaded = false;
        this.size = size;
        this.params = params;
        this.dataStore = dataStore;
    }

    /**
     * Generate the world data and meshes
     */
    generate(){
        const start = performance.now();
        

        const rng = new RNG(this.params.seed);
        this.initializeTerrain();
        this.generateResources(rng);
        this.generateTerrain(rng);
        this.generateTrees(rng);
        this.generateClouds(rng);
        this.loadPlayerChanges();
        this.generateMeshes(rng);

        this.loaded = true;
    }

    /**
     * Initializing terrain data
     */
    initializeTerrain(){
        this.data = [];
        for(let x = 0; x < this.size.width; x++){
            const slice = [];
            for(let y = 0; y < this.size.height; y++){
                const row = [];
                for(let z = 0; z < this.size.width; z++){
                    row.push({
                        id: blocks.empty.id,
                        instanceId: null
                    });
                }
                slice.push(row);
            }
            this.data.push(slice);
        }
    }

    /**
     * Generates resources like coal, stone, etc.
     */
    generateResources(rng){
        const simplex = new SimplexNoise(rng);
        resources.forEach(resource => {
            for(let x = 0; x < this.size.width; x++){
                for(let y = 0; y < this.size.height; y++){
                    for(let z = 0; z < this.size.width; z++){
                        const value = simplex.noise3d(
                            (this.position.x + x) / resource.scale.x,
                            (this.position.y + y) / resource.scale.y,
                            (this.position.z + z) / resource.scale.z);
                        if(value > resource.scarcity){
                            this.setBlockId(x, y, z, resource.id);
                        }
                    }
                }
            }
        });
    }

    generateTerrain(rng){
        const simplex = new SimplexNoise(rng);
        
        for(let x = 0; x < this.size.width; x++){
            for(let y = 0; y < this.size.height; y++){
                for(let z = 0; z < this.size.width; z++){
                    //get the noise value at x, z location
                    const value = simplex.noise(
                        (this.position.x + x) / this.params.terrain.scale,
                        (this.position.z + z) / this.params.terrain.scale,
                    );
                    //get the noise based on the magnitued/offset
                    const scaledNoise = this.params.terrain.offset + this.params.terrain.magnitude * value;
                    //get the height of the terrein at x, z
                    let height = Math.floor(this.size.height * scaledNoise);
                    height = Math.max(0, Math.min(height, this.size.height - 1));

                    //fill in all blocks at or below the terrain height
                    for(let y = 0; y <= this.size.height; y++){
                        if(y < height && this.getBlock(x, y, z).id === blocks.empty.id){
                            this.setBlockId(x, y, z, blocks.dirt.id);
                        } else if(y === height){
                            this.setBlockId(x, y, z, blocks.grass.id);
                        } else if(y > height){
                            this.setBlockId(x, y, z, blocks.empty.id);
                        }
                    }

                }
            }
        }
    }

    /**
     * Populate the world with trees
     * @param {RNG} rng
     */
    generateTrees(rng){
        const generateTreeTrunk = (x, z, rng) => {
            const minH = this.params.trees.trunk.minHeight;
            const maxH = this.params.trees.trunk.maxHeight;
            const h = Math.round(minH + (maxH - minH) * rng.random());

            //Search for the grass block which indicates the top of the terrain
            for(let y = 0; y < this.size.height; y++){
                const block = this.getBlock(x, y, z);
                //grass block found
                if(block && block.id === blocks.grass.id){
                    //The trunk of the tree starts here
                    for(let treeY = y + 1; treeY <= y + h; treeY++){
                        this.setBlockId(x, treeY, z, blocks.tree.id);
                    }

                    //generate canopy centered on top of the tree
                    generateTreeCanopy(x, y + h, z, rng);
                    break;
                }
            }
        };

        const generateTreeCanopy = (centerX, centerY, centerZ, rng) => {
            const minR = this.params.trees.canopy.minRadius;
            const maxR = this.params.trees.canopy.maxRadius;
            const r = Math.round(minR + (maxR - minR) * rng.random());

            for(let x = -r; x <= r; x++){
                for(let y = -r; y <= r; y++){
                    for(let z = -r; z <= r; z++){
                        const n = rng.random();
                        //make sure the block is within the canopy radius
                        if(x * x + y * y + z * z > r * r) continue;
    
                        // don't overwrite an existing block
                        const block = this.getBlock(centerX + x, centerY + y, centerZ + z);
                        if(block && block.id !== blocks.empty.id) continue;
                        
                        //fill the tree canopy with leaves based on the density param
                        if(n < this.params.trees.canopy.density){
                            this.setBlockId(centerX + x, centerY + y, centerZ + z, blocks.leaves.id);
                        }
                    }
                }
            }
        }

        let offset = this.params.trees.canopy.maxRadius;
        for(let x = offset; x < this.size.width - offset; x++){
            for(let z = offset; z < this.size.width - offset; z++){
                if(rng.random() < this.params.trees.frequency){
                    generateTreeTrunk(x, z, rng);
                }
            }
        }
    }

    /**
     * Creates clouds
     * @param {RNG} rng
     */
    generateClouds(rng){
        const simplex = new SimplexNoise(rng);
        for(let x = 0; x < this.size.width; x++){
            for(let z = 0; z < this.size.width; z++){
                const value = (simplex.noise(
                    (this.position.x + x) / this.params.clouds.scale,
                    (this.position.z + z) / this.params.clouds.scale
                ) + 1) * 0.5;

                if(value < this.params.clouds.density){
                    this.setBlockId(x, this.size.height - 1, z, blocks.cloud.id);
                }
            }
        }
    }

    /**
     * Pulls any changes from the data store and applies them to the data model
     */
    loadPlayerChanges(){
        for(let x = 0; x < this.size.width; x++){
            for(let y = 0; y < this.size.height; y++){
                for(let z = 0; z < this.size.width; z++){
                    if(this.dataStore.contains(this.position.x, this.position.z, x, y, z)){
                        const blockId = this.dataStore.get(this.position.x, this.position.z, x, y, z);
                        this.setBlockId(x, y, z, blockId);
                    }
                }
            }
        }
    }

    /**
     * Generates the 3D world from the world data generated before
     */
        /**
     * Generates the 3D world from the world data generated before
     * Distributes the mesh generation across multiple frames to avoid stuttering
     */
    generateMeshes(){
        this.clear();

        const maxCount = this.size.width * this.size.width * this.size.height;
        
        // create a lookup table where the key is the block id and the value is the instanced mesh
        const meshes = {};
        Object.values(blocks)
        .filter(blockType => blockType.id !== blocks.empty.id)
        .forEach(blockType => {
            const mesh = new THREE.InstancedMesh(geometry, blockType.material, maxCount);
            mesh.name = blockType.id;
            mesh.count = 0;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            meshes[blockType.id] = mesh; 
        });

        const matrix = new THREE.Matrix4();
        const totalBlocks = this.size.width * this.size.width * this.size.height;
        let blockIndex = 0;
        
        // procesamiento por lotes: max 5000 bloques por frame
        const processBlocks = () => {
            const blocksPerFrame = 5000;
            const startIndex = blockIndex;

            while(blockIndex < totalBlocks && blockIndex - startIndex < blocksPerFrame){
                // convertir índice lineal a coordenadas x, y, z
                const x = Math.floor(blockIndex / (this.size.height * this.size.width));
                const remainder = blockIndex % (this.size.height * this.size.width);
                const y = Math.floor(remainder / this.size.width);
                const z = remainder % this.size.width;

                const blockId = this.getBlock(x, y, z).id;
                
                if(blockId !== blocks.empty.id){
                    const mesh = meshes[blockId];
                    const blockInstanceId = mesh.count;

                    if(!this.isBlockObscured(x, y, z)){
                        matrix.setPosition(x, y, z);
                        mesh.setMatrixAt(blockInstanceId, matrix);
                        this.setBlockInstanceId(x, y, z, blockInstanceId);
                        mesh.count++;
                    }
                }
                
                blockIndex++;
            }

            // si aún quedan bloques, procesar en el siguiente frame
            if(blockIndex < totalBlocks){
                requestAnimationFrame(processBlocks);
            } else {
                // cuando termine, añadir todos los meshes
                this.add(...Object.values(meshes));
            }
        };

        requestAnimationFrame(processBlocks);
    }
// ...existing code...

    /**
     * Gets the block data at x, y, z
     * @param {number} x 
     * @param {number} y 
     * @param {number} z
     * @return {{id: number, instanceId: number}|null}
     */
    getBlock(x, y, z){
        if(this.inBounds(x, y, z))
            return this.data[x][y][z];
        return null;
    }

    /**
     * Sets the block id for the block at x, y, z
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @param {number} id 
     */
    setBlockId(x, y, z, id){
        if(this.inBounds(x, y, z))
            this.data[x][y][z].id = id;
    }

    /**
     * Sets the block instanceId for the block at x, y, z
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @param {number} instanceId 
     */
    setBlockInstanceId(x, y, z, instanceId){
        if(this.inBounds(x, y, z))
            this.data[x][y][z].instanceId = instanceId;
    }

    /**
     * Removes the block at x, y, z and sets it to empty
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    removeBlock(x, y, z){
        //the bottom layer of the terrain cannot be broken!
        if(y === 0) return;
        
        const block = this.getBlock(x, y, z);
        if(!block || block.id === blocks.empty.id) return;

        // delete visual instance first
        if(block.instanceId !== null) this.deleteBlockInstance(x, y, z);

        //update adj blocks
        const adj = [
            [x+1,y,z],
            [x-1,y,z],
            [x,y+1,z],
            [x,y-1,z],
            [x,y,z+1],
            [x,y,z-1]
        ];

        for(const [ax,ay,az] of adj){
            const a = this.getBlock(ax, ay, az);
            if(a && a.id !== blocks.empty.id && a.instanceId === null && !this.isBlockObscured(ax, ay, az)){
                this.addBlockInstance(ax, ay, az);
            }
        }

        // mark block as empty
        this.setBlockId(x, y, z, blocks.empty.id);

        this.dataStore.set(this.position.x, this.position.z, x, y, z, blocks.empty.id);
    }

    /**
     * Removes the mesh instance associated with 'block' by swapping it with
     * the last instance and decrementing the instance count
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    deleteBlockInstance(x, y, z){
        const block = this.getBlock(x, y, z);
        if(!block || block.instanceId === null) return;

        const mesh = this.children.find(m => m.name === block.id);
        if(!mesh) return;

        const removeId = block.instanceId;
        const lastIndex = mesh.count - 1;

        if(removeId !== lastIndex){
            //brings the matric of the last element and moves it into the position of the removed element
            const lastMatrix = new THREE.Matrix4();
            mesh.getMatrixAt(lastIndex, lastMatrix);

            mesh.setMatrixAt(removeId, lastMatrix);

            //obtains the position of the last element to update its block (instanceId)
            const pos = new THREE.Vector3();
            lastMatrix.decompose(pos, new THREE.Quaternion(), new THREE.Vector3());
            const lx = Math.round(pos.x);
            const ly = Math.round(pos.y);
            const lz = Math.round(pos.z);

            const lastBlock = this.getBlock(lx, ly, lz);
            if(lastBlock) {
                //updates the instanceId of the block that was moved
                this.setBlockInstanceId(lx, ly, lz, removeId);
            }
        }

        //update mesh
        mesh.count = Math.max(0, mesh.count - 1);
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();

        // clean the removed block data
        this.setBlockInstanceId(x, y, z, null);
    }

    /**
     * Create a new instance for the block at x, y, z
     * @param {number} x,
     * @param {number} y,
     * @param {number} z,
     */
    addBlockInstance(x, y, z){
        const block = this.getBlock(x, y, z);
        if(!block || block.id === blocks.empty.id) return;

        // avoid duplicated blocks
        if(block.instanceId !== null) return;

        const mesh = this.children.find(m => m.name === block.id);
        if(!mesh) return;

        const matrix = new THREE.Matrix4();
        matrix.setPosition(x, y, z);

        const instanceId = mesh.count;
        mesh.setMatrixAt(instanceId, matrix);
        mesh.count = instanceId + 1;

        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();

        this.setBlockInstanceId(x, y, z, instanceId);
    }

    /**
     * Checks if the given x, y, z coordinates are within the world bounds
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @return {boolean}
     */
    inBounds(x, y, z){
        return x >= 0 && x < this.size.width &&
               y >= 0 && y < this.size.height &&
               z >= 0 && z < this.size.width;
    }

    /**
     * Returns true if this block is completely hidden by other blocks
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @return {boolean}
     */
    isBlockObscured(x, y, z){
        const up = this.getBlock(x, y + 1, z)?.id ?? blocks.empty.id;
        const down = this.getBlock(x, y - 1, z)?.id ?? blocks.empty.id;
        const left = this.getBlock(x + 1, y, z)?.id ?? blocks.empty.id;
        const right = this.getBlock(x - 1, y, z)?.id ?? blocks.empty.id;
        const front = this.getBlock(x, y, z + 1)?.id ?? blocks.empty.id;
        const back = this.getBlock(x, y, z - 1)?.id ?? blocks.empty.id;

        //all sides must be hidden to be considered obscured
        return up !== blocks.empty.id &&
               down !== blocks.empty.id &&
               left !== blocks.empty.id &&
               right !== blocks.empty.id &&
               front !== blocks.empty.id &&
               back !== blocks.empty.id;
    }

    disposeInstances() {
        this.traverse(obj => {
            if(obj.dispose) obj.dispose();
        });
        this.clear();
    }

    /**
     * Adds a new block at x, y, z
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} blockId
     */
    addBlock(x, y, z, blockId){
        if(this.getBlock(x, y, z).id === blocks.empty.id) {
            this.setBlockId(x, y, z, blockId);
            this.addBlockInstance(x, y, z);
            this.dataStore.set(this.position.x, this.position.z, x, y, z, blockId);
        }
    }
}