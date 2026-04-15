import gsap from 'gsap';
import type { SupplierNode, AnchorNode } from './types';
import type { SimStore } from './store';

type GetStore = () => SimStore;

let animState: Record<string, number> = {};

export function getNodeRadius(node: any): number {
  if (node.type === 'anchor') return 26;
  if (node.type === 'competitor') return 18;
  if (node.tier === 'T1') return 18;
  if (node.tier === 'T2') return 14;
  return 10;
}

export function triggerStressCascade(
  supplierId: string,
  getStore: GetStore,
  setStore: (fn: (s: SimStore) => void) => void
) {
  const store = getStore();
  const node = store.nodes.find(n => n.id === supplierId);
  if (!node || node.type === 'anchor' || node.type === 'competitor') return;

  const sup = node as SupplierNode;
  animState[supplierId] = animState[supplierId] || 1;

  const pulseObj = { scale: 1 };
  gsap.to(pulseObj, {
    scale: 1.5,
    duration: 0.2,
    yoyo: true,
    repeat: 1,
    onUpdate: () => {
      animState[supplierId] = pulseObj.scale;
    },
    onComplete: () => {
      animState[supplierId] = 1;
    }
  });

  setStore(s => {
    const n = s.nodes.find(x => x.id === supplierId);
    if (n) (n as any).state = 'critical';
  });

  store.signals.unshift({
    id: `sig-${Date.now()}`,
    supplier_id: supplierId,
    type: 'cross_anchor_stress',
    timestamp: Date.now(),
    description: `Cross-anchor stress detected on ${supplierId}`,
    corridor: sup.corridor,
  });

  const connectedLinks = store.links.filter(l => {
    const src = typeof l.source === 'object' ? (l.source as any).id : l.source;
    const tgt = typeof l.target === 'object' ? (l.target as any).id : l.target;
    return src === supplierId || tgt === supplierId;
  });

  connectedLinks.forEach((link, i) => {
    setTimeout(() => {
      setStore(s => {
        const sl = s.links.find(x => x === link);
        if (sl) {
          sl.state = 'at-risk';
          sl.particles = 2;
          sl.particle_speed = 0.002;
          sl.particle_color = '#FFB800';
        }
      });
    }, 200 + i * 80);
  });
}

export function triggerAnchorDpoScenario(
  anchorId: string,
  getStore: GetStore,
  setStore: (fn: (s: SimStore) => void) => void
) {
  const store = getStore();
  const anchor = store.nodes.find(n => n.id === anchorId) as AnchorNode | undefined;
  if (!anchor) return;

  const newDpo = (anchor.dpo_days || 50) + 20;
  setStore(s => {
    const a = s.nodes.find(n => n.id === anchorId) as AnchorNode | undefined;
    if (a) a.dpo_days = newDpo;
  });

  const connectedSuppliers = store.nodes.filter(n => {
    if (n.type === 'anchor' || n.type === 'competitor') return false;
    const sup = n as SupplierNode;
    return sup.anchors.some(a => a.anchor_id === anchorId);
  }) as SupplierNode[];

  connectedSuppliers.forEach((sup, i) => {
    setTimeout(() => {
      setStore(s => {
        const node = s.nodes.find(x => x.id === sup.id);
        if (node && node.type !== 'anchor' && node.type !== 'competitor') {
          const n = node as SupplierNode;
          if (n.state === 'healthy') n.state = 'at-risk';
        }
        s.links.forEach(l => {
          const src = typeof l.source === 'object' ? (l.source as any).id : l.source;
          const tgt = typeof l.target === 'object' ? (l.target as any).id : l.target;
          if ((src === sup.id && tgt === anchorId) || (src === anchorId && tgt === sup.id)) {
            l.state = 'at-risk';
            l.particles = 2;
            l.particle_speed = 0.002;
            l.particle_color = '#FFB800';
          }
        });
        s.addSignal({
          id: `sig-dpo-${sup.id}-${Date.now()}`,
          supplier_id: sup.id,
          type: 'dpo_stretch',
          timestamp: Date.now(),
          description: `DPO stretch detected: ${anchor.name} now ${newDpo}d`,
          corridor: sup.corridor,
        });
      });
    }, 400 + i * 100);
  });
}

