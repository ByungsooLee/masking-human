"use client";

import { useEffect, useRef } from "react";
import { HUB_ID, type ConversationGraph, type GraphNode } from "@/lib/graph/build-conversation-graph";

export type GraphMode = "boot" | "idle" | "thinking" | "speaking" | "listening";

type Props = {
  graph: ConversationGraph;
  mode: GraphMode;
  /** 0–1 microphone level, read every frame. */
  micRef?: React.RefObject<number>;
  /** Guest node to feature (the climax line); a ripple fires when it changes. */
  highlightId?: string | null;
  /** Draws the laddering rings (inner to outer) and pulls answers onto the ring of their depth. */
  ringLabels?: readonly [string, string, string];
  /** Node whose neighbourhood stays lit while everything else fades. */
  selectedId?: string | null;
  /** Makes nodes pointable; tapping empty space clears the selection. */
  onSelect?: (id: string | null) => void;
  className?: string;
};

type SimNode = GraphNode & { x: number; y: number; vx: number; vy: number; born: number };

const GROW_MS = 650;
const REST: Record<string, number> = { "hub-ai": 120, "ai-guest": 95, "guest-ai": 105, tag: 70, "hub-seed": 80 };
const RINGS = [95, 175, 255] as const;

function readVar(el: Element, name: string, fallback: string) {
  return getComputedStyle(el).getPropertyValue(name).trim() || fallback;
}

function radius(n: SimNode, highlight: boolean) {
  if (n.kind === "hub") return 13;
  if (n.kind === "ai") return 4.5;
  if (n.kind === "session") return 9;
  if (n.kind === "tag") return (n.facet === "word" ? 2.6 : 3.4) + n.weight * 1.4;
  if (n.kind === "seed") return 3;
  return 6.5 * n.weight * (highlight ? 1.45 : 1);
}

function easeOut(p: number) {
  return 1 - (1 - p) ** 3;
}

function step(nodes: SimNode[], edges: ConversationGraph["edges"], byId: Map<string, SimNode>, rings: boolean) {
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      let dx = a.x - b.x;
      let dy = a.y - b.y;
      let d2 = dx * dx + dy * dy;
      if (d2 < 0.01) {
        dx = Math.random() - 0.5;
        dy = Math.random() - 0.5;
        d2 = 0.5;
      }
      const f = Math.min(6, 2400 / d2);
      const d = Math.sqrt(d2);
      a.vx += (dx / d) * f;
      a.vy += (dy / d) * f;
      b.vx -= (dx / d) * f;
      b.vy -= (dy / d) * f;
    }
  }
  for (const e of edges) {
    const a = byId.get(e.source);
    const b = byId.get(e.target);
    if (!a || !b) continue;
    const key = e.kind === "tag" ? "tag" : `${a.kind}-${b.kind}`;
    const rest = a.kind === "session" || b.kind === "session" ? 110 : (REST[key] ?? 100);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const k = e.kind === "tag" ? 0.012 : 0.03;
    const f = (d - rest) * k;
    a.vx += (dx / d) * f;
    a.vy += (dy / d) * f;
    b.vx -= (dx / d) * f;
    b.vy -= (dy / d) * f;
  }
  for (const n of nodes) {
    if (n.id === HUB_ID) {
      n.x = 0;
      n.y = 0;
      n.vx = 0;
      n.vy = 0;
      continue;
    }
    if (rings && n.kind === "guest" && n.depth != null) {
      const d = Math.sqrt(n.x * n.x + n.y * n.y) || 1;
      const f = (RINGS[n.depth] - d) * 0.16;
      n.vx += (n.x / d) * f;
      n.vy += (n.y / d) * f;
    }
    n.vx -= n.x * 0.003;
    n.vy -= n.y * 0.003;
    n.vx *= 0.82;
    n.vy *= 0.82;
    n.x += n.vx;
    n.y += n.vy;
  }
}

