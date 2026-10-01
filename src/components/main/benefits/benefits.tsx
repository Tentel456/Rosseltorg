"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';

/**
 * One looping line drawing per service, each acting out that service's six
 * capabilities in order. Same vocabulary as the clips they replace — hairlines,
 * ink dots, a small mono caption — but every beat is one of the points listed
 * under the card, and the caption names the one on screen.
 *
 * Each scene is a pure function of its clock `t` (seconds into the loop), so a
 * loop is just a timeline: things draw in, act, and the whole frame fades out
 * before it starts again. The clock only runs while the card is on screen.
 */

type Pt = [number, number];
type Step = [from: number, to: number, capability: string];
type Scene = { loop: number; still: number; steps: Step[]; Draw: (props: { t: number }) => React.ReactNode };

const W = 1280;
const H = 536;
const INK = "#16253f";
const ACCENT = "#3b81e3";
const TAU = Math.PI * 2;

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const inOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
const out = (p: number) => 1 - (1 - p) ** 3;
const back = (p: number) => 1 + 2.70158 * (p - 1) ** 3 + 1.70158 * (p - 1) ** 2;
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const mix = (a: Pt, b: Pt, p: number): Pt => [lerp(a[0], b[0], p), lerp(a[1], b[1], p)];
const quad = (a: Pt, c: Pt, b: Pt, p: number): Pt => mix(mix(a, c, p), mix(c, b, p), p);
const cubic = (a: Pt, c1: Pt, c2: Pt, b: Pt, p: number): Pt => quad(mix(a, c1, p), mix(c1, c2, p), mix(c2, b, p), p);
const pt = (p: Pt) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
const fade = (t: number, loop: number) => prog(t, 0, 0.25) * (1 - prog(t, loop - 0.7, loop));

/** Stroke-draw a shape from 0 (nothing) to 1 (whole outline). */
const draw = (p: number) =>
  ({ pathLength: 1, strokeDasharray: "1 1", strokeDashoffset: 1 - p, visibility: p > 0 ? "visible" : "hidden" }) as const;

