// Gera os assets dinâmicos do perfil (sem dependências externas):
//   - profile/activity.svg       gráfico de contribuições dos últimos 31 dias
//   - profile/projects/*.svg     cards de projetos a partir de projects.json
//   - README.md                  bloco entre <!-- PROJETOS:INICIO --> e <!-- PROJETOS:FIM -->
//
// Uso:  node .github/scripts/build-profile.mjs            (precisa de GITHUB_TOKEN)
//       node .github/scripts/build-profile.mjs --mock     (dados fictícios, só para pré-visualizar)

import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const OUT = process.env.OUT_DIR || path.join(ROOT, "profile");
const USER = process.env.PROFILE_USER || process.env.GITHUB_REPOSITORY_OWNER || "DavidHalan";
const TOKEN = process.env.GITHUB_TOKEN;
const MOCK = process.argv.includes("--mock");
const DAYS = 31;
const TZ = process.env.PROFILE_TZ || "America/Sao_Paulo";
// "hoje" no fuso do perfil (AAAA-MM-DD), para o gráfico não mostrar um dia que ainda não começou
const TODAY = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

const C = {
  navy: "#262F56",
  coffee: "#251B17",
  cream: "#F1E7DA",
  latte: "#C7B7A3",
  caramel: "#D4A373",
  mist: "#9AA5D8",
  line: "#3A4470",
};
const SANS = "'Segoe UI', Ubuntu, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace";

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const warn = (msg) => console.log(`::warning::${msg}`);

function wrap(text, maxChars, maxLines) {
  const words = String(text ?? "").trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxChars) cur = next;
    else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last.length > maxChars - 1) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last.replace(/[\s.,;:]+$/, "")}…`;
    return kept;
  }
  return lines;
}

const clip = (s, n) => (String(s).length > n ? `${String(s).slice(0, n - 1).trimEnd()}…` : String(s));

/* ------------------------------------------------------------------ */
/* Cards de projetos                                                   */
/* ------------------------------------------------------------------ */

function projectCard(p, i) {
  const W = 480;
  const H = 200;
  const num = String(i + 1).padStart(2, "0");
  const title = clip(p.nome || `Projeto ${num}`, 30);
  const desc = wrap(p.descricao, 52, 2);
  const status = clip(p.status || "", 18);
  const tags = (p.stack || []).slice(0, 4).map((t) => clip(t, 16));

  const charW = 7.25; // largura média do monoespaçado em 12px
  let x = 28;
  const tagEls = tags
    .map((t) => {
      const w = Math.round(t.length * charW + 22);
      const el =
        `<g transform="translate(${x} 150)">` +
        `<rect width="${w}" height="24" rx="12" fill="${C.cream}" fill-opacity=".06" stroke="${C.cream}" stroke-opacity=".16"/>` +
        `<text x="${w / 2}" y="16" text-anchor="middle" class="mono tag">${esc(t)}</text></g>`;
      x += w + 8;
      return el;
    })
    .join("");

  const sw = Math.round(status.length * 6.9 + 30);
  const statusEl = status
    ? `<g transform="translate(${W - 28 - sw} 26)">` +
      `<rect width="${sw}" height="22" rx="11" fill="none" stroke="${C.mist}" stroke-opacity=".7"/>` +
      `<circle cx="12" cy="11" r="3" fill="${C.mist}"/>` +
      `<text x="${sw / 2 + 5}" y="15" text-anchor="middle" class="mono status">${esc(status)}</text></g>`
    : "";

  const descEls = desc
    .map((l, k) => `<text x="28" y="${110 + k * 21}" class="sans desc">${esc(l)}</text>`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t">
<title id="t">${esc(title)} — ${esc(p.descricao)}</title>
<style>
.sans{font-family:${SANS}}.mono{font-family:${MONO}}
.num{font-size:13px;font-weight:600;fill:${C.caramel};letter-spacing:.5px}
.kind{font-size:13px;font-weight:400;fill:${C.latte}}
.title{font-size:24px;font-weight:700;fill:${C.cream}}
.desc{font-size:14.5px;fill:${C.latte}}
.tag{font-size:12px;fill:${C.cream}}
.status{font-size:11.5px;fill:${C.mist}}
</style>
<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.coffee}"/><stop offset="1" stop-color="${C.navy}"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" rx="16" fill="url(#g)"/>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="15.5" fill="none" stroke="${C.cream}" stroke-opacity=".08"/>
<text x="28" y="42" class="mono num">${num}<tspan class="kind" dx="8">/ projeto</tspan></text>
${statusEl}
<text x="28" y="80" class="sans title">${esc(title)}</text>
${descEls}
${tagEls}
<g transform="translate(${W - 44} ${H - 44})" fill="none" stroke="${C.caramel}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<path d="M3 13 13 3M5 3h8v8"/>
</g>
</svg>
`;
}

