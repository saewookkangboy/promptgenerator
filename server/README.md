# 프롬프트 가이드 수집 서버

주요 LLM 및 이미지/영상 생성 모델의 최신 프롬프트 가이드를 자동으로 수집하는 서버입니다.

## 기능

- 웹 스크래핑을 통한 프롬프트 가이드 자동 수집
- 매일 새벽 3시 자동 수집 (cron 스케줄러)
- RESTful API 제공
- CORS 지원

## 설치

```bash
npm install
```

## 실행

### 개발 모드
```bash
npm run server:dev
```

### 프로덕션 모드
```bash
npm run server
```

서버는 기본적으로 포트 3001에서 실행됩니다.

## API 엔드포인트

### Health Check
```
GET /health
```

### 가이드 수집 (모든 모델)
```
POST /api/guides/collect
```

### 특정 모델 가이드 수집
```
POST /api/guides/collect/:modelName
```

예: `POST /api/guides/collect/midjourney`

### 수집 상태 조회
```
GET /api/guides/status
```

## 지원 모델

### LLM
- OpenAI GPT-4 / GPT-3.5
- Claude 3 / Claude 3.5
- Gemini Pro / Ultra / Nano Banana Pro
- Llama 3 / Llama 3.1

### 이미지 생성
- Midjourney
- DALL-E 3
- Stable Diffusion

### 영상 생성
- Sora
- Veo 3

## 스케줄러

매일 새벽 3시 (KST)에 자동으로 모든 모델의 가이드를 수집합니다.

스케줄 변경: `server/scheduler/guideScheduler.js`의 `COLLECTION_SCHEDULE` 변수 수정

## 환경 변수

`.env` 파일 생성 (선택사항):

```
PORT=3001
```

## 클라이언트 연결

프론트엔드에서 서버에 연결하려면 `.env` 파일에 다음을 추가:

```
VITE_API_BASE_URL=http://localhost:3001
```

## 주의사항

- 일부 웹사이트는 봇 차단 정책이 있을 수 있습니다
- 요청 간 딜레이를 두어 서버 부하를 방지합니다
- 실제 운영 환경에서는 프록시나 VPN 사용을 고려하세요