const line = { fill: "none", stroke: INK, strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const hair = { ...line, strokeWidth: 2, strokeOpacity: 0.22 } as const;
const mono = { fontFamily: MONO_FONT, letterSpacing: 1 } as const;

/* ------------------------------------------------------------------------- *
 * Growth & Marketing: find the gap on the market map, turn it into a brand,  *
 * put it on channels, publish content, fill the funnel, and keep customers   *
 * who come back and bring others.                                            *
 * ------------------------------------------------------------------------- */

const G_YOU: Pt = [310, 150];
const G_BRAND: Pt = [540, 150];
const G_AXES: [label: string, x: number, y: number, anchor: "start" | "middle" | "end"][] = [
  ["premium", 230, 74, "middle"],
  ["budget", 230, 402, "middle"],
  ["simple", 92, 256, "start"],
  ["expert", 368, 256, "end"],
];
const G_RIVALS: Pt[] = [[130, 130], [175, 160], [150, 195], [200, 120], [120, 290], [170, 310], [140, 345], [205, 335], [185, 280], [260, 285], [300, 325], [340, 290], [280, 350]];
const G_CHANNELS = [110, 230, 350];
const G_ICONS = [
  <>
    <rect x={-40} y={-20} width={80} height={40} rx={20} />
    <circle cx={-18} cy={-2} r={8} />
    <path d="M-12 4l6 6" />
    <path d="M2 0H24" strokeWidth={2} strokeOpacity={0.35} />
  </>,
  <>
    <rect x={-40} y={-28} width={80} height={56} rx={8} />
    <path d="M-8 -14L14 0L-8 14Z" />
  </>,
  <>
    <rect x={-40} y={-26} width={80} height={52} rx={6} />
    <path d="M-40 -26L0 4L40 -26" />
  </>,
];
const G_SPOUT: Pt = [1080, 300];
const G_LOOP = { cx: 1082, cy: 444, rx: 172, ry: 46 };
const gSlot = (k: number): Pt => [950 + k * 44, 440];
const G_WON = [0, 4, 8, 10];
const G_LEADS = Array.from({ length: 12 }, (_, i) => ({
  start: 6.3 + i * 0.18,
  from: [910, G_CHANNELS[i % 3]] as Pt,
  rim: [985 + ((i * 71) % 190), 114] as Pt,
  won: G_WON.indexOf(i),
}));
const G_REFERRERS = [1, 2, 3];

function Person({ at, color = INK, s = 1, opacity = 1 }: { at: Pt; color?: string; s?: number; opacity?: number }) {
  return (
    <g transform={`translate(${pt(at)}) scale(${s})`} opacity={opacity}>
      <circle cy={-12} r={8} fill={color} />
      <path d="M-13 16Q0 -4 13 16" {...line} stroke={color} />
    </g>
  );
}

function Growth({ t }: { t: number }) {
  const axes = inOut(prog(t, 0.1, 0.9));
  const aim = quad([150, 300], [380, 400], G_YOU, inOut(prog(t, 0.5, 1.8)));
  const lock = prog(t, 1.8, 2.2);
  const hop = inOut(prog(t, 2.3, 2.8));
  const leads = G_LEADS.filter((l) => t >= l.start + 0.7).length;

  return (
    <g opacity={fade(t, 13)}>
      {/* Positioning: a map of the market, and the crosshair finds the corner nobody owns */}
      <rect x={232} y={92} width={136} height={136} fill={ACCENT} fillOpacity={0.08 * lock} />
      <line x1={90} y1={230} x2={370} y2={230} {...hair} {...draw(axes)} />
      <line x1={230} y1={370} x2={230} y2={90} {...hair} {...draw(axes)} />
      {G_AXES.map(([label, x, y, anchor]) => (
        <text key={label} x={x} y={y} textAnchor={anchor} fontSize={19} fill={INK} fillOpacity={0.45} opacity={prog(t, 0.5, 0.9)} style={mono}>
          {label}
        </text>
      ))}
      {G_RIVALS.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={6} fill={INK} opacity={0.28 * prog(t, 0.3 + i * 0.05, 0.6 + i * 0.05)} />
      ))}
      <g transform={`translate(${pt(aim)})`} opacity={prog(t, 0.3, 0.6) * (1 - prog(t, 2.2, 2.5))}>
        <circle r={26 - 8 * prog(t, 1.6, 1.9)} {...line} strokeWidth={2} />
        <path d="M-42 0H-32M32 0H42M0 -42V-32M0 32V42" {...line} strokeWidth={2} />
      </g>
      {lock > 0 && <circle cx={G_YOU[0]} cy={G_YOU[1]} r={9 * back(lock)} fill={INK} />}
      <text x={G_YOU[0] + 18} y={G_YOU[1] - 16} fontSize={19} fill={INK} fillOpacity={0.55} opacity={prog(t, 2, 2.3)} style={mono}>
        you
      </text>

      {/* Branding: that spot becomes the mark, then a name and a palette */}
      <line x1={G_YOU[0] + 14} y1={150} x2={490} y2={150} {...hair} strokeDasharray="4 8" opacity={prog(t, 2.3, 2.6)} />
      {hop > 0 && hop < 1 && <circle cx={lerp(G_YOU[0], G_BRAND[0], hop)} cy={150} r={9} fill={INK} />}
      <rect x={490} y={100} width={100} height={100} rx={22} {...line} {...draw(inOut(prog(t, 2.4, 3)))} />
      <circle cx={G_BRAND[0]} cy={G_BRAND[1]} r={24} {...line} strokeWidth={2} {...draw(inOut(prog(t, 2.6, 3)))} transform={`rotate(-90 ${pt(G_BRAND)})`} />
      <path d="M540 126A24 24 0 0 1 564 150" {...line} stroke={ACCENT} strokeWidth={6} {...draw(prog(t, 3, 3.3))} />
      <circle cx={G_BRAND[0]} cy={G_BRAND[1]} r={10 * back(prog(t, 2.8, 3.1))} fill={INK} />
      <line x1={490} y1={232} x2={580} y2={232} {...line} strokeWidth={6} {...draw(prog(t, 3.1, 3.4))} />
      <line x1={490} y1={254} x2={550} y2={254} {...line} strokeWidth={2} strokeOpacity={0.4} {...draw(prog(t, 3.3, 3.5))} />
      {[INK, ACCENT, "none"].map((fill, i) => (
        <circle key={i} cx={502 + i * 38} cy={290} r={12 * back(prog(t, 3.3 + i * 0.1, 3.6 + i * 0.1))} {...(fill === "none" ? hair : { fill })} />
      ))}

      {/* Marketing: the brand goes out on search, video and email */}
      {G_CHANNELS.map((y, i) => (
        <path key={y} d={`M590 150C640 150 640 ${y} 690 ${y}`} {...hair} strokeOpacity={0.35} {...draw(inOut(prog(t, 3.6 + i * 0.15, 4.2 + i * 0.15)))} />
      ))}
      {G_CHANNELS.map((y, i) => (
        <g key={y} transform={`translate(730 ${y}) scale(${back(prog(t, 3.9 + i * 0.15, 4.3 + i * 0.15))})`} {...line} fill="#fff">
          {G_ICONS[i]}
        </g>
      ))}
      {t > 4.3 &&
        G_CHANNELS.flatMap((y, i) =>
          [0, 1].map((k) => {
            const u = ((t - 4.3) * 0.6 + k / 2 + i * 0.2) % 1;
            const [x, py] = cubic([590, 150], [640, 150], [640, y], [690, y], u);
            return <circle key={`${i}${k}`} cx={x} cy={py} r={5} fill={ACCENT} opacity={prog(t, 4.3, 4.6) * Math.sin(Math.PI * u)} />;
          }),
        )}

      {/* Content creation: each channel gets its posts written */}
      {G_CHANNELS.map((y, i) => {
        const s = 4.8 + i * 0.3;
        return (
          <g key={y}>
            <line x1={770} y1={y} x2={800} y2={y} {...hair} {...draw(prog(t, s - 0.1, s + 0.1))} />
            <rect x={800} y={y - 40} width={110} height={80} rx={8} {...line} strokeWidth={2} {...draw(inOut(prog(t, s, s + 0.5)))} />
            <g opacity={prog(t, s + 0.3, s + 0.6)}>
              <rect x={810} y={y - 30} width={42} height={34} rx={4} {...hair} strokeOpacity={0.4} />
              <path d={`M814 ${y}l11 -11l8 8l6 -5l9 8`} {...line} strokeWidth={2} strokeOpacity={0.5} />
              <circle cx={843} cy={y - 22} r={3.5} fill={ACCENT} />
            </g>
            <path d={`M862 ${y - 22}H898M862 ${y - 10}H886M810 ${y + 18}H898M810 ${y + 30}H868`} {...line} strokeWidth={2} strokeOpacity={0.35} {...draw(prog(t, s + 0.4, s + 0.9))} />
          </g>
        );
      })}

      {/* Demand generation: the content fills a funnel, and some of it comes out as customers */}
      <path d="M960 110H1200M960 110L1060 290V330M1200 110L1100 290V330" {...line} strokeWidth={2} strokeOpacity={0.5} {...draw(inOut(prog(t, 5.9, 6.6)))} />
      <text x={1024} y={250} textAnchor="end" fontSize={19} fill={INK} fillOpacity={0.55} opacity={prog(t, 6.4, 6.8)} style={mono}>
        {leads} leads
      </text>
      {G_LEADS.map(({ start, from, rim, won }, i) => {
        const e = t - start;
        if (e < 0 || e > (won >= 0 ? 1.7 : 1.2)) return null;
        let pos: Pt;
        let o = prog(e, 0, 0.2);
        if (e < 0.7) pos = quad(from, [(from[0] + rim[0]) / 2, 40], rim, inOut(prog(e, 0, 0.7)));
        else if (e < 1.2) {
          pos = mix(rim, G_SPOUT, inOut(prog(e, 0.7, 1.2)));
          if (won < 0) o = 1 - prog(e, 0.8, 1.1);
        } else pos = quad(G_SPOUT, [1080, 380], [gSlot(won)[0], 428], inOut(prog(e, 1.2, 1.7)));
        return <circle key={i} cx={pos[0]} cy={pos[1]} r={7} fill={INK} opacity={o} />;
      })}
      {G_WON.map((i, k) => {
        const s = back(prog(t, G_LEADS[i].start + 1.7, G_LEADS[i].start + 2));
        return s > 0 ? <Person key={k} at={gSlot(k)} s={s} /> : null;
      })}

      {/* Retention: customers keep coming round, and each one brings someone new */}
      <ellipse cx={G_LOOP.cx} cy={G_LOOP.cy} rx={G_LOOP.rx} ry={G_LOOP.ry} {...hair} {...draw(inOut(prog(t, 9.8, 10.5)))} />
      <path d={`M${G_LOOP.cx + G_LOOP.rx - 8} ${G_LOOP.cy - 6}l8 10l8 -10`} {...line} strokeWidth={2} strokeOpacity={0.4} opacity={prog(t, 10.4, 10.7)} />
      {[0, 1].map((k) => {
        const theta = (t - 10) * 1.4 + k * Math.PI;
        return <circle key={k} cx={G_LOOP.cx + G_LOOP.rx * Math.cos(theta)} cy={G_LOOP.cy + G_LOOP.ry * Math.sin(theta)} r={5} fill={INK} opacity={prog(t, 10.4, 10.7)} />;
      })}
      {G_REFERRERS.map((k, j) => {
        const start = 10.2 + j * 0.35;
        const ping = prog(t, start, start + 0.6);
        const p = prog(t, start + 0.3, start + 1);
        if (ping <= 0) return null;
        const from = gSlot(k);
        const to = gSlot(4 + j);
        return (
          <g key={j}>
            {ping < 1 && <circle cx={from[0]} cy={from[1] - 12} r={10 + 24 * out(ping)} {...line} stroke={ACCENT} strokeWidth={2} strokeOpacity={0.7 * (1 - ping)} />}
            {p > 0 && <Person at={quad(from, [(from[0] + to[0]) / 2, 350], to, inOut(p))} color={ACCENT} s={lerp(0.6, 1, p)} opacity={prog(t, start + 0.3, start + 0.5)} />}
          </g>
        );
      })}
    </g>
  );
}

