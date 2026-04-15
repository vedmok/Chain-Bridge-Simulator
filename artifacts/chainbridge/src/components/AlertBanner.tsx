import { motion, AnimatePresence } from 'framer-motion';
import { useSimStore } from '../store';

export default function AlertBanner() {
  const alertBanner = useSimStore(s => s.alertBanner);
  const setAlertBanner = useSimStore(s => s.setAlertBanner);

  return (
    <AnimatePresence>
      {alertBanner && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 36, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            background: 'rgba(255,68,68,0.15)',
            borderBottom: '1px solid rgba(255,68,68,0.4)',
            overflow: 'hidden',
            position: 'relative',
            zIndex: 40,
          }}
        >
          <span style={{ fontSize: 13, color: '#FF4444' }}>●</span>
          <span style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 12,
            fontWeight: 600,
            color: '#FF4444',
            letterSpacing: '0.04em',
          }}>
            {alertBanner}
          </span>
          <button
            onClick={() => setAlertBanner(null)}
            style={{
              position: 'absolute',
              right: 12,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#FF4444',
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
