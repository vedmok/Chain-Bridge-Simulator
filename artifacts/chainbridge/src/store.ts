import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet, setAutoFreeze } from 'immer';

enableMapSet();
setAutoFreeze(false);
import type { GraphNode, GraphLink, Signal, QueueItem, SupplierNode, AnchorNode, ProgrammeHealthGauge, ChainBridgeOutcome, SimState } from './types';

export interface SimStore {
  nodes: GraphNode[];
  links: GraphLink[];
  signals: Signal[];
  queue: QueueItem[];
  selectedNode: GraphNode | null;
  hoveredNode: GraphNode | null;
  simState: SimState;
  simWeek: number;
  chainbridgeActive: boolean;
  presentationMode: boolean;
  rightPanelTab: 'inspector' | 'scenarios' | 'health';
  programmeHealth: ProgrammeHealthGauge[];
  healthHistory: { week: number; values: number[] }[];
  chainbridgeOutcome: ChainBridgeOutcome | null;
  alertBanner: string | null;
  dataLoaded: boolean;
  interventionModal: { open: boolean; supplierId: string | null };
  nodeFlashes: Record<string, 'green' | 'white' | null>;

  setNodes: (nodes: GraphNode[]) => void;
  setLinks: (links: GraphLink[]) => void;
  setDataLoaded: (v: boolean) => void;
  setSelectedNode: (node: GraphNode | null) => void;
  setHoveredNode: (node: GraphNode | null) => void;
  setSimState: (s: SimState) => void;
  setSimWeek: (w: number) => void;
  setChainbridgeActive: (v: boolean) => void;
  setPresentationMode: (v: boolean) => void;
  setRightPanelTab: (t: 'inspector' | 'scenarios' | 'health') => void;
  addSignal: (s: Signal) => void;
  addQueueItem: (q: QueueItem) => void;
  removeQueueItem: (id: string) => void;
  snoozeQueueItem: (id: string) => void;
  updateNodeState: (nodeId: string, state: GraphNode['state']) => void;
  updateLinkState: (sourceId: string, targetId: string, state: GraphLink['state']) => void;
  updateAnchorDpo: (anchorId: string, dpo: number) => void;
  setChainbridgeOutcome: (o: ChainBridgeOutcome | null) => void;
  setAlertBanner: (msg: string | null) => void;
  setInterventionModal: (v: { open: boolean; supplierId: string | null }) => void;
  updateProgrammeHealth: (values: number[]) => void;
  setNodeFlash: (nodeId: string, flash: 'green' | 'white' | null) => void;
  resetSimulation: () => void;
}

const INITIAL_HEALTH: ProgrammeHealthGauge[] = [
  { gap: 1, label: 'Signal Coverage', value: 72, description: '% suppliers with active monitoring' },
  { gap: 2, label: 'Onboarding Speed', value: 58, description: 'Inverse of avg onboarding days' },
  { gap: 3, label: 'Portfolio UR', value: 43, description: 'Avg utilisation rate' },
  { gap: 4, label: 'Network Resilience', value: 61, description: 'Inverse avg concentration risk' },
  { gap: 5, label: 'Retention Rate', value: 35, description: '% at-risk suppliers with intervention' },
];

