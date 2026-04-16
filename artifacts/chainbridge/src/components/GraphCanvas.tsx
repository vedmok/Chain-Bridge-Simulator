import { useRef, useCallback, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useSimStore } from '../store';
import type { GraphNode } from '../types';

const CORRIDOR_FLAGS: Record<string, string> = {
  India: '🇮🇳',
  Singapore: '🇸🇬',
  Vietnam: '🇻🇳',
  HongKong: '🇭🇰',
};

const STATE_COLORS: Record<string, string> = {
  healthy: '#00FF87',
  'at-risk': '#FFB800',
  critical: '#FF4444',
  dormant: '#6B7280',
  displaced: '#6B7280',
  active: '#6B7280',
};

const TIER_FILLS: Record<string, string> = {
  T1: '#0060A9',
  T2: '#B5984A',
  T3: '#4A6FA5',
};

function getNodeRadius(node: any): number {
  if (node.type === 'anchor') return 26;
  if (node.type === 'competitor') return 18;
  if (node.tier === 'T1') return 18;
  if (node.tier === 'T2') return 14;
  return 10;
}

function drawAnchorNode(
  ctx: CanvasRenderingContext2D,
  node: any,
  frameTime: number,
  flash: string | null
) {
  const r = 26;
  const x = node.x || 0;
  const y = node.y || 0;

  const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, 80);
  glowGrad.addColorStop(0, 'rgba(0,48,135,0.25)');
  glowGrad.addColorStop(1, 'rgba(0,48,135,0)');
  ctx.beginPath();
  ctx.arc(x, y, 80, 0, Math.PI * 2);
  ctx.fillStyle = glowGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#003087';
  ctx.fill();

  const dpo = node.dpo_days || 50;
  const ringColor =
    node.state === 'critical'
      ? '#FF4444'
      : node.state === 'at-risk' || dpo > 60
      ? '#FFB800'
      : 'rgba(0,100,200,0.6)';

  const dashOffset = -(frameTime / 16) * (dpo > 60 ? 0.15 : 0.06);
  ctx.beginPath();
  ctx.arc(x, y, r + 6, 0, Math.PI * 2);
  ctx.strokeStyle = ringColor;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 4]);
  ctx.lineDashOffset = dashOffset;
  ctx.stroke();
  ctx.setLineDash([]);

  if (flash) {
    ctx.beginPath();
    ctx.arc(x, y, r + 10, 0, Math.PI * 2);
    ctx.strokeStyle = flash === 'green' ? '#00FF87' : '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 9px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const name = node.name || '';
  ctx.fillText(name, x, y - 2);

  ctx.font = '7px Inter, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText(`${dpo}d DPO`, x, y + 9);
}

