"use client";

/**
 * CutePetScene3D — a playful WebGL backdrop for the PetSwipe hero.
 *
 * Notes:
 *  - Procedural geometry only. No binary assets (.glb/.gltf/.hdr/textures).
 *  - Adorable, pastel "toy" motif: puffy hearts, dog bones, paw prints and
 *    balloons floating over soft sparkle dust, all in MeshToonMaterial for a
 *    cartoon look on the light hero.
 *  - Shapes are scattered in a wide ring so the hero copy stays clear at center.
 *  - Reacts to cursor (parallax + tilt) and scroll (drift + gentle spin).
 *  - Adapts to the device (low / mobile / desktop), honors reduced-motion,
 *    pauses while the tab is hidden, and degrades to nothing without WebGL.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* ------------------------------------------------------------------ input -- */
type LiveInput = {
  px: number;
  py: number;
  scroll: number;
  reduced: boolean;
};

const InputContext = createContext<React.MutableRefObject<LiveInput> | null>(
  null,
);
function useInput() {
  const ref = useContext(InputContext);
  if (!ref) throw new Error("useInput must be used inside CutePetScene3D");
  return ref;
}

const damp = THREE.MathUtils.damp;

/* --------------------------------------------------------------- palette --- */
const PASTELS = [
  "#f9a8d4",
  "#93c5fd",
  "#86efac",
  "#fcd34d",
  "#c4b5fd",
  "#fda4af",
];
const BONE_COLOR = "#fff1d6";
const SPARKLE_COLORS = ["#f9a8d4", "#93c5fd", "#86efac", "#c4b5fd"];

/* ----------------------------------------------------------------- perf ---- */
type Tier = "low" | "mobile" | "desktop";
type Perf = {
  shapes: number;
  particles: number;
  dprMax: number;
  antialias: boolean;
  cpuDrift: boolean;
  twoLights: boolean;
};

const PERF: Record<Tier, Perf> = {
  desktop: {
    shapes: 14,
    particles: 1300,
    dprMax: 1.75,
    antialias: true,
    cpuDrift: true,
    twoLights: true,
  },
  mobile: {
    shapes: 9,
    particles: 480,
    dprMax: 1.4,
    antialias: false,
    cpuDrift: false,
    twoLights: true,
  },
  low: {
    shapes: 5,
    particles: 180,
    dprMax: 1,
    antialias: false,
    cpuDrift: false,
    twoLights: false,
  },
};

function detectTier(): Tier {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const mem = typeof nav.deviceMemory === "number" ? nav.deviceMemory : null;
  const cores = nav.hardwareConcurrency || 0;
  const coarse =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  const constrained = (mem !== null && mem <= 4) || (cores > 0 && cores <= 4);
  if (coarse) return w < 480 || constrained ? "low" : "mobile";
  return w < 768 ? "mobile" : "desktop";
}

/* ----------------------------------------------------- puffy heart geometry */
function buildHeartGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 0.45);
  s.bezierCurveTo(0, 0.72, -0.4, 1.0, -0.78, 0.62);
  s.bezierCurveTo(-1.15, 0.24, -0.62, -0.32, 0, -0.78);
  s.bezierCurveTo(0.62, -0.32, 1.15, 0.24, 0.78, 0.62);
  s.bezierCurveTo(0.4, 1.0, 0, 0.72, 0, 0.45);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.5,
    bevelEnabled: true,
    bevelSize: 0.16,
    bevelThickness: 0.16,
    bevelSegments: 5,
    curveSegments: 18,
  });
  geo.center();
  geo.scale(0.62, 0.62, 0.62);
  return geo;
}

type ShapeType = "heart" | "bone" | "paw" | "ball";

type ShapeSpec = {
  type: ShapeType;
  base: [number, number, number];
  color: string;
  scale: number;
  bobAmp: number;
  bobSpeed: number;
  spin: number;
  phase: number;
};

