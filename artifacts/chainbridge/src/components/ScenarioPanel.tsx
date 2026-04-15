import { useState } from 'react';
import { useSimStore } from '../store';
import {
  triggerAnchorDpoScenario,
  triggerCompetitorRateWar,
  triggerOnboardingBacklog,
  triggerCrossAnchorContagion,
  triggerChainBridgeActive,
} from '../scenarios';
import type { AnchorNode } from '../types';

const ANCHOR_NAMES = ['Anchor_Apple', 'Anchor_Samsung', 'Anchor_Siemens', 'Anchor_FedEx', 'Anchor_Unilever'];

const SEVERITY_COLORS: Record<string, string> = {
  LOW: '#60A5FA',
  MEDIUM: '#FFB800',
  HIGH: '#FF4444',
  CRITICAL: '#FF4444',
  INTERVENTION: '#003087',
};

interface Scenario {
  id: string;
  title: string;
  description: string;
  severity: string;
  icon: string;
  special?: boolean;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'anchor_dpo',
    title: 'Anchor DPO Stretch',
    description: 'DPO for selected anchor increases +20 days, connected suppliers show UR decline.',
    severity: 'MEDIUM',
    icon: '📅',
  },
  {
    id: 'competitor_rate_war',
    title: 'Competitor Rate War',
    description: '6 random T2 suppliers begin displacement. Grey particle streams flow to Competitor node.',
    severity: 'HIGH',
    icon: '⚔',
  },
  {
    id: 'onboarding_backlog',
    title: 'Onboarding Backlog',
    description: 'All T3 suppliers freeze. Onboarding stall signals fire. Programme Health drops.',
    severity: 'MEDIUM',
    icon: '⏳',
  },
  {
    id: 'cross_anchor_contagion',
    title: 'Cross-Anchor Contagion',
    description: 'Systemic node enters stress. GSAP cascade wave propagates through the network.',
    severity: 'CRITICAL',
    icon: '⬡',
  },
  {
    id: 'chainbridge_active',
    title: 'ChainBridge Active',
    description: 'Full decision engine triggers. Auto-Execute fires, RM Queue loads, network recovers.',
    severity: 'INTERVENTION',
    icon: '⚡',
    special: true,
  },
];

export default function ScenarioPanel() {
  const [selectedAnchor, setSelectedAnchor] = useState('Anchor_Apple');
  const [triggered, setTriggered] = useState<Record<string, boolean>>({});

  const getStore = useSimStore.getState;
  const setSimState = useSimStore(s => s.setSimState);

  const trigger = (scenario: Scenario) => {
    setTriggered(t => ({ ...t, [scenario.id]: true }));
    setTimeout(() => setTriggered(t => ({ ...t, [scenario.id]: false })), 3000);

    switch (scenario.id) {
      case 'anchor_dpo':
        setSimState('event_processing');
        triggerAnchorDpoScenario(selectedAnchor, getStore, (fn: any) => useSimStore.setState(fn as any));
        setTimeout(() => setSimState('cascading'), 500);
        break;
      case 'competitor_rate_war':
        setSimState('cascading');
        triggerCompetitorRateWar(getStore, (fn: any) => useSimStore.setState(fn as any));
        setTimeout(() => setSimState('running'), 3000);
        break;
      case 'onboarding_backlog':
        setSimState('event_processing');
        triggerOnboardingBacklog(getStore, (fn: any) => useSimStore.setState(fn as any));
        setTimeout(() => setSimState('running'), 4000);
        break;
      case 'cross_anchor_contagion':
        setSimState('cascading');
        triggerCrossAnchorContagion(getStore, (fn: any) => useSimStore.setState(fn as any));
        setTimeout(() => setSimState('running'), 5000);
        break;
      case 'chainbridge_active':
        triggerChainBridgeActive(getStore, (fn: any) => useSimStore.setState(fn as any));
        break;
    }
  };

  return (
    <div style={{ padding: '12px 14px', overflowY: 'auto', height: '100%', scrollbarWidth: 'thin', scrollbarColor: 'rgba(148,163,184,0.2) transparent' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#E2E8F0', marginBottom: 4 }}>
          Stress Scenarios
        </div>
        <div style={{ fontSize: 11, color: '#64748B' }}>
          Trigger supply chain events to test ChainBridge response
        </div>
      </div>

      {SCENARIOS.map(scenario => {
        const isTriggered = triggered[scenario.id];
        const severityColor = SEVERITY_COLORS[scenario.severity] || '#60A5FA';
        const isSpecial = scenario.special;

        return (
          <div
            key={scenario.id}
            style={{
              background: isSpecial
                ? 'linear-gradient(135deg, rgba(0,48,135,0.15) 0%, rgba(0,48,135,0.25) 100%)'
                : 'rgba(15,23,42,0.6)',
              border: isSpecial
                ? '1px solid rgba(181,152,74,0.5)'
                : `1px solid rgba(148,163,184,0.06)`,
              borderRadius: 8,
              padding: '10px 12px',
              marginBottom: 8,
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.borderColor = `${severityColor}40`;
              el.style.boxShadow = `0 0 12px ${severityColor}15`;
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.borderColor = isSpecial ? 'rgba(181,152,74,0.5)' : 'rgba(148,163,184,0.06)';
              el.style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{scenario.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: isSpecial ? '#B5984A' : '#E2E8F0',
                  }}>
                    {scenario.title}
                  </span>
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: 9,
                    fontWeight: 700,
                    color: severityColor,
                    border: `1px solid ${severityColor}40`,
                    padding: '1px 5px',
                    borderRadius: 3,
                    letterSpacing: '0.06em',
                  }}>
                    {scenario.severity}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: '#64748B', lineHeight: 1.5 }}>
                  {scenario.description}
                </div>
              </div>
            </div>

            {scenario.id === 'anchor_dpo' && (
              <select
                value={selectedAnchor}
                onChange={e => setSelectedAnchor(e.target.value)}
                style={{
                  width: '100%',
                  marginBottom: 8,
                  background: 'rgba(15,23,42,0.8)',
                  border: '1px solid rgba(148,163,184,0.15)',
                  borderRadius: 4,
                  color: '#E2E8F0',
                  fontSize: 11,
                  padding: '4px 8px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {ANCHOR_NAMES.map(a => (
                  <option key={a} value={a}>{a.replace('Anchor_', '')}</option>
                ))}
              </select>
            )}

            <button
              onClick={() => trigger(scenario)}
              disabled={isTriggered}
              style={{
                width: '100%',
                padding: '7px 0',
                fontSize: 11,
                fontWeight: 600,
                cursor: isTriggered ? 'not-allowed' : 'pointer',
                background: isSpecial
                  ? (isTriggered ? 'rgba(0,48,135,0.8)' : '#003087')
                  : 'transparent',
                color: isTriggered ? '#00FF87' : (isSpecial ? '#FFFFFF' : severityColor),
                border: isSpecial
                  ? '1px solid rgba(181,152,74,0.6)'
                  : `1px solid ${severityColor}50`,
                borderRadius: 5,
                transition: 'all 0.15s',
                letterSpacing: '0.05em',
              }}
            >
              {isTriggered ? '✓ Triggered' : (isSpecial ? '⚡ Activate ChainBridge' : 'Trigger')}
            </button>
          </div>
        );
      })}
    </div>
  );
}
