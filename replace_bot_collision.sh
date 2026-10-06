sed -i '147,285c\
    // Obstacle Avoidance & Collision\
    const rocks = (window as any).stumbleObstacles || [];\
    const cannons = (window as any).cannonBalls || [];\
    const charRadius = 0.5;\
    const charHeight = 2.0;\
    \
    for (let i = 0; i < rocks.length; i++) {\
        const rock = rocks[i];\
        const rockRadius = 1.6;\
        const rockPos = new THREE.Vector3();\
        rock.getWorldPosition(rockPos);\
        \
        const dx = pos.x - rockPos.x;\
        const dy = (pos.y + charHeight/2) - rockPos.y;\
        const dz = pos.z - rockPos.z;\
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);\
        \
        if (dist < rockRadius + charRadius) {\
            const pushDist = (rockRadius + charRadius) - dist;\
            const pushVec = new THREE.Vector3(dx, dy, dz).normalize().multiplyScalar(pushDist);\
            pos.add(pushVec);\
            \
            isJumpingRef.current = true;\
            jumpVelocityRef.current = 10.0;\
            knockbackVelocityRef.current.copy(new THREE.Vector3(dx, 0, dz).normalize().multiplyScalar(15));\
            isTumblingRef.current = true;\
        }\
    }\
    \
    for (let i = 0; i < cannons.length; i++) {\
        const ball = cannons[i];\
        const ballRadius = ball.radius || 1.5;\
        const ballPos = ball.position;\
        \
        const dx = pos.x - ballPos.x;\
        const dy = (pos.y + charHeight/2) - ballPos.y;\
        const dz = pos.z - ballPos.z;\
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);\
        \
        if (dist < ballRadius + charRadius) {\
            const pushDist = (ballRadius + charRadius) - dist;\
            const pushVec = new THREE.Vector3(dx, dy, dz).normalize().multiplyScalar(pushDist);\
            pos.add(pushVec);\
            \
            isJumpingRef.current = true;\
            jumpVelocityRef.current = 15.0;\
            knockbackVelocityRef.current.copy(new THREE.Vector3(dx, 0, dz).normalize().multiplyScalar(20));\
            isTumblingRef.current = true;\
        }\
    }\
' src/components/StumbleBot.tsx
