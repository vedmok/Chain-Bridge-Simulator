import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet, setAutoFreeze } from 'immer';
import type {
  GraphNode,
  GraphLink,
  Signal,
  QueueItem,
  SupplierNode,
  AnchorNode,
  ProgrammeHealthGauge,
  ChainBridgeOutcome,
  SimState,
  NodeState,
} from './types';

enableMapSet();
setAutoFreeze(false);

const clone = <T,>(value: T): T => {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value)) as T;
  }
};

const DEFAULT_PROGRAMME_HEALTH: ProgrammeHealthGauge[] = [
  {
    gap: 1,
    label: 'Programme Health',
    value: 78,
    description: 'Overall supplier engagement and programme usage.',
  },
  {
    gap: 2,
    label: 'Onboarding Resolution',
    value: 72,
    description: 'Entity resolution and onboarding conversion quality.',
  },
  {
    gap: 3,
    label: 'Utilisation',
    value: 69,
    description: 'Facility usage and supplier activity level.',
  },
  {
    gap: 4,
    label: 'Cross-Anchor Network',
    value: 74,
    description: 'Multi-anchor resilience and concentration balance.',
  },
  {
    gap: 5,
    label: 'Displacement Detection',
    value: 66,
    description: 'Early warning detection for migration risk.',
  },
];

type RightPanelTab = 'inspector' | 'scenarios' | 'health';
type NodeFlash = 'green' | 'white' | null;

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
  rightPanelTab: RightPanelTab;
  programmeHealth: ProgrammeHealthGauge[];
  healthHistory: { week: number; values: number[] }[];
  chainbridgeOutcome: ChainBridgeOutcome | null;
  alertBanner: string | null;
  dataLoaded: boolean;
  interventionModal: { open: boolean; supplierId: string | null };
  nodeFlashes: Record<string, NodeFlash>;

  _initialNodes: GraphNode[];
  _initialLinks: GraphLink[];
  _initialProgrammeHealth: ProgrammeHealthGauge[];
  _initialHealthHistory: { week: number; values: number[] }[];

  setNodes: (nodes: GraphNode[]) => void;
  setLinks: (links: GraphLink[]) => void;
  setDataLoaded: (v: boolean) => void;
  setSelectedNode: (node: GraphNode | null) => void;
  setHoveredNode: (node: GraphNode | null) => void;
  setSimState: (s: SimState) => void;
  setSimWeek: (week: number) => void;
  setRightPanelTab: (tab: RightPanelTab) => void;
  setPresentationMode: (v: boolean) => void;
  addSignal: (signal: Signal) => void;
  addQueueItem: (item: QueueItem) => void;
  removeQueueItem: (id: string) => void;
  snoozeQueueItem: (id: string) => void;
  setInterventionModal: (modal: { open: boolean; supplierId: string | null }) => void;
  updateProgrammeHealth: (values: number[]) => void;
  setChainbridgeOutcome: (outcome: ChainBridgeOutcome | null) => void;
  setAlertBanner: (message: string | null) => void;
  setNodeFlash: (nodeId: string, flash: NodeFlash) => void;
  updateNodeState: (nodeId: string, state: NodeState) => void;
  updateAnchorDpo: (anchorId: string, dpo: number) => void;
  resetSimulation: () => void;
}

const initialHealthHistory = [
  {
    week: 0,
    values: DEFAULT_PROGRAMME_HEALTH.map(g => g.value),
  },
];

