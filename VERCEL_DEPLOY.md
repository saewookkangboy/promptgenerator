# Vercel 배포 가이드

## 배포 설정

### 1. Vercel 프로젝트 연결

1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. "Add New Project" 클릭
3. GitHub 저장소 선택: `saewookkangboy/promptgenerator`
4. 프로젝트 설정 확인

### 2. 빌드 설정

Vercel이 자동으로 감지하는 설정:
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3. 환경 변수 설정

Vercel Dashboard → Project Settings → Environment Variables에서 다음 변수 추가:

#### 필수 환경 변수
```
VITE_API_BASE_URL=https://your-api-domain.com
```

#### 선택적 환경 변수 (서버 API가 있는 경우)
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=your-encryption-key
```

**주의**: 
- 클라이언트에서 사용하는 변수는 `VITE_` 접두사가 필요합니다
- 서버 사이드 변수는 `VITE_` 접두사 없이 설정합니다

### 4. 배포 확인

배포 후 다음을 확인하세요:

1. **빌드 로그 확인**
   - Vercel Dashboard → Deployments → 최신 배포 클릭
   - 빌드 로그에서 오류 확인

2. **사이트 접속**
   - 배포된 URL로 접속
   - 브라우저 콘솔에서 오류 확인

3. **라우팅 확인**
   - SPA 라우팅이 제대로 작동하는지 확인
   - 새로고침 시 404 오류가 나지 않는지 확인

## 문제 해결

### 빌드 실패

**오류**: TypeScript 오류
```bash
# 로컬에서 빌드 테스트
npm run build
```

**오류**: 의존성 설치 실패
```bash
# package-lock.json 확인
npm install
```

### 배포 후 페이지가 표시되지 않음

1. **SPA 라우팅 설정 확인**
   - `vercel.json`의 `rewrites` 설정 확인
   - 모든 경로가 `index.html`로 리다이렉트되는지 확인

2. **빌드 출력 확인**
   - `dist/index.html` 파일이 생성되었는지 확인
   - `dist/assets/` 폴더에 JS/CSS 파일이 있는지 확인

3. **환경 변수 확인**
   - `VITE_API_BASE_URL`이 올바르게 설정되었는지 확인
   - 브라우저 콘솔에서 API 요청 오류 확인

### API 연결 오류

**문제**: API 요청이 실패함
- `VITE_API_BASE_URL` 환경 변수 확인
- CORS 설정 확인 (서버 측)
- 네트워크 탭에서 요청 URL 확인

## 현재 설정

### vercel.json
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### package.json 빌드 스크립트
```json
{
  "scripts": {
    "build": "tsc && vite build"
  }
}
```

## 배포 후 체크리스트

- [ ] 빌드가 성공적으로 완료되었는가?
- [ ] 배포된 사이트가 정상적으로 로드되는가?
- [ ] 로그인/회원가입 기능이 작동하는가?
- [ ] 프롬프트 생성 기능이 작동하는가?
- [ ] Admin 대시보드가 접근 가능한가?
- [ ] 모바일 반응형이 제대로 작동하는가?
- [ ] API 요청이 정상적으로 작동하는가?

## 추가 리소스

- [Vercel 공식 문서](https://vercel.com/docs)
- [Vite 배포 가이드](https://vitejs.dev/guide/static-deploy.html)
- [SPA 라우팅 설정](https://vercel.com/docs/configuration#routes)

