"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, RoundedBox } from "@react-three/drei";
import { useLayoutEffect, useRef } from "react";
import type { Group } from "three";
import * as THREE from "three";

type PointerRef = React.MutableRefObject<{ x: number; y: number }>;

/** Soft companion palette: warm shell, gentle accents (not harsh sci-fi). */
const SHELL = "#f4f2ff";
const SHELL_SHADOW = "#e8e4f5";
const FACE_FRAME = "#2d2a3d";
const EYE_SOFT = "#5eead4";
const EYE_CORE = "#2dd4bf";
const CHEEK = "#fda4af";
const ACCENT_SOFT = "#a78bfa";

/** Bust-only VERA: rounded, friendly “guide” bot (modern, approachable). */
function VeraRobot({ pointerRef }: { pointerRef: PointerRef }) {
  const root = useRef<Group>(null);
  const leftEyeMat = useRef<THREE.MeshStandardMaterial>(null);
  const rightEyeMat = useRef<THREE.MeshStandardMaterial>(null);
  const smooth = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    if (!root.current) return;
    const lp = 1 - Math.pow(0.025, delta * 60);
    smooth.current.x += (pointerRef.current.x - smooth.current.x) * lp;
    smooth.current.y += (pointerRef.current.y - smooth.current.y) * lp;
    const px = smooth.current.x;
    const py = smooth.current.y;
    const t = state.clock.elapsedTime;

    /* Calmer idle: small sway, gentle nod (not aggressive scanning). */
    root.current.rotation.y = Math.sin(t * 0.65) * 0.12 + px * 0.22;
    root.current.rotation.x = Math.sin(t * 0.5) * 0.04 + py * 0.12;
    root.current.rotation.z = Math.sin(t * 0.4) * 0.02 + px * -0.03;
    root.current.position.y = Math.sin(t * 1.4) * 0.018;

    const pulse = 0.55 + Math.sin(t * 2.2) * 0.08 + Math.abs(px) * 0.08;
    if (leftEyeMat.current) leftEyeMat.current.emissiveIntensity = pulse;
    if (rightEyeMat.current) rightEyeMat.current.emissiveIntensity = pulse;
  });

  return (
    <group ref={root} position={[0, -0.12, 0]}>
      {/* Upper chest: soft pill shape */}
      <RoundedBox args={[0.52, 0.32, 0.26]} radius={0.08} smoothness={5} position={[0, 0.1, 0]} castShadow>
        <meshStandardMaterial color={SHELL} metalness={0.12} roughness={0.55} />
      </RoundedBox>
      {/* Soft status dot */}
      <mesh position={[0.15, 0.12, 0.125]}>
        <sphereGeometry args={[0.022, 20, 20]} />
        <meshStandardMaterial color="#86efac" emissive="#4ade80" emissiveIntensity={0.25} roughness={0.4} />
      </mesh>

      {/* Shoulder bumps: rounder, smaller */}
      <RoundedBox args={[0.12, 0.1, 0.12]} radius={0.04} position={[-0.32, 0.16, 0]} castShadow>
        <meshStandardMaterial color={SHELL_SHADOW} metalness={0.15} roughness={0.5} />
      </RoundedBox>
      <RoundedBox args={[0.12, 0.1, 0.12]} radius={0.04} position={[0.32, 0.16, 0]} castShadow>
        <meshStandardMaterial color={SHELL_SHADOW} metalness={0.15} roughness={0.5} />
      </RoundedBox>

      {/* Neck */}
      <mesh position={[0, 0.36, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.1, 24]} />
        <meshStandardMaterial color={SHELL_SHADOW} metalness={0.18} roughness={0.48} />
      </mesh>

      {/* Head: large rounded block reads softer than a sharp box */}
      <RoundedBox args={[0.5, 0.44, 0.42]} radius={0.14} smoothness={6} position={[0, 0.66, 0]} castShadow>
        <meshStandardMaterial color={SHELL} metalness={0.1} roughness={0.52} />
      </RoundedBox>

      {/* Ear nubs: soft hemispheres */}
      <mesh position={[-0.27, 0.66, 0.04]} castShadow>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial color={SHELL_SHADOW} metalness={0.12} roughness={0.5} />
      </mesh>
      <mesh position={[0.27, 0.66, 0.04]} castShadow>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial color={SHELL_SHADOW} metalness={0.12} roughness={0.5} />
      </mesh>

      {/* Face window: rounded inset (not a harsh black slab) */}
      <mesh position={[0, 0.64, 0.2]}>
        <boxGeometry args={[0.34, 0.22, 0.04]} />
        <meshStandardMaterial color={FACE_FRAME} metalness={0.25} roughness={0.65} />
      </mesh>

      {/* Cheek warmth (very subtle) */}
      <mesh position={[-0.12, 0.58, 0.215]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshStandardMaterial color={CHEEK} transparent opacity={0.35} roughness={1} />
      </mesh>
      <mesh position={[0.12, 0.58, 0.215]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshStandardMaterial color={CHEEK} transparent opacity={0.35} roughness={1} />
      </mesh>

      {/* Eyes: soft ovals (capsules), lower glow */}
      <mesh position={[-0.09, 0.65, 0.222]} rotation={[0, 0, 0.08]}>
        <capsuleGeometry args={[0.028, 0.05, 6, 12]} />
        <meshStandardMaterial
          ref={leftEyeMat}
          color={EYE_SOFT}
          emissive={EYE_CORE}
          emissiveIntensity={0.45}
          metalness={0.05}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[0.09, 0.65, 0.222]} rotation={[0, 0, -0.08]}>
        <capsuleGeometry args={[0.028, 0.05, 6, 12]} />
        <meshStandardMaterial
          ref={rightEyeMat}
          color={EYE_SOFT}
          emissive={EYE_CORE}
          emissiveIntensity={0.45}
          metalness={0.05}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[-0.082, 0.662, 0.238]}>
        <sphereGeometry args={[0.01, 10, 10]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0.098, 0.662, 0.238]}>
        <sphereGeometry args={[0.01, 10, 10]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.4} />
      </mesh>

      {/* Gentle smile arc (torus segment feel via thin torus) */}
      <mesh position={[0, 0.54, 0.226]} rotation={[0.35, 0, 0]}>
        <torusGeometry args={[0.09, 0.012, 10, 24, Math.PI * 0.95]} />
        <meshStandardMaterial color={ACCENT_SOFT} emissive="#8b5cf6" emissiveIntensity={0.15} roughness={0.4} />
      </mesh>

      {/* Top “halo” nub instead of a spike antenna */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <sphereGeometry args={[0.06, 20, 20]} />
        <meshStandardMaterial
          color="#ddd6fe"
          emissive={ACCENT_SOFT}
          emissiveIntensity={0.18}
          metalness={0.15}
          roughness={0.45}
        />
      </mesh>
    </group>
  );
}

