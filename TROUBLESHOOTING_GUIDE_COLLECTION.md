# 가이드 수집 "Failed to fetch" 오류 해결 가이드

## 🔍 오류 원인 진단

"Failed to fetch" 오류는 주로 다음 원인으로 발생합니다:

1. **API 서버 미실행** - Railway 서버가 실행되지 않음
2. **CORS 설정 문제** - Railway의 `FRONTEND_URL` 환경 변수 미설정
3. **API URL 설정 문제** - Vercel의 `VITE_API_BASE_URL` 환경 변수 미설정

---

## ✅ 해결 방법

### 1. Railway 서버 상태 확인

Railway 대시보드에서:
1. 프로젝트 선택
2. "Deployments" 탭 확인
3. 최신 배포가 "Active" 상태인지 확인
4. "View Logs"에서 서버가 정상 실행 중인지 확인

**확인 사항:**
- 서버가 `crashed` 상태가 아닌지
- 로그에 "Server running on port..." 메시지가 있는지
- 에러 로그가 없는지

---

### 2. Railway 환경 변수 확인

Railway 대시보드 → 프로젝트 → "Variables" 탭에서 확인:

#### 필수 환경 변수
- ✅ `FRONTEND_URL` - Vercel 프론트엔드 도메인
  - 예: `https://your-app.vercel.app`
  - 여러 도메인은 쉼표로 구분: `https://domain1.com,https://domain2.com`

#### 기타 환경 변수
- `GEMINI_API_KEY` - Gemini API 키
- `GEMINI_MODEL` - 모델 이름 (기본값: `gemini-2.5-flash`)
- `NODE_ENV=production`
- `DATABASE_URL` - PostgreSQL 연결 문자열 (있는 경우)

**중요:** `FRONTEND_URL`이 설정되지 않으면 프로덕션 환경에서 CORS 오류가 발생합니다.

---

### 3. Vercel 환경 변수 확인

Vercel 대시보드 → 프로젝트 → "Settings" → "Environment Variables"에서 확인:

#### 필수 환경 변수
- ✅ `VITE_API_BASE_URL` - Railway 백엔드 URL
  - 예: `https://promptgenerator-production.up.railway.app`

**중요:** 이 변수는 **Production**, **Preview**, **Development** 모두에 설정해야 합니다.

---

### 4. 환경 변수 설정 후 재배포

환경 변수를 변경한 후:

#### Railway
- 자동으로 재배포됩니다 (변경 사항 감지)
- 또는 수동으로 "Redeploy" 클릭

#### Vercel
- 자동으로 재배포됩니다
- 또는 "Deployments" → 최신 배포 → "Redeploy" 클릭

---

## 🧪 테스트 방법

### 1. Railway 서버 Health Check
```bash
curl https://promptgenerator-production.up.railway.app/health
```

예상 응답:
```json
{
  "status": "ok",
  "timestamp": "2025-11-26T..."
}
```

### 2. API 엔드포인트 테스트
```bash
curl https://promptgenerator-production.up.railway.app/api/guides/status
```

예상 응답:
```json
{
  "scheduled": true,
  "schedule": "0 3 * * *",
  "nextRun": "2025-11-26T03:00:00.000Z",
  "timezone": "Asia/Seoul"
}
```

### 3. 브라우저 콘솔 확인

프론트엔드에서:
1. 브라우저 개발자 도구 (F12) 열기
2. "Console" 탭 확인
3. "Network" 탭에서 API 요청 확인
4. 요청 URL이 올바른지 확인
5. CORS 오류가 있는지 확인

---

## 🔧 일반적인 문제 해결

### 문제 1: "Failed to fetch" 오류

**원인:** API 서버에 연결할 수 없음

**해결:**
1. Railway 서버가 실행 중인지 확인
2. Railway 로그에서 에러 확인
3. `VITE_API_BASE_URL`이 올바르게 설정되었는지 확인

---

### 문제 2: CORS 오류

**원인:** `FRONTEND_URL` 환경 변수 미설정 또는 잘못된 도메인

**해결:**
1. Railway → Variables → `FRONTEND_URL` 확인
2. Vercel 도메인과 정확히 일치하는지 확인
3. 프로토콜(`https://`) 포함 확인
4. 슬래시(`/`)로 끝나지 않도록 확인
5. Railway 서버 재시작

---

### 문제 3: "작업 ID를 받지 못했습니다"

**원인:** API 응답 형식 불일치

**해결:**
1. Railway 서버 로그 확인
2. `/api/guides/collect` 엔드포인트가 정상 작동하는지 확인
3. 서버 코드 최신 버전 확인

---

### 문제 4: EventSource 연결 실패

**원인:** SSE 엔드포인트 문제 또는 네트워크 문제

**해결:**
1. 브라우저 콘솔에서 SSE 연결 오류 확인
2. Railway 로그에서 SSE 관련 오류 확인
3. 작업 상태를 직접 조회하는 방식으로 폴백 (이미 구현됨)

---

## 📋 체크리스트

배포 전 확인사항:

- [ ] Railway 서버가 "Active" 상태
- [ ] Railway `FRONTEND_URL` 환경 변수 설정됨
- [ ] Vercel `VITE_API_BASE_URL` 환경 변수 설정됨
- [ ] Railway Health Check 성공
- [ ] Railway API Status 엔드포인트 정상 작동
- [ ] 브라우저 콘솔에 CORS 오류 없음
- [ ] 네트워크 탭에서 API 요청이 올바른 URL로 전송됨

---

## 🆘 추가 도움

문제가 계속되면:

1. **Railway 로그 확인**
   - Railway 대시보드 → Deployments → View Logs
   - 최근 에러 메시지 확인

2. **브라우저 개발자 도구 확인**
   - Console 탭: JavaScript 오류
   - Network 탭: API 요청 상태 및 응답

3. **환경 변수 재확인**
   - Railway와 Vercel 모두에서 환경 변수 재확인
   - 오타나 공백 없는지 확인

4. **서버 재시작**
   - Railway에서 "Redeploy" 실행
   - Vercel에서 "Redeploy" 실행

