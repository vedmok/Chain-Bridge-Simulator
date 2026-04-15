import Papa from 'papaparse';
import type { GraphNode, GraphLink, SupplierNode, AnchorNode, CompetitorNode, Corridor, QueueItem } from './types';

function parseCSV(path: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(path, {
      download: true,
      header: true,
      dynamicTyping: true,
      complete: (results) => resolve(results.data as any[]),
      error: (err) => reject(err),
    });
  });
}

const ANCHOR_POSITIONS: Record<string, { x: number; y: number }> = {
  Anchor_Apple:   { x: -220, y: -200 },
  Anchor_Samsung: { x: -60,  y: -230 },
  Anchor_Siemens: { x: 100,  y: -220 },
  Anchor_FedEx:   { x: 230,  y: -195 },
  Anchor_Unilever:{ x: 30,   y: -265 },
};

const CORRIDOR_OFFSETS: Record<string, { x: number; y: number }> = {
  India:     { x: -270, y: 80 },
  Singapore: { x: -40,  y: 90 },
  Vietnam:   { x: 150,  y: 70 },
  HongKong:  { x: 280,  y: 20 },
};

function supplierPosition(corridor: string, index: number, total: number): { x: number; y: number } {
  const base = CORRIDOR_OFFSETS[corridor] || { x: 0, y: 80 };
  const cols = Math.ceil(Math.sqrt(total));
  const col = index % cols;
  const row = Math.floor(index / cols);
  return {
    x: base.x + (col - cols / 2) * 55 + (Math.random() - 0.5) * 15,
    y: base.y + row * 55 + (Math.random() - 0.5) * 15,
  };
}

