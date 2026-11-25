"use client";

import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Box, Check, Layers, RotateCw } from 'lucide-react';
import type * as THREE from 'three';
import { MonoCell } from '../components/MonoCell.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { ZiroButton } from '../components/ZiroButton.js';
import {
  computeConfiguratorSelection,
  type BomConfiguratorOption,
  type ConfiguratorSelectionResult,
  type MaterialFinishOption,
} from './pricing.js';

export type {
  BomConfiguratorOption,
  ConfiguratorSelectionResult,
  MaterialFinishOption,
};

export interface ProductConfiguratorSelectionEvent extends ConfiguratorSelectionResult {
  sku: string;
  finish: MaterialFinishOption | null;
}

export interface ProductConfigurator3DProps {
  sku: string;
  title: string;
  basePriceMinor: number;
  currency?: string;
  finishes?: readonly MaterialFinishOption[];
  bomOptions?: readonly BomConfiguratorOption[];
  initialFinishId?: string;
  initialSelectedOptionIds?: readonly string[];
  onSelectionChange?: (selection: ProductConfiguratorSelectionEvent) => void;
  onAddToCart?: (selection: ProductConfiguratorSelectionEvent) => void;
  className?: string;
}

const DEFAULT_FINISHES: readonly MaterialFinishOption[] = [
  {
    id: 'anodized-obsidian',
    label: 'Anodized Obsidian',
    swatchHex: '#1F2633',
    metalness: 0.85,
    roughness: 0.28,
    priceDeltaMinor: 0,
  },
  {
    id: 'machined-titanium',
    label: 'Machined Titanium',
    swatchHex: '#94A3B8',
    metalness: 0.92,
    roughness: 0.18,
    priceDeltaMinor: 45_000,
  },
  {
    id: 'mint-ceramic',
    label: 'Electric Mint Ceramic',
    swatchHex: '#00E599',
    metalness: 0.45,
    roughness: 0.32,
    priceDeltaMinor: 75_000,
  },
];

interface AssemblySceneProps {
  finish: MaterialFinishOption;
  selectedOptionIds: readonly string[];
  bomOptions: readonly BomConfiguratorOption[];
}

function AssemblyMesh({ finish, selectedOptionIds, bomOptions }: AssemblySceneProps) {
  const groupRef = useRef<THREE.Group | null>(null);
  const selectedSet = useMemo(() => new Set(selectedOptionIds), [selectedOptionIds]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.25;
    }
  });

  const metalness = finish.metalness ?? 0.8;
  const roughness = finish.roughness ?? 0.3;

  return (
    <group ref={groupRef}>
      {/* Primary ventilated rotor disc */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.15, 1.15, 0.14, 48]} />
        <meshStandardMaterial
          color={finish.swatchHex}
          metalness={metalness}
          roughness={roughness}
        />
      </mesh>

      {/* Center hub bell */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.08]} castShadow>
        <cylinderGeometry args={[0.48, 0.52, 0.22, 32]} />
        <meshStandardMaterial color="#12161E" metalness={0.85} roughness={0.35} />
      </mesh>

      {/* Precision Mint axial ring */}
      <mesh rotation={[0, 0, 0]}>
        <torusGeometry args={[0.68, 0.03, 16, 48]} />
        <meshStandardMaterial color="#00E599" metalness={0.6} roughness={0.25} />
      </mesh>

      {/* Monoblock caliper bracket */}
      <mesh position={[0.92, 0.35, 0]} rotation={[0, 0, -0.35]} castShadow>
        <boxGeometry args={[0.56, 0.88, 0.42]} />
        <meshStandardMaterial color="#1F2633" metalness={0.75} roughness={0.35} />
      </mesh>

      {/* Dynamic BOM optional sub-assemblies */}
      {bomOptions.map((option, idx) => {
        if (!selectedSet.has(option.id)) {
          return null;
        }
        const angle = (idx / Math.max(bomOptions.length, 1)) * Math.PI * 1.4 - 0.7;
        const radius = 0.86;
        return (
          <mesh
            key={option.id}
            position={[Math.cos(angle) * radius, Math.sin(angle) * radius, 0.19]}
            castShadow
          >
            <boxGeometry args={[0.24, 0.16, 0.14]} />
            <meshStandardMaterial
              color={idx % 2 === 0 ? '#00E599' : '#F59E0B'}
              metalness={0.55}
              roughness={0.28}
            />
          </mesh>
        );
      })}
    </group>
  );
}

