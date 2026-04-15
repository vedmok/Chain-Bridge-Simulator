export type NodeState = 'healthy' | 'at-risk' | 'critical' | 'dormant' | 'displaced';
export type NodeTier = 'T1' | 'T2' | 'T3' | 'anchor' | 'competitor';
export type Corridor = 'India' | 'Singapore' | 'Vietnam' | 'HongKong';
export type SimState = 'idle' | 'running' | 'event_processing' | 'cascading' | 'recovering' | 'stable';

export interface SupplierNode {
  id: string;
  type: NodeTier;
  corridor: Corridor;
  tier: 'T1' | 'T2' | 'T3';
  state: NodeState;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;

  // Gap 1 - Programme Health
  utilisation_rate: number;
  anchor_dpo_days: number;
  facility_limit_usd: number;
  utilisation_history: { month: number; value: number; anchor: string }[];

  // Gap 2 - Onboarding
  entity_resolution: 'Pass1_Deterministic' | 'Pass2_Probabilistic';
  jw_score?: number;
  auto_merge_eligible: boolean;
  onboard_cost_usd: number;
  eligible_volume_usd: number;
  npv_positive: boolean;
  onboard_status: string;

  // Gap 3 - Utilisation
  financed_volume_usd: number;
  taulia_logins: number;
  taulia_transactions: number;
  supplier_state: string;
  alert_flag: boolean;
  recommended_intervention: string;
  autonomy_tier: string;

  // Gap 4 - Cross-Anchor
  num_anchors: number;
  concentration_risk: number;
  systemic_node_flag: boolean;
  high_concentration_flag: boolean;
  anchors: { anchor_id: string; weight: number; financed_volume: number }[];

  // Gap 5 - Displacement
  displacement_signal_fired: boolean;
  delta_u: number;
  delta_t: number;
  engine_classification: string;
  at_risk_volume_usd: number;
  retention_value_usd: number;
  p_preventable: number;

  // Animation state
  pulse_scale?: number;
  ring_opacity?: number;
  highlight?: boolean;
}

export interface AnchorNode {
  id: string;
  type: 'anchor';
  name: string;
  corridor: string;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
  dpo_days: number;
  connected_suppliers: number;
  at_risk_count: number;
  total_volume: number;
  pulse_scale?: number;
  state: 'healthy' | 'at-risk' | 'critical';
}

export interface CompetitorNode {
  id: string;
  type: 'competitor';
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
  state: 'active';
}

export type GraphNode = SupplierNode | AnchorNode | CompetitorNode;

export interface GraphLink {
  source: string;
  target: string;
  weight: number;
  state: 'healthy' | 'at-risk' | 'critical' | 'broken' | 'displaced';
  particles: number;
  particle_speed: number;
  particle_color: string;
  curvature?: number;
}

export interface Signal {
  id: string;
  supplier_id: string;
  type: 'displacement' | 'utilisation_drop' | 'cross_anchor_stress' | 'onboarding_stall' | 'dpo_stretch' | 'dormant_flagged' | 'intervention_fired' | 'recovery_confirmed';
  timestamp: number;
  description: string;
  corridor: string;
  time_ago?: string;
}

export interface QueueItem {
  id: string;
  supplier_id: string;
  tier: 'T1' | 'T2' | 'T3';
  action_type: string;
  urgency: 'Critical' | 'High' | 'Medium';
  autonomy_tier: string;
  signal_time: number;
  snoozed?: boolean;
}

export interface ProgrammeHealthGauge {
  gap: number;
  label: string;
  value: number;
  description: string;
}

export interface ChainBridgeOutcome {
  suppliers_reactivated: number;
  displacements_prevented: number;
  volume_retained: number;
  rm_decision_time: string;
}
