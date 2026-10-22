import type { MermaidConfig } from "mermaid";

type Tone = { fill: string; border: string; text: string };
type ToneName = "sky" | "violet" | "teal" | "fuchsia" | "amber" | "lime" | "coral" | "slate";

type Palette = {
  canvas: string;
  text: string;
  muted: string;
  line: string;
  tones: Record<ToneName, Tone>;
};

// Seven bright tones over tinted fills; slate is the neutral for anything unclassed.
const dark: Palette = {
  canvas: "#0c1220",
  text: "#e6edf3",
  muted: "#9aa7b8",
  line: "#6b7a93",
  tones: {
    sky: { fill: "#0b2133", border: "#38bdf8", text: "#e0f2fe" },
    violet: { fill: "#1d1638", border: "#a78bfa", text: "#ede9fe" },
    teal: { fill: "#0a2724", border: "#2dd4bf", text: "#ccfbf1" },
    fuchsia: { fill: "#2a0f2e", border: "#e879f9", text: "#fae8ff" },
    amber: { fill: "#2a1f08", border: "#fbbf24", text: "#fef3c7" },
    lime: { fill: "#17240a", border: "#a3e635", text: "#ecfccb" },
    coral: { fill: "#2d1016", border: "#fb7185", text: "#ffe4e6" },
    slate: { fill: "#141c2b", border: "#4b5a72", text: "#e2e8f0" },
  },
};

const light: Palette = {
  canvas: "#f4f7fb",
  text: "#1e293b",
  muted: "#5b6577",
  line: "#94a0b4",
  tones: {
    sky: { fill: "#ebf7fe", border: "#0284c7", text: "#0c3a5c" },
    violet: { fill: "#f3f0ff", border: "#7c3aed", text: "#3b1d7a" },
    teal: { fill: "#e9fbf8", border: "#0d9488", text: "#134e48" },
    fuchsia: { fill: "#fdf0ff", border: "#c026d3", text: "#6b1470" },
    amber: { fill: "#fff8e6", border: "#d97706", text: "#6b3a06" },
    lime: { fill: "#f4fbe6", border: "#65a30d", text: "#3a5a0a" },
    coral: { fill: "#fff0f2", border: "#e11d48", text: "#7f1230" },
    slate: { fill: "#ffffff", border: "#a3afc2", text: "#1e293b" },
  },
};

// Classes a diagram can apply with `class NodeId source` (nodes and subgraphs).
const classes: { name: string; tone: ToneName; label: string }[] = [
  { name: "mana", tone: "sky", label: "Mana app" },
  { name: "source", tone: "violet", label: "Your source" },
  { name: "external", tone: "teal", label: "Website / API" },
  { name: "good", tone: "lime", label: "Result" },
  { name: "warn", tone: "amber", label: "Decision / wait" },
  { name: "bad", tone: "coral", label: "Error" },
  { name: "muted", tone: "slate", label: "Ignored" },
  { name: "copy", tone: "fuchsia", label: "Bytes in JavaScript" },
];

// Sequence participants and data-model classes take these in turn.
const sequenceCycle: ToneName[] = ["sky", "violet", "teal", "fuchsia", "amber", "lime", "coral"];
const classCycle: ToneName[] = ["violet", "sky", "fuchsia", "teal", "amber", "coral", "lime"];

type TypeKind = "primitive" | "named";

// TypeScript token colours from Shiki's GitHub themes, the ones VitePress uses for code blocks.
const syntax = {
  light: { primitive: "#005CC5", named: "#6F42C1", property: "#E36209", punctuation: "#24292E" },
  dark: { primitive: "#79B8FF", named: "#B392F0", property: "#FFAB70", punctuation: "#E1E4E8" },
};

const typeKinds: { kind: TypeKind; label: string }[] = [
  { kind: "primitive", label: "primitive type" },
  { kind: "named", label: "type" },
];

const primitives = new Set(["string", "number", "boolean", "void", "any", "unknown", "never", "null", "undefined", "object"]);

function typeKind(type: string): TypeKind {
  const base = type.replace(/(\[\])+$/, "").replace(/<.*>$/, "");
  return primitives.has(base) ? "primitive" : "named";
}

