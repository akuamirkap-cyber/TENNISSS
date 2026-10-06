import * as THREE from 'three';

export interface ObstacleData {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    rotSpeed: number;
    halfWidth: number;
    halfHeight: number;
    halfDepth: number;
    radius: number;
}

export class StumbleBotBrain {
    static getUpcomingObstacles(pos: THREE.Vector3, obstacles: any[]): ObstacleData[] {
        if (!obstacles) return [];
        return obstacles
            .filter(obs => obs.position.z < pos.z + 5 && obs.position.z > pos.z - 35)
            .sort((a, b) => b.position.z - a.position.z)
            .slice(0, 4)
            .map(obs => ({
                position: obs.position,
                rotation: obs.rotation,
                rotSpeed: obs.userData.rotSpeed || 2.1,
                halfWidth: 6.0,
                halfHeight: 0.5,
                halfDepth: 0.5,
                radius: 0.5
            }));
    }

    static isBlockedAtTime(x: number, z: number, t: number, obstacles: ObstacleData[]) {
        let hit = false;
        let safeRadius = 0.8;
        for (const obs of obstacles) {
            if (Math.abs(z - obs.position.z) > 15) continue;
            
            const fRotY = obs.rotation.y + obs.rotSpeed * t;
            const dx = x - obs.position.x;
            const dz = z - obs.position.z;
            
            const cos = Math.cos(-fRotY);
            const sin = Math.sin(-fRotY);
            const localX = dx * cos - dz * sin;
            const localZ = dx * sin + dz * cos;
            
            if (Math.abs(localX) < obs.halfWidth + safeRadius && 
                Math.abs(localZ) < obs.radius + safeRadius) {
                hit = true;
                break;
            }
        }
        return hit;
    }

