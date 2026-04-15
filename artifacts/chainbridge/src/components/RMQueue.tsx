import { motion, AnimatePresence } from 'framer-motion';
import { useSimStore } from '../store';
import type { QueueItem } from '../types';

function timeHoursAgo(ts: number): string {
  const hrs = (Date.now() - ts) / 3600000;
  if (hrs < 1) return `${Math.round(hrs * 60)}m`;
  return `${hrs.toFixed(0)}h`;
}

function QueueRow({ item, onAct, onSnooze, onEscalate }: {
  item: QueueItem;
  onAct: () => void;
  onSnooze: () => void;
  onEscalate: () => void;
}) {
  const isOverdue = (Date.now() - item.signal_time) > 48 * 3600000;
  const urgencyColor = item.urgency === 'Critical' ? '#FF4444' : item.urgency === 'High' ? '#FFB800' : '#60A5FA';
  const borderColor = item.autonomy_tier === 'Auto-Execute' ? '#00FF87' :
    (item.autonomy_tier === 'Recommend and Choose' ? '#FFB800' : '#FF4444');
  const hoursAgo = timeHoursAgo(item.signal_time);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: item.snoozed ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        borderLeft: `4px solid ${borderColor}`,
        background: 'rgba(15,23,42,0.6)',
        borderRadius: '0 6px 6px 0',
        padding: '7px 10px',
        marginBottom: 4,
        border: `1px solid rgba(148,163,184,0.06)`,
        borderLeftWidth: 4,
        borderLeftColor: borderColor,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 12,
          color: '#E2E8F0',
          fontWeight: 700,
        }}>
          {item.supplier_id}
        </span>
        <span style={{
          fontSize: 9,
          fontWeight: 700,
          background: '#003087',
          padding: '1px 5px',
          borderRadius: 3,
          color: '#FFFFFF',
        }}>
          {item.tier}
        </span>
        <span style={{
          fontSize: 9,
          color: urgencyColor,
          border: `1px solid ${urgencyColor}50`,
          padding: '1px 5px',
          borderRadius: 3,
          marginLeft: 'auto',
        }}>
          {item.urgency.toUpperCase()}
        </span>
      </div>

      <div style={{
        fontSize: 10,
        color: '#94A3B8',
        marginBottom: 6,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {item.action_type}
      </div>

      <div style={{
        fontSize: 10,
        fontFamily: '"JetBrains Mono", monospace',
        color: isOverdue ? '#FF4444' : '#64748B',
        marginBottom: 6,
      }}>
        {hoursAgo} elapsed{isOverdue ? ' — OVERDUE' : ''}
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        <button
          onClick={onAct}
          style={{
            flex: 1,
            fontSize: 10,
            fontWeight: 600,
            padding: '3px 0',
            background: '#003087',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          ▶ Act
        </button>
        <button
          onClick={onSnooze}
          style={{
            fontSize: 10,
            padding: '3px 8px',
            background: 'transparent',
            color: '#FFB800',
            border: '1px solid rgba(255,184,0,0.3)',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          —
        </button>
        <button
          onClick={onEscalate}
          style={{
            fontSize: 10,
            padding: '3px 8px',
            background: 'transparent',
            color: '#FF4444',
            border: '1px solid rgba(255,68,68,0.3)',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          ↑
        </button>
      </div>
    </motion.div>
  );
}

export default function RMQueue() {
  const queue = useSimStore(s => s.queue);
  const removeQueueItem = useSimStore(s => s.removeQueueItem);
  const snoozeQueueItem = useSimStore(s => s.snoozeQueueItem);
  const setInterventionModal = useSimStore(s => s.setInterventionModal);
  const nodes = useSimStore(s => s.nodes);
  const setSelectedNode = useSimStore(s => s.setSelectedNode);

  const activeItems = queue.filter(q => !q.snoozed);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '45%',
      minHeight: 0,
      borderTop: '1px solid rgba(148,163,184,0.08)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px 6px',
        borderBottom: '1px solid rgba(148,163,184,0.06)',
      }}>
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#E2E8F0',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          RM Queue
        </span>
        {activeItems.length > 0 && (
          <motion.div
            key={activeItems.length}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: '#FF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 700,
              color: '#FFFFFF',
            }}
          >
            {activeItems.length}
          </motion.div>
        )}
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '6px 10px',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(148,163,184,0.2) transparent',
      }}>
        {queue.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#475569',
            fontSize: 12,
          }}>
            Queue is clear
          </div>
        ) : (
          <AnimatePresence>
            {queue.map(item => (
              <QueueRow
                key={item.id}
                item={item}
                onAct={() => {
                  setInterventionModal({ open: true, supplierId: item.supplier_id });
                  const node = nodes.find(n => n.id === item.supplier_id);
                  if (node) setSelectedNode(node);
                }}
                onSnooze={() => snoozeQueueItem(item.id)}
                onEscalate={() => {
                  removeQueueItem(item.id);
                }}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