export const useSimStore = create<SimStore>()(
  immer((set) => ({
    nodes: [],
    links: [],
    signals: [],
    queue: [],
    selectedNode: null,
    hoveredNode: null,
    simState: 'idle',
    simWeek: 1,
    chainbridgeActive: false,
    presentationMode: false,
    rightPanelTab: 'inspector',
    programmeHealth: INITIAL_HEALTH,
    healthHistory: [{ week: 0, values: INITIAL_HEALTH.map(h => h.value) }],
    chainbridgeOutcome: null,
    alertBanner: null,
    dataLoaded: false,
    interventionModal: { open: false, supplierId: null },
    nodeFlashes: {},

    setNodes: (nodes) => set(state => { state.nodes = nodes; }),
    setLinks: (links) => set(state => { state.links = links; }),
    setDataLoaded: (v) => set(state => { state.dataLoaded = v; }),
    setSelectedNode: (node) => set(state => { state.selectedNode = node; }),
    setHoveredNode: (node) => set(state => { state.hoveredNode = node; }),
    setSimState: (s) => set(state => { state.simState = s; }),
    setSimWeek: (w) => set(state => { state.simWeek = w; }),
    setChainbridgeActive: (v) => set(state => { state.chainbridgeActive = v; }),
    setPresentationMode: (v) => set(state => { state.presentationMode = v; }),
    setRightPanelTab: (t) => set(state => { state.rightPanelTab = t; }),

    addSignal: (s) => set(state => {
      state.signals.unshift(s);
      if (state.signals.length > 50) state.signals = state.signals.slice(0, 50);
    }),

    addQueueItem: (q) => set(state => {
      if (!state.queue.find(i => i.id === q.id)) {
        state.queue.unshift(q);
      }
    }),

    removeQueueItem: (id) => set(state => {
      state.queue = state.queue.filter(q => q.id !== id);
    }),

    snoozeQueueItem: (id) => set(state => {
      const item = state.queue.find(q => q.id === id);
      if (item) item.snoozed = true;
    }),

    updateNodeState: (nodeId, nodeState) => set(state => {
      const node = state.nodes.find(n => n.id === nodeId);
      if (node) (node as any).state = nodeState;
    }),

    updateLinkState: (sourceId, targetId, linkState) => set(state => {
      const link = state.links.find(l => {
        const src = typeof l.source === 'object' ? (l.source as any).id : l.source;
        const tgt = typeof l.target === 'object' ? (l.target as any).id : l.target;
        return (src === sourceId && tgt === targetId) || (src === targetId && tgt === sourceId);
      });
      if (link) {
        link.state = linkState;
        if (linkState === 'healthy') {
          link.particles = 4;
          link.particle_speed = 0.004;
          link.particle_color = '#00FF87';
        } else if (linkState === 'at-risk') {
          link.particles = 2;
          link.particle_speed = 0.002;
          link.particle_color = '#FFB800';
        } else if (linkState === 'critical' || linkState === 'broken') {
          link.particles = 0;
          link.particle_color = '#FF4444';
        } else if (linkState === 'displaced') {
          link.particles = 3;
          link.particle_speed = 0.006;
          link.particle_color = '#9CA3AF';
        }
      }
    }),

    updateAnchorDpo: (anchorId, dpo) => set(state => {
      const anchor = state.nodes.find(n => n.id === anchorId && n.type === 'anchor') as AnchorNode | undefined;
      if (anchor) anchor.dpo_days = dpo;
    }),

    setChainbridgeOutcome: (o) => set(state => { state.chainbridgeOutcome = o; }),
    setAlertBanner: (msg) => set(state => { state.alertBanner = msg; }),
    setInterventionModal: (v) => set(state => { state.interventionModal = v; }),

    updateProgrammeHealth: (values) => set(state => {
      state.programmeHealth = state.programmeHealth.map((g, i) => ({
        ...g,
        value: Math.max(0, Math.min(100, values[i] ?? g.value))
      }));
      const lastWeek = state.healthHistory[state.healthHistory.length - 1];
      state.healthHistory.push({ week: (lastWeek?.week ?? 0) + 1, values });
      if (state.healthHistory.length > 10) state.healthHistory.shift();
    }),

    setNodeFlash: (nodeId, flash) => set(state => {
      state.nodeFlashes[nodeId] = flash;
    }),

    resetSimulation: () => set(state => {
      state.simState = 'idle';
      state.simWeek = 1;
      state.chainbridgeActive = false;
      state.chainbridgeOutcome = null;
      state.alertBanner = null;
      state.signals = [];
      state.queue = [];
      state.programmeHealth = INITIAL_HEALTH;
      state.healthHistory = [{ week: 0, values: INITIAL_HEALTH.map(h => h.value) }];
      state.nodeFlashes = {};
      state.nodes.forEach(node => {
        if (node.type !== 'anchor' && node.type !== 'competitor') {
          const sup = node as SupplierNode;
          if (sup.displacement_signal_fired) {
            (node as any).state = 'displaced';
          } else if (sup.alert_flag) {
            (node as any).state = 'at-risk';
          } else {
            (node as any).state = 'healthy';
          }
        }
      });
      state.links.forEach(link => {
        if (link.state !== 'displaced') {
          link.state = 'healthy';
          link.particles = 4;
          link.particle_speed = 0.004;
          link.particle_color = '#00FF87';
        }
      });
    }),
  }))
);
