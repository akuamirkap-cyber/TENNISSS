const fs = require('fs');
let code = fs.readFileSync('src/components/TennisBall.tsx', 'utf8');

const oldDyingLogic = `    if (state.current.dying) {
        state.current.deathTimer += delta;
        const scale = Math.max(0.001, 1 - state.current.deathTimer * 2.0); // shrink over 0.5s
        meshRef.current.scale.setScalar(scale);
        
        if (state.current.deathTimer > 2.0) { // wait 2 seconds for trail to finish
            if (!state.current.dead) {
                state.current.dead = true;
                onRemove();
            }
        }
        
        // simple physics while dying
        state.current.velocity.y -= useEditorStore.getState().ballGravity * delta;
        state.current.position.addScaledVector(state.current.velocity, delta);
        
        const ballRadius = 0.18 * scale;
        if (state.current.position.y <= ballRadius) {
            state.current.position.y = ballRadius;
            state.current.velocity.y *= -0.5;
            state.current.velocity.x *= 0.8;
            state.current.velocity.z *= 0.8;
        }
        
        meshRef.current.position.copy(state.current.position);
        
        meshRef.current.rotation.x += state.current.angularVelocity.x * delta;
        meshRef.current.rotation.y += state.current.angularVelocity.y * delta;
        meshRef.current.rotation.z += state.current.angularVelocity.z * delta;
        
        if (landingGroup.current) landingGroup.current.visible = false;
        
        return;
    }`;

const newDyingLogic = `    if (state.current.dying) {
        state.current.deathTimer += delta;
        
        // Make ball disappear immediately
        meshRef.current.visible = false;
        
        // Fast fade out for trail (0.5 seconds)
        if (state.current.deathTimer > 0.5) {
            if (!state.current.dead) {
                state.current.dead = true;
                onRemove();
            }
        }
        
        // Slow down physics quickly so trail catches up and shrinks
        state.current.velocity.y -= useEditorStore.getState().ballGravity * delta;
        state.current.velocity.multiplyScalar(0.9);
        state.current.position.addScaledVector(state.current.velocity, delta);
        
        meshRef.current.position.copy(state.current.position);
        if (landingGroup.current) landingGroup.current.visible = false;
        
        return;
    }`;

code = code.replace(oldDyingLogic, newDyingLogic);
fs.writeFileSync('src/components/TennisBall.tsx', code);