function FaceFramingCamera() {
  const { camera } = useThree();
  useLayoutEffect(() => {
    const c = camera as THREE.PerspectiveCamera;
    c.fov = 46;
    c.position.set(0, 0.38, 2.05);
    c.lookAt(0, 0.4, 0);
    c.updateProjectionMatrix();
  }, [camera]);
  return null;
}

export function VeraRobotScene({ pointerRef }: { pointerRef: PointerRef }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0.38, 2.05], fov: 46 }}
      className="h-full w-full"
    >
      <FaceFramingCamera />
      <hemisphereLight args={["#f0ebff", "#c4b5fd", 0.72]} />
      <ambientLight intensity={0.48} color="#faf5ff" />
      <directionalLight position={[4, 7, 5]} intensity={0.85} color="#fff7ed" />
      <directionalLight position={[-3, 2.5, -1.5]} intensity={0.28} color="#e9d5ff" />
      <pointLight position={[-1.5, 1.2, 2]} intensity={0.4} color="#99f6e4" distance={7} />
      <pointLight position={[1.8, 0.8, 1.8]} intensity={0.28} color="#ddd6fe" distance={6} />
      <VeraRobot pointerRef={pointerRef} />
      <ContactShadows position={[0, -0.26, 0]} opacity={0.32} scale={7} blur={2.4} far={3} color="#1e1b2e" />
    </Canvas>
  );
}
