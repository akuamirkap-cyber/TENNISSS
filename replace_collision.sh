sed -i '530,663c\
    // Check collision with Stumble obstacles\
    let isStandingOnObstacle = false;\
    if (gameMode === "stumble") {\
        const charPos = characterRef.current.position;\
        const charRadius = 0.5;\
        const charHeight = 2.0;\
        \
        const rocks = (window as any).stumbleObstacles || [];\
        const cannons = (window as any).cannonBalls || [];\
        \
        // Spherical collision for rocks\
        for (let i = 0; i < rocks.length; i++) {\
            const rock = rocks[i];\
            const rockRadius = 1.6;\
            const rockPos = new THREE.Vector3();\
            rock.getWorldPosition(rockPos);\
            \
            const dx = charPos.x - rockPos.x;\
            const dy = (charPos.y + charHeight/2) - rockPos.y;\
            const dz = charPos.z - rockPos.z;\
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);\
            \
            if (dist < rockRadius + charRadius) {\
                const pushDist = (rockRadius + charRadius) - dist;\
                const pushVec = new THREE.Vector3(dx, dy, dz).normalize().multiplyScalar(pushDist);\
                charPos.add(pushVec);\
                \
                isJumpingRef.current = true;\
                jumpVelocityRef.current = 10.0;\
                knockbackVelocityRef.current.copy(new THREE.Vector3(dx, 0, dz).normalize().multiplyScalar(15));\
                isTumblingRef.current = true;\
                setGameAction("stumble");\
            }\
        }\
        \
        // Spherical collision for cannon balls\
        for (let i = 0; i < cannons.length; i++) {\
            const ball = cannons[i];\
            const ballRadius = ball.radius || 1.5;\
            const ballPos = ball.position;\
            \
            const dx = charPos.x - ballPos.x;\
            const dy = (charPos.y + charHeight/2) - ballPos.y;\
            const dz = charPos.z - ballPos.z;\
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);\
            \
            if (dist < ballRadius + charRadius) {\
                const pushDist = (ballRadius + charRadius) - dist;\
                const pushVec = new THREE.Vector3(dx, dy, dz).normalize().multiplyScalar(pushDist);\
                charPos.add(pushVec);\
                \
                isJumpingRef.current = true;\
                jumpVelocityRef.current = 15.0;\
                knockbackVelocityRef.current.copy(new THREE.Vector3(dx, 0, dz).normalize().multiplyScalar(20));\
                isTumblingRef.current = true;\
                setGameAction("stumble");\
            }\
        }\
    }\
' src/components/TennisCharacter.tsx
