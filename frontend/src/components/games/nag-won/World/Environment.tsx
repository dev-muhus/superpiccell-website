import React from 'react';
import { Sky, Environment as DreiEnvironment, Plane } from '@react-three/drei';
import { Color } from 'three';

interface EnvironmentProps {
  skyProps?: {
    sunPosition?: [number, number, number];
    distance?: number;
    turbidity?: number;
    rayleigh?: number;
    mieCoefficient?: number;
    mieDirectionalG?: number;
  };
  groundColor?: string;
  groundSize?: number;
  environmentPreset?: 'sunset' | 'dawn' | 'night' | 'warehouse' | 'forest' | 'apartment' | 'studio' | 'city' | 'park' | 'lobby';
}

export const Environment: React.FC<EnvironmentProps> = ({
  skyProps = {},
  groundColor = '#303030',
  groundSize = 100,
  environmentPreset = 'city',
}) => {
  const defaultSkyProps = {
    sunPosition: [100, 10, 100] as [number, number, number],
    distance: 450,
    turbidity: 10,
    rayleigh: 0.5,
    mieCoefficient: 0.01,
    mieDirectionalG: 0.9,
  };

  const mergedSkyProps = { ...defaultSkyProps, ...skyProps };

  return (
    <>
      {/* 環境光と反射 */}
      <DreiEnvironment preset={environmentPreset} />
      
      {/* 空 */}
      <Sky {...mergedSkyProps} />
      
      {/* 地面 */}
      <Plane 
        args={[groundSize, groundSize]} 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]}
        receiveShadow
      >
        <meshStandardMaterial 
          color={new Color(groundColor)} 
          roughness={0.9}
          metalness={0.1}
        />
      </Plane>
      
      {/* 方向光源 (太陽光) */}
      <directionalLight
        position={[50, 50, 20]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={100}
        shadow-camera-near={0.1}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      
      {/* 環境光 */}
      <ambientLight intensity={0.4} />
      
      {/* 補助光 */}
      <hemisphereLight 
        color={new Color('#aaccff')}
        groundColor={new Color('#223344')}
        intensity={0.5}
      />
    </>
  );
}; 