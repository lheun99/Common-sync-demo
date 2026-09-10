// 공통 자산 탐색기 사이트 전체를 서빙하는 서버.
// GET  /            → 탐색기 페이지 (정적 파일)
// GET  /api/assets  → asset-index.json을 매번 새로 읽어서 반환 (트리가 항상 최신)
// POST /ask         → claude -p (MCP로 색인 조회) 호출 → 답변 반환
import http from "http";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8787;
const PUBLIC_DIR = path.join(__dirname, "public");
const INDEX_PATH = path.join(__dirname, "..", "asset-index.json");

function loadAssetsWithSource() {
  const { assets } = JSON.parse(fs.readFileSync(INDEX_PATH, "utf-8"));
  return assets.map((a) => {
    const sourcePath = path.join(__dirname, "..", "..", a.path);
    let source;
    try {
      source = fs.readFileSync(sourcePath, "utf-8");
    } catch {
      source = "(소스 파일을 찾을 수 없습니다: " + a.path + ")";
    }
    return { ...a, source };
  });
}

const ANSWER_SCHEMA = JSON.stringify({
  type: "object",
  properties: {
    answer: { type: "string", description: "질문에 대한 한국어 답변, 3~4문장 이내" },
    relatedAssetNames: {
      type: "array",
      items: { type: "string" },
      description: "답변에서 언급한 공통 자산들의 정확한 이름 (색인의 name 필드와 동일하게). 없으면 빈 배열",
    },
  },
  required: ["answer", "relatedAssetNames"],
});

function askClaude(question) {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "claude",
      [
        "-p",
        question,
        "--permission-mode",
        "bypassPermissions",
        "--allowedTools",
        "mcp__common-asset-index__search_assets mcp__common-asset-index__get_asset_detail",
        "--json-schema",
        ANSWER_SCHEMA,
        "--output-format",
        "text",
      ],
      { cwd: __dirname }
    );

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d));
    proc.stderr.on("data", (d) => (stderr += d));
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `claude 프로세스가 코드 ${code}로 종료됨`));
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        resolve({ answer: stdout.trim(), relatedAssetNames: [] });
      }
    });
    proc.on("error", reject);
  });
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
    const html = fs.readFileSync(path.join(PUBLIC_DIR, "index.html"), "utf-8");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }

  if (req.method === "GET" && req.url === "/api/assets") {
    try {
      const assets = loadAssetsWithSource();
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(assets));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: String(err.message || err) }));
    }
    return;
  }

  if (req.method === "POST" && req.url === "/ask") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { question } = JSON.parse(body || "{}");
        if (!question || !question.trim()) {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ error: "질문을 입력해주세요." }));
          return;
        }
        console.log(`[질문] ${question}`);
        const result = await askClaude(question);
        console.log(`[답변] ${result.answer.slice(0, 80)}... (관련: ${result.relatedAssetNames.join(", ")})`);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error(err);
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: String(err.message || err) }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`공통 자산 탐색기 서버가 떴어요: http://localhost:${PORT}`);
});
