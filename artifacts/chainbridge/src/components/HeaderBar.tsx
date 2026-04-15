import { useSimStore } from '../store';
import type { SimState } from '../types';
import {
  triggerChainBridgeActive,
} from '../scenarios';

const STATE_CONFIG: Record<SimState, { color: string; pulse: boolean; label: string }> = {
  idle: { color: '#6B7280', pulse: false, label: 'Awaiting Simulation' },
  running: { color: '#00FF87', pulse: true, label: 'Live Simulation' },
  event_processing: { color: '#FFB800', pulse: true, label: 'Event Processing' },
  cascading: { color: '#FF4444', pulse: true, label: 'Stress Event Cascading' },
  recovering: { color: '#00FF87', pulse: true, label: 'ChainBridge Recovering' },
  stable: { color: '#00FF87', pulse: false, label: 'Portfolio Stable' },
};

export default function HeaderBar() {
  const simState = useSimStore(s => s.simState);
  const simWeek = useSimStore(s => s.simWeek);
  const chainbridgeActive = useSimStore(s => s.chainbridgeActive);
  const presentationMode = useSimStore(s => s.presentationMode);
  const setPresentationMode = useSimStore(s => s.setPresentationMode);
  const setSimState = useSimStore(s => s.setSimState);
  const setSimWeek = useSimStore(s => s.setSimWeek);
  const resetSimulation = useSimStore(s => s.resetSimulation);
  const getStore = useSimStore.getState;
  const setStore = (fn: any) => useSimStore.setState(fn);

  const config = STATE_CONFIG[simState];

  const handleRun = () => {
    if (simState === 'idle' || simState === 'stable') {
      setSimState('running');
      setSimWeek(1);
    } else if (simState === 'running') {
      setSimState('idle');
    }
  };

  const handleStepForward = () => {
    const newWeek = simWeek + 1;
    setSimWeek(newWeek);
    const store = getStore();
    const values = store.programmeHealth.map(g => Math.min(100, g.value + Math.random() * 3 - 1));
    store.updateProgrammeHealth(values);
  };

  const handleStepBack = () => {
    setSimWeek(Math.max(1, simWeek - 1));
  };

  return (
    <header
      className="flex items-center justify-between px-4 z-50 relative"
      style={{
        height: 56,
        background: 'rgba(5,13,26,0.95)',
        borderBottom: '1px solid rgba(148,163,184,0.08)',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 20, color: '#003087' }}>⬡</span>
          <span style={{ fontWeight: 600, fontSize: 16, color: '#FFFFFF' }}>ChainBridge</span>
        </div>
        <div style={{ width: 1, height: 20, background: '#1E293B' }} />
        <span style={{ fontSize: 13, color: '#94A3B8' }}>SCF Command Simulator</span>
        <div
          style={{
            background: '#003087',
            color: '#FFFFFF',
            fontSize: 10,
            padding: '2px 7px',
            borderRadius: 99,
            fontWeight: 600,
            letterSpacing: '0.05em',
          }}
        >
          J.P. MORGAN
        </div>
      </div>

      <div className="flex items-center gap-3">
        {chainbridgeActive ? (
          <div
            className="flex items-center gap-2"
            style={{
              background: 'linear-gradient(90deg, rgba(0,48,135,0.4) 0%, rgba(0,48,135,0.6) 50%, rgba(0,48,135,0.4) 100%)',
              padding: '4px 16px',
              borderRadius: 6,
              animation: 'chainbridge-pulse 2s ease-in-out infinite',
            }}
          >
            <span style={{ color: '#B5984A', fontSize: 14 }}>⚡</span>
            <span style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 600 }}>
              CHAINBRIDGE ACTIVE — Decision Engine Running
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: config.color,
                boxShadow: config.pulse ? `0 0 6px ${config.color}` : 'none',
                animation: config.pulse ? 'dot-pulse 1.2s ease-in-out infinite' : 'none',
              }}
            />
            <span style={{ fontSize: 13, color: '#E2E8F0' }}>
              {config.label}
              {simState === 'running' && (
                <span style={{ fontFamily: '"JetBrains Mono", monospace', marginLeft: 6, color: '#00FF87' }}>
                  — Week {simWeek}
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleStepBack}
          className="sim-btn"
          title="Step back"
          disabled={simWeek <= 1}
          style={{ opacity: simWeek <= 1 ? 0.4 : 1 }}
        >
          ◀◀
        </button>

        <button
          onClick={handleRun}
          className="sim-btn primary"
          title={simState === 'running' ? 'Pause' : 'Run'}
        >
          {simState === 'running' ? '⏸ Pause' : '▶ Run'}
        </button>

        <button
          onClick={handleStepForward}
          className="sim-btn"
          title="Step forward"
        >
          ▶▶
        </button>

        <div style={{ width: 1, height: 20, background: '#1E293B', margin: '0 4px' }} />

        <button
          onClick={() => resetSimulation()}
          className="sim-btn"
          title="Reset simulation"
        >
          ↺ Reset
        </button>

        <button
          onClick={() => setPresentationMode(!presentationMode)}
          className="sim-btn"
          title="Presentation mode"
          style={{ color: presentationMode ? '#00FF87' : undefined }}
        >
          ⛶ {presentationMode ? 'Exit' : 'Present'}
        </button>
      </div>
    </header>
  );
}
