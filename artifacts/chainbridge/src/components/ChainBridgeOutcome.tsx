import { motion, AnimatePresence } from 'framer-motion';
import { useSimStore } from '../store';

export default function ChainBridgeOutcomeCard() {
  const outcome = useSimStore(s => s.chainbridgeOutcome);
  const setChainbridgeOutcome = useSimStore(s => s.setChainbridgeOutcome);

  return (
    <AnimatePresence>
      {outcome && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            background: 'linear-gradient(135deg, rgba(0,48,135,0.95) 0%, rgba(5,20,60,0.95) 100%)',
            border: '1px solid rgba(181,152,74,0.6)',
            borderRadius: 12,
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            boxShadow: '0 0 40px rgba(0,48,135,0.4), 0 0 80px rgba(0,48,135,0.1)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20, color: '#B5984A' }}>⚡</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#B5984A', letterSpacing: '0.08em' }}>
                CHAINBRIDGE OUTCOME
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Recovery wave complete</div>
            </div>
          </div>

          <div style={{
            width: 1,
            height: 36,
            background: 'rgba(181,152,74,0.3)',
          }} />

          {[
            { label: 'Reactivated', value: String(outcome.suppliers_reactivated), unit: 'suppliers' },
            { label: 'Prevented', value: String(outcome.displacements_prevented), unit: 'displacements' },
            { label: 'Retained', value: `$${outcome.volume_retained}K`, unit: 'volume' },
            { label: 'Decision Time', value: outcome.rm_decision_time, unit: 'avg' },
          ].map(m => (
            <div key={m.label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 18,
                fontWeight: 700,
                color: '#00FF87',
              }}>
                {m.value}
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {m.unit}
              </div>
            </div>
          ))}

          <button
            onClick={() => setChainbridgeOutcome(null)}
            style={{
              position: 'absolute',
              top: 8,
              right: 10,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.3)',
              fontSize: 16,
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