/* ----------------------------------------------------------- floating shape */
function FloatingShape({
  spec,
  heartGeo,
}: {
  spec: ShapeSpec;
  heartGeo: THREE.BufferGeometry;
}) {
  const ref = useRef<THREE.Group>(null);
  const tRef = useRef(0);
  const input = useInput();

  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    const { reduced } = input.current;
    const dt = Math.min(delta, 0.05);
    // Accumulate clamped time so resuming a hidden tab never jumps the clock.
    if (!reduced) tRef.current += dt;
    const t = tRef.current;
    g.position.y =
      spec.base[1] + Math.sin(t * spec.bobSpeed + spec.phase) * spec.bobAmp;
    if (!reduced) {
      g.rotation.y += spec.spin * dt;
      g.rotation.z = Math.sin(t * spec.bobSpeed * 0.8 + spec.phase) * 0.25;
    }
  });

  const mat = (color: string, key?: string) => (
    <meshToonMaterial key={key} color={color} />
  );

  return (
    <group ref={ref} position={spec.base} scale={spec.scale}>
      {spec.type === "heart" && (
        <mesh geometry={heartGeo} rotation={[0, 0, 0]}>
          {mat(spec.color)}
        </mesh>
      )}

      {spec.type === "ball" && (
        <mesh scale={[1, 0.92, 1]}>
          <sphereGeometry args={[0.62, 28, 28]} />
          {mat(spec.color)}
        </mesh>
      )}

      {spec.type === "bone" && (
        <group rotation={[0, 0, Math.PI / 5]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.16, 0.16, 0.92, 16]} />
            {mat(BONE_COLOR)}
          </mesh>
          {[
            [-0.5, 0.2],
            [-0.5, -0.2],
            [0.5, 0.2],
            [0.5, -0.2],
          ].map(([x, y], i) => (
            <mesh key={i} position={[x, y, 0]}>
              <sphereGeometry args={[0.24, 16, 16]} />
              {mat(BONE_COLOR)}
            </mesh>
          ))}
        </group>
      )}

      {spec.type === "paw" && (
        <group>
          <mesh scale={[1, 0.82, 0.7]}>
            <sphereGeometry args={[0.5, 22, 22]} />
            {mat(spec.color)}
          </mesh>
          {[
            [-0.42, 0.5],
            [-0.15, 0.66],
            [0.15, 0.66],
            [0.42, 0.5],
          ].map(([x, y], i) => (
            <mesh key={i} position={[x, y, 0.05]} scale={[1, 1, 0.7]}>
              <sphereGeometry args={[0.18, 16, 16]} />
              {mat(spec.color)}
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

/* ---------------------------------------------------------- shapes cluster -- */
function ShapeCluster({ count }: { count: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const tRef = useRef(0);
  const input = useInput();
  const heartGeo = useMemo(() => buildHeartGeometry(), []);

  const specs = useMemo<ShapeSpec[]>(() => {
    const types: ShapeType[] = [
      "heart",
      "paw",
      "bone",
      "ball",
      "heart",
      "ball",
    ];
    const golden = Math.PI * (3 - Math.sqrt(5));
    const arr: ShapeSpec[] = [];
    for (let i = 0; i < count; i++) {
      const angle = golden * i;
      const radius = 3.7 + (i % 3) * 1.15;
      arr.push({
        type: types[i % types.length],
        base: [
          Math.cos(angle) * radius * 1.55,
          Math.sin(angle) * radius * 0.95,
          -2 + (i % 4) * 1.1,
        ],
        color: PASTELS[i % PASTELS.length],
        scale: 0.6 + (i % 4) * 0.18,
        bobAmp: 0.25 + (i % 3) * 0.12,
        bobSpeed: 0.6 + (i % 4) * 0.22,
        spin: (i % 2 === 0 ? 1 : -1) * (0.2 + (i % 3) * 0.12),
        phase: i * 1.7,
      });
    }
    return arr;
  }, [count]);

  useEffect(() => () => heartGeo.dispose(), [heartGeo]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const { px, py, scroll, reduced } = input.current;
    const dt = Math.min(delta, 0.05);
    if (!reduced) tRef.current += dt;
    const t = tRef.current;
    // Scroll rotates and lifts the whole cluster so the backdrop evolves
    // across the page; cursor adds parallax tilt.
    g.rotation.y = damp(
      g.rotation.y,
      px * 0.22 + t * 0.01 + scroll * Math.PI * 0.55,
      3,
      dt,
    );
    g.rotation.x = damp(g.rotation.x, -py * 0.16 + scroll * 0.4, 3, dt);
    g.position.y = damp(g.position.y, scroll * 6, 3, dt);
  });

  return (
    <group ref={groupRef}>
      {specs.map((spec, i) => (
        <FloatingShape key={i} spec={spec} heartGeo={heartGeo} />
      ))}
    </group>
  );
}

/* -------------------------------------------------------------- sparkles --- */
function Sparkles({ count, cpuDrift }: { count: number; cpuDrift: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const rx = useRef(0);
  const ry = useRef(0);
  const tRef = useRef(0);
  const input = useInput();

  const { positions, colors, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const palette = SPARKLE_COLORS.map((c) => new THREE.Color(c));
    const spread = 26;
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * spread * 1.7;
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread - 3;
      const c = palette[i % palette.length];
      colors[i * 3 + 0] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      speeds[i] = 0.3 + Math.random() * 0.9;
    }
    return { positions, colors, speeds };
  }, [count]);

  useFrame((_, delta) => {
    const pts = pointsRef.current;
    if (!pts) return;
    const { px, py, scroll, reduced } = input.current;
    const dt = Math.min(delta, 0.05);
    // Accumulated clamped time avoids a clock jump (and spin) on tab resume.
    if (!reduced) tRef.current += dt;
    const t = tRef.current;

    if (!reduced && cpuDrift) {
      const pos = pts.geometry.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      const rise = 0.4 * dt;
      for (let i = 0; i < count; i++) {
        let y = arr[i * 3 + 1] + speeds[i] * rise;
        if (y > 14) y = -14;
        arr[i * 3 + 1] = y;
      }
      pos.needsUpdate = true;
    }

    ry.current = damp(ry.current, px * 0.2, 3, dt);
    rx.current = damp(rx.current, -py * 0.14, 3, dt);
    pts.rotation.y = t * 0.015 + scroll * 0.9 + ry.current;
    pts.rotation.x = rx.current;
    pts.position.y = damp(pts.position.y, scroll * 4, 3, dt);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.7}
        depthWrite={false}
      />
    </points>
  );
}

/* ------------------------------------------------------------------- rig --- */
function Rig() {
  const input = useInput();
  const { camera } = useThree();
  useFrame((_, delta) => {
    const { px, py, scroll } = input.current;
    const dt = Math.min(delta, 0.05);
    camera.position.x = damp(camera.position.x, px * 1.4, 3, dt);
    camera.position.y = damp(
      camera.position.y,
      -py * 1.0 + scroll * 2.2,
      3,
      dt,
    );
    camera.position.z = damp(camera.position.z, 10 + scroll * 3.5, 2.5, dt);
    camera.lookAt(0, scroll * 1.4, 0);
  });
  return null;
}

/* ------------------------------------------------------------ experience --- */
function Experience({ perf }: { perf: Perf }) {
  return (
    <>
      <ambientLight intensity={0.95} />
      <directionalLight position={[4, 6, 8]} intensity={1.5} color="#ffffff" />
      {perf.twoLights && (
        <directionalLight
          position={[-6, -2, 4]}
          intensity={0.8}
          color="#ffd9ec"
        />
      )}
      <Rig />
      <ShapeCluster count={perf.shapes} />
      <Sparkles count={perf.particles} cpuDrift={perf.cpuDrift} />
    </>
  );
}

/* ----------------------------------------------------------- public layer -- */
export default function CutePetScene3D() {
  const inputRef = useRef<LiveInput>({
    px: 0,
    py: 0,
    scroll: 0,
    reduced: false,
  });
  const [tier, setTier] = useState<Tier>("desktop");
  const [enabled, setEnabled] = useState(true);
  const [frameloop, setFrameloop] = useState<"always" | "never">("always");

  useEffect(() => {
    const reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyReduced = () => {
      inputRef.current.reduced = reducedMq.matches;
    };
    applyReduced();
    reducedMq.addEventListener("change", applyReduced);

    const resize = () => setTier(detectTier());
    resize();
    window.addEventListener("resize", resize);

    const onVis = () => setFrameloop(document.hidden ? "never" : "always");
    document.addEventListener("visibilitychange", onVis);

    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      if (!gl) setEnabled(false);
    } catch {
      setEnabled(false);
    }

    return () => {
      reducedMq.removeEventListener("change", applyReduced);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      inputRef.current.px = (e.clientX / window.innerWidth) * 2 - 1;
      inputRef.current.py = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onScroll = () => {
      // Progress across the whole document so the backdrop evolves the full page.
      const max = document.documentElement.scrollHeight - window.innerHeight;
      inputRef.current.scroll =
        max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const perf = PERF[tier];
  if (!enabled) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Soft pastel base so the whole page always has a pleasant backdrop
          behind the translucent content sections. */}
      <div className="absolute inset-0 bg-[linear-gradient(125deg,#eaf7ff_0%,#f6fdff_28%,#ffeef6_62%,#f2fbff_100%)]" />

      <InputContext.Provider value={inputRef}>
        <Canvas
          key={tier}
          className="!absolute inset-0"
          frameloop={frameloop}
          dpr={[1, perf.dprMax]}
          gl={{
            alpha: true,
            antialias: perf.antialias,
            powerPreference: "high-performance",
          }}
          camera={{ position: [0, 0, 10], fov: 50 }}
          onCreated={({ gl }) => gl.setClearAlpha(0)}
        >
          <Experience perf={perf} />
        </Canvas>
      </InputContext.Provider>

      {/* Gentle white center wash to keep copy readable over the busy middle. */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(255,255,255,0.42)_0%,rgba(255,255,255,0.12)_42%,transparent_68%)]" />
    </div>
  );
}
