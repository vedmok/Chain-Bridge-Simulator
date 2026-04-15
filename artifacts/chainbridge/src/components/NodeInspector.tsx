import { motion } from 'framer-motion';
import { ResponsiveLine } from '@nivo/line';
import { ResponsiveBar } from '@nivo/bar';
import { useSimStore } from '../store';
import type { SupplierNode, AnchorNode } from '../types';

const CORRIDOR_FLAGS: Record<string, string> = {
  India: '🇮🇳',
  Singapore: '🇸🇬',
  Vietnam: '🇻🇳',
  HongKong: '🇭🇰',
};

const STATE_COLORS: Record<string, string> = {
  healthy: '#00FF87',
  'at-risk': '#FFB800',
  critical: '#FF4444',
  dormant: '#6B7280',
  displaced: '#9CA3AF',
};

function fmt(v: number, prefix = '$', k = true): string {
  if (k) return `${prefix}${(v / 1000).toFixed(0)}K`;
  return `${prefix}${v.toFixed(0)}`;
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function SupplierInspector({ node }: { node: SupplierNode }) {
  const stateColor = STATE_COLORS[node.state] || '#6B7280';

  const lineData = node.utilisation_history.length > 0
    ? [{
        id: 'UR',
        color: node.utilisation_rate > node.utilisation_history[0]?.value ? '#00FF87' : '#FF4444',
        data: node.utilisation_history.map(h => ({ x: `M${h.month}`, y: Math.round(h.value * 100) })),
      }]
    : [{ id: 'UR', color: '#00FF87', data: [{ x: 'M1', y: 40 }, { x: 'M6', y: Math.round(node.utilisation_rate * 100) }] }];

  const isUp = node.utilisation_history.length > 1
    ? node.utilisation_history[node.utilisation_history.length - 1]?.value > node.utilisation_history[0]?.value
    : true;

  const metricStyle = {
    background: 'rgba(15,23,42,0.6)',
    borderRadius: 6,
    padding: '6px 8px',
    border: '1px solid rgba(148,163,184,0.06)',
  };

  const labelStyle = { fontSize: 9, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 2 };
  const valueStyle = { fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: '#E2E8F0', fontWeight: 700 };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      style={{ padding: '12px 14px', overflowY: 'auto', height: '100%', scrollbarWidth: 'thin', scrollbarColor: 'rgba(148,163,184,0.2) transparent' }}
    >
      <div style={{ marginBottom: 12 }}>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 18,
          color: '#FFFFFF',
          fontWeight: 700,
          marginBottom: 4,
        }}>
          {node.id}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 10, fontWeight: 700,
            background: '#003087',
            padding: '2px 7px', borderRadius: 3, color: '#FFFFFF',
          }}>{node.tier}</span>
          <span style={{ fontSize: 14 }}>{CORRIDOR_FLAGS[node.corridor] || '🌐'}</span>
          <span style={{ fontSize: 9, color: node.corridor === 'Singapore' ? '#60A5FA' : '#94A3B8' }}>{node.corridor}</span>
          <span style={{
            marginLeft: 'auto',
            fontSize: 10,
            color: stateColor,
            border: `1px solid ${stateColor}50`,
            padding: '2px 7px',
            borderRadius: 3,
          }}>{node.state.toUpperCase()}</span>
        </div>
      </div>

      <div style={{ height: 80, marginBottom: 12, position: 'relative' }}>
        <ResponsiveLine
          data={lineData}
          margin={{ top: 5, right: 10, bottom: 20, left: 30 }}
          xScale={{ type: 'point' }}
          yScale={{ type: 'linear', min: 0, max: 100 }}
          curve="monotoneX"
          colors={[isUp ? '#00FF87' : '#FF4444']}
          lineWidth={2}
          enablePoints={false}
          enableGridX={false}
          enableGridY={false}
          axisLeft={{ tickSize: 0, tickPadding: 4, format: v => `${v}%`, tickValues: [0, 40, 100] }}
          axisBottom={{ tickSize: 0, tickPadding: 4 }}
          theme={{
            text: { fill: '#64748B', fontSize: 9, fontFamily: '"JetBrains Mono", monospace' },
            axis: { ticks: { line: { stroke: 'rgba(148,163,184,0.1)' } } },
          }}
          markers={[{
            axis: 'y',
            value: 40,
            lineStyle: { stroke: '#FFB800', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.6 },
            legend: '',
          }]}
          isInteractive={false}
          enableArea={true}
          areaOpacity={0.08}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
        {[
          { label: 'UR', value: pct(node.utilisation_rate) },
          { label: 'Eligible Vol', value: fmt(node.eligible_volume_usd) },
          { label: 'Financed', value: fmt(node.financed_volume_usd) },
          { label: 'Taulia Logins', value: String(node.taulia_logins) },
          { label: 'Anchors', value: String(node.num_anchors) },
          { label: 'Conc. Risk', value: node.concentration_risk.toFixed(2) },
        ].map(m => (
          <div key={m.label} style={metricStyle}>
            <div style={labelStyle}>{m.label}</div>
            <div style={valueStyle}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 10, ...metricStyle }}>
        <div style={labelStyle}>Entity Resolution</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 3,
            background: node.entity_resolution === 'Pass1_Deterministic' ? 'rgba(0,255,135,0.15)' : 'rgba(255,184,0,0.15)',
            color: node.entity_resolution === 'Pass1_Deterministic' ? '#00FF87' : '#FFB800',
            border: `1px solid ${node.entity_resolution === 'Pass1_Deterministic' ? '#00FF8750' : '#FFB80050'}`,
          }}>
            {node.entity_resolution === 'Pass1_Deterministic' ? 'Pass 1 — Deterministic' : `Pass 2 — JW ${node.jw_score?.toFixed(3)}`}
          </span>
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 3,
            background: node.npv_positive ? 'rgba(0,255,135,0.15)' : 'rgba(255,68,68,0.15)',
            color: node.npv_positive ? '#00FF87' : '#FF4444',
          }}>
            {node.npv_positive ? 'NPV+' : 'NPV-'}
          </span>
        </div>
        {node.entity_resolution === 'Pass2_Probabilistic' && node.jw_score !== undefined && (
          <div style={{ marginTop: 6 }}>
            <div style={{ height: 4, background: 'rgba(148,163,184,0.1)', borderRadius: 2, position: 'relative' }}>
              <div style={{
                height: '100%',
                width: `${node.jw_score * 100}%`,
                background: node.jw_score >= 0.85 ? '#00FF87' : '#FFB800',
                borderRadius: 2,
              }} />
              <div style={{
                position: 'absolute',
                top: 0,
                left: '85%',
                width: 1,
                height: '100%',
                background: '#FF4444',
              }} />
            </div>
          </div>
        )}
      </div>

      {(node.displacement_signal_fired || node.alert_flag) && (
        <div style={{ marginBottom: 10, ...metricStyle }}>
          <div style={labelStyle}>Active Signals</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {node.displacement_signal_fired && (
              <span style={{ fontSize: 9, color: '#FF4444', border: '1px solid #FF444440', padding: '2px 6px', borderRadius: 3 }}>
                ↘ Displacement
              </span>
            )}
            {node.alert_flag && (
              <span style={{ fontSize: 9, color: '#FFB800', border: '1px solid #FFB80040', padding: '2px 6px', borderRadius: 3 }}>
                ⚠ Alert
              </span>
            )}
            {node.systemic_node_flag && (
              <span style={{ fontSize: 9, color: '#FF4444', border: '1px solid #FF444440', padding: '2px 6px', borderRadius: 3 }}>
                ⬡ Systemic
              </span>
            )}
            {node.delta_u < -0.3 && (
              <span style={{ fontSize: 9, color: '#FFB800', border: '1px solid #FFB80040', padding: '2px 6px', borderRadius: 3 }}>
                ↘ ΔUR {(node.delta_u * 100).toFixed(0)}%
              </span>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <button style={{ ...actionBtnStyle, borderColor: '#00FF87', color: '#00FF87' }}>
          Send Benefit Calc
        </button>
        <button style={{ ...actionBtnStyle, borderColor: '#FFB800', color: '#FFB800' }}>
          Offer Rate Reduction
        </button>
        <button style={{ ...actionBtnStyle, borderColor: '#FFB800', color: '#FFB800' }}>
          Request Limit Review
        </button>
        <button style={{ ...actionBtnStyle, borderColor: '#FF4444', color: '#FF4444' }}>
          Escalate to Coverage
        </button>
      </div>
    </motion.div>
  );
}

const actionBtnStyle = {
  fontSize: 10,
  fontWeight: 600,
  padding: '6px 4px',
  background: 'transparent',
  border: '1px solid',
  borderRadius: 5,
  cursor: 'pointer',
  textAlign: 'center' as const,
};

function AnchorInspector({ node }: { node: AnchorNode }) {
  const nodes = useSimStore(s => s.nodes);
  const updateAnchorDpo = useSimStore(s => s.updateAnchorDpo);
  const addSignal = useSimStore(s => s.addSignal);
  const setAlertBanner = useSimStore(s => s.setAlertBanner);

  const connectedSuppliers = nodes.filter(n => {
    if (n.type === 'anchor' || n.type === 'competitor') return false;
    return (n as SupplierNode).anchors.some(a => a.anchor_id === node.id);
  }) as SupplierNode[];

  const topSuppliers = connectedSuppliers
    .sort((a, b) => b.financed_volume_usd - a.financed_volume_usd)
    .slice(0, 6);

  const barData = topSuppliers.map(s => ({
    id: s.id.replace('SUP_', '#'),
    value: Math.round(s.financed_volume_usd / 1000),
    color: STATE_COLORS[s.state] || '#6B7280',
  }));

  const dpoColor = (node.dpo_days || 0) > 75 ? '#FF4444' : (node.dpo_days || 0) > 60 ? '#FFB800' : '#00FF87';

  const adjustDpo = (delta: number) => {
    const newDpo = (node.dpo_days || 50) + delta;
    updateAnchorDpo(node.id, newDpo);
    if (newDpo > 60 && (node.dpo_days || 50) <= 60) {
      addSignal({
        id: `sig-dpo-${node.id}-${Date.now()}`,
        supplier_id: node.id,
        type: 'dpo_stretch',
        timestamp: Date.now(),
        description: `${node.name} DPO crossed 60-day threshold: ${newDpo}d`,
        corridor: 'APAC',
      });
    }
    if (newDpo > 75) {
      setAlertBanner(`DPO CRITICAL: ${node.name} at ${newDpo} days — cascade risk elevated`);
    }
  };

  const metricStyle = {
    background: 'rgba(15,23,42,0.6)',
    borderRadius: 6,
    padding: '6px 8px',
    border: '1px solid rgba(148,163,184,0.06)',
  };
  const labelStyle = { fontSize: 9, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 2 };
  const valueStyle = { fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: '#E2E8F0', fontWeight: 700 };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      style={{ padding: '12px 14px', overflowY: 'auto', height: '100%', scrollbarWidth: 'thin', scrollbarColor: 'rgba(148,163,184,0.2) transparent' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40,
          borderRadius: '50%',
          background: '#003087',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700, color: '#FFFFFF',
          flexShrink: 0,
        }}>
          {node.name?.[0] || 'A'}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>{node.name}</div>
          <div style={{ fontSize: 11, color: '#94A3B8' }}>Anchor — APAC</div>
          <div style={{ fontSize: 10, color: '#64748B' }}>
            {node.connected_suppliers} suppliers · {node.at_risk_count} at-risk
          </div>
        </div>
      </div>

      {barData.length > 0 && (
        <div style={{ height: 120, marginBottom: 12 }}>
          <ResponsiveBar
            data={barData}
            keys={['value']}
            indexBy="id"
            margin={{ top: 0, right: 10, bottom: 20, left: 40 }}
            layout="horizontal"
            colors={d => d.data.color as string}
            borderRadius={2}
            enableLabel={false}
            enableGridX={false}
            enableGridY={false}
            axisLeft={{ tickSize: 0, tickPadding: 4 }}
            axisBottom={{ tickSize: 0, tickPadding: 4, format: v => `$${v}K` }}
            theme={{
              text: { fill: '#64748B', fontSize: 9, fontFamily: '"JetBrains Mono", monospace' },
              axis: { ticks: { line: { stroke: 'rgba(148,163,184,0.1)' } } },
            }}
            isInteractive={false}
          />
        </div>
      )}

      <div style={{ ...metricStyle, marginBottom: 12 }}>
        <div style={labelStyle}>DPO Control</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <button onClick={() => adjustDpo(-5)} style={{ ...dpoBtn, color: '#94A3B8' }}>−</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <span style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 24,
              fontWeight: 700,
              color: dpoColor,
            }}>
              {node.dpo_days}d
            </span>
            {(node.dpo_days || 0) > 60 && (
              <div style={{ fontSize: 10, color: '#FFB800', marginTop: 2 }}>⚠ Threshold exceeded</div>
            )}
          </div>
          <button onClick={() => adjustDpo(5)} style={{ ...dpoBtn, color: '#E2E8F0' }}>+</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {[
          { label: 'Programme Vol', value: fmt(node.total_volume) },
          { label: 'At-Risk Count', value: String(node.at_risk_count) },
          { label: 'Activation Rate', value: `${Math.round((1 - node.at_risk_count / Math.max(1, node.connected_suppliers)) * 100)}%` },
          { label: 'DPO Avg', value: `${node.dpo_days}d` },
        ].map(m => (
          <div key={m.label} style={metricStyle}>
            <div style={labelStyle}>{m.label}</div>
            <div style={valueStyle}>{m.value}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

const dpoBtn = {
  width: 28,
  height: 28,
  background: 'rgba(148,163,184,0.1)',
  border: '1px solid rgba(148,163,184,0.2)',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export default function NodeInspector() {
  const selectedNode = useSimStore(s => s.selectedNode);

  if (!selectedNode) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#475569',
        fontSize: 13,
        gap: 8,
      }}>
        <div style={{ fontSize: 24, opacity: 0.3 }}>⬡</div>
        <div>Click any node to inspect</div>
        <div style={{ fontSize: 11, color: '#334155' }}>Supplier or anchor</div>
      </div>
    );
  }

  if (selectedNode.type === 'anchor') {
    return <AnchorInspector node={selectedNode as AnchorNode} />;
  }

  if (selectedNode.type === 'competitor') {
    return (
      <div style={{ padding: 14, color: '#94A3B8' }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Competitor Bank</div>
        <div style={{ fontSize: 12 }}>Receiving displaced supplier flow. No intervention available.</div>
      </div>
    );
  }

  return <SupplierInspector node={selectedNode as SupplierNode} />;
}
