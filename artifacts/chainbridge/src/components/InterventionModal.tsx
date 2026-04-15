import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSimStore } from '../store';
import type { SupplierNode } from '../types';

export default function InterventionModal() {
  const { open, supplierId } = useSimStore(s => s.interventionModal);
  const nodes = useSimStore(s => s.nodes);
  const setInterventionModal = useSimStore(s => s.setInterventionModal);
  const removeQueueItem = useSimStore(s => s.removeQueueItem);
  const addSignal = useSimStore(s => s.addSignal);
  const updateNodeState = useSimStore(s => s.updateNodeState);
  const setNodeFlash = useSimStore(s => s.setNodeFlash);

  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C'>('A');

  const node = nodes.find(n => n.id === supplierId) as SupplierNode | undefined;
  if (!open || !node) return null;

  const urgencyColor = node.displacement_signal_fired ? '#FF4444' : node.alert_flag ? '#FFB800' : '#60A5FA';
  const urgencyLabel = node.displacement_signal_fired ? 'CRITICAL' : node.alert_flag ? 'HIGH' : 'MEDIUM';

  const handleConfirm = () => {
    setInterventionModal({ open: false, supplierId: null });
    removeQueueItem(`q-${node.id}`);
    removeQueueItem(`q-cb-${node.id}`);
    updateNodeState(node.id, 'healthy');
    setNodeFlash(node.id, 'green');
    setTimeout(() => setNodeFlash(node.id, null), 600);
    addSignal({
      id: `sig-confirm-${node.id}-${Date.now()}`,
      supplier_id: node.id,
      type: 'intervention_fired',
      timestamp: Date.now(),
      description: `Intervention Confirmed — ${node.id} · Option ${selectedOption} selected`,
      corridor: node.corridor,
    });
  };

  const optionA = node.recommended_intervention;
  const optionB = node.displacement_signal_fired ? 'Rate-only offer — no value-add component' : 'Anchor outreach — request DPO review';
  const retentionA = Math.round((node.p_preventable || 0.375) * 100);
  const retentionB = Math.round(retentionA * 0.35);

  const CORRIDOR_FLAGS: Record<string, string> = { India: '🇮🇳', Singapore: '🇸🇬', Vietnam: '🇻🇳' };

  return (
    <AnimatePresence>
      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(5,13,26,0.85)',
            backdropFilter: 'blur(8px)',
          }}
          onClick={() => setInterventionModal({ open: false, supplierId: null })}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={e => e.stopPropagation()}
            style={{
              width: 580,
              maxHeight: '85vh',
              overflowY: 'auto',
              background: 'rgba(15,23,42,0.95)',
              border: '1px solid rgba(148,163,184,0.12)',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 0 40px rgba(0,48,135,0.2)',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(148,163,184,0.2) transparent',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#FFFFFF',
                  marginBottom: 6,
                }}>
                  {node.id}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, background: '#003087', color: '#FFFFFF' }}>
                    {node.tier}
                  </span>
                  <span style={{ fontSize: 14 }}>{CORRIDOR_FLAGS[node.corridor] || '🌐'}</span>
                  <span style={{ fontSize: 10, color: '#94A3B8' }}>{node.corridor}</span>
                  <span style={{
                    fontSize: 10,
                    padding: '2px 7px',
                    borderRadius: 3,
                    color: node.state === 'displaced' ? '#9CA3AF' : '#94A3B8',
                    border: '1px solid rgba(148,163,184,0.2)',
                  }}>
                    {node.state.toUpperCase()}
                  </span>
                </div>
              </div>
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                color: urgencyColor,
                border: `1px solid ${urgencyColor}50`,
                padding: '4px 12px',
                borderRadius: 4,
              }}>
                {urgencyLabel}
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              marginBottom: 16,
              padding: 12,
              background: 'rgba(15,23,42,0.6)',
              borderRadius: 8,
              border: '1px solid rgba(148,163,184,0.06)',
            }}>
              {[
                { label: 'ΔUtilisation', value: `${(node.delta_u * 100).toFixed(1)}%` },
                { label: 'ΔTrade Volume', value: `${(node.delta_t * 100).toFixed(1)}%` },
                { label: 'At-Risk Volume', value: `$${Math.round(node.at_risk_volume_usd / 1000)}K` },
                { label: 'Retention Value', value: `$${node.retention_value_usd.toFixed(0)}` },
              ].map(m => (
                <div key={m.label}>
                  <div style={{ fontSize: 9, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{m.label}</div>
                  <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 14, fontWeight: 700, color: '#E2E8F0' }}>{m.value}</div>
                </div>
              ))}
              <div style={{ gridColumn: '1/-1', marginTop: 8 }}>
                <div style={{
                  padding: '8px 10px',
                  border: '1px solid rgba(255,184,0,0.3)',
                  borderRadius: 6,
                  background: 'rgba(255,184,0,0.05)',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#FFB800', marginBottom: 4 }}>
                    Engine Classification: {node.engine_classification.replace(/_/g, ' ').toUpperCase()}
                  </div>
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>
                    {node.displacement_signal_fired
                      ? 'Supplier financing activity has migrated to a competing SCF platform. Immediate competitive response required.'
                      : node.alert_flag
                      ? 'Utilisation has dropped below threshold. Facility constraints or market contraction driving reduced activity.'
                      : 'Supplier is in a healthy engagement state with normal utilisation patterns.'}
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              padding: '12px 14px',
              background: 'rgba(15,23,42,0.6)',
              borderLeft: '3px solid #003087',
              borderRadius: '0 8px 8px 0',
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#E2E8F0', marginBottom: 8 }}>
                ChainBridge Recommendation
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 12 }}>
                {optionA}
              </div>

              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: '#64748B', marginBottom: 4 }}>Act now</div>
                    <div style={{ height: 8, background: 'rgba(148,163,184,0.1)', borderRadius: 2 }}>
                      <div style={{
                        height: '100%',
                        width: `${retentionA}%`,
                        background: '#00FF87',
                        borderRadius: 2,
                      }} />
                    </div>
                    <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: '#00FF87', marginTop: 3 }}>
                      {retentionA}% retention
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: '#64748B', marginBottom: 4 }}>Wait 7d</div>
                    <div style={{ height: 8, background: 'rgba(148,163,184,0.1)', borderRadius: 2 }}>
                      <div style={{
                        height: '100%',
                        width: `${retentionB}%`,
                        background: '#FF4444',
                        borderRadius: 2,
                      }} />
                    </div>
                    <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: '#FF4444', marginTop: 3 }}>
                      {retentionB}% retention
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 10, color: '#FFB800' }}>
                ⏱ Optimal window closes in ~5 days
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Select Action
              </div>
              {([
                { key: 'A', label: 'ChainBridge Rec', desc: optionA, star: true },
                { key: 'B', label: 'Alternative', desc: optionB, star: false },
                { key: 'C', label: 'Monitor Only', desc: 'No action — field stays open for 7 days', star: false },
              ] as { key: 'A' | 'B' | 'C'; label: string; desc: string; star: boolean }[]).map(opt => (
                <div
                  key={opt.key}
                  onClick={() => setSelectedOption(opt.key)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: selectedOption === opt.key
                      ? '1px solid #003087'
                      : '1px solid rgba(148,163,184,0.12)',
                    background: selectedOption === opt.key
                      ? 'rgba(0,48,135,0.15)'
                      : 'transparent',
                    marginBottom: 6,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                    <div style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      border: `2px solid ${selectedOption === opt.key ? '#003087' : 'rgba(148,163,184,0.3)'}`,
                      background: selectedOption === opt.key ? '#003087' : 'transparent',
                      flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#E2E8F0' }}>
                      Option {opt.key}: {opt.label}
                    </span>
                    {opt.star && (
                      <span style={{ fontSize: 10, color: '#B5984A', marginLeft: 'auto' }}>★ Recommended</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748B', paddingLeft: 22 }}>{opt.desc}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                onClick={() => setInterventionModal({ open: false, supplierId: null })}
                style={{
                  fontSize: 12,
                  color: '#64748B',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px 0',
                }}
              >
                Dismiss
              </button>
              <button
                onClick={() => setInterventionModal({ open: false, supplierId: null })}
                style={{
                  fontSize: 12,
                  color: '#FFB800',
                  background: 'transparent',
                  border: '1px solid rgba(255,184,0,0.3)',
                  borderRadius: 5,
                  cursor: 'pointer',
                  padding: '8px 16px',
                }}
              >
                Snooze 24h
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#FFFFFF',
                  background: '#003087',
                  border: 'none',
                  borderRadius: 5,
                  cursor: 'pointer',
                  padding: '8px 20px',
                  transition: 'filter 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.15)')}
                onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
                onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.98)')}
                onMouseUp={e => (e.currentTarget.style.transform = 'none')}
              >
                Confirm Action
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
