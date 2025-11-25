# 아이콘 생성 가이드

## 현재 상태
- ✅ `favicon.svg` - SVG favicon (모든 모던 브라우저 지원)
- ⚠️ PNG 아이콘들은 브라우저에서 생성해야 합니다

## PNG 아이콘 생성 방법

### 방법 1: 브라우저에서 생성
1. `public/create-simple-icons.html` 파일을 브라우저에서 엽니다
2. 자동으로 3개의 PNG 파일이 다운로드됩니다:
   - `icon-192.png` (192x192)
   - `icon-512.png` (512x512)
   - `apple-touch-icon.png` (180x180)

### 방법 2: 온라인 도구 사용
1. `favicon.svg` 파일을 사용하여 온라인 favicon 생성기 사용
2. 추천 사이트:
   - https://realfavicongenerator.net/
   - https://favicon.io/

### 방법 3: 수동 생성
- 검정 배경 (#000000)
- 중앙에 ⌨️ 이모지 (흰색 #ffffff)
- 크기: 192x192, 512x512, 180x180

## 아이콘 파일 위치
모든 아이콘 파일은 `public/` 디렉토리에 있어야 합니다:
- `favicon.svg`
- `icon-192.png`
- `icon-512.png`
- `apple-touch-icon.png`

