# 서버 설정 가이드

프롬프트 가이드 수집 서버를 실행하는 방법입니다.

## 문제 해결: "Failed to fetch" 오류

이 오류는 일반적으로 서버가 실행되지 않았을 때 발생합니다.

### 해결 방법

1. **서버 실행 확인**
   ```bash
   # 터미널에서 서버 디렉토리로 이동
   cd /Users/chunghyo/prompt-generator
   
   # 서버 실행 (개발 모드)
   npm run server:dev
   
   # 또는 프로덕션 모드
   npm run server
   ```

2. **서버가 정상 실행되었는지 확인**
   - 터미널에 다음과 같은 메시지가 표시되어야 합니다:
     ```
     🚀 프롬프트 가이드 수집 서버가 포트 3001에서 실행 중입니다
     📅 가이드 수집 스케줄러 초기화...
     ```

3. **브라우저에서 서버 확인**
   - `http://localhost:3001/health` 접속
   - `{"status":"ok","timestamp":"..."}` 응답이 와야 합니다

4. **환경 변수 확인**
   - `.env` 파일이 있다면 `VITE_API_BASE_URL` 확인
   - 기본값: `http://localhost:3001`

## 서버 실행 방법

### 방법 1: 개발 모드 (권장)
```bash
npm run server:dev
```
- 파일 변경 시 자동 재시작
- 상세한 에러 메시지

### 방법 2: 프로덕션 모드
```bash
npm run server
```

### 방법 3: 별도 터미널에서 실행
```bash
# 새 터미널 창 열기
cd /Users/chunghyo/prompt-generator
node server/index.js
```

## 포트 변경

기본 포트는 3001입니다. 변경하려면:

1. 환경 변수 설정:
   ```bash
   PORT=3002 npm run server
   ```

2. 또는 `.env` 파일 생성:
   ```
   PORT=3002
   VITE_API_BASE_URL=http://localhost:3002
   ```

## 문제 해결 체크리스트

- [ ] 서버가 실행 중인가? (`npm run server:dev`)
- [ ] 포트 3001이 사용 가능한가?
- [ ] `http://localhost:3001/health` 접속 시 응답이 오는가?
- [ ] 브라우저 콘솔에 에러 메시지가 있는가?
- [ ] 방화벽이 포트를 차단하지 않는가?

## 로그 확인

서버 실행 시 터미널에서 다음 정보를 확인할 수 있습니다:
- 수집 요청 받음
- 각 모델별 수집 진행 상황
- 성공/실패 결과
- 에러 메시지

