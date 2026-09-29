// Renderiza os troféus (ryo-ma/github-profile-trophy) com a paleta do perfil.
// Executado pelo workflow dentro de um clone fixado do repositório original.
// Uso: deno run --allow-net --allow-env --allow-read --allow-write trophy.ts USUARIO SAIDA.svg

import { GithubApiService } from "./src/Services/GithubApiService.ts";
import { Card } from "./src/card.ts";
import type { Theme } from "./src/theme.ts";

const [username, outputPath = "trophies.svg"] = Deno.args;
if (!username) {
  console.error("Uso: trophy.ts USUARIO SAIDA.svg");
  Deno.exit(1);
}

const theme: Theme = {
  BACKGROUND: "#262F56",
  TITLE: "#F1E7DA",
  ICON_CIRCLE: "#F1E7DA",
  TEXT: "#C7B7A3",
  LAUREL: "#D4A373",
  SECRET_RANK_1: "#D4A373",
  SECRET_RANK_2: "#9AA5D8",
  SECRET_RANK_3: "#F1E7DA",
  SECRET_RANK_TEXT: "#9AA5D8",
  NEXT_RANK_BAR: "#D4A373",
  S_RANK_BASE: "#D4A373",
  S_RANK_SHADOW: "#A87B4F",
  S_RANK_TEXT: "#251B17",
  A_RANK_BASE: "#9AA5D8",
  A_RANK_SHADOW: "#6D78AE",
  A_RANK_TEXT: "#1B2240",
  B_RANK_BASE: "#C7B7A3",
  B_RANK_SHADOW: "#9C8C78",
  B_RANK_TEXT: "#251B17",
  DEFAULT_RANK_BASE: "#5A6390",
  DEFAULT_RANK_SHADOW: "#3A4270",
  DEFAULT_RANK_TEXT: "#F1E7DA",
};

const info = await new GithubApiService().requestUserInfo(username);
// deno-lint-ignore no-explicit-any
if (!info || (info as any).totalCommits === undefined) {
  console.error("Falha ao buscar dados do usuário (token, usuário ou limite da API).");
  Deno.exit(2);
}

// titles, ranks, colunas (-1 = todas numa linha), linhas, tamanho, margens, sem fundo, sem moldura
const card = new Card([], [], -1, 1, 110, 12, 10, false, false);
// deno-lint-ignore no-explicit-any
const svg = card.render(info as any, theme).replaceAll('stroke="#e1e4e8"', 'stroke="#3A4470"');

const dir = outputPath.replace(/\/[^/]+$/, "");
if (dir && dir !== outputPath) await Deno.mkdir(dir, { recursive: true });
await Deno.writeTextFile(outputPath, svg);
console.log(`Troféus salvos em ${outputPath}`);