export function triggerCompetitorRateWar(
  getStore: GetStore,
  setStore: (fn: (s: SimStore) => void) => void
) {
  const store = getStore();
  const t2Suppliers = store.nodes.filter(n =>
    n.type !== 'anchor' && n.type !== 'competitor' && (n as SupplierNode).tier === 'T2' && (n as SupplierNode).state !== 'displaced'
  ) as SupplierNode[];

  const targets = t2Suppliers.sort(() => Math.random() - 0.5).slice(0, 6);

  targets.forEach((sup, i) => {
    setTimeout(() => {
      setStore(s => {
        const node = s.nodes.find(x => x.id === sup.id);
        if (node) (node as any).state = 'displaced';
        const key = `${sup.id}__COMPETITOR`;
        if (!s.links.find(l => {
          const src = typeof l.source === 'object' ? (l.source as any).id : l.source;
          const tgt = typeof l.target === 'object' ? (l.target as any).id : l.target;
          return src === sup.id && tgt === 'COMPETITOR';
        })) {
          s.links.push({
            source: sup.id,
            target: 'COMPETITOR',
            weight: 0.5,
            state: 'displaced',
            particles: 3,
            particle_speed: 0.006,
            particle_color: '#9CA3AF',
            curvature: 0.15,
          });
        }
        s.addSignal({
          id: `sig-disp-${sup.id}-${Date.now()}`,
          supplier_id: sup.id,
          type: 'displacement',
          timestamp: Date.now(),
          description: `${sup.id} displaced to competitor — utilisation drop ${Math.abs(sup.delta_u * 100).toFixed(1)}%`,
          corridor: sup.corridor,
        });
      });
    }, i * 300);
  });
}

export function triggerOnboardingBacklog(
  getStore: GetStore,
  setStore: (fn: (s: SimStore) => void) => void
) {
  const store = getStore();
  const t3Suppliers = store.nodes.filter(n =>
    n.type !== 'anchor' && n.type !== 'competitor' && (n as SupplierNode).tier === 'T3'
  ) as SupplierNode[];

  t3Suppliers.forEach((sup, i) => {
    setTimeout(() => {
      setStore(s => {
        const node = s.nodes.find(x => x.id === sup.id);
        if (node) (node as any).state = 'dormant';
        s.addSignal({
          id: `sig-ob-${sup.id}-${Date.now()}`,
          supplier_id: sup.id,
          type: 'onboarding_stall',
          timestamp: Date.now(),
          description: `Onboarding stalled for ${sup.id} — T3 freeze in progress`,
          corridor: sup.corridor,
        });
      });
    }, i * 50);
  });

  setTimeout(() => {
    const store2 = getStore();
    const values = store2.programmeHealth.map((g, i) => i === 1 ? Math.max(10, g.value - 20) : g.value);
    setStore(s => { s.updateProgrammeHealth(values); });
  }, 2000);
}

export function triggerCrossAnchorContagion(
  getStore: GetStore,
  setStore: (fn: (s: SimStore) => void) => void
) {
  const store = getStore();
  const systemicNodes = store.nodes.filter(n =>
    n.type !== 'anchor' && n.type !== 'competitor' && (n as SupplierNode).systemic_node_flag
  ) as SupplierNode[];

  if (systemicNodes.length === 0) {
    const allSuppliers = store.nodes.filter(n => n.type !== 'anchor' && n.type !== 'competitor') as SupplierNode[];
    const target = allSuppliers.find(n => n.num_anchors >= 4) || allSuppliers[0];
    if (target) systemicNodes.push(target);
  }

  const triggerNode = systemicNodes[0];
  if (!triggerNode) return;

  setStore(s => {
    s.setAlertBanner('SYSTEMIC NODE STRESS DETECTED — Cross-anchor exposure active');
  });

  setStore(s => {
    const node = s.nodes.find(x => x.id === triggerNode.id);
    if (node) (node as any).state = 'critical';
    s.addSignal({
      id: `sig-cross-${Date.now()}`,
      supplier_id: triggerNode.id,
      type: 'cross_anchor_stress',
      timestamp: Date.now(),
      description: `Systemic node ${triggerNode.id} entered stress — ${triggerNode.num_anchors} anchors exposed`,
      corridor: triggerNode.corridor,
    });
  });

  const connectedAnchorIds = triggerNode.anchors.map(a => a.anchor_id);

  connectedAnchorIds.forEach((aid, i) => {
    setTimeout(() => {
      setStore(s => {
        const anchor = s.nodes.find(n => n.id === aid) as AnchorNode | undefined;
        if (anchor) anchor.state = 'at-risk';
        s.links.forEach(l => {
          const src = typeof l.source === 'object' ? (l.source as any).id : l.source;
          const tgt = typeof l.target === 'object' ? (l.target as any).id : l.target;
          if ((src === triggerNode.id && tgt === aid) || (src === aid && tgt === triggerNode.id)) {
            l.state = 'critical';
            l.particles = 0;
          }
        });
      });
    }, 500 + i * 200);
  });

  const secondDegree = store.nodes.filter(n => {
    if (n.type === 'anchor' || n.type === 'competitor') return false;
    if (n.id === triggerNode.id) return false;
    const sup = n as SupplierNode;
    return sup.anchors.some(a => connectedAnchorIds.includes(a.anchor_id));
  }) as SupplierNode[];

  secondDegree.forEach((sup, i) => {
    setTimeout(() => {
      setStore(s => {
        const node = s.nodes.find(x => x.id === sup.id);
        if (node && (node as SupplierNode).state === 'healthy') {
          (node as any).state = 'at-risk';
        }
      });
    }, 1200 + i * 50);
  });
}

