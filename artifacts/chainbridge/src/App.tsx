import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSimStore } from './store';
import { loadSimulationData } from './dataLoader';
import HeaderBar from './components/HeaderBar';
import GraphCanvas from './components/GraphCanvas';
import SignalFeed from './components/SignalFeed';
import RMQueue from './components/RMQueue';
import NodeInspector from './components/NodeInspector';
import ScenarioPanel from './components/ScenarioPanel';
import ProgrammeHealth from './components/ProgrammeHealth';
import AlertBanner from './components/AlertBanner';
import InterventionModal from './components/InterventionModal';
import ChainBridgeOutcomeCard from './components/ChainBridgeOutcome';

const TAB_LABELS: { key: 'inspector' | 'scenarios' | 'health'; label: string; icon: string }[] = [
  { key: 'inspector', label: 'Inspector', icon: '⬡' },
  { key: 'scenarios', label: 'Scenarios', icon: '⚡' },
  { key: 'health', label: 'Health', icon: '◉' },
];

export default function App() {
  const { setNodes, setLinks, setDataLoaded, addSignal, addQueueItem, dataLoaded } = useSimStore();
  const rightPanelTab = useSimStore(s => s.rightPanelTab);
  const setRightPanelTab = useSimStore(s => s.setRightPanelTab);
  const presentationMode = useSimStore(s => s.presentationMode);
  const chainbridgeActive = useSimStore(s => s.chainbridgeActive);
  const simState = useSimStore(s => s.simState);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    loadSimulationData().then(({ nodes, links, initialQueue }) => {
      setNodes(nodes);
      setLinks(links);
      initialQueue.forEach(q => addQueueItem(q));
      setDataLoaded(true);
      setLoading(false);

      const supplierCount = nodes.filter(n => n.type !== 'anchor' && n.type !== 'competitor').length;
      const anchorCount = nodes.filter(n => n.type === 'anchor').length;

      addSignal({
        id: 'sig-boot',
        supplier_id: 'System',
        type: 'recovery_confirmed',
        timestamp: Date.now(),
        description: `ChainBridge loaded — ${supplierCount} suppliers, ${anchorCount} anchors, ${links.length} connections`,
        corridor: 'APAC',
      });
    }).catch(err => {
      console.error('Data load failed', err);
      setLoadError(err?.message || 'Failed to load CSV data');
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (simState !== 'running') return;

    tickRef.current = setInterval(() => {
      const store = useSimStore.getState();
      const newWeek = store.simWeek + 1;
      store.setSimWeek(newWeek);

      const all = store.nodes.filter(n => n.type !== 'anchor' && n.type !== 'competitor');
      if (all.length === 0) return;

      const rand = all[Math.floor(Math.random() * all.length)] as any;
      const signalTypes = ['utilisation_drop', 'dormant_flagged', 'displacement'] as const;
      const t = signalTypes[Math.floor(Math.random() * signalTypes.length)];

      store.addSignal({
        id: `sig-tick-${Date.now()}`,
        supplier_id: rand.id,
        type: t,
        timestamp: Date.now(),
        description: `Auto-monitored: ${t.replace(/_/g, ' ')} — ${rand.id}`,
        corridor: rand.corridor || 'APAC',
      });
    }, 6000);

    return () => clearInterval(tickRef.current);
  }, [simState]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#050D1A',
        gap: 24,
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ fontSize: 40, color: '#003087' }}>⬡</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF' }}>ChainBridge</div>
        <div style={{ fontSize: 13, color: '#64748B' }}>Loading APAC supply chain data...</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#003087',
              animation: `dot-pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#050D1A',
        gap: 16,
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ fontSize: 14, color: '#FF4444' }}>⚠ Data load error</div>
        <div style={{ fontSize: 11, color: '#64748B' }}>{loadError}</div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      background: 'linear-gradient(180deg, #050D1A 0%, #040B18 100%)',
      overflow: 'hidden',
      fontFamily: 'Inter, sans-serif',
    }}>
      <HeaderBar />
      <AlertBanner />

      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          width: 280,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid rgba(148,163,184,0.06)',
          background: 'rgba(5,13,26,0.7)',
          overflow: 'hidden',
        }}>
          <SignalFeed />
          <RMQueue />
        </div>

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <GraphCanvas />

          {presentationMode && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              pointerEvents: 'none',
              overflow: 'hidden',
              zIndex: 10,
            }}>
              <motion.div
                animate={{ x: '-100%' }}
                transition={{ repeat: Infinity, duration: 16, ease: 'linear', repeatDelay: 1 }}
                style={{
                  display: 'flex',
                  gap: 32,
                  whiteSpace: 'nowrap',
                  padding: '4px 24px',
                  background: 'rgba(0,48,135,0.9)',
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: '"JetBrains Mono", monospace',
                  color: '#FFFFFF',
                  borderBottom: '1px solid rgba(181,152,74,0.4)',
                }}
              >
                {Array.from({ length: 3 }).map((_, i) => (
                  <span key={i} style={{ display: 'flex', gap: 32 }}>
                    <span>⬡ ChainBridge SCF Command Simulator</span>
                    <span style={{ color: '#00FF87' }}>APAC Portfolio · Live Simulation</span>
                    <span style={{ color: '#B5984A' }}>J.P. Morgan Supply Chain Finance</span>
                    <span style={{ color: '#FFB800' }}>150+ Suppliers · 5 Anchors · Real-time Signals</span>
                  </span>
                ))}
              </motion.div>
            </div>
          )}

          <ChainBridgeOutcomeCard />
        </div>

        <div style={{
          width: 320,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid rgba(148,163,184,0.06)',
          background: 'rgba(5,13,26,0.7)',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex',
            borderBottom: '1px solid rgba(148,163,184,0.08)',
          }}>
            {TAB_LABELS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setRightPanelTab(tab.key)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  fontSize: 11,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: rightPanelTab === tab.key
                    ? 'rgba(0,48,135,0.2)'
                    : 'transparent',
                  color: rightPanelTab === tab.key ? '#E2E8F0' : '#64748B',
                  borderBottom: rightPanelTab === tab.key
                    ? '2px solid #003087'
                    : '2px solid transparent',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <AnimatePresence mode="wait">
              {rightPanelTab === 'inspector' && (
                <motion.div
                  key="inspector"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ height: '100%', overflow: 'hidden' }}
                >
                  <NodeInspector />
                </motion.div>
              )}
              {rightPanelTab === 'scenarios' && (
                <motion.div
                  key="scenarios"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ height: '100%', overflow: 'hidden' }}
                >
                  <ScenarioPanel />
                </motion.div>
              )}
              {rightPanelTab === 'health' && (
                <motion.div
                  key="health"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ height: '100%', overflow: 'hidden' }}
                >
                  <ProgrammeHealth />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <InterventionModal />
    </div>
  );
}