export function ThoughtGraph({ graph, mode, micRef, highlightId, ringLabels, selectedId, onSelect, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<{ nodes: SimNode[]; byId: Map<string, SimNode>; edges: ConversationGraph["edges"] }>({
    nodes: [],
    byId: new Map(),
    edges: [],
  });
  const modeRef = useRef(mode);
  const highlightRef = useRef<string | null>(null);
  const rippleAtRef = useRef<number | null>(null);
  const reducedRef = useRef(false);
  const ringsRef = useRef(ringLabels);
  const selectedRef = useRef<string | null>(null);
  const hoverRef = useRef<string | null>(null);
  const cameraRef = useRef({ scale: 1, x: 0, y: 0 });
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    modeRef.current = mode;
    ringsRef.current = ringLabels;
    selectedRef.current = selectedId ?? null;
    onSelectRef.current = onSelect;
  }, [mode, ringLabels, selectedId, onSelect]);

  useEffect(() => {
    highlightRef.current = highlightId ?? null;
    if (highlightId) rippleAtRef.current = performance.now();
  }, [highlightId]);

  useEffect(() => {
    const sim = simRef.current;
    const now = performance.now();
    const next = new Map<string, SimNode>();
    graph.nodes.forEach((n, i) => {
      const prev = sim.byId.get(n.id);
      if (prev) {
        next.set(n.id, Object.assign(prev, n));
        return;
      }
      const parent = (n.parentId && (next.get(n.parentId) ?? sim.byId.get(n.parentId))) || null;
      const angle = i * 2.399 + Math.random() * 0.6;
      const dist = n.kind === "hub" ? 0 : parent ? 24 : 120;
      next.set(n.id, {
        ...n,
        x: (parent?.x ?? 0) + Math.cos(angle) * dist,
        y: (parent?.y ?? 0) + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        born: now,
      });
    });
    sim.byId = next;
    sim.nodes = [...next.values()];
    sim.edges = graph.edges;
    if (reducedRef.current) {
      for (let i = 0; i < 240; i++) step(sim.nodes, sim.edges, sim.byId, Boolean(ringsRef.current));
    }
  }, [graph]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reducedRef.current = reduced;
    if (reduced) {
      const sim = simRef.current;
      for (let i = 0; i < 240; i++) step(sim.nodes, sim.edges, sim.byId, Boolean(ringsRef.current));
    }
    const rose = readVar(canvas, "--color-rose", "#b4466e");
    const lilac = readVar(canvas, "--color-lilac", "#a99ad8");
    const blush = readVar(canvas, "--color-blush", "#f4cfd4");
    const thread = readVar(canvas, "--color-thread", "#e5d3d8");
    const muted = readVar(canvas, "--color-ink-muted", "#76606b");
    const ink = readVar(canvas, "--color-ink", "#3a2832");
    const font = getComputedStyle(canvas).fontFamily;
    const startedAt = performance.now();
    let raf = 0;
    let energy = 0;
    let focusFade = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const nodeAt = (clientX: number, clientY: number): string | null => {
      const rect = canvas.getBoundingClientRect();
      const cam = cameraRef.current;
      const x = (clientX - rect.left - rect.width / 2) / cam.scale + cam.x;
      const y = (clientY - rect.top - rect.height / 2) / cam.scale + cam.y;
      let best: string | null = null;
      let bestD = Infinity;
      for (const n of simRef.current.nodes) {
        if (n.kind === "seed") continue;
        const d = Math.hypot(n.x - x, n.y - y);
        const reach = radius(n, false) + 10 / cam.scale;
        if (d < reach && d < bestD) {
          best = n.id;
          bestD = d;
        }
      }
      return best;
    };
    const onMove = (e: PointerEvent) => {
      if (!onSelectRef.current) return;
      hoverRef.current = nodeAt(e.clientX, e.clientY);
      canvas.style.cursor = hoverRef.current ? "pointer" : "default";
    };
    const onLeave = () => {
      hoverRef.current = null;
    };
    const onClick = (e: MouseEvent) => {
      const select = onSelectRef.current;
      if (!select) return;
      const id = nodeAt(e.clientX, e.clientY);
      select(id && id !== selectedRef.current ? id : null);
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("click", onClick);

    const circle = (x: number, y: number, r: number) => {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2);
    };

    const draw = (now: number) => {
      const { width, height } = canvas.getBoundingClientRect();
      if (width <= 0 || height <= 0) {
        raf = requestAnimationFrame(draw);
        return;
      }
      const sim = simRef.current;
      const elapsed = Math.max(0, now - startedAt);
      const t = elapsed / 1000;
      const m = modeRef.current;
      const mic = micRef?.current ?? 0;
      const highlight = highlightRef.current;
      const rings = ringsRef.current;
      const hasHub = sim.byId.has(HUB_ID);

      if (!reduced) step(sim.nodes, sim.edges, sim.byId, Boolean(rings));

      let target = 0.12 + 0.06 * Math.sin(t * 1.4);
      if (m === "listening") target = 0.1 + mic * 0.9;
      if (m === "speaking") target = reduced ? 0.5 : 0.4 + 0.35 * Math.abs(Math.sin(t * 5.1) * Math.sin(t * 1.9 + 1));
      energy += (target - energy) * 0.15;

      const usedRing = rings
        ? sim.nodes.reduce((mx, n) => (n.kind === "guest" && n.depth != null ? Math.max(mx, n.depth) : mx), -1)
        : -1;
      let minX = -60;
      let maxX = 60;
      let minY = -60;
      let maxY = 60;
      // Rings reached so far plus the next one to aim for.
      const shownRings = rings ? Math.min(2, usedRing + 1) : -1;
      if (shownRings >= 0) {
        // Room for the ring label above it.
        const r = RINGS[shownRings] + 30;
        minX = minY = -r;
        maxX = maxY = r;
      }
      for (const n of sim.nodes) {
        // Labels extend to the right of their dot.
        const right = n.kind === "tag" || n.kind === "session" ? 76 : 24;
        minX = Math.min(minX, n.x - 24);
        maxX = Math.max(maxX, n.x + right);
        minY = Math.min(minY, n.y - 24);
        maxY = Math.max(maxY, n.y + 24);
      }
      const ease = reduced ? 1 : 0.06;
      const cam = cameraRef.current;
      const goal = Math.min(1.6, (width - 24) / (maxX - minX), (height - 24) / (maxY - minY));
      cam.scale += (goal - cam.scale) * ease;
      cam.x += ((minX + maxX) / 2 - cam.x) * ease;
      cam.y += ((minY + maxY) / 2 - cam.y) * ease;
      const scale = cam.scale;

      const focus = selectedRef.current ?? hoverRef.current;
      const lit = new Set<string>();
      if (focus && sim.byId.has(focus)) {
        lit.add(focus);
        for (const e of sim.edges) {
          if (e.source === focus) lit.add(e.target);
          if (e.target === focus) lit.add(e.source);
        }
      }
      focusFade += ((lit.size ? 1 : 0) - focusFade) * (reduced ? 1 : 0.18);
      const dim = (id: string) => (lit.size && !lit.has(id) ? 1 - focusFade * 0.78 : 1);

      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(scale, scale);
      ctx.translate(-cam.x, -cam.y);

      const grow = (n: SimNode) => (reduced ? 1 : easeOut(Math.min(1, Math.max(0, now - n.born) / GROW_MS)));
      const bootGrow = m === "boot" && !reduced ? easeOut(Math.min(1, elapsed / 900)) : 1;
      ctx.font = `${12 / scale}px ${font}`;
      ctx.textBaseline = "middle";

      if (rings && hasHub) {
        RINGS.forEach((r, i) => {
          if (i > shownRings) return;
          const reached = i <= usedRing;
          ctx.strokeStyle = reached ? lilac : rose;
          ctx.globalAlpha = reached ? 0.5 : 0.3;
          ctx.lineWidth = 1 / scale;
          ctx.setLineDash([2 / scale, 5 / scale]);
          circle(0, 0, r);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
          ctx.fillStyle = muted;
          ctx.textAlign = "center";
          ctx.fillText(rings[i], 0, -r - 9 / scale);
          ctx.textAlign = "left";
        });
      }

      ctx.lineCap = "round";
      for (const e of sim.edges) {
        const a = sim.byId.get(e.source);
        const b = sim.byId.get(e.target);
        if (!a || !b) continue;
        const newer = a.born > b.born ? a : b;
        const older = newer === a ? b : a;
        const p = grow(newer);
        const onFocus = lit.size > 0 && lit.has(a.id) && lit.has(b.id) && (a.id === focus || b.id === focus);
        ctx.strokeStyle = e.kind === "tag" || onFocus ? rose : thread;
        ctx.globalAlpha = onFocus ? 0.75 : (e.kind === "tag" ? 0.28 : 1) * (lit.size ? 1 - focusFade * 0.8 : 1);
        ctx.lineWidth = (onFocus ? 1.8 : e.kind === "tag" ? 1 : 1.4) / scale;
        ctx.beginPath();
        ctx.moveTo(older.x, older.y);
        ctx.lineTo(older.x + (newer.x - older.x) * p, older.y + (newer.y - older.y) * p);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      const newestGuest = [...sim.nodes].reverse().find((n) => n.kind === "guest")?.id;

      for (const n of sim.nodes) {
        const g = grow(n);
        const isHi = n.id === highlight;
        const r = radius(n, isHi) * g;
        const alpha = dim(n.id);
        ctx.globalAlpha = alpha;
        if (n.kind === "hub") {
          const hr = r * bootGrow;
          ctx.fillStyle = lilac;
          ctx.globalAlpha = 0.14 * alpha;
          circle(0, 0, hr + 8 + energy * 34);
          ctx.fill();
          ctx.globalAlpha = 0.22 * alpha;
          circle(0, 0, hr + 4 + energy * 16);
          ctx.fill();
          ctx.globalAlpha = alpha;
          circle(0, 0, hr);
          ctx.fill();
          if (m === "thinking" && !reduced) {
            const a = t * 3;
            ctx.fillStyle = rose;
            circle(Math.cos(a) * (hr + 14), Math.sin(a) * (hr + 14), 3);
            ctx.fill();
          }
        } else if (n.kind === "seed") {
          ctx.fillStyle = thread;
          circle(n.x, n.y, r * bootGrow);
          ctx.fill();
        } else if (n.kind === "ai") {
          ctx.fillStyle = lilac;
          circle(n.x, n.y, r);
          ctx.fill();
        } else if (n.kind === "tag") {
          if (n.facet === "person") {
            ctx.fillStyle = "#ffffff";
            circle(n.x, n.y, r);
            ctx.fill();
            ctx.strokeStyle = lilac;
            ctx.lineWidth = 2 / scale;
            ctx.stroke();
          } else if (n.facet === "feeling") {
            ctx.fillStyle = blush;
            circle(n.x, n.y, r);
            ctx.fill();
            ctx.strokeStyle = rose;
            ctx.lineWidth = 1 / scale;
            ctx.stroke();
          } else {
            ctx.fillStyle = rose;
            ctx.globalAlpha = 0.55 * alpha;
            circle(n.x, n.y, r);
            ctx.fill();
          }
          ctx.globalAlpha = g * alpha;
          ctx.fillStyle = n.facet === "word" ? muted : ink;
          ctx.fillText(n.label ?? "", n.x + r + 5 / scale, n.y);
        } else if (n.kind === "session") {
          ctx.fillStyle = "#ffffff";
          circle(n.x, n.y, r);
          ctx.fill();
          ctx.strokeStyle = rose;
          ctx.lineWidth = 1.6 / scale;
          ctx.stroke();
          ctx.fillStyle = ink;
          ctx.fillText(n.label ?? "", n.x + r + 6 / scale, n.y);
        } else {
          ctx.fillStyle = isHi ? rose : n.id === newestGuest && !onSelectRef.current ? blush : "#ffffff";
          circle(n.x, n.y, r);
          ctx.fill();
          ctx.strokeStyle = rose;
          ctx.lineWidth = 1.5 / scale;
          ctx.stroke();
          const rippleAt = rippleAtRef.current;
          if (isHi && rippleAt != null && !reduced) {
            const p = Math.max(0, now - rippleAt) / 1600;
            if (p < 1) {
              ctx.globalAlpha = (1 - p) * alpha;
              ctx.lineWidth = (2.5 * (1 - p)) / scale;
              circle(n.x, n.y, r + p * 70);
              ctx.stroke();
              circle(n.x, n.y, r + p * 40);
              ctx.stroke();
            }
          }
        }
        if (n.id === focus && n.kind !== "hub") {
          ctx.globalAlpha = 1;
          ctx.strokeStyle = rose;
          ctx.lineWidth = 1.5 / scale;
          circle(n.x, n.y, r + 5 / scale);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      ctx.restore();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("click", onClick);
    };
  }, [micRef]);

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}
