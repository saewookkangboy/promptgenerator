# 문제 해결 가이드

## 페이지가 표시되지 않는 경우

### 1. 브라우저 콘솔 확인

**F12 → Console 탭**에서 다음 오류를 확인하세요:

#### 자주 발생하는 오류

**오류 1**: `Failed to fetch` 또는 `Network Error`
```
원인: API 서버 연결 실패
해결: VITE_API_BASE_URL 환경 변수 확인
```

**오류 2**: `Cannot read property 'X' of undefined`
```
원인: 컴포넌트 초기화 문제
해결: 브라우저 콘솔의 전체 스택 트레이스 확인
```

**오류 3**: `404 Not Found` (assets 파일)
```
원인: 정적 파일 경로 문제
해결: vercel.json의 rewrites 설정 확인
```

### 2. Network 탭 확인

**F12 → Network 탭**에서:

1. **index.html 로드 확인**
   - Status: 200 OK 여부 확인
   - Response에 HTML 내용이 있는지 확인

2. **JavaScript 파일 로드 확인**
   - `/assets/index-*.js` 파일이 로드되는지 확인
   - Status: 200 OK 여부 확인

3. **CSS 파일 로드 확인**
   - `/assets/index-*.css` 파일이 로드되는지 확인
   - Status: 200 OK 여부 확인

### 3. Vercel 배포 로그 확인

Vercel Dashboard → Deployments → 최신 배포:

1. **빌드 단계 확인**
   - "Build Completed" 메시지 확인
   - 빌드 오류가 없는지 확인

2. **배포 단계 확인**
   - "Deployment completed" 메시지 확인
   - 배포 오류가 없는지 확인

### 4. 환경 변수 확인

Vercel Dashboard → Project Settings → Environment Variables:

**필수 변수**:
```
VITE_API_BASE_URL=https://your-api-domain.com
```

**주의사항**:
- 클라이언트 변수는 `VITE_` 접두사 필요
- Production, Preview, Development 환경 모두 설정

### 5. 로컬 빌드 테스트

```bash
# 빌드 테스트
npm run build

# 빌드 결과 확인
ls -la dist/

# 로컬 프리뷰
npm run preview
```

로컬에서 `npm run preview`가 작동하면 빌드는 정상입니다.

## 일반적인 문제 해결

### 문제: 빈 화면 (White Screen)

**가능한 원인**:
1. React 앱 초기화 실패
2. JavaScript 오류로 인한 렌더링 중단
3. CSS 로드 실패

**해결 방법**:
1. 브라우저 콘솔에서 오류 확인
2. `dist/index.html`의 스크립트 경로 확인
3. 네트워크 탭에서 파일 로드 확인

### 문제: 404 오류

**가능한 원인**:
1. SPA 라우팅 설정 문제
2. 파일 경로 문제

**해결 방법**:
1. `vercel.json`의 `rewrites` 설정 확인
2. 모든 경로가 `/index.html`로 리다이렉트되는지 확인

### 문제: API 요청 실패

**가능한 원인**:
1. 환경 변수 미설정
2. CORS 설정 문제
3. API 서버 미실행

**해결 방법**:
1. `VITE_API_BASE_URL` 환경 변수 확인
2. API 서버가 실행 중인지 확인
3. CORS 설정 확인 (서버 측)

## 디버깅 체크리스트

- [ ] 브라우저 콘솔에 오류가 없는가?
- [ ] Network 탭에서 모든 파일이 200 OK인가?
- [ ] `index.html`이 정상적으로 로드되는가?
- [ ] JavaScript 파일이 정상적으로 로드되는가?
- [ ] CSS 파일이 정상적으로 로드되는가?
- [ ] Vercel 배포 로그에 오류가 없는가?
- [ ] 환경 변수가 올바르게 설정되었는가?
- [ ] 로컬 빌드가 정상적으로 작동하는가?

## 추가 도움말

문제가 계속되면 다음 정보를 수집하세요:

1. **브라우저 콘솔 오류** (전체 스택 트레이스)
2. **Network 탭 스크린샷** (실패한 요청)
3. **Vercel 배포 로그** (전체 로그)
4. **환경 변수 목록** (민감한 정보 제외)

이 정보를 가지고 문제를 더 정확히 진단할 수 있습니다.

