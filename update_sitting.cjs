const fs = require('fs');
let code = fs.readFileSync('src/components/MumuSkin.tsx', 'utf8');

if (!code.includes('isSitting?: boolean')) {
   code = code.replace("disableAnimation?: boolean;", "disableAnimation?: boolean;\n  isSitting?: boolean;");
}
if (!code.includes('isSitting = false')) {
   code = code.replace("disableAnimation = false", "disableAnimation = false,\n  isSitting = false");
}

code = code.replace(
   "<group ref={leftLegRef} position={[-mousePartSizes.legX - 0.05, mousePartSizes.legY, 0]} scale={[mousePartSizes.legs * 1.0, mousePartSizes.legs * 1.0, mousePartSizes.legs * 1.0]}>",
   "<group ref={leftLegRef} position={[-mousePartSizes.legX - 0.05, mousePartSizes.legY + (isSitting ? 0.1 : 0), (isSitting ? 0.2 : 0)]} rotation={[isSitting ? -Math.PI / 2 : 0, 0, 0]} scale={[mousePartSizes.legs * 1.0, mousePartSizes.legs * 1.0, mousePartSizes.legs * 1.0]}>"
);
code = code.replace(
   "<group ref={rightLegRef} position={[mousePartSizes.legX + 0.05, mousePartSizes.legY, 0]} scale={[mousePartSizes.legs * 1.0, mousePartSizes.legs * 1.0, mousePartSizes.legs * 1.0]}>",
   "<group ref={rightLegRef} position={[mousePartSizes.legX + 0.05, mousePartSizes.legY + (isSitting ? 0.1 : 0), (isSitting ? 0.2 : 0)]} rotation={[isSitting ? -Math.PI / 2 : 0, 0, 0]} scale={[mousePartSizes.legs * 1.0, mousePartSizes.legs * 1.0, mousePartSizes.legs * 1.0]}>"
);

fs.writeFileSync('src/components/MumuSkin.tsx', code);
