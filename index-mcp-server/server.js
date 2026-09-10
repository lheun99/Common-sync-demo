import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = path.join(__dirname, "..", "asset-index.json");

function loadAssets() {
  const raw = fs.readFileSync(INDEX_PATH, "utf-8");
  return JSON.parse(raw).assets;
}

const server = new McpServer({
  name: "index-mcp-server",
  version: "1.0.0",
});

server.tool(
  "search_assets",
  "공통팀이 만든 프론트엔드 컴포넌트/백엔드 모듈 중 설명이나 이름이 비슷한 것을 찾는다. " +
    "새 화면이나 기능을 만들기 전에 이미 존재하는지 확인할 때 반드시 이 도구로 먼저 확인한다.",
  {
    query: z
      .string()
      .describe("찾고 싶은 기능/컴포넌트에 대한 설명이나 이름 (예: '페이지 넘기기', 'Pagination', '공통 예외 처리')"),
  },
  async ({ query }) => {
    const assets = loadAssets();
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = assets.filter((a) => {
      const haystack = `${a.name} ${a.purpose}`.toLowerCase();
      return words.some((w) => haystack.includes(w));
    });

    if (matches.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `"${query}"와(과) 일치하는 공통 자산을 찾지 못했습니다. 신규로 개발해야 할 수 있습니다.`,
          },
        ],
      };
    }

    const summary = matches
      .map((a) => `- [${a.type}] ${a.name}: ${a.purpose} (경로: ${a.path})`)
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text: `다음 공통 자산이 이미 존재합니다 — 신규 개발 전에 재사용을 검토하세요:\n${summary}`,
        },
      ],
    };
  }
);

server.tool(
  "get_asset_detail",
  "공통 자산 하나의 상세 정보(props 또는 usage, 경로, 추가된 커밋/시각)를 조회한다.",
  {
    name: z.string().describe("자산 이름 (예: Pagination, ApiResponse)"),
  },
  async ({ name }) => {
    const assets = loadAssets();
    const asset = assets.find((a) => a.name.toLowerCase() === name.toLowerCase());

    if (!asset) {
      return {
        content: [{ type: "text", text: `"${name}"이라는 이름의 공통 자산을 찾을 수 없습니다.` }],
      };
    }

    return { content: [{ type: "text", text: JSON.stringify(asset, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
