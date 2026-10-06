const fs = require('fs');
let code = fs.readFileSync('src/components/TennisCourt.tsx', 'utf8');

const mumuImport = "import { MumuSkin } from './MumuSkin';\n";
if (!code.includes('MumuSkin')) {
   code = code.replace("import { Text } from '@react-three/drei';", "import { Text } from '@react-three/drei';\n" + mumuImport);
}

const startIdx = code.indexOf('function Audience() {');
const endStr = 'export function TennisCourt() {';
const endIdx = code.indexOf(endStr);

const audienceCode = `function Audience() {
  const audienceData = useMemo(() => {
    const data = [];
    const steps = 5;
    const stepWidth = 1.2;
    const stepHeight = 0.6;
    const stepLength = 20;
    const startX = 12;
    const spacing = 1.0;
    
    const addPerson = (x, y, z, rotY) => {
      if (Math.random() > 0.8) {
        const xOffset = (Math.random() - 0.5) * 0.4;
        const zOffset = (Math.random() - 0.5) * 0.4;
        const rotYOffset = (Math.random() - 0.5) * 0.6;
        
        data.push({
          id: \`aud-\${x}-\${y}-\${z}\`,
          basePos: [x + xOffset, y - 0.1, z + zOffset],
          rotation: [0, rotY + rotYOffset, 0],
        });
      }
    };
    
    for (let i = 0; i < steps; i++) {
        const height = (i + 1) * stepHeight;
        const x = -(startX + i * stepWidth + stepWidth / 2);
        for (let z = -stepLength/2 + 2; z < stepLength/2 - 1; z += spacing) {
            addPerson(x, height, z, Math.PI / 2);
        }
    }
    for (let i = 0; i < steps; i++) {
        const height = (i + 1) * stepHeight;
        const x = startX + i * stepWidth + stepWidth / 2;
        for (let z = -stepLength/2 + 2; z < stepLength/2 - 1; z += spacing) {
            addPerson(x, height, z, -Math.PI / 2);
        }
    }
    for (let i = 0; i < steps; i++) {
        const height = (i + 1) * stepHeight;
        const z = -(10 + i * stepWidth + stepWidth / 2);
        for (let lx = -11; lx <= 11; lx += spacing) {
             addPerson(lx, height, z, 0);
        }
    }
    for (let i = 0; i < steps; i++) {
        const height = (i + 1) * stepHeight;
        const z = 10 + i * stepWidth + stepWidth / 2;
         for (let lx = -11; lx <= 11; lx += spacing) {
             addPerson(lx, height, z, Math.PI);
        }
    }
    
    return data;
  }, []);

  return (
    <group>
      {audienceData.map((data) => (
        <group 
          key={data.id} 
          position={new THREE.Vector3(...data.basePos)} 
          rotation={new THREE.Euler(...data.rotation)}
          scale={0.8}
        >
          <MumuSkin disableAnimation={true} />
        </group>
      ))}
    </group>
  );
}

`;

code = code.substring(0, startIdx) + audienceCode + code.substring(endIdx);
fs.writeFileSync('src/components/TennisCourt.tsx', code);
