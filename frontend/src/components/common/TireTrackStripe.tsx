// src/components/common/TireTrackStripe.tsx
import { useId } from "react";

export type TireTrackStripeProps = {
  w?: number;
  h?: number;
  bg?: string;
  ink?: string;
  rubber?: string;
  seed?: number;
  wearOpacity?: number; // 0..1
  speed?: number; // px/s (quanto maior, mais rápido)
  className?: string;
  style?: React.CSSProperties;
};

export default function TireTrackStripe({
  w = 900,
  h = 220,
  bg = "#f2f2ea",
  ink = "#0b0b0b",
  rubber = "#f2f2ea",
  seed = 7,
  wearOpacity = 0.65,
  speed = 180,
  className,
  style,
}: TireTrackStripeProps) {
  const uid = useId().replace(/:/g, "");

  const sideId = `sideTread_${uid}`;
  const centerId = `centerTread_${uid}`;
  const noiseId = `noise_${uid}`;
  const maskId = `grungeMask_${uid}`;

  // Agora são “linhas” horizontais (trilhas)
  const topY = h * 0.18;
  const sideH = h * 0.28;
  const centerY = h * 0.46;
  const centerH = h * 0.20;
  const bottomY = h * 0.68;

  // velocidade -> duração (pattern avança 60px por ciclo)
  const animDur = Math.max(0.2, 60 / speed);

  return (
    <div className={["tireTrack", className ?? ""].join(" ")} style={style}>
      <svg
        className="tireTrack__svg"
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Side tread horizontal: barras diagonais repetidas */}
          <pattern id={sideId} patternUnits="userSpaceOnUse" width="60" height="40">
            <rect width="60" height="40" fill={ink} />
            <path d="M5 -10 L5 25 L30 50 L30 15 Z" fill={rubber} />
            <path d="M35 -10 L35 25 L60 50 L60 15 Z" fill={rubber} />

            {/* rolagem no eixo X */}
            <animateTransform
              attributeName="patternTransform"
              type="translate"
              from="0 0"
              to="60 0"
              dur={`${animDur}s`}
              repeatCount="indefinite"
            />
          </pattern>

          {/* Center tread horizontal: chevrons “deitados” */}
          <pattern id={centerId} patternUnits="userSpaceOnUse" width="60" height="60">
            <rect width="60" height="60" fill={ink} />
            {/* chevron apontando para a direita */}
            <path d="M0 30 L25 5 L25 17 L10 30 L25 43 L25 55 Z" fill={rubber} />
            <path d="M30 30 L55 5 L55 17 L40 30 L55 43 L55 55 Z" fill={rubber} />

            <animateTransform
              attributeName="patternTransform"
              type="translate"
              from="0 0"
              to="60 0"
              dur={`${animDur}s`}
              repeatCount="indefinite"
            />
          </pattern>

          {/* desgaste */}
          <filter id={noiseId} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves="2"
              seed={seed}
              result="t"
            />
            <feColorMatrix
              in="t"
              type="matrix"
              values="
                0 0 0 0 0
                0 0 0 0 0
                0 0 0 0 0
                0 0 0 1 0
              "
              result="a"
            />
            <feComponentTransfer in="a" result="th">
              <feFuncA type="table" tableValues="0 0 0 0 0 0 0 0 0 0 1 1 1 1 1 1" />
            </feComponentTransfer>
          </filter>

          <mask id={maskId}>
            <rect width={w} height={h} fill="white" />
            <rect width={w} height={h} filter={`url(#${noiseId})`} fill="black" opacity={wearOpacity} />
          </mask>
        </defs>

        <rect width={w} height={h} fill={bg} />

        <g mask={`url(#${maskId})`}>
          {/* trilha de cima (lateral) */}
          <rect x="0" y={topY} width={w} height={sideH} fill={`url(#${sideId})`} />
          {/* trilha do meio (central) */}
          <rect x="0" y={centerY} width={w} height={centerH} fill={`url(#${centerId})`} />
          {/* trilha de baixo (lateral) */}
          <rect x="0" y={bottomY} width={w} height={sideH} fill={`url(#${sideId})`} />
        </g>
      </svg>
    </div>
  );
}