/* ------------------------------------------------------------------------- *
 * Technology: a site and an app get drawn, the stack slots in underneath,    *
 * they get wired together, the numbers start reading, and the chores tick.   *
 * ------------------------------------------------------------------------- */

const T_WIRES: [Pt, Pt, Pt, Pt][] = [
  [[470, 60], [520, 10], [960, 10], [1000, 100]],
  [[790, 240], [840, 240], [850, 222], [900, 222]],
  [[540, 380], [620, 470], [840, 430], [900, 312]],
];
const T_SPARK = [240, 232, 236, 220, 224, 205, 210, 190, 184, 170].map((y, i): Pt => [140 + i * (350 / 9), y]);

function Technology({ t }: { t: number }) {
  const auto = t >= 8.8 ? Math.floor((t - 8.8) * 2) % 3 : -1;
  const sparkEnd = prog(t, 8.3, 8.6);

  return (
    <g opacity={fade(t, 12)}>
      {/* Website development */}
      <rect x={90} y={60} width={450} height={350} rx={14} {...line} {...draw(inOut(prog(t, 0.2, 1.2)))} />
      <line x1={90} y1={100} x2={540} y2={100} {...hair} {...draw(prog(t, 0.9, 1.3))} />
      {[116, 136, 156].map((x, i) => (
        <circle key={x} cx={x} cy={80} r={5} fill={INK} opacity={0.3 * prog(t, 1 + i * 0.08, 1.2 + i * 0.08)} />
      ))}
      <path d="M120 126H200M400 126H430M445 126H475M490 126H510" {...line} strokeWidth={2} strokeOpacity={0.5} {...draw(prog(t, 1.1, 1.6))} />
      <rect x={120} y={150} width={390} height={120} rx={8} {...hair} {...draw(inOut(prog(t, 1.2, 1.8)))} />
      {[120, 256, 392].map((x, i) => (
        <rect key={x} x={x} y={290} width={118} height={90} rx={8} {...hair} {...draw(inOut(prog(t, 1.6 + i * 0.2, 2.2 + i * 0.2)))} />
      ))}

      {/* App development */}
      <rect x={620} y={70} width={170} height={340} rx={26} {...line} {...draw(inOut(prog(t, 2.2, 3.2)))} />
      <line x1={680} y1={90} x2={730} y2={90} {...line} strokeOpacity={0.5} {...draw(prog(t, 3, 3.3))} />
      {[0, 1, 2, 3, 4].map((i) => {
        const y = 128 + i * 52;
        const p = out(prog(t, 2.8 + i * 0.22, 3.3 + i * 0.22));
        return (
          <g key={i} opacity={p} transform={`translate(${(1 - p) * 12} 0)`}>
            <circle cx={650} cy={y} r={11} {...hair} />
            <path d={`M672 ${y - 5}H745M672 ${y + 8}H720`} {...line} strokeWidth={2} strokeOpacity={0.35} />
            <path d={`M757 ${y}l5 5l10 -10`} {...line} stroke={ACCENT} {...draw(prog(t, 9 + i * 0.3, 9.25 + i * 0.3))} />
          </g>
        );
      })}

      {/* Ops stack */}
      {[100, 190, 280].map((y, i) => {
        const p = out(prog(t, 4 + i * 0.35, 4.6 + i * 0.35));
        return (
          <g key={y} opacity={p} transform={`translate(0 ${-(1 - p) * 50})`}>
            <rect x={900} y={y} width={290} height={64} rx={12} {...line} fill="#fff" />
            <circle cx={926} cy={y + 32} r={7} fill={auto === i ? ACCENT : INK} fillOpacity={auto === i ? 1 : 0.3} />
            <path d={`M950 ${y + 26}H1080M950 ${y + 40}H1030`} {...line} strokeWidth={2} strokeOpacity={0.35} />
          </g>
        );
      })}

      {/* Integrations: wires, then packets running both ways */}
      {T_WIRES.map((c, i) => (
        <path key={i} d={`M${pt(c[0])}C${pt(c[1])} ${pt(c[2])} ${pt(c[3])}`} {...hair} strokeOpacity={0.35} {...draw(inOut(prog(t, 5.4 + i * 0.2, 6.2 + i * 0.2)))} />
      ))}
      {t > 6.2 &&
        T_WIRES.flatMap((c, i) =>
          [0, 1, 2].map((k) => {
            let u = ((t - 6.2) * 0.4 + k / 3 + i * 0.11) % 1;
            if (i === 1) u = 1 - u;
            const [x, y] = cubic(c[0], c[1], c[2], c[3], u);
            return <circle key={`${i}${k}`} cx={x} cy={y} r={6} fill={ACCENT} opacity={prog(t, 6.2, 6.6) * Math.sin(Math.PI * u)} />;
          }),
        )}

      {/* Analytics setup: the hero turns into a chart */}
      <line x1={140} y1={252} x2={490} y2={252} {...hair} strokeDasharray="4 8" opacity={prog(t, 6.8, 7.2)} />
      <polyline points={T_SPARK.map(pt).join(" ")} {...line} {...draw(inOut(prog(t, 7, 8.4)))} />
      {sparkEnd > 0 && (
        <>
          <circle cx={T_SPARK[9][0]} cy={T_SPARK[9][1]} r={7 * back(sparkEnd)} fill={ACCENT} />
          <circle cx={T_SPARK[9][0]} cy={T_SPARK[9][1]} r={7 + ((t * 18) % 22)} {...line} stroke={ACCENT} strokeWidth={2} strokeOpacity={0.5 * (1 - ((t * 18) % 22) / 22)} />
        </>
      )}

      {/* Automation: a job that keeps turning */}
      <circle cx={1045} cy={430} r={26} {...line} strokeWidth={2} strokeDasharray="12 9" opacity={prog(t, 8.8, 9.2)} transform={`rotate(${t * 90} 1045 430)`} />
      <circle cx={1045} cy={430} r={6} fill={ACCENT} opacity={prog(t, 8.8, 9.2)} />
    </g>
  );
}

