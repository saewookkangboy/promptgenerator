# Vercel 환경 변수 설정 가이드

Vercel에서 `VITE_API_BASE_URL` 환경 변수를 설정하는 방법입니다.

## 🎯 방법 1: Vercel 대시보드에서 설정 (권장)

### Step 1: Vercel 프로젝트 접속
1. https://vercel.com 접속
2. 로그인 (GitHub 계정 권장)
3. 배포된 프로젝트 선택

### Step 2: 환경 변수 설정 페이지 이동
1. 프로젝트 대시보드에서 **"Settings"** 클릭
2. 왼쪽 메뉴에서 **"Environment Variables"** 클릭

### Step 3: 환경 변수 추가
1. **"Add New"** 버튼 클릭
2. 다음 정보 입력:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: Railway에서 생성된 백엔드 URL
     ```
     https://your-railway-app.up.railway.app
     ```
   - **Environment**: 
     - ✅ **Production** (프로덕션 환경)
     - ✅ **Preview** (프리뷰 환경, 선택)
     - ✅ **Development** (개발 환경, 선택)

3. **"Save"** 클릭

### Step 4: 재배포
환경 변수는 새 배포에만 적용되므로:
1. **"Deployments"** 탭으로 이동
2. 최신 배포의 **"..."** 메뉴 클릭
3. **"Redeploy"** 선택
4. 또는 GitHub에 새로운 커밋 푸시

---

## 🎯 방법 2: Vercel CLI로 설정

### Step 1: Vercel CLI 설치
```bash
npm i -g vercel
```

### Step 2: 로그인
```bash
vercel login
```

### Step 3: 프로젝트 연결 (처음만)
```bash
cd /path/to/your/project
vercel link
```

### Step 4: 환경 변수 추가
```bash
# 프로덕션 환경
vercel env add VITE_API_BASE_URL production

# 프리뷰 환경
vercel env add VITE_API_BASE_URL preview

# 개발 환경
vercel env add VITE_API_BASE_URL development
```

각 명령 실행 시 값 입력 프롬프트가 나타납니다:
```
? What's the value of VITE_API_BASE_URL? https://your-railway-app.up.railway.app
```

### Step 5: 재배포
```bash
vercel --prod
```

---

## 🎯 방법 3: vercel.json에 기본값 설정 (선택)

`vercel.json`에 기본값을 설정할 수 있지만, 환경 변수로 오버라이드됩니다.

```json
{
  "env": {
    "VITE_API_BASE_URL": "https://your-railway-app.up.railway.app"
  },
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**주의**: 이 방법은 환경별로 다른 값을 설정하기 어렵습니다.

---

## 📋 설정 확인 방법

### 1. Vercel 대시보드에서 확인
- Settings → Environment Variables
- 설정된 환경 변수 목록 확인

### 2. 배포 로그에서 확인
- Deployments → 최신 배포 → "Build Logs"
- 환경 변수가 빌드에 포함되었는지 확인

### 3. 런타임에서 확인
프론트엔드 코드에 임시로 추가:
```typescript
console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL)
```

브라우저 콘솔에서 확인 (프로덕션에서는 제거)

---

## 🔄 환경별 다른 URL 설정

### 개발 환경
```
VITE_API_BASE_URL=http://localhost:3001
```

### 프리뷰 환경 (Pull Request 등)
```
VITE_API_BASE_URL=https://your-railway-app.up.railway.app
```

### 프로덕션 환경
```
VITE_API_BASE_URL=https://your-railway-app.up.railway.app
```

각 환경에 대해 별도로 설정 가능합니다.

---

## ⚠️ 주의사항

### 1. Vite 환경 변수 규칙
- `VITE_` 접두사 필수
- 환경 변수는 빌드 타임에 주입됨
- 변경 시 재배포 필요

### 2. 보안
- API 키는 절대 프론트엔드 환경 변수에 포함하지 않음
- `VITE_API_BASE_URL`은 공개되어도 안전 (URL만 포함)

### 3. 캐싱
- 환경 변수 변경 후 브라우저 캐시 클리어
- CDN 캐시 무효화 (Vercel이 자동 처리)

---

## 🧪 테스트

### 1. 로컬 테스트
```bash
# .env.local 파일 생성
echo "VITE_API_BASE_URL=http://localhost:3001" > .env.local

# 개발 서버 실행
npm run dev
```

### 2. 프로덕션 테스트
1. Vercel에 배포
2. 브라우저 개발자 도구 → Network 탭
3. API 요청이 올바른 URL로 전송되는지 확인

---

## 🔍 문제 해결

### 환경 변수가 적용되지 않음
1. **재배포 확인**: 환경 변수 변경 후 반드시 재배포
2. **빌드 로그 확인**: 환경 변수가 빌드에 포함되었는지 확인
3. **캐시 클리어**: 브라우저 캐시 및 CDN 캐시 클리어

### 잘못된 URL
1. Railway 대시보드에서 정확한 URL 확인
2. `https://` 프로토콜 포함 확인
3. 마지막 슬래시(`/`) 제거

### CORS 오류
1. Railway에서 `FRONTEND_URL` 환경 변수 확인
2. Vercel 도메인이 정확히 일치하는지 확인
3. Railway 서버 재시작

---

## 📸 스크린샷 가이드 (대시보드)

### 1. Settings 페이지
```
프로젝트 대시보드
  └─ Settings (상단 메뉴)
      └─ Environment Variables (왼쪽 사이드바)
```

### 2. 환경 변수 추가
```
+ Add New 버튼 클릭
  └─ Key: VITE_API_BASE_URL
  └─ Value: https://your-app.up.railway.app
  └─ Environment: Production, Preview, Development 선택
  └─ Save 클릭
```

### 3. 재배포
```
Deployments 탭
  └─ 최신 배포
      └─ ... (우측 상단)
          └─ Redeploy
```

---

## ✅ 체크리스트

배포 전 확인:
- [ ] Railway 백엔드 URL 확인
- [ ] Vercel에서 `VITE_API_BASE_URL` 설정
- [ ] Production, Preview, Development 모두 설정 (선택)
- [ ] 재배포 완료
- [ ] 브라우저에서 API 호출 확인
- [ ] CORS 오류 없음 확인

---

## 🚀 빠른 시작

```bash
# 1. Vercel CLI로 빠르게 설정
vercel env add VITE_API_BASE_URL production

# 값 입력: https://your-railway-app.up.railway.app

# 2. 재배포
vercel --prod
```

또는 Vercel 대시보드에서:
1. Settings → Environment Variables
2. Add New → `VITE_API_BASE_URL` 추가
3. Deployments → Redeploy

---

## 📚 참고

- [Vercel 환경 변수 문서](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vite 환경 변수 문서](https://vitejs.dev/guide/env-and-mode.html)
- [프론트엔드 설정 가이드](./FRONTEND_SETUP.md)