async function buildProjects() {
  const file = path.join(ROOT, "projects.json");
  const data = JSON.parse(await readFile(file, "utf8"));
  const projects = Array.isArray(data.projetos) ? data.projetos : [];
  const dir = path.join(OUT, "projects");
  await mkdir(dir, { recursive: true });

  const names = [];
  for (const [i, p] of projects.entries()) {
    const name = `projeto-${String(i + 1).padStart(2, "0")}.svg`;
    names.push(name);
    await writeFile(path.join(dir, name), projectCard(p, i), "utf8");
  }
  // remove cards de projetos que saíram da lista
  for (const f of await readdir(dir)) {
    if (/^projeto-\d+\.svg$/.test(f) && !names.includes(f)) await unlink(path.join(dir, f));
  }

  const readmePath = path.join(ROOT, "README.md");
  const readme = await readFile(readmePath, "utf8").catch(() => null);
  const START = "<!-- PROJETOS:INICIO -->";
  const END = "<!-- PROJETOS:FIM -->";
  if (!readme || !readme.includes(START) || !readme.includes(END)) {
    warn("Marcadores de projetos não encontrados no README.md — seção não atualizada.");
    return projects.length;
  }
  const rel = path.relative(ROOT, dir).split(path.sep).join("/");
  const links = projects
    .map((p, i) => {
      const href = p.link || `https://github.com/${USER}`;
      const alt = `${p.nome || `Projeto ${i + 1}`}: ${p.descricao || ""}`;
      return `  <a href="${esc(href)}"><img src="./${rel}/${names[i]}" width="49%" alt="${esc(alt)}"></a>`;
    })
    .join("\n");
  const block = `${START}\n<p align="center">\n${links}\n</p>\n${END}`;
  const re = new RegExp(`${START}[\\s\\S]*?${END}`);
  const updated = readme.replace(re, block);
  if (updated !== readme) await writeFile(readmePath, updated, "utf8");
  return projects.length;
}

/* ------------------------------------------------------------------ */
/* Gráfico de atividade                                                */
/* ------------------------------------------------------------------ */

async function fetchDays() {
  if (MOCK) {
    const out = [];
    const today = new Date(`${TODAY}T12:00:00Z`);
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - i);
      const v = Math.max(0, Math.round(4 + 4 * Math.sin(i / 3) + (i % 5) - 2));
      out.push({ date: d.toISOString().slice(0, 10), contributionCount: v });
    }
    return out;
  }
  const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{weeks{contributionDays{date contributionCount}}}}}}`;
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": `${USER}-profile-readme`,
    },
    body: JSON.stringify({ query, variables: { login: USER } }),
  });
  if (!res.ok) throw new Error(`GraphQL respondeu HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
  const weeks = json.data?.user?.contributionsCollection?.contributionCalendar?.weeks;
  if (!weeks) throw new Error("Resposta sem contributionCalendar");
  return weeks
    .flatMap((w) => w.contributionDays)
    .filter((d) => d.date <= TODAY)
    .slice(-DAYS);
}

