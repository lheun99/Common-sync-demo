// asset-index.json을 읽어서, IDE 옆에 붙는 "탐색기 패널"을 흉내낸 index.html을 생성한다.
// 실행: node generate.js  (커밋이 생겨 색인이 갱신될 때마다 다시 실행하면 최신 화면이 됨)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = path.join(__dirname, "..", "asset-index.json");
const OUT_PATH = path.join(__dirname, "index.html");

const { assets: rawAssets } = JSON.parse(fs.readFileSync(INDEX_PATH, "utf-8"));

// 각 자산의 실제 소스 코드를 읽어서 붙인다 (common-repo는 common-sync-demo의 형제 폴더)
const assets = rawAssets.map((a) => {
  const sourcePath = path.join(__dirname, "..", "..", a.path);
  let source;
  try {
    source = fs.readFileSync(sourcePath, "utf-8");
  } catch {
    source = "(소스 파일을 찾을 수 없습니다: " + a.path + ")";
  }
  return { ...a, source };
});

const TYPE_LABEL = {
  "frontend-component": "프론트엔드 컴포넌트",
  "backend-module": "백엔드 모듈",
};

const grouped = assets.reduce((acc, a) => {
  (acc[a.type] ??= []).push(a);
  return acc;
}, {});

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const treeHtml = Object.entries(grouped)
  .map(([type, items]) => {
    const rows = items
      .map(
        (a) => `
      <li class="asset" data-idx="${assets.indexOf(a)}">
        <span class="dot ${type}"></span>
        <span class="name">${escapeHtml(a.name)}</span>
        <span class="purpose">${escapeHtml(a.purpose)}</span>
      </li>`
      )
      .join("");
    return `
    <div class="group">
      <div class="group-head">${TYPE_LABEL[type] ?? type} <span class="count">${items.length}</span></div>
      <ul class="asset-list">${rows}</ul>
    </div>`;
  })
  .join("");

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>공통 자산 탐색기 (목업)</title>
<style>
  :root{
    --bg:#F4F6F5; --panel:#FFFFFF; --edge:#CBD8D5; --ink:#20303D; --soft:#5C6B73;
    --fe:#C97A1F; --be:#3F6FB0; --accent:#1F8A5F;
  }
  @media (prefers-color-scheme: dark){
    :root{ --bg:#141C22; --panel:#1D2830; --edge:#31424C; --ink:#EAF1F0; --soft:#9FB2B9; --fe:#E7A759; --be:#7FA8DE; --accent:#5FC498; }
  }
  *{box-sizing:border-box;}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:'Segoe UI',sans-serif;display:flex;height:100vh;}
  .panel{width:300px;border-right:1px solid var(--edge);background:var(--panel);display:flex;flex-direction:column;flex-shrink:0;}
  .panel-title{padding:12px 14px;font-size:12px;font-weight:700;letter-spacing:.04em;color:var(--soft);
    text-transform:uppercase;border-bottom:1px solid var(--edge);}
  .tree{overflow-y:auto;flex:1;padding:6px 0;}
  .group-head{padding:8px 14px 4px;font-size:11px;font-weight:700;color:var(--soft);display:flex;gap:6px;align-items:center;}
  .group-head .count{background:var(--edge);border-radius:999px;padding:0 6px;font-size:10px;}
  .asset-list{list-style:none;margin:0;padding:0;}
  .asset{display:flex;align-items:center;gap:8px;padding:6px 14px 6px 24px;cursor:pointer;font-size:13px;}
  .asset:hover{background:var(--bg);}
  .asset.active{background:var(--edge);}
  .dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
  .dot.frontend-component{background:var(--fe);}
  .dot.backend-module{background:var(--be);}
  .name{font-weight:600;flex-shrink:0;}
  .purpose{color:var(--soft);font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .detail{flex:1;padding:28px 32px;overflow-y:auto;}
  .detail h1{font-size:20px;margin:0 0 4px;}
  .detail .path{font-family:monospace;font-size:12.5px;color:var(--soft);margin-bottom:18px;}
  .detail .purpose-full{font-size:14.5px;line-height:1.7;margin-bottom:20px;}
  .field{margin-bottom:16px;}
  .field .label{font-size:11px;font-weight:700;color:var(--soft);text-transform:uppercase;letter-spacing:.03em;margin-bottom:6px;}
  .chip-row{display:flex;gap:6px;flex-wrap:wrap;}
  .chip{background:var(--panel);border:1px solid var(--edge);border-radius:6px;padding:4px 10px;font-family:monospace;font-size:12px;}
  .meta{font-size:12.5px;color:var(--soft);}
  .empty{padding:40px;color:var(--soft);text-align:center;}
  .code-block{
    background:var(--panel);border:1px solid var(--edge);border-radius:8px;
    padding:14px 16px;overflow-x:auto;font-family:'Consolas','Menlo',monospace;
    font-size:12.5px;line-height:1.6;white-space:pre;
  }
</style>
</head>
<body>
  <div class="panel">
    <div class="panel-title">공통 자산 탐색기</div>
    <div class="tree">${treeHtml}</div>
  </div>
  <div class="detail" id="detail">
    <div class="empty">왼쪽에서 항목을 클릭하면 상세 정보가 여기 표시됩니다.</div>
  </div>

<script>
  const assets = ${JSON.stringify(assets, null, 2)};

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  document.querySelectorAll(".asset").forEach((el) => {
    el.addEventListener("click", () => {
      document.querySelectorAll(".asset").forEach((e) => e.classList.remove("active"));
      el.classList.add("active");
      const idx = Number(el.dataset.idx);
      render(assets[idx]);
    });
  });

  function render(a) {
    const listField = a.type === "frontend-component"
      ? { label: "Props", items: a.props || [] }
      : { label: "Usage", items: a.usage || [] };

    document.getElementById("detail").innerHTML = \`
      <h1>\${a.name}</h1>
      <div class="path">\${a.path}</div>
      <div class="purpose-full">\${a.purpose}</div>
      <div class="field">
        <div class="label">\${listField.label}</div>
        <div class="chip-row">\${listField.items.map(p => \`<span class="chip">\${p}</span>\`).join("") || "<span class=\\"meta\\">없음</span>"}</div>
      </div>
      <div class="field">
        <div class="label">추가된 커밋</div>
        <div class="meta">\${a.addedInCommit} · \${a.addedAt}</div>
      </div>
      <div class="field">
        <div class="label">소스 코드</div>
        <div class="code-block">\${escapeHtml(a.source)}</div>
      </div>
    \`;
  }
</script>
</body>
</html>
`;

fs.writeFileSync(OUT_PATH, html, "utf-8");
console.log(`생성 완료: ${OUT_PATH} (자산 ${assets.length}개 반영)`);
