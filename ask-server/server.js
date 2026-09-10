// 탐색기 패널 웹페이지의 질문창이 부르는 작은 서버.
// 브라우저 → 이 서버 → claude -p (MCP로 색인 조회) → 답변을 다시 브라우저로.
import http from "http";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8787;

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
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || `claude 프로세스가 코드 ${code}로 종료됨`));
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
        const answer = await askClaude(question);
        console.log(`[답변] ${answer.slice(0, 80)}...`);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ answer }));
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
  console.log(`질문 서버가 떴어요: http://localhost:${PORT} (탐색기 패널에서 이 서버를 불러요)`);
});
