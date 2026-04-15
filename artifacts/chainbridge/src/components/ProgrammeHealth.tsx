import { ResponsiveRadialBar } from '@nivo/radial-bar';
import { ResponsiveLine } from '@nivo/line';
import { useSimStore } from '../store';

function getHealthColor(value: number): string {
  if (value >= 70) return '#00FF87';
  if (value >= 40) return '#FFB800';
  return '#FF4444';
}

export default function ProgrammeHealth() {
  const health = useSimStore(s => s.programmeHealth);
  const healthHistory = useSimStore(s => s.healthHistory);

  const radialData = health.map(g => ({
    id: `Gap ${g.gap}`,
    data: [{ x: g.label, y: g.value }],
  }));

  const lineData = health.map((g, gi) => ({
    id: `G${g.gap}`,
    color: getHealthColor(g.value),
    data: healthHistory.map((h, hi) => ({
      x: `W${hi}`,
      y: h.values[gi] ?? g.value,
    })),
  }));

  return (
    <div style={{
      padding: '12px 14px',
      overflowY: 'auto',
      height: '100%',
      scrollbarWidth: 'thin',
      scrollbarColor: 'rgba(148,163,184,0.2) transparent',
    }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#E2E8F0', marginBottom: 3 }}>
          Programme Health
        </div>
        <div style={{ fontSize: 10, color: '#64748B' }}>
          Five gap health indicators
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {health.map(g => {
          const color = getHealthColor(g.value);
          const circumference = 2 * Math.PI * 28;
          const dash = (g.value / 100) * circumference;

          return (
            <div
              key={g.gap}
              style={{
                background: 'rgba(15,23,42,0.6)',
                border: '1px solid rgba(148,163,184,0.06)',
                borderRadius: 8,
                padding: '10px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <div style={{ position: 'relative', width: 64, height: 64 }}>
                <svg width={64} height={64} style={{ transform: 'rotate(-90deg)' }}>
                  <circle
                    cx={32}
                    cy={32}
                    r={28}
                    fill="none"
                    stroke="rgba(148,163,184,0.1)"
                    strokeWidth={4}
                  />
                  <circle
                    cx={32}
                    cy={32}
                    r={28}
                    fill="none"
                    stroke={color}
                    strokeWidth={4}
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 4px ${color}60)`, transition: 'all 0.8s ease' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 12,
                    fontWeight: 700,
                    color: color,
                  }}>
                    {Math.round(g.value)}%
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#E2E8F0', marginBottom: 2 }}>
                  Gap {g.gap}
                </div>
                <div style={{ fontSize: 9, color: '#64748B' }}>{g.label}</div>
              </div>
            </div>
          );
        })}

        <div
          style={{
            background: 'rgba(15,23,42,0.6)',
            border: '1px solid rgba(148,163,184,0.06)',
            borderRadius: 8,
            padding: '10px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 16,
              fontWeight: 700,
              color: getHealthColor(health.reduce((s, g) => s + g.value, 0) / health.length),
              marginBottom: 4,
            }}>
              {Math.round(health.reduce((s, g) => s + g.value, 0) / health.length)}%
            </div>
            <div style={{ fontSize: 9, color: '#64748B' }}>Overall Score</div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Programme Health — 6-Week Trend
        </div>
        <div style={{ height: 130 }}>
          <ResponsiveLine
            data={lineData}
            margin={{ top: 5, right: 15, bottom: 25, left: 30 }}
            xScale={{ type: 'point' }}
            yScale={{ type: 'linear', min: 0, max: 100 }}
            curve="monotoneX"
            colors={d => getHealthColor(health.find((g, i) => `G${g.gap}` === d.id)?.value || 50)}
            lineWidth={1.5}
            enablePoints={false}
            enableGridX={false}
            enableGridY={true}
            gridYValues={[40, 70]}
            axisLeft={{ tickSize: 0, tickPadding: 4, format: v => `${v}%`, tickValues: [0, 40, 70, 100] }}
            axisBottom={{ tickSize: 0, tickPadding: 4 }}
            theme={{
              grid: { line: { stroke: 'rgba(148,163,184,0.05)' } },
              text: { fill: '#64748B', fontSize: 9, fontFamily: '"JetBrains Mono", monospace' },
              axis: { ticks: { line: { stroke: 'rgba(148,163,184,0.05)' } } },
            }}
            legends={[{
              anchor: 'bottom',
              direction: 'row',
              translateY: 22,
              itemWidth: 30,
              itemHeight: 10,
              symbolSize: 6,
              symbolShape: 'circle',
              itemTextColor: '#64748B',
            }]}
            isInteractive={false}
          />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {health.map(g => (
          <div key={g.gap} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: '#94A3B8' }}>Gap {g.gap} — {g.label}</span>
              <span style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 11,
                color: getHealthColor(g.value),
                fontWeight: 600,
              }}>
                {Math.round(g.value)}%
              </span>
            </div>
            <div style={{ height: 3, background: 'rgba(148,163,184,0.1)', borderRadius: 2 }}>
              <div style={{
                height: '100%',
                width: `${g.value}%`,
                background: getHealthColor(g.value),
                borderRadius: 2,
                boxShadow: `0 0 6px ${getHealthColor(g.value)}60`,
                transition: 'all 1.2s ease',
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