    static planMove(
        pos: THREE.Vector3,
        currentVelocity: THREE.Vector3,
        speed: number,
        rawObstacles: any[],
        isJumping: boolean,
        id: number,
        trainingData?: { time: number; x: number; z: number; moveX: number; moveZ: number; jump: boolean }[]
    ): { moveX: number; moveZ: number; jump: boolean; jumpForce: number } {
        if (pos.z < -100) return { moveX: 0, moveZ: 0, jump: false, jumpForce: 0 };
        
        const obstacles = this.getUpcomingObstacles(pos, rawObstacles);
        const maxSpeed = speed * 2.2;
        
        // --- A* Pathfinding Grid Implementation ---
        // State is represented by [gridX, gridZ] where grid cells are 1.5x1.5m
        const CELL_SIZE = 1.5;
        const TARGET_Z_OFFSET = -18; // Look ahead 18 units
        
        const startGX = Math.round(pos.x / CELL_SIZE);
        const startGZ = Math.round(pos.z / CELL_SIZE);
        const targetGZ = Math.round((pos.z + TARGET_Z_OFFSET) / CELL_SIZE);
        
        interface Node {
            x: number;
            z: number;
            t: number; // estimated time to reach
            g: number; // cost so far
            f: number; // g + heuristic
            parent: Node | null;
            jumpRequired: boolean;
        }
        
        let openList: Node[] = [];
        let closedSet = new Set<string>();
        
        openList.push({
            x: startGX,
            z: startGZ,
            t: 0,
            g: 0,
            f: 0,
            parent: null,
            jumpRequired: false
        });
        
        let bestNode: Node | null = null;
        let iter = 0;
        
        while (openList.length > 0 && iter < 100) { // Max 100 iterations to keep 60fps
            iter++;
            // Pop lowest f
            openList.sort((a, b) => a.f - b.f);
            let current = openList.shift()!;
            
            if (bestNode === null || current.z < bestNode.z) {
                bestNode = current; // Keep track of the furthest we got
            }
            
            if (current.z <= targetGZ) {
                bestNode = current;
                break;
            }
            
            let stateKey = `${current.x},${current.z}`;
            if (closedSet.has(stateKey)) continue;
            closedSet.add(stateKey);
            
            // Neighbors: Forward, Forward-Left, Forward-Right, Left, Right
            const neighbors = [
                { dx: 0, dz: -1 },
                { dx: -1, dz: -1 },
                { dx: 1, dz: -1 },
                { dx: -1, dz: 0 },
                { dx: 1, dz: 0 }
            ];
            
            for (let n of neighbors) {
                let nx = current.x + n.dx;
                let nz = current.z + n.dz;
                
                // Bounds check
                if (nx * CELL_SIZE < -6.5 || nx * CELL_SIZE > 6.5) continue;
                
                let dist = Math.sqrt(n.dx*n.dx + n.dz*n.dz) * CELL_SIZE;
                let tReach = current.t + (dist / maxSpeed);
                
                let isBlocked = this.isBlockedAtTime(nx * CELL_SIZE, nz * CELL_SIZE, tReach, obstacles);
                let jumpRequired = current.jumpRequired;
                let cost = current.g + dist;
                
                if (isBlocked) {
                    // Can we jump over it? 
                    // Let's add a massive jump penalty so it only jumps if absolutely necessary.
                    jumpRequired = true;
                    cost += 50; // Heavy penalty for going through an obstacle (representing a jump)
                }
                
                // Heuristic: pure Z distance to target
                let h = Math.abs(nz - targetGZ) * CELL_SIZE;
                
                // Prefer center slightly
                cost += Math.abs(nx) * 0.1;
                
                openList.push({
                    x: nx,
                    z: nz,
                    t: tReach,
                    g: cost,
                    f: cost + h,
                    parent: current,
                    jumpRequired: jumpRequired
                });
            }
        }
        
        // Trace back the path to find the immediate next move
        let nextMoveX = 0;
        let nextMoveZ = -1;
        let requiresJump = false;
        
        if (bestNode && bestNode.parent) {
            let path = [];
            let curr: Node | null = bestNode;
            while (curr && curr.parent) {
                path.push(curr);
                curr = curr.parent;
            }
            path.reverse(); // Now ordered from first step to last
            
            // Pick a node further ahead to smoothly aim for
            const lookaheadStep = Math.min(2, path.length - 1);
            const targetNode = path[lookaheadStep];
            
            const targetX = targetNode.x * CELL_SIZE;
            const targetZ = targetNode.z * CELL_SIZE;
            
            const dx = targetX - pos.x;
            const dz = targetZ - pos.z;
            
            const len = Math.sqrt(dx*dx + dz*dz);
            if (len > 0.01) {
                nextMoveX = dx / len;
                nextMoveZ = dz / len;
            }
            
            // If the immediate next step requires a jump, we jump
            requiresJump = path[0].jumpRequired;
        }
        
        // Imitation Bias: follow training data if available
        if (trainingData && trainingData.length > 0) {
            let closestDist = Infinity;
            let bestFrame = null;
            for (const frame of trainingData) {
                const dist = Math.abs(frame.z - pos.z);
                if (dist < closestDist) {
                    closestDist = dist;
                    bestFrame = frame;
                }
            }
            if (bestFrame && closestDist < 2.5) {
                if (bestFrame.jump) requiresJump = true;
            }
        }
        
        let jump = false;
        let jumpForce = 0;
        
        // Only jump if we actually detected an obstacle in our immediate face
        if (requiresJump && !isJumping && pos.y < 0.2) {
            // Confirm it's hitting soon
            let immediateHit = this.isBlockedAtTime(pos.x + nextMoveX*1.5, pos.z + nextMoveZ*1.5, 0.1, obstacles);
            if (immediateHit) {
                jump = true;
                jumpForce = 14.0 + (id % 2) * 1.5;
            }
        }
        
        // Mid-air slight steering corrections
        if (isJumping) {
            if (pos.x < -6.0) nextMoveX += 0.3;
            if (pos.x > 6.0) nextMoveX -= 0.3;
        }
        
        return { 
            moveX: nextMoveX * 1.0, 
            moveZ: nextMoveZ * 1.0, 
            jump, 
            jumpForce 
        };
    }
}
