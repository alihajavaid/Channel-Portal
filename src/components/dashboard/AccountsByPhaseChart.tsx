"use client";

import { useState } from "react";
import { PHASES } from "@/lib/constants/phaseChecklists";

type Props = { data: { phase: number; count: number }[] };

const CHART_WIDTH = 640;
const CHART_HEIGHT = 220;
const PADDING_LEFT = 32;
const PADDING_BOTTOM = 28;
const PADDING_TOP = 12;
const BAR_GAP = 2;
const MAX_BAR_THICKNESS = 24;

export function AccountsByPhaseChart({ data }: Props) {
  const [hover, setHover] = useState<{ phase: number; count: number; x: number; y: number } | null>(null);

  const maxCount = Math.max(1, ...data.map((d) => d.count));
  const plotWidth = CHART_WIDTH - PADDING_LEFT;
  const plotHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const slotWidth = plotWidth / data.length;
  const barWidth = Math.min(MAX_BAR_THICKNESS, slotWidth - BAR_GAP);

  // Clean, round-number gridlines rather than an arbitrary max.
  const niceMax = Math.max(4, Math.ceil(maxCount / 4) * 4);
  const gridSteps = [0, niceMax / 4, niceMax / 2, (niceMax * 3) / 4, niceMax];

  return (
    <div className="viz-root relative rounded-md border border-slate-200 bg-white p-4">
      <style>{`
        .viz-root {
          color-scheme: light;
          --surface-1: #fcfcfb;
          --text-secondary: #52514e;
          --muted: #898781;
          --gridline: #e1e0d9;
          --baseline: #c3c2b7;
          --series-1: #2a78d6;
        }
        @media (prefers-color-scheme: dark) {
          :root:not([data-theme="light"]) .viz-root {
            color-scheme: dark;
            --surface-1: #1a1a19;
            --text-secondary: #c3c2b7;
            --muted: #898781;
            --gridline: #2c2c2a;
            --baseline: #383835;
            --series-1: #3987e5;
          }
        }
        :root[data-theme="dark"] .viz-root {
          color-scheme: dark;
          --surface-1: #1a1a19;
          --text-secondary: #c3c2b7;
          --muted: #898781;
          --gridline: #2c2c2a;
          --baseline: #383835;
          --series-1: #3987e5;
        }
      `}</style>
      <h2 className="mb-2 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
        Accounts by phase
      </h2>
      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="w-full" style={{ maxHeight: 240 }}>
        {gridSteps.map((step) => {
          const y = PADDING_TOP + plotHeight - (step / niceMax) * plotHeight;
          return (
            <g key={step}>
              <line x1={PADDING_LEFT} x2={CHART_WIDTH} y1={y} y2={y} stroke="var(--gridline)" strokeWidth={1} />
              <text x={PADDING_LEFT - 6} y={y + 3} textAnchor="end" fontSize={10} fill="var(--muted)">
                {step}
              </text>
            </g>
          );
        })}
        <line
          x1={PADDING_LEFT}
          x2={CHART_WIDTH}
          y1={PADDING_TOP + plotHeight}
          y2={PADDING_TOP + plotHeight}
          stroke="var(--baseline)"
          strokeWidth={1}
        />
        {data.map((d, i) => {
          const phaseDef = PHASES.find((p) => p.phase === d.phase);
          const barHeight = (d.count / niceMax) * plotHeight;
          const x = PADDING_LEFT + i * slotWidth + (slotWidth - barWidth) / 2;
          const y = PADDING_TOP + plotHeight - barHeight;
          return (
            <g key={d.phase}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 1)}
                rx={4}
                fill="var(--series-1)"
                onMouseEnter={() => setHover({ phase: d.phase, count: d.count, x: x + barWidth / 2, y })}
                onMouseLeave={() => setHover(null)}
              />
              <text
                x={x + barWidth / 2}
                y={PADDING_TOP + plotHeight + 16}
                textAnchor="middle"
                fontSize={10}
                fill="var(--muted)"
              >
                {d.phase}
              </text>
              <title>
                {phaseDef ? `${phaseDef.phase}. ${phaseDef.name}` : `Phase ${d.phase}`}: {d.count} accounts
              </title>
            </g>
          );
        })}
      </svg>
      {hover && (
        <div
          className="pointer-events-none absolute rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow"
          style={{ left: hover.x, top: hover.y - 8, transform: "translate(-50%, -100%)" }}
        >
          {PHASES.find((p) => p.phase === hover.phase)?.name}: {hover.count}
        </div>
      )}
    </div>
  );
}