export async function loadSimulationData() {
  const base = import.meta.env.BASE_URL;
  const prefix = base.replace(/\/$/, '');

  const [gap1Raw, gap2Raw, gap3Raw, gap4Raw, gap5Raw] = await Promise.all([
    parseCSV(`${prefix}/data/gap1_programme_health.csv`),
    parseCSV(`${prefix}/data/gap2_onboarding_entity_resolution.csv`),
    parseCSV(`${prefix}/data/gap3_utilisation_classification.csv`),
    parseCSV(`${prefix}/data/gap4_cross_anchor_network.csv`),
    parseCSV(`${prefix}/data/gap5_displacement_detection.csv`),
  ]);

  const gap1 = gap1Raw.filter(r => r.supplier_id);
  const gap2 = gap2Raw.filter(r => r.supplier_id);
  const gap3 = gap3Raw.filter(r => r.supplier_id);
  const gap4 = gap4Raw.filter(r => r.supplier_id);
  const gap5 = gap5Raw.filter(r => r.supplier_id);

  const gap2Map = new Map<string, any>(gap2.map(r => [r.supplier_id, r]));
  const gap3Map = new Map<string, any>(gap3.map(r => [r.supplier_id, r]));
  const gap5Map = new Map<string, any>(gap5.map(r => [r.supplier_id, r]));

  const gap4BySupplier = new Map<string, any[]>();
  gap4.forEach(r => {
    if (!gap4BySupplier.has(r.supplier_id)) gap4BySupplier.set(r.supplier_id, []);
    gap4BySupplier.get(r.supplier_id)!.push(r);
  });

  const gap1BySup = new Map<string, any[]>();
  gap1.forEach(r => {
    if (!gap1BySup.has(r.supplier_id)) gap1BySup.set(r.supplier_id, []);
    gap1BySup.get(r.supplier_id)!.push(r);
  });

  const anchorNames = Array.from(new Set(gap4.map(r => r.anchor_id))) as string[];

  const anchorNodes: AnchorNode[] = anchorNames.map(anchorId => {
    const pos = ANCHOR_POSITIONS[anchorId] || { x: 0, y: -250 };
    const connected = gap4.filter(r => r.anchor_id === anchorId).map(r => r.supplier_id);
    const uniqueConnected = Array.from(new Set(connected));
    const atRisk = uniqueConnected.filter(sid => {
      const g5 = gap5Map.get(sid);
      const g3 = gap3Map.get(sid);
      return g5?.displacement_signal_fired === 1 || g3?.alert_flag === 1;
    });
    const latestG1ForAnchor = gap1.filter(r => r.anchor_id === anchorId);
    const avgDpo = latestG1ForAnchor.length > 0
      ? latestG1ForAnchor.reduce((s, r) => s + (r.anchor_dpo_days || 50), 0) / latestG1ForAnchor.length
      : 50;
    const totalVol = gap4.filter(r => r.anchor_id === anchorId).reduce((s, r) => s + (r.financed_volume_anchor_usd || 0), 0);

    return {
      id: anchorId,
      type: 'anchor',
      name: anchorId.replace('Anchor_', ''),
      corridor: 'APAC',
      x: pos.x,
      y: pos.y,
      fx: pos.x,
      fy: pos.y,
      dpo_days: Math.round(avgDpo),
      connected_suppliers: uniqueConnected.length,
      at_risk_count: atRisk.length,
      total_volume: totalVol,
      state: 'healthy',
    };
  });

  const competitorNode: CompetitorNode = {
    id: 'COMPETITOR',
    type: 'competitor',
    x: 350,
    y: 150,
    fx: 350,
    fy: 150,
    state: 'active',
  };

  const corridorCounts: Record<string, number> = {};
  const corridorIndex: Record<string, number> = {};

  const supplierIds = Array.from(new Set([...gap3.map(r => r.supplier_id), ...gap4.map(r => r.supplier_id)]));

  supplierIds.forEach(sid => {
    const g3 = gap3Map.get(sid);
    const corridor = g3?.corridor || 'Singapore';
    corridorCounts[corridor] = (corridorCounts[corridor] || 0) + 1;
  });

  const supplierNodes: SupplierNode[] = [];

  for (const sid of supplierIds) {
    const g2 = gap2Map.get(sid);
    const g3 = gap3Map.get(sid);
    const g5 = gap5Map.get(sid);
    const g4rows = gap4BySupplier.get(sid) || [];
    const g1rows = gap1BySup.get(sid) || [];

    const corridor = (g3?.corridor || g2?.corridor || 'Singapore') as Corridor;
    const tier = (g3?.tier || g4rows[0]?.tier || 'T2') as 'T1' | 'T2' | 'T3';

    if (!corridorIndex[corridor]) corridorIndex[corridor] = 0;
    const idx = corridorIndex[corridor]++;
    const total = corridorCounts[corridor] || 1;
    const pos = supplierPosition(corridor, idx, total);

    let state: SupplierNode['state'] = 'healthy';
    if (g5?.displacement_signal_fired === 1) state = 'displaced';
    else if (g3?.supplier_state === 'Disengaged' || g3?.supplier_state === 'Unaware') state = 'dormant';
    else if (g3?.alert_flag === 1) state = 'at-risk';

    const latestUR = g3?.utilisation_rate ?? g1rows[g1rows.length - 1]?.utilisation_rate ?? 0.4;
    const utilHistory = g1rows.slice(0, 6).map((r, i) => ({ month: i + 1, value: r.utilisation_rate, anchor: r.anchor_id }));

    const anchors = g4rows.map(r => ({
      anchor_id: r.anchor_id,
      weight: r.weight_wij,
      financed_volume: r.financed_volume_anchor_usd,
    }));

    const primaryAnchor = g4rows.sort((a: any, b: any) => b.weight_wij - a.weight_wij)[0];
    const numAnchors = g4rows.length;
    const maxCR = g4rows.reduce((m: number, r: any) => Math.max(m, r.concentration_risk_cr || 0), 0);
    const systemic = g4rows.some((r: any) => r.systemic_node_flag === 1);

    supplierNodes.push({
      id: sid,
      type: tier,
      corridor,
      tier,
      state,
      x: pos.x,
      y: pos.y,

      utilisation_rate: latestUR,
      anchor_dpo_days: g1rows[g1rows.length - 1]?.anchor_dpo_days ?? 50,
      facility_limit_usd: g1rows[g1rows.length - 1]?.facility_limit_usd ?? 100000,
      utilisation_history: utilHistory,

      entity_resolution: g2?.entity_resolution_pass || 'Pass1_Deterministic',
      jw_score: g2?.jw_score,
      auto_merge_eligible: g2?.auto_merge_eligible === 1,
      onboard_cost_usd: g2?.onboard_cost_usd ?? 1000,
      eligible_volume_usd: g2?.eligible_volume_usd ?? g3?.eligible_volume_usd ?? 100000,
      npv_positive: g2?.npv_positive === 1,
      onboard_status: g2?.status || 'Active',

      financed_volume_usd: g3?.financed_volume_usd ?? 50000,
      taulia_logins: g3?.taulia_logins ?? 0,
      taulia_transactions: g3?.taulia_transactions ?? 0,
      supplier_state: g3?.supplier_state || 'Constrained',
      alert_flag: g3?.alert_flag === 1,
      recommended_intervention: g3?.recommended_intervention || 'No action required',
      autonomy_tier: g3?.autonomy_tier || 'Recommend and Choose',

      num_anchors: numAnchors,
      concentration_risk: maxCR,
      systemic_node_flag: systemic,
      high_concentration_flag: g4rows.some((r: any) => r.high_concentration_flag === 1),
      anchors,

      displacement_signal_fired: g5?.displacement_signal_fired === 1,
      delta_u: g5?.delta_u ?? 0,
      delta_t: g5?.delta_t ?? 0,
      engine_classification: g5?.engine_classification || 'Healthy',
      at_risk_volume_usd: g5?.at_risk_volume_usd ?? 0,
      retention_value_usd: g5?.retention_value_usd ?? 0,
      p_preventable: g5?.p_preventable ?? 0,

      pulse_scale: 1,
      ring_opacity: 1,
      highlight: false,
    });
  }

  const links: GraphLink[] = [];
  const linkSet = new Set<string>();

  gap4.forEach((row: any) => {
    const sid = row.supplier_id;
    const aid = row.anchor_id;
    if (!sid || !aid) return;
    const key = `${sid}__${aid}`;
    if (linkSet.has(key)) return;
    linkSet.add(key);

    const supplier = supplierNodes.find(n => n.id === sid);
    let state: GraphLink['state'] = 'healthy';
    let particles = 4;
    let particle_speed = 0.004;
    let particle_color = '#00FF87';

    if (supplier?.displacement_signal_fired) {
      state = 'displaced';
      particles = 3;
      particle_speed = 0.006;
      particle_color = '#9CA3AF';
    } else if (supplier?.state === 'critical') {
      state = 'critical';
      particles = 0;
      particle_color = '#FF4444';
    } else if (supplier?.state === 'at-risk') {
      state = 'at-risk';
      particles = 2;
      particle_speed = 0.002;
      particle_color = '#FFB800';
    }

    const numAnchors = (gap4BySupplier.get(sid) || []).length;
    const curvature = numAnchors >= 3 ? 0.2 + Math.random() * 0.2 : 0;

    links.push({
      source: sid,
      target: aid,
      weight: row.weight_wij,
      state,
      particles,
      particle_speed,
      particle_color,
      curvature,
    });
  });

  const displacedIds = supplierNodes.filter(n => n.displacement_signal_fired).map(n => n.id);
  displacedIds.forEach(sid => {
    const key = `${sid}__COMPETITOR`;
    if (!linkSet.has(key)) {
      linkSet.add(key);
      links.push({
        source: sid,
        target: 'COMPETITOR',
        weight: 0.5,
        state: 'displaced',
        particles: 3,
        particle_speed: 0.006,
        particle_color: '#9CA3AF',
        curvature: 0.1,
      });
    }
  });

  const initialQueue: QueueItem[] = supplierNodes
    .filter(n => n.displacement_signal_fired || (n.alert_flag && n.at_risk_volume_usd > 5000))
    .slice(0, 8)
    .map(n => ({
      id: `q-${n.id}`,
      supplier_id: n.id,
      tier: n.tier,
      action_type: n.displacement_signal_fired ? 'Competitive rate review + value-add proposal' : 'Personalised gap calculator + limit review',
      urgency: n.displacement_signal_fired ? 'Critical' : (n.at_risk_volume_usd > 50000 ? 'High' : 'Medium'),
      autonomy_tier: n.autonomy_tier,
      signal_time: Date.now() - Math.floor(Math.random() * 48 * 3600000),
    }));

  const nodes: GraphNode[] = [
    ...anchorNodes,
    competitorNode,
    ...supplierNodes,
  ];

  return { nodes, links, initialQueue };
}