/** Splits a class member such as `+string title` or `+didChange(value)` into its parts. */
function parseMember(text: string):
  | { visibility: string; method: string; params: string }
  | { visibility: string; type?: string; name: string } {
  const match = /^([+\-#~]?)(.*)$/.exec(text.trim())!;
  const [, visibility, rest] = match;
  const method = /^(\w+)\((.*)\)$/.exec(rest);
  if (method) return { visibility, method: method[1], params: method[2] };

  const space = rest.lastIndexOf(" ");
  return space < 0 ? { visibility, name: rest } : { visibility, type: rest.slice(0, space), name: rest.slice(space + 1) };
}

/** The legend entries for the classes a diagram uses, in a fixed order. */
export function legendFor(code: string): { name: string; label: string }[] {
  const used = new Set<string>();
  for (const [, names] of code.matchAll(/^\s*class\s+[^\s]+\s+([\w,]+)\s*$/gm)) {
    names.split(",").forEach((name) => used.add(name));
  }
  for (const [, name] of code.matchAll(/:::(\w+)/g)) used.add(name);
  // `%% legend: copy, source` adds entries a diagram shows without node classes, such as shaded regions.
  for (const [, names] of code.matchAll(/^\s*%%\s*legend:\s*(.+)$/gm)) {
    names.split(",").forEach((name) => used.add(name.trim()));
  }
  // Flowchart diamonds are drawn in the decision colour.
  if (/^\s*flowchart/m.test(code) && /\w+\{[^}]+\}/.test(code)) used.add("warn");

  const legend = classes.filter((c) => used.has(c.name)).map(({ name, label }) => ({ name, label }));

  if (/^\s*classDiagram/m.test(code)) {
    const kinds = new Set<TypeKind>();
    for (const [, member] of code.matchAll(/^\s*([+\-#~]\S+\s+\w+)\s*$/gm)) {
      const parsed = parseMember(member);
      if ("type" in parsed && parsed.type) kinds.add(typeKind(parsed.type));
    }
    legend.push(...typeKinds.filter((t) => kinds.has(t.kind)).map((t) => ({ name: `type-${t.kind}`, label: t.label })));
    if (kinds.size) legend.push({ name: "type-property", label: "property" });
  }

  return legend;
}

const XHTML = "http://www.w3.org/1999/xhtml";

/** Rewrites a member label into coloured tokens; the characters (and so the measured width) stay the same. */
function highlightMember(doc: Document, p: Element) {
  const text = p.textContent ?? "";
  const parsed = parseMember(text);
  const parts: [string, string][] = [];

  if (parsed.visibility) parts.push([parsed.visibility, "tok-muted"]);
  if ("method" in parsed) {
    parts.push([parsed.method, "tok-method"], ["(", "tok-muted"]);
    if (parsed.params) parts.push([parsed.params, "tok-param"]);
    parts.push([")", "tok-muted"]);
  } else {
    if (parsed.type) {
      const base = parsed.type.replace(/(\[\])+$/, "");
      parts.push([base, `tok-type tok-${typeKind(parsed.type)}`]);
      if (base.length < parsed.type.length) parts.push([parsed.type.slice(base.length), "tok-muted"]);
      parts.push([" ", ""]);
    }
    parts.push([parsed.name, parsed.type ? "tok-name" : "tok-field"]);
  }

  p.textContent = "";
  const leading = text.length - text.trimStart().length;
  if (leading) p.appendChild(doc.createTextNode(text.slice(0, leading)));
  for (const [value, className] of parts) {
    if (!className) {
      p.appendChild(doc.createTextNode(value));
      continue;
    }
    const span = doc.createElementNS(XHTML, "span");
    span.setAttribute("class", className);
    span.textContent = value;
    p.appendChild(span);
  }
}

/**
 * Turns sequence `rect` regions into titled groups like flowchart subgraphs. Each
 * `%% region: copy | Bytes in JavaScript` line styles the next region with a class from
 * `classes`; a `Note` with the same text as the first line inside the region becomes its
 * title, so Mermaid reserves the space for it.
 */
function decorateRegions(root: Element, code: string) {
  const regions = [...code.matchAll(/^\s*%%\s*region:\s*(\w+)\s*\|\s*(.+)$/gm)].map(([, name, title]) => ({
    name,
    title: title.trim(),
  }));
  if (!regions.length) return;

  root.querySelectorAll("rect.rect").forEach((rect, i) => {
    const region = regions[Math.min(i, regions.length - 1)];
    rect.setAttribute("class", `rect region region-${region.name}`);
  });

  root.querySelectorAll("text.noteText").forEach((text) => {
    const region = regions.find((r) => r.title === text.textContent?.trim());
    if (!region) return;
    text.setAttribute("class", `noteText region-title region-${region.name}`);
    text.parentElement?.querySelector("rect.note")?.setAttribute("class", "note region-note");
  });
}

/** Tags sequence participants and data-model classes with a tone so each gets its own colour. */
export function decorate(svg: string, code = ""): string {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  const kind = root.getAttribute("aria-roledescription") ?? "";

  if (kind === "sequence") {
    // Mermaid draws participants right to left; colour them in reading order instead.
    const order = [...root.querySelectorAll("rect.actor")]
      .sort((a, b) => Number(a.getAttribute("x")) - Number(b.getAttribute("x")))
      .map((rect) => rect.getAttribute("name") ?? "")
      .filter((name, i, names) => names.indexOf(name) === i);
    const toneOf = (name: string) => {
      if (!order.includes(name)) order.push(name);
      return sequenceCycle[order.indexOf(name) % sequenceCycle.length];
    };
    root.querySelectorAll("rect.actor").forEach((rect) => {
      rect.parentElement?.classList.add(`tone-${toneOf(rect.getAttribute("name") ?? "")}`);
    });
    root.querySelectorAll("line.actor-line").forEach((line) => {
      line.classList.add(`tone-${toneOf(line.getAttribute("name") ?? "")}`);
    });
    decorateRegions(root, code);
  } else if (kind.startsWith("class")) {
    root.querySelectorAll("g.node").forEach((node, i) => {
      node.classList.add(`tone-${classCycle[i % classCycle.length]}`);
    });
    root.querySelectorAll(".members-group p, .methods-group p").forEach((p) => highlightMember(doc, p));
  } else {
    return svg;
  }

  return new XMLSerializer().serializeToString(root);
}

const fontFamily = '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

function themeCSS(p: Palette, ts: (typeof syntax)["dark"]): string {
  const node = (selector: string, t: Tone) => `
    ${selector} rect, ${selector} polygon, ${selector} circle, ${selector} path {
      fill: ${t.fill} !important; stroke: ${t.border} !important;
    }
    ${selector} .nodeLabel, ${selector} .nodeLabel p, ${selector} span { color: ${t.text} !important; }`;

  const cluster = (selector: string, t: Tone) => `
    ${selector} > rect { fill: ${t.fill} !important; fill-opacity: 0.35; stroke: ${t.border} !important; }
    ${selector} .cluster-label span, ${selector} .cluster-label p, ${selector} .nodeLabel { color: ${t.border} !important; }`;

  // Per-participant and per-class colours added by `decorate`.
  const tone = (name: ToneName, t: Tone) => `
    g.tone-${name} > rect.actor { fill: ${t.fill} !important; stroke: ${t.border} !important; }
    g.tone-${name} > text.actor, g.tone-${name} > text.actor > tspan { fill: ${t.text} !important; }
    line.actor-line.tone-${name} { stroke: ${t.border} !important; stroke-opacity: 0.45; }

    g.node.tone-${name} .label-container path { fill: ${t.fill} !important; stroke: ${t.border} !important; stroke-width: 1.5px; }
    g.node.tone-${name} .divider path { stroke: ${t.border} !important; stroke-opacity: 0.45; }
    g.node.tone-${name} .label-group .nodeLabel, g.node.tone-${name} .label-group .nodeLabel p { color: ${t.border} !important; }
    g.node.tone-${name} .members-group .nodeLabel, g.node.tone-${name} .members-group .nodeLabel p,
    g.node.tone-${name} .methods-group .nodeLabel, g.node.tone-${name} .methods-group .nodeLabel p { color: ${t.text} !important; }`;

  // Sequence regions match flowchart groups: tinted fill, dashed rounded border, uppercase title.
  const region = (name: string, t: Tone) => `
    rect.region-${name} {
      fill: ${t.fill} !important; fill-opacity: 0.35; stroke: ${t.border};
      stroke-width: 1.4px; stroke-dasharray: 7 5; rx: 12px; ry: 12px;
    }
    text.region-title.region-${name}, text.region-title.region-${name} > tspan { fill: ${t.border} !important; }`;

  const toneCSS = classes
    .map(({ name, tone: t }) => node(`.node.${name}`, p.tones[t]) + cluster(`.cluster.${name}`, p.tones[t]) + region(name, p.tones[t]))
    .join("\n");

  const cycleCSS = (Object.keys(p.tones) as ToneName[]).map((name) => tone(name, p.tones[name])).join("\n");

  const { slate, amber, sky, fuchsia } = p.tones;

  return `
    .nodeLabel, .label { font-weight: 600; }
    rect.region-note { fill: transparent !important; stroke: none !important; }
    text.region-title, text.region-title > tspan {
      font-size: 12px !important; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
    }
    .nodeLabel small, .label small {
      font-size: 11px; font-weight: 400;
      color: color-mix(in srgb, currentColor 75%, transparent);
    }
    .nodeLabel code { font-family: inherit; font-size: 11px; color: color-mix(in srgb, currentColor 85%, transparent); }

    .node rect, .node polygon, .node circle, .node path { stroke-width: 1.6px; }
    .node rect { rx: 7px; ry: 7px; }
    .node polygon { fill: ${amber.fill}; stroke: ${amber.border}; }
    .node:has(polygon) .nodeLabel { color: ${amber.text}; }

    .cluster > rect {
      rx: 12px; ry: 12px;
      fill: transparent; stroke: ${slate.border};
      stroke-width: 1.4px; stroke-dasharray: 7 5;
    }
    .cluster-label .nodeLabel, .cluster-label span, .cluster-label p {
      font-weight: 700; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase;
      color: ${p.muted};
    }

    .edgeLabel, .edgeLabel p, .edgeLabel span { font-size: 11.5px; font-weight: 500; color: ${p.muted}; }
    .edgeLabel rect, .labelBkg { fill: ${p.canvas}; background: ${p.canvas}; }
    .flowchart-link { stroke-width: 1.5px; }
    .marker, marker path { fill: ${p.line}; stroke: ${p.line}; }

    rect.actor { rx: 8px; ry: 8px; stroke-width: 1.6px; }
    text.actor > tspan { font-weight: 700; }
    .actor-man circle, .actor-man line { stroke: ${amber.border}; fill: ${amber.fill}; }
    .actor-man text, .actor-man text tspan { fill: ${amber.text}; }
    .actor-line { stroke-dasharray: 3 4; }
    .messageText { font-size: 12.5px; }
    .note { rx: 6px; ry: 6px; }
    .noteText > tspan { font-size: 12px; }
    .labelBox { rx: 4px; ry: 4px; }
    .labelText, .labelText > tspan { font-weight: 700; font-size: 11px; }
    .loopLine { stroke: ${fuchsia.border}; stroke-dasharray: 6 4; stroke-opacity: 0.7; }
    .sequenceNumber { font-size: 10.5px; font-weight: 800; }
    #sequencenumber, [id$="-sequencenumber"] circle, marker circle { fill: ${sky.border}; stroke: ${sky.border}; }

    g.classGroup rect, .classGroup .basic.label-container, .node.default .basic.label-container {
      rx: 8px; ry: 8px;
    }
    .classTitle, .classTitle span { font-weight: 700; }

    ${toneCSS}
    ${cycleCSS}

    .members-group p, .methods-group p { color: ${ts.punctuation} !important; }
    .members-group .tok-muted, .methods-group .tok-muted { color: ${ts.punctuation} !important; font-weight: 400; }
    .members-group .tok-name, .members-group .tok-field { color: ${ts.property} !important; }
    .methods-group .tok-method { color: ${ts.named} !important; }
    .methods-group .tok-param { color: ${ts.property} !important; }
    .members-group .tok-primitive { color: ${ts.primitive} !important; }
    .members-group .tok-named { color: ${ts.named} !important; }
  `;
}

export function mermaidConfig(isDark: boolean): MermaidConfig {
  const p = isDark ? dark : light;
  const { slate, sky, amber, fuchsia, violet } = p.tones;

  return {
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
    darkMode: isDark,
    fontFamily,
    themeCSS: themeCSS(p, isDark ? syntax.dark : syntax.light),
    themeVariables: {
      fontFamily,
      fontSize: "13.5px",
      background: "transparent",

      primaryColor: slate.fill,
      primaryBorderColor: slate.border,
      primaryTextColor: slate.text,
      secondaryColor: violet.fill,
      secondaryBorderColor: violet.border,
      secondaryTextColor: violet.text,
      tertiaryColor: p.canvas,
      tertiaryBorderColor: slate.border,
      tertiaryTextColor: p.text,

      textColor: p.text,
      lineColor: p.line,
      mainBkg: slate.fill,
      nodeBorder: slate.border,
      nodeTextColor: slate.text,
      clusterBkg: "transparent",
      clusterBorder: slate.border,
      titleColor: p.muted,
      edgeLabelBackground: p.canvas,

      actorBkg: sky.fill,
      actorBorder: sky.border,
      actorTextColor: sky.text,
      actorLineColor: slate.border,
      signalColor: p.line,
      signalTextColor: p.text,
      labelBoxBkgColor: fuchsia.fill,
      labelBoxBorderColor: fuchsia.border,
      labelTextColor: fuchsia.text,
      loopTextColor: p.muted,
      noteBkgColor: amber.fill,
      noteBorderColor: amber.border,
      noteTextColor: amber.text,
      activationBkgColor: slate.fill,
      activationBorderColor: sky.border,
      sequenceNumberColor: p.canvas,

      classText: violet.text,
    },
    flowchart: {
      curve: "basis",
      padding: 14,
      nodeSpacing: 34,
      rankSpacing: 46,
      htmlLabels: true,
      useMaxWidth: true,
    },
    sequence: {
      mirrorActors: false,
      width: 116,
      height: 46,
      actorMargin: 34,
      wrap: false,
      boxMargin: 12,
      boxTextMargin: 6,
      noteMargin: 12,
      messageMargin: 36,
      useMaxWidth: true,
    },
    class: {
      useMaxWidth: true,
    },
  };
}
