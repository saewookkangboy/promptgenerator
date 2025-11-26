# 프론트엔드 API 연결 설정 가이드

Railway에 백엔드를 배포한 후, 프론트엔드를 연결하는 방법입니다.

## 🔗 API URL 설정

### 방법 1: 환경 변수 사용 (권장)

#### 개발 환경 (`.env.local`)
```env
VITE_API_BASE_URL=http://localhost:3001
```

#### 프로덕션 환경 (Vercel 등)
1. Vercel 대시보드 → 프로젝트 → "Settings" → "Environment Variables"
2. 다음 변수 추가:
   ```
   VITE_API_BASE_URL=https://your-railway-app.up.railway.app
   ```

### 방법 2: vite.config.ts에서 설정

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
      process.env.VITE_API_BASE_URL || 
      (import.meta.env.MODE === 'production' 
        ? 'https://your-railway-app.up.railway.app'
        : 'http://localhost:3001')
    )
  }
})
```

### 방법 3: src/utils/api.ts에서 직접 설정

```typescript
// 개발 환경에서는 localhost, 프로덕션에서는 Railway URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.MODE === 'production'
    ? 'https://your-railway-app.up.railway.app'
    : 'http://localhost:3001')
```

---

## ✅ 연결 확인

### 1. 브라우저 콘솔 확인
프론트엔드를 실행하고 브라우저 개발자 도구 콘솔에서:
```javascript
console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL)
```

### 2. 네트워크 탭 확인
1. 브라우저 개발자 도구 → "Network" 탭
2. 프롬프트 생성 시도
3. API 요청이 올바른 URL로 전송되는지 확인

### 3. CORS 오류 확인
CORS 오류가 발생하면:
1. Railway 대시보드에서 `FRONTEND_URL` 환경 변수 확인
2. 프론트엔드 도메인이 정확히 설정되었는지 확인
3. 서버 재시작

---

## 🔄 배포 워크플로우

### 1. 백엔드 배포 (Railway)
```bash
# 코드 푸시 시 자동 배포
git push origin main
```

### 2. 프론트엔드 배포 (Vercel)
```bash
# 환경 변수 설정 후
git push origin main
# Vercel이 자동 배포
```

### 3. 환경 변수 동기화
백엔드 URL이 변경되면:
1. Vercel에서 `VITE_API_BASE_URL` 업데이트
2. 프론트엔드 재배포

---

## 🧪 테스트

### 로컬에서 테스트
```bash
# 백엔드 실행
npm run server

# 프론트엔드 실행 (다른 터미널)
npm run dev
```

### 프로덕션 테스트
1. Railway Health Check: `https://your-app.up.railway.app/health`
2. 프론트엔드에서 프롬프트 생성 테스트
3. 번역 기능 테스트

---

## ⚠️ 주의사항

1. **CORS 설정**: Railway에서 `FRONTEND_URL`에 프론트엔드 도메인 추가 필수
2. **HTTPS**: 프로덕션에서는 반드시 HTTPS 사용
3. **환경 변수**: API 키는 절대 프론트엔드 코드에 포함하지 않음
4. **캐싱**: 환경 변수 변경 후 브라우저 캐시 클리어

---

## 🔍 문제 해결

### API 요청이 실패함
1. Railway URL이 올바른지 확인
2. Health check 엔드포인트 테스트
3. 브라우저 콘솔에서 에러 확인

### CORS 오류
1. Railway `FRONTEND_URL` 환경 변수 확인
2. 프론트엔드 도메인이 정확히 일치하는지 확인
3. 서버 재시작

### 환경 변수가 적용되지 않음
1. Vite는 환경 변수 변경 시 재시작 필요
2. 빌드 시 환경 변수 포함 확인
3. 브라우저 캐시 클리어