/* ------------------------------------------------------------------------- *
 * AI Enablement: a prompt and tidy data feed an agent; it routes the work    *
 * through tools on its own, and only the rare case goes up to your team.     *
 * ------------------------------------------------------------------------- */

const A_AGENT: Pt = [600, 270];
const A_FEED: Pt = [410, 323];
const A_TOOLS: Pt[] = [[850, 120], [850, 270], [850, 420]];
const A_DONE: Pt = [1110, 330];
const A_TEAM: Pt = [1110, 110];
const A_SEG = 0.5;
const A_PROMPT = "> triage inbound leads";
const A_DATA = Array.from({ length: 16 }, (_, i) => ({
  from: [100 + ((i * 97) % 280), 210 + ((i * 53) % 240)] as Pt,
  to: [130 + (i % 4) * 80, 230 + Math.floor(i / 4) * 62] as Pt,
}));
const A_TOKENS = Array.from({ length: 14 }, (_, k) => {
  const rare = k % 5 === 3;
  const b = [1, 0, 2, 1, 2, 0][k % 6];
  const next = b === 2 ? 1 : b + 1;
  const path = rare ? [A_FEED, A_AGENT, A_TOOLS[0], A_TEAM] : k % 4 === 1 ? [A_FEED, A_AGENT, A_TOOLS[b], A_TOOLS[next], A_DONE] : [A_FEED, A_AGENT, A_TOOLS[b], A_DONE];
  const start = 4.8 + k * 0.4;
  return { rare, path, start, end: start + (path.length - 1) * A_SEG };
});