function drawSupplierNode(
  ctx: CanvasRenderingContext2D,
  node: any,
  selected: boolean,
  flash: string | null,
  presentationMode: boolean,
  pulsePhase: number
) {
  const r = getNodeRadius(node);
  const x = node.x || 0;
  const y = node.y || 0;
  const state = node.state;
  const color = STATE_COLORS[state] || '#00FF87';
  const fill = TIER_FILLS[node.tier] || '#0060A9';

  if (node.systemic_node_flag) {
    const pulseR = r * (1.15 + 0.5 * Math.sin(pulsePhase));
    ctx.beginPath();
    ctx.arc(x, y, pulseR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,184,0,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  const glowColor =
    state === 'healthy'
      ? 'rgba(0,255,135,0.1)'
      : state === 'at-risk'
      ? 'rgba(255,184,0,0.1)'
      : state === 'critical'
      ? 'rgba(255,68,68,0.13)'
      : 'rgba(107,114,128,0.07)';

  const glowG = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
  glowG.addColorStop(0, glowColor);
  glowG.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.arc(x, y, r * 3, 0, Math.PI * 2);
  ctx.fillStyle = glowG;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();

  if (selected) {
    ctx.beginPath();
    ctx.arc(x, y, r + 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  if (flash) {
    ctx.beginPath();
    ctx.arc(x, y, r + 5, 0, Math.PI * 2);
    ctx.strokeStyle = flash === 'green' ? '#00FF87' : '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  const dotR = Math.max(3, r * 0.28);
  const dotX = x + r * 0.62;
  const dotY = y + r * 0.62;

  let dotAlpha = 1;
  if (state === 'at-risk') {
    dotAlpha = 0.5 + 0.5 * Math.sin(pulsePhase * 1.5);
  } else if (state === 'critical') {
    dotAlpha = 0.3 + 0.7 * Math.abs(Math.sin(pulsePhase * 4));
  }

  ctx.beginPath();
  ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.globalAlpha = dotAlpha;
  ctx.fill();
  ctx.globalAlpha = 1;

  if (r >= 12) {
    const flagX = x - r * 0.45;
    const flagY = y - r * 0.6;
    ctx.font = `${Math.max(8, r * 0.5)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(CORRIDOR_FLAGS[node.corridor] || '🌐', flagX, flagY);
  }

  if (presentationMode && r >= 10) {
    ctx.font = `${Math.max(6, r * 0.38)}px "JetBrains Mono", monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = node.id.replace('SUP_', '');
    ctx.fillText(label, x, y + 2);
  }
}

function drawCompetitorNode(ctx: CanvasRenderingContext2D, node: any) {
  const r = 20;
  const x = node.x || 0;
  const y = node.y || 0;

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(107,114,128,0.15)';
  ctx.fill();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = '#6B7280';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = '7px Inter, sans-serif';
  ctx.fillStyle = '#9CA3AF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Competitor', x, y - 4);
  ctx.fillText('Bank', x, y + 5);
}

export default function GraphCanvas() {
  const graphRef = useRef<any>(null);
  const frameTimeRef = useRef(0);
  const pulseRef = useRef(0);

  const storeNodes = useSimStore(s => s.nodes);
  const storeLinks = useSimStore(s => s.links);
  const selectedNode = useSimStore(s => s.selectedNode);
  const presentationMode = useSimStore(s => s.presentationMode);
  const nodeFlashes = useSimStore(s => s.nodeFlashes);
  const setSelectedNode = useSimStore(s => s.setSelectedNode);
  const setRightPanelTab = useSimStore(s => s.setRightPanelTab);

  const graphDataRef = useRef<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });
  const [graphData, setGraphData] = useState(() => graphDataRef.current);
  const hasZoomed = useRef(false);

  useEffect(() => {
    if (storeNodes.length === 0) return;

    const existingNodeMap = new Map<string, any>(
      graphDataRef.current.nodes.map((n: any) => [n.id, n])
    );

    const newNodes = storeNodes.map((sn: any) => {
      const existing = existingNodeMap.get(sn.id);
      if (existing) {
        Object.assign(existing, sn);
        return existing;
      }
      return { ...sn };
    });

    const existingLinkMap = new Map<string, any>();
    graphDataRef.current.links.forEach((l: any) => {
      const srcId = typeof l.source === 'object' ? l.source.id : l.source;
      const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
      existingLinkMap.set(`${srcId}__${tgtId}`, l);
    });

    const newLinks = storeLinks.map((sl: any) => {
      const srcId = typeof sl.source === 'object' ? sl.source.id : sl.source;
      const tgtId = typeof sl.target === 'object' ? sl.target.id : sl.target;
      const key = `${srcId}__${tgtId}`;
      const existing = existingLinkMap.get(key);
      if (existing) {
        Object.assign(existing, sl);
        return existing;
      }
      return { ...sl };
    });

    graphDataRef.current = { nodes: newNodes, links: newLinks };
    setGraphData({ ...graphDataRef.current });

    if (!hasZoomed.current) {
      setTimeout(() => {
        if (graphRef.current && !hasZoomed.current) {
          hasZoomed.current = true;
          graphRef.current.zoomToFit(600, 80);
        }
      }, 1500);
    }
  }, [storeNodes, storeLinks]);

  useEffect(() => {
    let raf = 0;
    const tick = (t: number) => {
      frameTimeRef.current = t;
      pulseRef.current = t / 500;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const drawNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D) => {
      const t = frameTimeRef.current;
      const pulse = pulseRef.current;
      const nodeId = node.id;
      const flash = nodeFlashes[nodeId] || null;
      const isSelected = selectedNode?.id === nodeId;

      if (node.type === 'anchor') {
        drawAnchorNode(ctx, node, t, flash);
      } else if (node.type === 'competitor') {
        drawCompetitorNode(ctx, node);
      } else {
        drawSupplierNode(ctx, node, isSelected, flash, presentationMode, pulse);
      }
    },
    [selectedNode, presentationMode, nodeFlashes]
  );

  const getLinkParticles = useCallback((link: any): number => link.particles ?? 0, []);
  const getLinkParticleWidth = useCallback((): number => 2, []);
  const getLinkParticleSpeed = useCallback((link: any): number => link.particle_speed ?? 0.004, []);
  const getLinkParticleColor = useCallback((link: any): string => link.particle_color ?? '#00FF87', []);

  const getLinkColor = useCallback((link: any): string => {
    const state = link.state;
    if (state === 'healthy') return 'rgba(0,255,135,0.2)';
    if (state === 'at-risk') return 'rgba(255,184,0,0.25)';
    if (state === 'critical' || state === 'broken') return 'rgba(255,68,68,0.4)';
    if (state === 'displaced') return 'rgba(107,114,128,0.3)';
    return 'rgba(0,255,135,0.2)';
  }, []);

  const getLinkWidth = useCallback((link: any): number => {
    const w = link.weight ?? 0.5;
    return 0.8 + w * 3;
  }, []);

  const getLinkCurvature = useCallback((link: any): number => link.curvature ?? 0, []);

  const handleNodeClick = useCallback(
    (node: any) => {
      const storeNode = useSimStore.getState().nodes.find(n => n.id === node.id) || node;
      setSelectedNode(storeNode as GraphNode);
      setRightPanelTab('inspector');
      if (graphRef.current) {
        graphRef.current.centerAt(node.x, node.y, 800);
      }
    },
    [setSelectedNode, setRightPanelTab]
  );

  const handleNodeHover = useCallback((node: any) => {
    if (typeof document !== 'undefined') {
      document.body.style.cursor = node ? 'pointer' : 'default';
    }
  }, []);

  const handleEngineStop = useCallback(() => {
    if (!hasZoomed.current && graphRef.current) {
      hasZoomed.current = true;
      graphRef.current.zoomToFit(600, 60);
    }
  }, []);

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D) => {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 1.5);
    grad.addColorStop(0, '#0A1628');
    grad.addColorStop(1, '#050D1A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(148,163,184,0.03)';
    ctx.lineWidth = 1;
    const gs = 60;
    for (let x = 0; x < w; x += gs) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gs) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setDims({
          w: containerRef.current.clientWidth,
          h: containerRef.current.clientHeight,
        });
      }
    };

    update();

    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <ForceGraph2D
        width={dims.w}
        height={dims.h}
        ref={graphRef}
        graphData={graphData}
        nodeCanvasObject={drawNode}
        nodeCanvasObjectMode={() => 'replace'}
        nodePointerAreaPaint={(node: any, color, ctx) => {
          const r = getNodeRadius(node) + 8;
          ctx.beginPath();
          ctx.arc(node.x || 0, node.y || 0, r, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        linkColor={getLinkColor}
        linkWidth={getLinkWidth}
        linkCurvature={getLinkCurvature}
        linkDirectionalParticles={getLinkParticles}
        linkDirectionalParticleWidth={getLinkParticleWidth}
        linkDirectionalParticleSpeed={getLinkParticleSpeed}
        linkDirectionalParticleColor={getLinkParticleColor}
        backgroundColor="transparent"
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        onEngineStop={handleEngineStop}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        minZoom={0.15}
        maxZoom={10}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        warmupTicks={120}
        onRenderFramePre={drawBackground}
      />
    </div>
  );
}
