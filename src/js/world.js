import * as THREE from 'three';
import { SimplexNoise } from 'three/examples/jsm/Addons.js';
import { RNG } from './rng';
import { blocks, resources } from './blocks.js';

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshLambertMaterial();

export class World extends THREE.Group {
    /**
     * @type {{id: number, instanceId: number}[][][]}
     */
    data = [];

    params = {
        seed: 0,
        terrain: {
            scale: 30,
            magnitude: 0.5,
            offset: 0.2
        }
    };
    constructor(size = {width: 64, height: 32}) {
        super();
        this.size = size;
    }

    /**
     * Generate the world data and meshes
     */
    generate(){
        const rng = new RNG(this.params.seed);
        this.initializeTerrain();
        this.generateResources(rng);
        this.generateTerrain(rng);
        this.generateMeshes(rng);
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
                            x / resource.scale.x,
                            y / resource.scale.y,
                            z / resource.scale.z);
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
                        x / this.params.terrain.scale,
                        z / this.params.terrain.scale,
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
     * Generates the 3D world from the world data generated before
     */
    generateMeshes(){
        this.clear();

        const maxCount = this.size.width * this.size.width * this.size.height;
        
        //createa a lookup table where the key is the block id and the value is the instanced mesh
        const meshes = {};
        Object.values(blocks)
        .filter(blockType => blockType.id !== blocks.empty.id)
        .forEach(blockType => {
            const mesh = new THREE.InstancedMesh(geometry, blockType.material, maxCount);
            mesh.name = blockType.name;
            mesh.count = 0;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            meshes[blockType.id] = mesh; 
        });

        
        const matrix = new THREE.Matrix4();
        for(let x = 0; x < this.size.width; x++){
            for(let y = 0; y < this.size.height; y++){
                for(let z = 0; z < this.size.width; z++){
                    const blockId = this.getBlock(x, y, z).id;
                    
                    if(blockId === blocks.empty.id) continue;

                    const mesh = meshes[blockId];
                    const blockInstanceId = mesh.count;

                    if(!this.isBlockObscured(x, y, z)){
                        matrix.setPosition(x, y, z);
                        mesh.setMatrixAt(blockInstanceId, matrix);
                        this.setBlockInstanceId(x, y, z, blockInstanceId);
                        mesh.count++;
                    }
                }
            }
        }
        this.add(...Object.values(meshes));
    }

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
}