function Enablement({ t }: { t: number }) {
  const typed = Math.floor(prog(t, 0.4, 2) * A_PROMPT.length);
  const cursor = t < 2.8 && (t * 2) % 1 < 0.5 ? "_" : "";
  const handled = A_TOKENS.filter((k) => !k.rare && k.end <= t).length;
  const lastDone = Math.max(-1, ...A_TOKENS.filter((k) => !k.rare && k.end <= t).map((k) => k.end));
  const lastUp = Math.max(-1, ...A_TOKENS.filter((k) => k.rare && k.end <= t).map((k) => k.end));
  const doneFlash = prog(t, lastDone, lastDone + 0.5);
  const upFlash = prog(t, lastUp, lastUp + 0.7);
  const edges = inOut(prog(t, 3.6, 4.4));
  const exits = inOut(prog(t, 4.1, 4.8));

  return (
    <g opacity={fade(t, 12)}>
      {/* Prompt systems */}
      <rect x={80} y={80} width={356} height={76} rx={12} {...line} {...draw(inOut(prog(t, 0.1, 0.7)))} />
      <text x={102} y={126} fontSize={21} fill={INK} style={mono}>
        {A_PROMPT.slice(0, typed)}
        {cursor}
      </text>

      {/* Data setup: scattered records fall into a grid */}
      {A_DATA.map(({ from, to }, i) => {
        const [x, y] = mix(from, to, inOut(prog(t, 1.8 + i * 0.04, 2.8 + i * 0.04)));
        return <circle key={i} cx={x} cy={y} r={6} fill={INK} opacity={0.5 * prog(t, 1.1 + i * 0.03, 1.5 + i * 0.03)} />;
      })}

      <path d={`M436 118L${pt(A_AGENT)}M${pt(A_FEED)}L${pt(A_AGENT)}`} {...hair} {...draw(prog(t, 2.8, 3.5))} />
      {A_TOOLS.map((p, i) => (
        <g key={i}>
          <line x1={A_AGENT[0]} y1={A_AGENT[1]} x2={p[0]} y2={p[1]} {...hair} {...draw(edges)} />
          <line x1={p[0]} y1={p[1]} x2={A_DONE[0]} y2={A_DONE[1]} {...hair} {...draw(exits)} />
        </g>
      ))}
      <line x1={850} y1={120} x2={850} y2={420} {...hair} strokeDasharray="3 9" opacity={exits} />
      <line x1={A_TOOLS[0][0]} y1={A_TOOLS[0][1]} x2={A_TEAM[0] - 36} y2={A_TEAM[1]} {...hair} {...draw(exits)} />

      {/* The agent, thinking */}
      <circle cx={A_AGENT[0]} cy={A_AGENT[1]} r={38} {...line} fill="#fff" {...draw(inOut(prog(t, 2.6, 3.2)))} />
      <circle cx={A_AGENT[0]} cy={A_AGENT[1]} r={54} {...line} strokeWidth={2} strokeDasharray="4 12" opacity={0.5 * prog(t, 3, 3.4)} transform={`rotate(${t * 40} ${pt(A_AGENT)})`} />
      <circle cx={A_AGENT[0]} cy={A_AGENT[1]} r={8 * back(prog(t, 3, 3.3))} fill={INK} />

      {/* Custom AI tools, each doing one sales or support job */}
      {A_TOOLS.map(([x, y], i) => {
        const p = back(prog(t, 3.9 + i * 0.15, 4.3 + i * 0.15));
        const shape = [
          <rect key="s" x={-20} y={-20} width={40} height={40} rx={6} />,
          <rect key="d" x={-17} y={-17} width={34} height={34} rx={4} transform="rotate(45)" />,
          <circle key="c" r={22} />,
        ][i];
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <g transform={`scale(${p})`} {...line} fill="#fff">
              {shape}
            </g>
            <text x={40} y={7} fontSize={19} fill={INK} fillOpacity={0.55} opacity={prog(t, 4.2, 4.6)} style={mono}>
              {["qualify", "reply", "book"][i]}
            </text>
          </g>
        );
      })}

      {/* Where the work lands: done, or up to a person */}
      <g opacity={prog(t, 4.4, 4.8)}>
        <circle cx={A_DONE[0]} cy={A_DONE[1]} r={26} {...line} />
        <circle cx={A_DONE[0]} cy={A_DONE[1]} r={12} fill={INK} />
        {doneFlash > 0 && doneFlash < 1 && <circle cx={A_DONE[0]} cy={A_DONE[1]} r={26 + 20 * out(doneFlash)} {...line} strokeWidth={2} strokeOpacity={1 - doneFlash} />}
        <text x={A_DONE[0]} y={A_DONE[1] + 62} fontSize={19} textAnchor="middle" fill={INK} fillOpacity={0.55} style={mono}>
          {handled} handled
        </text>
        <circle cx={A_TEAM[0]} cy={A_TEAM[1] - 20} r={14} {...line} />
        <path d={`M${A_TEAM[0] - 26} ${A_TEAM[1] + 24}Q${A_TEAM[0]} ${A_TEAM[1] - 14} ${A_TEAM[0] + 26} ${A_TEAM[1] + 24}`} {...line} />
        {upFlash > 0 && upFlash < 1 && <circle cx={A_TEAM[0]} cy={A_TEAM[1]} r={40 + 24 * out(upFlash)} {...line} stroke={ACCENT} strokeWidth={2} strokeOpacity={1 - upFlash} />}
        <text x={A_TEAM[0] + 44} y={A_TEAM[1] + 7} fontSize={19} fill={INK} fillOpacity={0.55} style={mono}>
          your team
        </text>
      </g>

      {/* Workflow automation / agentic workflows: the work itself */}
      {A_TOKENS.map(({ rare, path, start, end }, k) => {
        if (t < start || t > end + 0.15) return null;
        const e = Math.min((t - start) / A_SEG, path.length - 1.0001);
        const i = Math.floor(e);
        const [x, y] = mix(path[i], path[i + 1], inOut(e - i));
        return rare ? (
          <g key={k}>
            <circle cx={x} cy={y} r={12} {...line} stroke={ACCENT} strokeWidth={2} />
            <circle cx={x} cy={y} r={6} fill={ACCENT} />
          </g>
        ) : (
          <circle key={k} cx={x} cy={y} r={7} fill={INK} />
        );
      })}
    </g>
  );
}

/* ------------------------------------------------------------------------- *
 * Legal & Compliance: the company gets written and signed, IP is assigned    *
 * in, the cap table is split, and every paper is filed, checked and locked.  *
 * ------------------------------------------------------------------------- */

const L_DOC: Pt = [235, 245];
const L_CAP: Pt = [640, 230];
const L_SLICES = [
  { start: 0, share: 0.6, color: INK, opacity: 0.85 },
  { start: 0.6, share: 0.25, color: INK, opacity: 0.35 },
  { start: 0.85, share: 0.15, color: ACCENT, opacity: 1 },
];
const L_TEXT = [210, 190, 215, 160, 205, 180, 212, 120];
const L_SLOTS = Array.from({ length: 6 }, (_, i) => ({ x: 880 + (i % 3) * 115, y: 150 + Math.floor(i / 3) * 150, from: i === 3 || i === 5 ? L_CAP : L_DOC }));