export const useSimStore = create<SimStore>()(
  immer((set, get) => ({
    nodes: [],
    links: [],
    signals: [],
    queue: [],
    selectedNode: null,
    hoveredNode: null,
    simState: 'idle',
    simWeek: 0,
    chainbridgeActive: false,
    presentationMode: false,
    rightPanelTab: 'inspector',
    programmeHealth: clone(DEFAULT_PROGRAMME_HEALTH),
    healthHistory: clone(initialHealthHistory),
    chainbridgeOutcome: null,
    alertBanner: null,
    dataLoaded: false,
    interventionModal: { open: false, supplierId: null },
    nodeFlashes: {},

    _initialNodes: [],
    _initialLinks: [],
    _initialProgrammeHealth: clone(DEFAULT_PROGRAMME_HEALTH),
    _initialHealthHistory: clone(initialHealthHistory),

    setNodes: (nodes) =>
      set(state => {
        state.nodes = clone(nodes);
        if (state._initialNodes.length === 0 && nodes.length > 0) {
          state._initialNodes = clone(nodes);
        }
      }),

    setLinks: (links) =>
      set(state => {
        state.links = clone(links);
        if (state._initialLinks.length === 0 && links.length > 0) {
          state._initialLinks = clone(links);
        }
      }),

    setDataLoaded: (v) =>
      set(state => {
        state.dataLoaded = v;
      }),

    setSelectedNode: (node) =>
      set(state => {
        state.selectedNode = node;
      }),

    setHoveredNode: (node) =>
      set(state => {
        state.hoveredNode = node;
      }),

    setSimState: (s) =>
      set(state => {
        state.simState = s;
      }),

    setSimWeek: (week) =>
      set(state => {
        state.simWeek = Math.max(0, week);
      }),

    setRightPanelTab: (tab) =>
      set(state => {
        state.rightPanelTab = tab;
      }),

    setPresentationMode: (v) =>
      set(state => {
        state.presentationMode = v;
      }),

    addSignal: (signal) =>
      set(state => {
        state.signals.unshift(signal);
        if (state.signals.length > 100) {
          state.signals = state.signals.slice(0, 100);
        }
      }),

    addQueueItem: (item) =>
      set(state => {
        const exists = state.queue.some(
          q => q.id === item.id || (q.supplier_id === item.supplier_id && q.action_type === item.action_type)
        );
        if (!exists) {
          state.queue.unshift(item);
        }
      }),

    removeQueueItem: (id) =>
      set(state => {
        state.queue = state.queue.filter(q => q.id !== id);
      }),

    snoozeQueueItem: (id) =>
      set(state => {
        const item = state.queue.find(q => q.id === id);
        if (item) item.snoozed = true;
      }),

    setInterventionModal: (modal) =>
      set(state => {
        state.interventionModal = modal;
      }),

    updateProgrammeHealth: (values) =>
      set(state => {
        state.programmeHealth = state.programmeHealth.map((g, i) => ({
          ...g,
          value: Math.max(0, Math.min(100, values[i] ?? g.value)),
        }));

        state.healthHistory.push({
          week: state.simWeek,
          values: state.programmeHealth.map(g => g.value),
        });

        if (state.healthHistory.length > 16) {
          state.healthHistory = state.healthHistory.slice(-16);
        }
      }),

    setChainbridgeOutcome: (outcome) =>
      set(state => {
        state.chainbridgeOutcome = outcome;
      }),

    setAlertBanner: (message) =>
      set(state => {
        state.alertBanner = message;
      }),

    setNodeFlash: (nodeId, flash) =>
      set(state => {
        if (flash === null) {
          delete state.nodeFlashes[nodeId];
        } else {
          state.nodeFlashes[nodeId] = flash;
        }
      }),

    updateNodeState: (nodeId, newState) =>
      set(state => {
        const node = state.nodes.find(n => n.id === nodeId);
        if (!node) return;

        if (node.type === 'anchor') {
          if (newState === 'healthy' || newState === 'at-risk' || newState === 'critical') {
            (node as AnchorNode).state = newState;
          }
          return;
        }

        if (node.type === 'competitor') return;
        (node as SupplierNode).state = newState;
      }),

    updateAnchorDpo: (anchorId, dpo) =>
      set(state => {
        const node = state.nodes.find(n => n.id === anchorId);
        if (!node || node.type !== 'anchor') return;

        const anchor = node as AnchorNode;
        anchor.dpo_days = Math.max(0, dpo);

        if (anchor.dpo_days > 75) anchor.state = 'critical';
        else if (anchor.dpo_days > 60) anchor.state = 'at-risk';
        else anchor.state = 'healthy';
      }),

    resetSimulation: () =>
      set(state => {
        const restoredNodes =
          state._initialNodes.length > 0 ? clone(state._initialNodes) : [];
        const restoredLinks =
          state._initialLinks.length > 0 ? clone(state._initialLinks) : [];
        const restoredProgrammeHealth =
          state._initialProgrammeHealth.length > 0
            ? clone(state._initialProgrammeHealth)
            : clone(DEFAULT_PROGRAMME_HEALTH);
        const restoredHealthHistory =
          state._initialHealthHistory.length > 0
            ? clone(state._initialHealthHistory)
            : clone(initialHealthHistory);

        state.nodes = restoredNodes;
        state.links = restoredLinks;
        state.signals = [];
        state.queue = [];
        state.selectedNode = null;
        state.hoveredNode = null;
        state.simState = 'idle';
        state.simWeek = 0;
        state.chainbridgeActive = false;
        state.presentationMode = false;
        state.rightPanelTab = 'inspector';
        state.programmeHealth = restoredProgrammeHealth;
        state.healthHistory = restoredHealthHistory;
        state.chainbridgeOutcome = null;
        state.alertBanner = null;
        state.interventionModal = { open: false, supplierId: null };
        state.nodeFlashes = {};
        state.dataLoaded = restoredNodes.length > 0 || state.dataLoaded;
      }),
  }))
);