// Interpolação cúbica monotônica (Fritsch–Carlson): curva suave sem ultrapassar os dados
function monotonePath(pts) {
  const n = pts.length;
  if (n < 2) return `M${pts[0].x} ${pts[0].y}`;
  const dx = [];
  const m = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1].x - pts[i].x);
    m.push((pts[i + 1].y - pts[i].y) / dx[i]);
  }
  const t = [m[0]];
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
  t.push(m[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }
  const f = (v) => +v.toFixed(2);
  let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${f(pts[i].x + h)} ${f(pts[i].y + t[i] * h)} ${f(pts[i + 1].x - h)} ${f(pts[i + 1].y - t[i + 1] * h)} ${f(pts[i + 1].x)} ${f(pts[i + 1].y)}`;
  }
  return d;
}

function niceMax(v) {
  // teto do eixo Y com 4 divisões inteiras e "redondas" (ex.: 10 -> 12, 37 -> 40)
  const raw = Math.max(1, Math.ceil(v / 4));
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 3, 4, 5, 6, 8, 10].map((s) => s * pow).find((s) => s >= raw);
  return step * 4;
}

function activitySvg(days) {
  const W = 1000;
  const H = 320;
  const pl = 58;
  const pr = 30;
  const pt = 84;
  const pb = 52;
  const cw = W - pl - pr;
  const ch = H - pt - pb;
  const counts = days.map((d) => d.contributionCount);
  const total = counts.reduce((a, b) => a + b, 0);
  const max = niceMax(Math.max(...counts));
  const step = cw / (days.length - 1);
  const pts = days.map((d, i) => ({
    x: pl + i * step,
    y: pt + ch - (d.contributionCount / max) * ch,
    v: d.contributionCount,
    date: d.date,
  }));
  const line = monotonePath(pts);
  const area = `${line}L${pts.at(-1).x.toFixed(2)} ${pt + ch}L${pl} ${pt + ch}Z`;

  const grid = [0, 1, 2, 3, 4]
    .map((k) => {
      const y = pt + ch - (k / 4) * ch;
      return (
        `<line x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}" stroke="${C.line}" stroke-dasharray="${k === 0 ? "0" : "3 6"}"/>` +
        `<text x="${pl - 12}" y="${y + 4}" text-anchor="end" class="mono axis">${(max / 4) * k}</text>`
      );
    })
    .join("");

  const fmt = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  const xLabels = pts
    .map((p, i) =>
      (pts.length - 1 - i) % 3 === 0
        ? `<text x="${p.x.toFixed(2)}" y="${pt + ch + 26}" text-anchor="middle" class="mono axis">${fmt(p.date)}</text>`
        : "",
    )
    .join("");

  const peak = pts.reduce((a, b) => (b.v > a.v ? b : a), pts[0]);
  const dots = pts
    .map(
      (p) =>
        `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${p === peak && p.v > 0 ? 5 : 3}" fill="${C.navy}" stroke="${p === peak && p.v > 0 ? C.cream : C.caramel}" stroke-width="2"><title>${fmt(p.date)}: ${p.v}</title></circle>`,
    )
    .join("");
  const peakLabel =
    peak.v > 0
      ? `<text x="${peak.x.toFixed(2)}" y="${(peak.y - 14).toFixed(2)}" text-anchor="middle" class="mono peak">${peak.v}</text>`
      : "";
  const empty =
    total === 0
      ? `<text x="${pl + cw / 2}" y="${pt + ch / 2}" text-anchor="middle" class="sans empty">Nenhuma contribuição pública nos últimos ${DAYS} dias</text>`
      : "";

  const first = fmt(days[0].date);
  const last = fmt(days.at(-1).date);
  const plural = total === 1 ? "contribuição" : "contribuições";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t">
<title id="t">Atividade de contribuições de ${esc(USER)}: ${total} ${plural} entre ${first} e ${last}</title>
<style>
.sans{font-family:${SANS}}.mono{font-family:${MONO}}
.h{font-size:19px;font-weight:700;fill:${C.cream}}
.sub{font-size:12.5px;fill:${C.latte}}
.axis{font-size:11px;fill:${C.latte};fill-opacity:.8}
.peak{font-size:12px;font-weight:700;fill:${C.cream}}
.empty{font-size:14px;fill:${C.latte}}
.ln{stroke-dasharray:1;animation:draw 1.8s ease-out both}
@keyframes draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@media (prefers-reduced-motion:reduce){.ln{animation:none}}
</style>
<defs>
<linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.caramel}" stop-opacity=".38"/><stop offset="1" stop-color="${C.caramel}" stop-opacity="0"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" rx="14" fill="${C.navy}"/>
<text x="30" y="44" class="sans h">Atividade de contribuições</text>
<text x="30" y="66" class="mono sub">${first} → ${last}</text>
<text x="${W - 30}" y="44" text-anchor="end" class="sans h">${total}</text>
<text x="${W - 30}" y="66" text-anchor="end" class="mono sub">${plural} em ${DAYS} dias</text>
${grid}
<path d="${area}" fill="url(#a)"/>
<path class="ln" d="${line}" pathLength="1" fill="none" stroke="${C.caramel}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
${dots}
${peakLabel}
${xLabels}
${empty}
</svg>
`;
}

async function buildActivity() {
  if (!TOKEN && !MOCK) {
    warn("GITHUB_TOKEN ausente — gráfico de atividade não foi gerado.");
    return false;
  }
  const days = await fetchDays();
  if (!days.length) throw new Error("Nenhum dia retornado pelo calendário de contribuições");
  await mkdir(OUT, { recursive: true });
  await writeFile(path.join(OUT, "activity.svg"), activitySvg(days), "utf8");
  return true;
}

/* ------------------------------------------------------------------ */

let failed = false;
try {
  const n = await buildProjects();
  console.log(`Cards de projetos: ${n}`);
} catch (e) {
  failed = true;
  console.log(`::error::Falha ao gerar cards de projetos: ${e.message}`);
}
try {
  if (await buildActivity()) console.log("Gráfico de atividade: ok");
} catch (e) {
  failed = true;
  console.log(`::error::Falha ao gerar gráfico de atividade: ${e.message}`);
}
process.exitCode = failed ? 1 : 0;