export function triggerChainBridgeActive(
  getStore: GetStore,
  setStore: (fn: (s: SimStore) => void) => void
) {
  setStore(s => {
    s.chainbridgeActive = true;
    s.simState = 'recovering';
  });

  const store = getStore();
  const dormantUnaware = store.nodes.filter(n => {
    if (n.type === 'anchor' || n.type === 'competitor') return false;
    const sup = n as SupplierNode;
    return sup.state === 'dormant' || sup.supplier_state === 'Unaware';
  }) as SupplierNode[];

  dormantUnaware.forEach((sup, i) => {
    setTimeout(() => {
      setStore(s => {
        const node = s.nodes.find(x => x.id === sup.id);
        if (node) (node as any).state = 'at-risk';
        s.addSignal({
          id: `sig-auto-${sup.id}-${Date.now()}`,
          supplier_id: sup.id,
          type: 'intervention_fired',
          timestamp: Date.now(),
          description: `Auto-Execute Fired — Benefit Calculator sent to ${sup.id}`,
          corridor: sup.corridor,
        });
      });
    }, 1000 + i * 80);
  });

  const atRiskSuppliers = store.nodes.filter(n => {
    if (n.type === 'anchor' || n.type === 'competitor') return false;
    return (n as SupplierNode).state === 'at-risk' || (n as SupplierNode).state === 'displaced';
  }) as SupplierNode[];

  atRiskSuppliers.slice(0, 6).forEach((sup, i) => {
    setTimeout(() => {
      setStore(s => {
        s.addQueueItem({
          id: `q-cb-${sup.id}`,
          supplier_id: sup.id,
          tier: sup.tier,
          action_type: sup.state === 'displaced'
            ? 'Competitive rate review + value-add proposal'
            : 'Personalised gap calculator + limit review',
          urgency: sup.state === 'displaced' ? 'Critical' : 'High',
          autonomy_tier: 'Recommend and Choose',
          signal_time: Date.now(),
        });
      });
    }, 2000 + i * 150);
  });

  setTimeout(() => {
    const store2 = getStore();
    const atRiskLinks = store2.links.filter(l => l.state === 'at-risk' || l.state === 'displaced');
    atRiskLinks.forEach((link, i) => {
      setTimeout(() => {
        setStore(s => {
          const sl = s.links.find(x => x === link);
          if (sl && sl.state !== 'displaced') {
            sl.state = 'healthy';
            sl.particles = 4;
            sl.particle_speed = 0.004;
            sl.particle_color = '#00FF87';
          }
        });
      }, i * 150);
    });

    const atRiskNodes = store2.nodes.filter(n => {
      if (n.type === 'anchor' || n.type === 'competitor') return false;
      return (n as SupplierNode).state === 'at-risk';
    });

    atRiskNodes.forEach((node, i) => {
      setTimeout(() => {
        setStore(s => {
          const n = s.nodes.find(x => x.id === node.id);
          if (n && (n as SupplierNode).state === 'at-risk') {
            (n as any).state = 'healthy';
          }
          s.setNodeFlash(node.id, 'green');
          setTimeout(() => s.setNodeFlash(node.id, null), 600);
        });
      }, 3000 + i * 120);
    });
  }, 3000);

  setTimeout(() => {
    const store3 = getStore();
    const displacedCount = store3.nodes.filter(n =>
      n.type !== 'anchor' && n.type !== 'competitor' && (n as SupplierNode).displacement_signal_fired
    ).length;

    setStore(s => {
      s.programmeHealth = s.programmeHealth.map(g => ({
        ...g,
        value: Math.min(98, g.value + 15 + Math.random() * 10)
      }));
      s.chainbridgeOutcome = {
        suppliers_reactivated: dormantUnaware.length,
        displacements_prevented: Math.round(displacedCount * 0.37),
        volume_retained: Math.round(store3.nodes
          .filter(n => n.type !== 'anchor' && n.type !== 'competitor')
          .reduce((s, n) => s + ((n as SupplierNode).at_risk_volume_usd || 0), 0) * 0.37 / 1000),
        rm_decision_time: '<48h',
      };
      s.simState = 'stable';
      s.addSignal({
        id: `sig-recovery-${Date.now()}`,
        supplier_id: 'ALL',
        type: 'recovery_confirmed',
        timestamp: Date.now(),
        description: 'ChainBridge recovery wave complete — portfolio stabilising',
        corridor: 'APAC',
      });
    });
  }, 5000);
}

export function getAnimState() { return animState; }