function Legal({ t }: { t: number }) {
  const stamp = prog(t, 3.3, 3.7);
  const ipP = inOut(prog(t, 3.9, 4.6));
  const ip = quad([520, 450], [440, 330], [260, 317], ipP);
  const shackle = out(prog(t, 10.6, 11.1));

  return (
    <g opacity={fade(t, 13)}>
      {/* Incorporation and contracts: the page writes itself, then gets signed and sealed */}
      <path d="M100 40H340L370 70V450H100Z" {...line} {...draw(inOut(prog(t, 0.1, 0.9)))} />
      <path d="M340 40V70H370" {...line} {...draw(prog(t, 0.8, 1))} />
      <line x1={130} y1={90} x2={270} y2={90} {...line} strokeWidth={5} {...draw(prog(t, 0.6, 1))} />
      {L_TEXT.map((w, i) => (
        <line key={i} x1={130} y1={125 + i * 24} x2={130 + w} y2={125 + i * 24} {...line} strokeWidth={2} strokeOpacity={0.4} {...draw(prog(t, 0.9 + i * 0.2, 1.25 + i * 0.2))} />
      ))}
      <line x1={130} y1={317} x2={280} y2={317} {...line} strokeWidth={2} stroke={ACCENT} {...draw(prog(t, 4.6, 5))} />
      <line x1={130} y1={404} x2={300} y2={404} {...hair} {...draw(prog(t, 2.3, 2.6))} />
      <path d="M140 392C155 360 165 402 178 380S200 360 205 388S230 400 240 372S262 380 290 384" {...line} {...draw(inOut(prog(t, 2.6, 3.3)))} />
      {stamp > 0 && (
        <g transform={`translate(330 392) scale(${1.5 - 0.5 * out(stamp)})`} opacity={out(stamp)}>
          <circle r={30} {...line} fill="#fff" stroke={ACCENT} />
          <circle r={21} {...line} stroke={ACCENT} strokeWidth={2} strokeDasharray="3 5" />
          <path d="M-8 0l5 6l11 -12" {...line} stroke={ACCENT} />
        </g>
      )}

      {/* IP assignment: the idea is carried into the paper */}
      {ipP < 1 && (
        <rect x={ip[0] - 9} y={ip[1] - 9} width={18} height={18} rx={2} fill={ACCENT} opacity={prog(t, 3.6, 3.9)} transform={`rotate(45 ${pt(ip)})`} />
      )}

      {/* Cap table */}
      <circle cx={L_CAP[0]} cy={L_CAP[1]} r={120} {...hair} strokeOpacity={0.15} opacity={prog(t, 4.8, 5.1)} />
      {L_SLICES.map(({ start, share, color, opacity }, i) => {
        const p = inOut(prog(t, 5 + i * 0.45, 5.5 + i * 0.45));
        const mid = (start + share / 2) * TAU - Math.PI / 2;
        return (
          <g key={i}>
            <circle cx={L_CAP[0]} cy={L_CAP[1]} r={120} fill="none" stroke={color} strokeOpacity={opacity} strokeWidth={20} pathLength={1} strokeDasharray={`${Math.max(0, share * p - 0.008)} 1`} strokeDashoffset={-start} transform={`rotate(-90 ${pt(L_CAP)})`} visibility={p > 0 ? "visible" : "hidden"} />
            <text x={L_CAP[0] + 170 * Math.cos(mid)} y={L_CAP[1] + 170 * Math.sin(mid) + 7} textAnchor="middle" fontSize={20} fill={INK} fillOpacity={0.55} opacity={prog(t, 5.4 + i * 0.45, 5.7 + i * 0.45)} style={mono}>
              {Math.round(share * 100)}%
            </text>
          </g>
        );
      })}

      {/* Data room: every paper gets filed and checked, then the room locks */}
      {L_SLOTS.map(({ x, y, from }, i) => {
        const s = 7.1 + i * 0.4;
        const p = prog(t, s, s + 0.8);
        const to: Pt = [x + 47, y + 68];
        const pos = quad(from, [(from[0] + to[0]) / 2, Math.min(from[1], to[1]) - 140], to, inOut(p));
        const tick = prog(t, s + 0.8, s + 1.1);
        return (
          <g key={i}>
            <path d={`M${x} ${y}h36l8 12h51v108h-95Z`} {...line} strokeWidth={2} strokeOpacity={0.5} {...draw(inOut(prog(t, 6.2 + i * 0.1, 6.9 + i * 0.1)))} />
            {p > 0 && (
              <g transform={`translate(${pt(pos)}) scale(${lerp(0.8, 1, p)})`}>
                {from === L_CAP ? (
                  <>
                    <circle r={17} {...line} strokeWidth={2} />
                    <path d="M0 -17A17 17 0 0 1 16.2 5.3" {...line} strokeWidth={6} />
                  </>
                ) : (
                  <>
                    <rect x={-15} y={-20} width={30} height={40} rx={3} {...line} fill="#fff" strokeWidth={2} />
                    <path d="M-8 -8H8M-8 0H8M-8 8H2" {...line} strokeWidth={2} strokeOpacity={0.5} />
                  </>
                )}
              </g>
            )}
            {tick > 0 && (
              <g transform={`translate(${x + 90} ${y + 20}) scale(${back(tick)})`}>
                <circle r={12} fill={ACCENT} />
                <path d="M-5 0l3.5 4l7 -8" {...line} stroke="#fff" strokeWidth={2.5} />
              </g>
            )}
          </g>
        );
      })}
      <rect x={860} y={120} width={360} height={330} rx={16} {...hair} {...draw(inOut(prog(t, 9.8, 10.6)))} />
      <g opacity={prog(t, 10.2, 10.5)}>
        <path d={`M1028 80V66A12 12 0 0 1 1052 66V80`} {...line} transform={`translate(0 ${-14 * (1 - shackle)})`} />
        <rect x={1020} y={78} width={40} height={30} rx={6} {...line} fill={shackle >= 1 ? INK : "#fff"} />
      </g>
    </g>
  );
}

