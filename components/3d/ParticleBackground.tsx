"use client";

import { useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// =============================================
// PARTICLES MESH
// =============================================
function Particles({ count }: { count: number }) {
  const meshRef = useRef<THREE.Points>(null);

  const { positions, colors } = (() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;

      // Purple to cyan gradient
      const t = Math.random();
      col[i * 3] = 0.48 + t * 0.02;      // R: violet -> cyan
      col[i * 3 + 1] = 0.16 + t * 0.55; // G
      col[i * 3 + 2] = 0.93 - t * 0.1;  // B
    }
    return { positions: pos, colors: col };
  })();

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    meshRef.current.rotation.y = t * 0.04;
    meshRef.current.rotation.x = t * 0.02;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// =============================================
// PARTICLE BACKGROUND WRAPPER
// =============================================
import { useState } from "react";

export function ParticleBackground() {
  const [particleCount, setParticleCount] = useState(120);

  useEffect(() => {
    const checkMobile = () => {
      setParticleCount(window.innerWidth < 768 ? 50 : 120);
    };
    // İlk yüklemede kontrol et
    checkMobile();
    // Tarayıcı yeninden boyutlandırıldığında
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none"
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        dpr={[1, 1.5]} // Cap pixel ratio for mobile perf
        gl={{
          antialias: false, // Better mobile perf
          alpha: true,
          powerPreference: "low-power",
        }}
        style={{ background: "transparent" }}
      >
        <Particles count={particleCount} />
      </Canvas>
    </div>
  );
}
