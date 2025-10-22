import * as THREE from 'three';
import { SimplexNoise } from 'three/examples/jsm/Addons.js';
import { RNG } from './rng';

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshLambertMaterial({ color: 0x00d000 });

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
        this.initializeTerrain();
        this.generateTerrain();
        this.generateMeshes();
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
                        id: Math.random() > this.threshold ? 1 : 0,
                        instanceId: null
                    });
                }
                slice.push(row);
            }
            this.data.push(slice);
        }
    }

    generateTerrain(){
        const rng = new RNG(this.params.seed);
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
                    for(let y = 0; y <= height; y++){
                        this.setBlockId(x, y, z, 1);
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
        const mesh = new THREE.InstancedMesh(geometry, material, maxCount);
        mesh.count = 0;
        
        const matrix = new THREE.Matrix4();
        for(let x = 0; x < this.size.width; x++){
            for(let y = 0; y < this.size.height; y++){
                for(let z = 0; z < this.size.width; z++){
                    const blockId = this.getBlock(x, y, z).id;
                    const blockInstanceId = mesh.count;

                    if(blockId !== 0){
                        matrix.setPosition(x + 0.5, y + 0.5, z + 0.5);
                        mesh.setMatrixAt(blockInstanceId, matrix);
                        this.setBlockInstanceId(x, y, z, blockInstanceId);
                        mesh.count++;
                    }
                }
            }
        }

        this.add(mesh);
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
}