const scenes: Record<string, Scene> = {
  growth: {
    loop: 13,
    still: 11.9,
    Draw: Growth,
    steps: [
      [0, 2.2, "Positioning"],
      [2.2, 3.6, "Branding"],
      [3.6, 4.8, "Marketing"],
      [4.8, 6.2, "Content creation"],
      [6.2, 9.8, "Demand generation"],
      [9.8, 13, "Retention"],
    ],
  },
  technology: {
    loop: 12,
    still: 10.6,
    Draw: Technology,
    steps: [
      [0, 2.4, "Website development"],
      [2.4, 4.2, "App development"],
      [4.2, 5.6, "Ops stack"],
      [5.6, 7.1, "Integrations"],
      [7.1, 8.8, "Analytics setup"],
      [8.8, 12, "Automation"],
    ],
  },
  ai: {
    loop: 12,
    still: 10.2,
    Draw: Enablement,
    steps: [
      [0, 2, "Prompt systems"],
      [2, 3.6, "Data setup"],
      [3.6, 5, "Custom AI tools"],
      [5, 7, "Workflow automation"],
      [7, 8.8, "Sales & support AI"],
      [8.8, 12, "Agentic workflows"],
    ],
  },
  legal: {
    loop: 13,
    still: 11.6,
    Draw: Legal,
    steps: [
      [0, 1.8, "Incorporation"],
      [1.8, 3.6, "Contracts"],
      [3.6, 5, "IP assignment"],
      [5, 7, "Cap table"],
      [7, 9.4, "Compliance"],
      [9.4, 13, "Data room"],
    ],
  },
};
const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (cb: () => void) => {
  const m = window.matchMedia(REDUCED);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

type Props = {
  id: string;
  title: string;
  /** Called with the capability currently being acted out. */
  onStep?: (capability: string | undefined) => void;
};

function ServiceAnimation({ id, title, onStep }: Props) {
  const scene = scenes[id];
  const svg = useRef<SVGSVGElement>(null);
  const [clock, setClock] = useState(0);
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches, () => false);
  const loop = scene?.loop ?? 1;

  useEffect(() => {
    const el = svg.current;
    if (!el || reduced) return;
    let raf = 0;
    let last = 0;
    let elapsed = 0;
    const tick = (now: number) => {
      if (last) elapsed += Math.min(0.1, (now - last) / 1000);
      last = now;
      setClock(elapsed % loop);
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(raf);
      last = 0;
      if (entry.isIntersecting) raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [reduced, loop]);

  const t = reduced ? (scene?.still ?? 0) : clock;
  const step = scene?.steps.find(([a, b]) => t >= a && t < b)?.[2];

  useEffect(() => {
    onStep?.(step);
  }, [step, onStep]);

  if (!scene) return null;
  const { Draw, steps } = scene;

  return (
    <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={title}>
      <Draw t={t} />
      {steps.map(([a, b, name]) => {
        const o = prog(t, a, a + 0.3) * (1 - prog(t, b - 0.3, b));
        return o > 0 ? (
          <text key={name} x={90} y={514 + (1 - o) * 8} fontSize={22} fill={INK} fillOpacity={0.5} opacity={o} style={mono}>
            {name}
          </text>
        ) : null;
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------------- *
 * The section: full-height panels stack while scrolling (sticky cards), and   *
 * the sticky background cross-fades per active service.                       *
 * ------------------------------------------------------------------------- */

export type Service = {
  /** One of "growth" | "technology" | "ai" | "legal" picks a built-in drawing. */
  id: string;
  title: string;
  text: string;
  capabilities: string[];
  /** Background image for this panel. */
  bg?: string;
};

const IMG = "https://knnekt.studio/sanity";

export const defaultServices: Service[] = [
  {
    id: "growth",
    title: "Growth & Marketing",
    text: "How you’re found, understood and remembered, turning attention into customers who come back and bring others. Positioning first, then demand: we don’t spend to grow before the story is proven.",
    capabilities: ["Positioning", "Branding", "Marketing", "Content creation", "Demand generation", "Retention"],
    bg: `${IMG}/7fa74a1ccdcb8015276c6112898c48b4bdcb3da7-1920x1112.webp`,
  },
  {
    id: "technology",
    title: "Technology",
    text: "The product and the systems behind it, built properly so they hold weight as you grow, without a rebuild later. Website and MVP inside the quarter, with the ops stack that keeps them running.",
    capabilities: ["Website development", "App development", "Ops stack", "Integrations", "Analytics setup", "Automation"],
    bg: `${IMG}/5972f7b6bc093c048edc54c40149f78a8af834ae-1920x1112.webp`,
  },
  {
    id: "ai",
    title: "AI Enablement",
    text: "AI put to work across the business, so the repeatable runs itself and your team spends its time on the rare. Inside the product where it earns its place, and behind it where it saves you hires.",
    capabilities: ["Workflow automation", "Sales & support AI", "Custom AI tools", "Data setup", "Prompt systems", "Agentic workflows"],
    bg: `${IMG}/5c0766161f4835c1f8d9489e22128bfc71aad1ff-1920x1112.webp`,
  },
  {
    id: "legal",
    title: "Legal & Compliance",
    text: "The paperwork that decides whether a raise goes smoothly, handled early, before it gets expensive to fix. Incorporation, cap table and contracts done once, properly, and a data room that holds up.",
    capabilities: ["Incorporation", "Cap table", "Contracts", "IP assignment", "Compliance", "Data room"],
    bg: `${IMG}/84a716626708bc871945e911c39039eb81ec16c1-1920x1112.webp`,
  },
];

const FALLBACK_BG = "linear-gradient(180deg, #0b0f4a 0%, #2d5fc4 45%, #7fa6dd 70%, #e9ecf3 100%)";

const panelClass =
  "sticky top-0 mx-auto grid min-h-screen w-full max-w-[104.5rem] origin-top content-center items-center px-4 py-6 sm:px-16 md:px-9 lg:grid-cols-2 lg:px-0 lg:py-20 lg:[@media(max-height:910px)]:py-10";

const capabilityClass =
  "relative items-baseline gap-2 rounded-lg bg-[#d3e3f6] px-2.5 pt-1.5 pb-2 transition-colors duration-500 before:bg-[#16253f] before:transition-colors before:duration-500 lg:flex lg:pt-2.5 lg:pb-3 lg:before:size-2 lg:before:shrink-0 lg:before:-translate-y-[20%] lg:before:rounded-full";

/** The chip for whichever capability the drawing above is acting out right now. */
const activeCapabilityClass = "bg-[#b9d8f9] before:bg-[#3b81e3]";

export type ServicesStackProps = {
  services?: Service[];
  /** The line that sits above each service title. */
  eyebrow?: string;
  className?: string;
};

export function ServicesStack({ services = defaultServices, eyebrow = "Создан для:", className }: ServicesStackProps) {
  const root = useRef<HTMLElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const panels = Array.from(el.querySelectorAll<HTMLElement>("[data-panel]"));
    let raf = 0;
    // A panel taller than the viewport sticks by its bottom edge, so the whole card stays reachable.
    const fit = () => {
      const vh = window.innerHeight;
      panels.forEach((panel) => {
        panel.style.top = `${Math.min(0, vh - panel.offsetHeight)}px`;
      });
    };
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      let idx = 0;
      panels.forEach((panel, i) => {
        if (panel.getBoundingClientRect().top <= vh * 0.5) idx = i;
        // how far the *next* panel has travelled over this one (0..1)
        const next = panels[i + 1];
        const card = cards.current[i];
        if (!card) return;
        const covered = next ? Math.min(1, Math.max(0, 1 - next.getBoundingClientRect().top / vh)) : 0;
        card.style.opacity = String(Math.max(0, 1 - covered * 1.4));
        card.style.transform = `scale(${1 - covered * 0.06}) translateY(${-covered * 40}px)`;
      });
      setActive(idx);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onResize = () => {
      fit();
      schedule();
    };
    fit();
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, [services.length]);

  return (
    <section ref={root} className={cn("relative isolate w-full text-[#16253f] lg:px-9", className)}>
      <style>{GRAIN_CSS}</style>
      {services.map((s, i) => (
        <div key={s.id} data-panel className={panelClass}>
          {/* Title and card fade together as the next panel slides over them. */}
          <div
            className="mx-auto w-full max-w-[36rem] lg:col-start-2 lg:mx-0 lg:max-w-none"
            ref={(el) => {
              cards.current[i] = el;
            }}
            style={{ transformOrigin: "top center", willChange: "transform, opacity" }}
          >
            <h2 className="text-2xl font-medium text-white lg:sr-only">
              <span className="block text-white/50">{eyebrow}</span>
              <span className="block">{s.title}</span>
            </h2>
            <div className="mt-6 lg:mt-0">
              <ServiceCard service={s} />
            </div>
          </div>
        </div>
      ))}

      {/* Sticky background: left-hand titles + cross-fading photos + grain */}
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div className="sticky top-0 grid h-screen w-full overflow-hidden py-20">
          <div className="mx-auto hidden w-full max-w-[104.5rem] grid-cols-12 px-9 text-[clamp(1.75rem,0.5263vi+1.6184rem,2.25rem)] leading-[1.15] font-medium tracking-tight text-white lg:grid">
            <div className="col-span-5 flex h-full flex-col">
              <div className="flex h-1/2 flex-col justify-end">
                <h2 className="text-white/50">{eyebrow}</h2>
              </div>
              <div className="relative h-1/2">
                {services.map((s, i) => (
                  <span key={s.id} className={cn("absolute inset-0 transition duration-300", i !== active && "translate-y-10 opacity-0")}>
                    {s.title}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="ss-grain absolute inset-0 -z-10 overflow-hidden" />
          {services.map((s, i) =>
            s.bg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={s.id}
                alt=""
                loading="lazy"
                width={1920}
                height={1112}
                src={s.bg}
                className={cn("absolute inset-0 -z-20 h-screen w-full object-cover transition-opacity duration-1000", i !== active && "opacity-0")}
              />
            ) : (
              <div
                key={s.id}
                className={cn("absolute inset-0 -z-20 transition-opacity duration-1000", i !== active && "opacity-0")}
                style={{ background: FALLBACK_BG }}
              />
            ),
          )}
        </div>
      </div>
    </section>
  );
}

function ServiceCard({ service: s }: { service: Service }) {
  const [step, setStep] = useState<string>();
  return (
    <div className="overflow-hidden rounded-lg bg-gradient-to-b from-[#e3e8f4] to-[#f8f9fc] px-4 pt-5 lg:max-w-[42.5rem] lg:rounded-xl lg:pt-8">
      <div className="px-2 lg:px-10">
        <ServiceAnimation id={s.id} title={`${s.title}: ${s.capabilities.join(", ")}`} onStep={setStep} />
      </div>
      <div className="p-5 pt-7 lg:px-14 lg:py-12 lg:[@media(max-height:910px)]:py-8">
        <p className="text-[1.1875rem] leading-tight tracking-[0.005em] lg:max-w-[36.25rem]">{s.text}</p>
        <p
          id={`service-list-title-${s.id}`}
          className="mt-11 text-[0.6875rem] leading-tight font-medium tracking-[0.055rem] text-[#16253f]/80 uppercase lg:[@media(max-height:910px)]:mt-8"
          style={{ fontFamily: MONO_FONT }}
        >
          Что дает:
        </p>
        <ul
          className="mt-3.5 grid grid-cols-2 gap-1.5 text-[0.9375rem] leading-tight lg:gap-2 lg:[@media(max-height:910px)]:mt-2"
          aria-labelledby={`service-list-title-${s.id}`}
        >
          {s.capabilities.map((c) => (
            <li key={c} className={cn(capabilityClass, c === step && activeCapabilityClass)}>
              {c}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const GRAIN_CSS = `
.ss-grain::after{content:"";position:absolute;top:0;left:0;width:140%;height:140%;opacity:.05;
background-image:url(https://cdn.21st.dev/assets/mirror/07/0779a346a8a608cb9830a8892152beae5fd79088a7a4f4a50a9d9ebf435e5404.png);animation:ss-grain 8s steps(10) infinite}
@keyframes ss-grain{0%{transform:translate(0)}10%,30%,50%,70%,90%{transform:translate(-5%,-10%)}20%,40%,60%,80%,100%{transform:translate(-15%,-20%)}}
@media (prefers-reduced-motion: reduce){.ss-grain::after{animation:none}}
`;

export default ServicesStack;
