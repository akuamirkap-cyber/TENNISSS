import React, { Suspense } from 'react';
import { render } from '@testing-library/react';
import { Environment } from '@react-three/drei';

function Test() {
  return <Environment map={{}} ground={{}} preset="city" />;
}
console.log("Syntax is valid");