interface CanvasErrorBoundaryProps {
  onError: () => void;
  fallback: ReactNode;
  children: ReactNode;
}

interface CanvasErrorBoundaryState {
  hasError: boolean;
}

class CanvasErrorBoundary extends Component<
  CanvasErrorBoundaryProps,
  CanvasErrorBoundaryState
> {
  override state: CanvasErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): CanvasErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch() {
    this.props.onError();
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function detectWebGlSupport(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl');
    if (!gl) {
      return false;
    }
    const webglCtx = gl as Partial<WebGLRenderingContext>;
    webglCtx.getExtension?.('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/**
 * Interactive R3F 3D product configurator with material swatches, BOM add-on toggles,
 * integer minor-unit pricing, and a Dark Precision SSR/non-WebGL schematic fallback.
 */
export function ProductConfigurator3D({
  sku,
  title,
  basePriceMinor,
  currency = 'INR',
  finishes = DEFAULT_FINISHES,
  bomOptions = [],
  initialFinishId,
  initialSelectedOptionIds,
  onSelectionChange,
  onAddToCart,
  className,
}: ProductConfigurator3DProps) {
  const [webglSupported, setWebglSupported] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);
  const webglCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextLostHandlerRef = useRef<((event: Event) => void) | null>(null);

  const defaultFinish = useMemo(() => {
    if (finishes.length === 0) return null;
    return finishes.find((f) => f.id === initialFinishId) ?? finishes[0] ?? null;
  }, [finishes, initialFinishId]);

  const [selectedFinishId, setSelectedFinishId] = useState<string | null>(
    defaultFinish?.id ?? null,
  );

  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (initialSelectedOptionIds !== undefined) {
      return [...initialSelectedOptionIds];
    }
    return bomOptions.filter((opt) => opt.defaultSelected).map((opt) => opt.id);
  });

  useEffect(() => {
    if (detectWebGlSupport()) {
      setWebglSupported(true);
    }
    return () => {
      if (webglCanvasRef.current && contextLostHandlerRef.current) {
        webglCanvasRef.current.removeEventListener(
          'webglcontextlost',
          contextLostHandlerRef.current,
        );
      }
    };
  }, []);

  const activeFinish = useMemo(
    () => finishes.find((f) => f.id === selectedFinishId) ?? defaultFinish,
    [finishes, selectedFinishId, defaultFinish],
  );

  const selection = useMemo(
    () => computeConfiguratorSelection(basePriceMinor, bomOptions, selectedIds, activeFinish),
    [basePriceMinor, bomOptions, selectedIds, activeFinish],
  );

  function handleSelectFinish(finish: MaterialFinishOption) {
    setSelectedFinishId(finish.id);
    if (onSelectionChange) {
      const nextSelection = computeConfiguratorSelection(
        basePriceMinor,
        bomOptions,
        selectedIds,
        finish,
      );
      onSelectionChange({
        ...nextSelection,
        sku,
        finish,
      });
    }
  }

  function handleToggleBomOption(optionId: string) {
    const nextIds = selectedIds.includes(optionId)
      ? selectedIds.filter((id) => id !== optionId)
      : [...selectedIds, optionId];
    setSelectedIds(nextIds);
    if (onSelectionChange) {
      const nextSelection = computeConfiguratorSelection(
        basePriceMinor,
        bomOptions,
        nextIds,
        activeFinish,
      );
      onSelectionChange({
        ...nextSelection,
        sku,
        finish: activeFinish,
      });
    }
  }

  const activeSwatch = activeFinish?.swatchHex ?? '#1F2633';
  const isWebGlActive = webglSupported && !webglFailed && Boolean(activeFinish);

  const schematicFallback = (
    <div
      data-webgl-fallback="true"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        padding: '1rem 0',
      }}
    >
      <svg
        width="220"
        height="180"
        viewBox="0 0 220 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`${title} engineering schematic`}
      >
        <title>{`${title} engineering schematic`}</title>
        {/* Grid crosshairs */}
        <line x1="110" y1="8" x2="110" y2="172" stroke="#1F2633" strokeDasharray="3 3" />
        <line x1="20" y1="90" x2="200" y2="90" stroke="#1F2633" strokeDasharray="3 3" />
        {/* Rotor disc */}
        <circle
          cx="110"
          cy="90"
          r="62"
          fill={activeSwatch}
          fillOpacity="0.22"
          stroke={activeSwatch}
          strokeWidth="3"
        />
        {/* Precision cooling ring */}
        <circle
          cx="110"
          cy="90"
          r="40"
          stroke="#00E599"
          strokeWidth="2"
          strokeDasharray="6 4"
        />
        {/* Center hub */}
        <circle cx="110" cy="90" r="18" fill="#12161E" stroke="#F4F6F9" strokeWidth="2" />
        {/* Caliper block */}
        <rect
          x="150"
          y="56"
          width="28"
          height="68"
          rx="3"
          fill="#12161E"
          stroke="#00E599"
          strokeWidth="2"
        />
        {/* Active BOM option indicator nodes */}
        {selection.selectedOptions.map((opt, idx) => (
          <circle
            key={opt.id}
            cx={58 + idx * 24}
            cy={32}
            r={5}
            fill={idx % 2 === 0 ? '#00E599' : '#F59E0B'}
          />
        ))}
      </svg>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          fontFamily: 'var(--font-mono, "JetBrains Mono", ui-monospace, monospace)',
          fontSize: '0.75rem',
          color: 'var(--color-ziro-muted, #94A3B8)',
        }}
      >
        <Box size={14} color="#00E599" aria-hidden="true" />
        <span>
          WebGL unavailable in SSR/headless preview · {activeFinish?.label ?? 'Standard'}
        </span>
      </span>
    </div>
  );

  return (
    <section
      className={className}
      aria-label={`${title} 3D configurator`}
      style={{
        backgroundColor: 'var(--color-ziro-slate, #12161E)',
        border: '1px solid var(--color-ziro-border, #1F2633)',
        borderRadius: '8px',
        padding: '1.25rem',
        color: 'var(--color-ziro-alabaster, #F4F6F9)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
      }}
    >
      {/* 3D Viewport / SSR Schematic Fallback */}
      <div
        style={{
          backgroundColor: 'var(--color-ziro-obsidian, #090B0E)',
          border: '1px solid var(--color-ziro-border, #1F2633)',
          borderRadius: '6px',
          minHeight: '320px',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '0.875rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            zIndex: 2,
          }}
        >
          <MonoCell kind="sku" value={sku} highlight="mint" />
          <StatusBadge
            variant={isWebGlActive ? 'live-sync' : 'zero-fee'}
            label={isWebGlActive ? 'WebGL 3D Active' : 'Interactive Schematic'}
            ariaLabel={
              isWebGlActive
                ? '3D Viewport Status: WebGL 3D Active'
                : '3D Viewport Status: Interactive Schematic'
            }
          />
        </div>

        {isWebGlActive && activeFinish ? (
          <CanvasErrorBoundary
            fallback={schematicFallback}
            onError={() => setWebglFailed(true)}
          >
            <div style={{ width: '100%', height: '260px' }} data-webgl-canvas="true">
              <Canvas
                camera={{ position: [2.6, 1.9, 3.0], fov: 40 }}
                dpr={[1, 2]}
                onCreated={({ gl }) => {
                  if (webglCanvasRef.current && contextLostHandlerRef.current) {
                    webglCanvasRef.current.removeEventListener(
                      'webglcontextlost',
                      contextLostHandlerRef.current,
                    );
                  }
                  const handleContextLost = (event: Event) => {
                    event.preventDefault();
                    setWebglFailed(true);
                  };
                  webglCanvasRef.current = gl.domElement;
                  contextLostHandlerRef.current = handleContextLost;
                  gl.domElement.addEventListener('webglcontextlost', handleContextLost, {
                    once: true,
                  });
                }}
              >
                <color attach="background" args={['#090B0E']} />
                <ambientLight intensity={0.45} />
                <directionalLight position={[4, 6, 4]} intensity={1.5} />
                <pointLight position={[-3, 2, -2]} intensity={0.85} color="#00E599" />
                <AssemblyMesh
                  finish={activeFinish}
                  selectedOptionIds={selection.selectedIds}
                  bomOptions={bomOptions}
                />
                <OrbitControls enablePan={false} minDistance={2} maxDistance={5.5} />
              </Canvas>
            </div>
          </CanvasErrorBoundary>
        ) : (
          schematicFallback
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-mono, "JetBrains Mono", ui-monospace, monospace)',
            fontSize: '0.75rem',
            color: 'var(--color-ziro-muted, #94A3B8)',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
            <RotateCw size={12} aria-hidden="true" />
            <span>360° Assembly</span>
          </span>
          <span className="ziro-tabular">
            {selection.selectedOptionalSkus.length} BOM Add-on
            {selection.selectedOptionalSkus.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Material Swatches, BOM Toggles & Price Summary */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: '1.125rem',
              fontWeight: 700,
              color: 'var(--color-ziro-alabaster, #F4F6F9)',
            }}
          >
            {title}
          </h2>
        </div>

        {finishes.length > 0 ? (
          <div>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--color-ziro-muted, #94A3B8)',
                marginBottom: '0.5rem',
              }}
            >
              Material Finish
            </div>
            <div
              role="radiogroup"
              aria-label="Material finish"
              style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}
            >
              {finishes.map((finish) => {
                const isSelected = activeFinish?.id === finish.id;
                return (
                  <button
                    key={finish.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleSelectFinish(finish)}
                    className="ziro-focus-ring"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.4375rem 0.75rem',
                      borderRadius: '6px',
                      backgroundColor: 'var(--color-ziro-obsidian, #090B0E)',
                      border: `1px solid ${isSelected ? '#00E599' : '#1F2633'}`,
                      color: 'var(--color-ziro-alabaster, #F4F6F9)',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '9999px',
                        backgroundColor: finish.swatchHex,
                        border: '1px solid rgba(244, 246, 249, 0.35)',
                      }}
                    />
                    <span>{finish.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {bomOptions.length > 0 ? (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--color-ziro-muted, #94A3B8)',
                marginBottom: '0.5rem',
              }}
            >
              <Layers size={13} aria-hidden="true" />
              <span>BOM Optional Sub-Assemblies</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {bomOptions.map((option) => {
                const isSelected = selection.selectedIds.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleToggleBomOption(option.id)}
                    className="ziro-focus-ring"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      padding: '0.625rem 0.75rem',
                      borderRadius: '6px',
                      backgroundColor: 'var(--color-ziro-obsidian, #090B0E)',
                      border: `1px solid ${isSelected ? '#00E599' : '#1F2633'}`,
                      color: 'var(--color-ziro-alabaster, #F4F6F9)',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                        }}
                      >
                        {isSelected ? <Check size={14} color="#00E599" aria-hidden="true" /> : null}
                        <span>{option.label}</span>
                      </span>
                      <MonoCell kind="sku" value={option.childSku} />
                    </span>
                    <MonoCell
                      kind="currency"
                      amountMinor={option.priceDeltaMinor}
                      currency={currency}
                      highlight={option.priceDeltaMinor < 0 ? 'amber' : 'mint'}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Minor-unit price breakdown */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: '0.875rem',
            borderTop: '1px solid var(--color-ziro-border, #1F2633)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.375rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
            <span style={{ color: 'var(--color-ziro-muted, #94A3B8)' }}>Base Assembly</span>
            <MonoCell kind="currency" amountMinor={selection.basePriceMinor} currency={currency} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
            <span style={{ color: 'var(--color-ziro-muted, #94A3B8)' }}>Configuration Delta</span>
            <MonoCell
              kind="currency"
              amountMinor={selection.deltaMinor}
              currency={currency}
              highlight={selection.deltaMinor >= 0 ? 'mint' : 'amber'}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginTop: '0.25rem',
              fontSize: '1rem',
              fontWeight: 700,
            }}
          >
            <span>Configured Total</span>
            <MonoCell
              kind="currency"
              amountMinor={selection.totalPriceMinor}
              currency={currency}
              highlight="mint"
            />
          </div>
          {onAddToCart ? (
            <ZiroButton
              variant="primary"
              style={{ marginTop: '0.625rem', width: '100%' }}
              onClick={() =>
                onAddToCart({
                  ...selection,
                  sku,
                  finish: activeFinish,
                })
              }
            >
              Add Configured Assembly
            </ZiroButton>
          ) : null}
        </div>
      </div>
    </section>
  );
}
