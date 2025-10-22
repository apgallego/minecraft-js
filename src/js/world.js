import * as THREE from 'three';

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshLambertMaterial({ color: 0x00d000 });

export class World extends THREE.Group {
    /**
     * @type {{id: number, instanceId: number}[][][]}
     */
    data = [];
    threshold = 0.5;

    constructor(size = {width: 64, height: 32}) {
        super();
        this.size = size;
    }

    /**
     * Generates terrain data
     */
    generateTerrain(){
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