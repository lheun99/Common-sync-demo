# (사용 중단됨)

이 폴더의 정적 생성 방식(`generate.js`)은 `ask-server`로 통합됐습니다.

- 예전 방식: `node generate.js` 실행 → `index.html`이 그 시점 스냅샷으로 고정됨 (수동 갱신 필요)
- 지금 방식: `../ask-server`를 실행하면 `http://localhost:8787`에서 항상 최신 데이터로 트리+질문창을
  같이 제공합니다.

이 폴더는 삭제 예정이며, 참고용으로만 남아있습니다.
