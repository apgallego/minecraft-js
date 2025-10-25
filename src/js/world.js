import * as THREE from 'three';
import { WorldChunk } from './worldChunk';

export class World extends THREE.Group {
    
    chunkSize = {
        width: 64,
        height: 32
    };

    params = {
        seed: 0,
        terrain: {
            scale: 30,
            magnitude: 0.5,
            offset: 0.2
        }
    };

    constructor(seed = 0){
        super();
        this.seed = seed;
    }

    generate(){
        this.disposeChunks();
        for(let x = -1; x <= 1; x++ ){
            for(let z = -1; z <= 1; z++ ){
                const chunk = new WorldChunk(this.chunkSize, this.params);
                chunk.position.set(x * this.chunkSize.width, 0, z * this.chunkSize.width);
                chunk.userData = {x, z};
                chunk.generate();
                this.add(chunk);
            }
        }
    }

    /**
     * Returns the coordinates of the block at world (x, y z)
     * @param {number} x 
     * @param {number} y 
     * @param {number} z
     * @returns {{
     *  chunk: x: number, z: number,
     *  block: x: number, y: number, z: number
     * }}
     */
    worldToChunkCoords(x, y, z){
        const chunkCoords = {
            x: Math.floor(x / this.chunkSize.width),
            z: Math.floor(z / this.chunkSize.width),
        };

        const blockCoords = {
            x: x - this.chunkSize.width * chunkCoords.x,
            y,
            z: z - this.chunkSize.width * chunkCoords.z,
        };

        return {
            chunk: chunkCoords,
            block: blockCoords,
        };
    }

    /**
     * Returns the WorldChunk obj at the specified coordinates
     * @param {number} chunkX 
     * @param {number} chunkZ
     * @returns {WorldChunk | null}
     */
        // ...existing code...
        getChunk(chunkX, chunkZ){
            return this.children.find(chunk =>
                chunk.userData &&
                chunk.userData.x === chunkX &&
                chunk.userData.z === chunkZ
            ) || null;
        }
    // ...existing code...
    getBlock(x, y, z){
        const coords = this.worldToChunkCoords(x, y, z);
        const chunk = this.getChunk(coords.chunk.x, coords.chunk.z);

        if(chunk){
            return chunk.getBlock(
                coords.block.x,
                coords.block.y,
                coords.block.z
            );
        } else {
            return null;
        }
    }

    disposeChunks(){
        this.traverse(chunk => {
            if(chunk.disposeInstances) chunk.disposeInstances();
        });
        this.clear();
    }
}