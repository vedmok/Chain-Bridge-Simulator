import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSimStore } from '../store';
import type { Signal } from '../types';

const SIGNAL_CONFIG: Record<Signal['type'], { color: string; icon: string; label: string }> = {
  displacement:       { color: '#FF4444', icon: '↘', label: 'Displacement' },
  utilisation_drop:   { color: '#FFB800', icon: '⚠', label: 'Util Drop' },
  cross_anchor_stress:{ color: '#FF4444', icon: '⬡', label: 'Cross-Anchor' },
  onboarding_stall:   { color: '#60A5FA', icon: '⏳', label: 'Onboarding' },
  dpo_stretch:        { color: '#FFB800', icon: '📅', label: 'DPO Stretch' },
  dormant_flagged:    { color: '#6B7280', icon: '⊗', label: 'Dormant' },
  intervention_fired: { color: '#00FF87', icon: '⚡', label: 'Intervention' },
  recovery_confirmed: { color: '#00FF87', icon: '✓', label: 'Recovery' },
};

const CORRIDOR_FLAGS: Record<string, string> = {
  India: '🇮🇳',
  Singapore: '🇸🇬',
  Vietnam: '🇻🇳',
  HongKong: '🇭🇰',
  APAC: '🌏',
};

function timeAgo(ts: number): string {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function SignalCard({ signal, onClick }: { signal: Signal; onClick: () => void }) {
  const cfg = SIGNAL_CONFIG[signal.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClick}
      style={{
        display: 'flex',
        gap: 0,
        marginBottom: 4,
        cursor: 'pointer',
        borderRadius: 6,
        overflow: 'hidden',
        background: 'rgba(15,23,42,0.6)',
        border: '1px solid rgba(148,163,184,0.06)',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.background = 'rgba(30,41,59,0.9)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.background = 'rgba(15,23,42,0.6)';
      }}
    >
      <div style={{
        width: 3,
        background: cfg.color,
        flexShrink: 0,
      }} />
      <div style={{ padding: '6px 10px', flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ color: cfg.color, fontSize: 11, flexShrink: 0 }}>{cfg.icon}</span>
          <span style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 11,
            color: '#E2E8F0',
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {signal.supplier_id}
          </span>
          <span style={{ fontSize: 12, flexShrink: 0 }}>
            {CORRIDOR_FLAGS[signal.corridor] || '🌐'}
          </span>
          <span style={{
            marginLeft: 'auto',
            fontSize: 10,
            color: '#64748B',
            flexShrink: 0,
            fontFamily: '"JetBrains Mono", monospace',
          }}>
            {timeAgo(signal.timestamp)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{
            fontSize: 10,
            color: cfg.color,
            border: `1px solid ${cfg.color}40`,
            borderRadius: 3,
            padding: '0 5px',
            flexShrink: 0,
          }}>
            {cfg.label}
          </span>
        </div>
        <div style={{
          fontSize: 10,
          color: '#94A3B8',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {signal.description}
        </div>
      </div>
    </motion.div>
  );
}

export default function SignalFeed() {
  const signals = useSimStore(s => s.signals);
  const setSelectedNode = useSimStore(s => s.setSelectedNode);
  const nodes = useSimStore(s => s.nodes);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [signals.length]);

  const handleSignalClick = (signal: Signal) => {
    const node = nodes.find(n => n.id === signal.supplier_id);
    if (node) setSelectedNode(node);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '55%',
      minHeight: 0,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px 6px',
        borderBottom: '1px solid rgba(148,163,184,0.06)',
      }}>
        <div style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#00FF87',
          animation: 'dot-pulse 1.5s ease-in-out infinite',
          boxShadow: '0 0 6px #00FF87',
        }} />
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#E2E8F0',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          Signal Feed
        </span>
        <span style={{
          marginLeft: 'auto',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 11,
          color: '#64748B',
        }}>
          {signals.length} events
        </span>
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '6px 10px',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(148,163,184,0.2) transparent',
        }}
      >
        {signals.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#475569',
            fontSize: 12,
          }}>
            No signals fired yet
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {signals.slice(0, 15).map(signal => (
              <SignalCard
                key={signal.id}
                signal={signal}
                onClick={() => handleSignalClick(signal)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
