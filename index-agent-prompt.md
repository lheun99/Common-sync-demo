# 색인 자동 갱신 지시서 (index-agent-prompt)

> 이 문서는 사람이 아니라 `watch-and-update` 스크립트가 커밋 직후 자동으로 호출하는 AI에게 주는
> 지시서다. 사람이 검토하기 전에 실행되므로, "확실한 것만 반영하고 애매하면 로그에 남긴다"는 원칙을
> 지킨다.
>
> 공통팀은 프론트엔드 컴포넌트뿐 아니라 백엔드 공통 모듈도 만든다. 이 지시서는 둘 다 다룬다.

## 입력으로 주어지는 것

- `asset-index.json` — 지금까지 쌓인 색인 (현재 상태)
- 방금 만들어진 커밋의 diff (어떤 파일이 새로 생겼는지/바뀌었는지)
- 커밋 해시, 커밋 메시지, 커밋 시각

## 자산 종류 판별

> **경로 표기 주의**: diff에 나오는 파일 경로는 `common-repo` 저장소 **내부 기준**이라
> `common-repo/` 접두사가 없다 (예: `backend/PageRequest.java`). 반면 `asset-index.json`에
> 저장하는 `path` 필드는 항상 `common-repo/`를 붙인 전체 경로로 적는다 (예:
> `common-repo/backend/PageRequest.java`). 아래 판별 기준은 diff 경로(접두사 없음) 기준이다.

diff에 새로 추가된 파일이 다음 중 어디에 해당하는지 먼저 판별한다.

| 종류 | diff상 경로 패턴 (접두사 없음) | index에 저장할 path | 예 |
|---|---|---|---|
| `frontend-component` | `components/*.tsx` | `common-repo/components/*.tsx` | Button, Pagination |
| `backend-module` | `backend/*.java` | `common-repo/backend/*.java` | ApiResponse, GlobalExceptionHandler |

둘 다 아닌 파일(설정 파일, 테스트 등)은 색인 대상이 아니다 — 무시한다.

## 해야 할 일

1. 새로 추가된 자산마다 종류에 맞게 코드에서 그대로 추출한다 (추측 금지):

   **frontend-component인 경우**
   - `name`: 컴포넌트 함수/export 이름
   - `path`: 저장소 기준 상대 경로
   - `props`: interface/type에 정의된 prop 이름 목록
   - `purpose`: 파일 상단 주석이 있으면 그대로 사용, 없으면 props 구성으로 미루어 한 줄 요약 +
     ` (AI 추론)`
   - `detail`: 코드 안의 **모든** 주석(문서화 주석, prop별 인라인 설명, 사용 예시, 주의사항 등)을
     빠짐없이 모아 정리한 상세 설명. 여러 문장이어도 된다 — 개발자가 실제로 적어둔 내용만 담고,
     없는 내용을 지어내지 않는다. `purpose` 한 줄 이상으로 코드에 적힌 게 없으면 `null`로 둔다.

   **backend-module인 경우**
   - `name`: public 클래스 이름
   - `path`: 저장소 기준 상대 경로
   - `usage`: 이 클래스를 다른 코드에서 어떻게 쓰는지 (public 메서드/생성자 시그니처 그대로, 최대 3개)
   - `purpose`: 클래스 상단 주석(Javadoc)이 있으면 그대로 사용, 없으면 클래스명·메서드 구성으로
     미루어 한 줄 요약 + ` (AI 추론)`
   - `detail`: Javadoc의 설명 본문, `@param`/`@return`/`@throws`, 메서드별 인라인 주석, 예시 코드,
     "주의"·"단" 같은 개발자의 당부까지 빠짐없이 모아 정리한 상세 설명. 개발자가 실제로 적어둔
     내용만 담고, 코드에 그 이상의 설명이 없으면 `null`로 둔다.

2. `asset-index.json`의 `assets` 배열에 새 항목을 추가한다. 이때:
   - `type`: 위 표의 값 (`frontend-component` 또는 `backend-module`)
   - `addedInCommit`: 커밋 해시 (앞 7자리)
   - `addedAt`: 커밋 시각(ISO 8601)
   - 기존 항목은 diff에서 실제로 바뀌지 않았다면 절대 건드리지 않는다
3. 이미 존재하는 자산이 diff에서 확장된 경우(예: prop 추가, 메서드 추가)에만 해당 항목을 갱신한다.
   새 항목으로 중복 추가하지 않는다.
4. `asset-index.json`을 갱신된 내용으로 덮어쓴다. JSON 외의 텍스트(설명, 마크다운 코드펜스 등)는
   파일에 남기지 않는다.
5. `logs/automation.log`에 한 줄을 추가한다. 형식:
   `[ISO시각] commit <해시> → index에 <자산명>(<종류>) 추가함 (사람 개입 없음)`

## 하지 말아야 할 것

- 새 자산인지 애매하면(예: 리팩토링으로 파일만 이동한 경우) 색인에 추가하지 말고, 대신
  `logs/automation.log`에 `[ISO시각] commit <해시> → 판단 보류: <이유>` 로 남긴다.
- `common-repo/` 안의 소스 코드는 절대 수정하지 않는다. 이 지시서는 색인 갱신 전용이다.
- 사람에게 승인을 구하는 질문을 하지 않는다 (이 프로세스는 무인 실행이 전제다).
