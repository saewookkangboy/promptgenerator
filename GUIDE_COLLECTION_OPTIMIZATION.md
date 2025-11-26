# 프롬프트 가이드 수집 최적화 아이디어

## 📊 현재 상태 분석

### 현재 구조
- **순차 처리**: 모델별로 순차적으로 수집 (느림)
- **동기 처리**: API 요청이 완료될 때까지 대기 (타임아웃 위험)
- **에러 처리**: 기본적인 try-catch만 사용
- **진행 상황**: 프론트엔드에서 진행률 표시 없음
- **재시도**: 실패 시 자동 재시도 없음

---

## 🚀 최적화 아이디어

### 1. **병렬 처리 (Parallel Processing)** ⭐⭐⭐
**우선순위: 높음**

#### 문제점
- 현재는 모델별로 순차 처리 (약 3초 딜레이 × 모델 수)
- 전체 수집 시간이 매우 김 (13개 모델 × 3초 = 39초 + 스크래핑 시간)

#### 해결책
```javascript
// 동시에 여러 모델 수집 (최대 3-5개)
const BATCH_SIZE = 3
const batches = chunkArray(modelNames, BATCH_SIZE)

for (const batch of batches) {
  const promises = batch.map(modelName => 
    collectGuideForModel(modelName)
  )
  await Promise.allSettled(promises)
}
```

**예상 효과**: 수집 시간 60-70% 단축

---

### 2. **백그라운드 작업 큐 (Background Job Queue)** ⭐⭐⭐
**우선순위: 높음**

#### 문제점
- HTTP 요청이 완료될 때까지 대기 (타임아웃 위험)
- 사용자가 페이지를 떠나면 작업 취소됨

#### 해결책
```javascript
// 작업 ID 생성 및 큐에 추가
const jobId = generateJobId()
jobQueue.add({ jobId, type: 'collect', models: modelNames })

// 즉시 응답
res.json({ 
  success: true, 
  jobId,
  message: '수집 작업이 시작되었습니다',
  statusUrl: `/api/guides/jobs/${jobId}`
})

// 프론트엔드에서 폴링으로 상태 확인
```

**예상 효과**: 
- 타임아웃 방지
- 사용자 경험 개선
- 작업 취소 가능

---

### 3. **실시간 진행 상황 표시 (Real-time Progress)** ⭐⭐
**우선순위: 중간**

#### 문제점
- 사용자가 수집 진행 상황을 알 수 없음
- 얼마나 걸릴지 예상 불가

#### 해결책
```javascript
// Server-Sent Events (SSE) 또는 WebSocket 사용
app.get('/api/guides/progress/:jobId', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  
  const progress = {
    total: 13,
    completed: 5,
    current: 'gemini-pro',
    status: 'collecting'
  }
  
  res.write(`data: ${JSON.stringify(progress)}\n\n`)
})
```

**프론트엔드**:
```typescript
const eventSource = new EventSource(`/api/guides/progress/${jobId}`)
eventSource.onmessage = (e) => {
  const progress = JSON.parse(e.data)
  setProgress(progress) // 진행률 표시
}
```

---

### 4. **스마트 재시도 로직 (Smart Retry)** ⭐⭐⭐
**우선순위: 높음**

#### 문제점
- 네트워크 오류나 일시적 서버 오류 시 즉시 실패
- 403 봇 차단 시 재시도 없음

#### 해결책
```javascript
async function collectWithRetry(modelName, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await collectGuideForModel(modelName)
      if (result.success) return result
      
      // 403 오류는 지수 백오프로 재시도
      if (result.error?.includes('403')) {
        const delay = Math.pow(2, attempt) * 1000 // 2초, 4초, 8초
        await sleep(delay)
        continue
      }
    } catch (error) {
      if (attempt === maxRetries) throw error
      await sleep(1000 * attempt)
    }
  }
}
```

**예상 효과**: 성공률 20-30% 향상

---

### 5. **캐싱 및 증분 수집 (Caching & Incremental)** ⭐⭐
**우선순위: 중간**

#### 문제점
- 매번 모든 모델을 처음부터 수집
- 이미 최신인 가이드도 재수집

#### 해결책
```javascript
// 마지막 수집 시간 확인
const lastCollected = getLastCollectionTime(modelName)
const daysSinceLastCollection = (Date.now() - lastCollected) / (1000 * 60 * 60 * 24)

// 7일 이내면 스킵 또는 빠른 검증만
if (daysSinceLastCollection < 7) {
  return {
    success: true,
    cached: true,
    guide: getCachedGuide(modelName)
  }
}

// 증분 수집: 변경된 부분만 업데이트
const existingGuide = getCachedGuide(modelName)
const newGuide = await collectGuideForModel(modelName)
const mergedGuide = mergeGuides(existingGuide, newGuide)
```

**예상 효과**: 수집 시간 40-50% 단축

---

### 6. **선택적 수집 (Selective Collection)** ⭐
**우선순위: 낮음**

#### 문제점
- 특정 모델만 수집하고 싶어도 전체 수집해야 함

#### 해결책
```typescript
// 프론트엔드에서 모델 선택
const [selectedModels, setSelectedModels] = useState<string[]>([])

// 선택된 모델만 수집
await fetch('/api/guides/collect', {
  method: 'POST',
  body: JSON.stringify({ models: selectedModels })
})
```

---

### 7. **데이터 검증 및 품질 개선** ⭐⭐
**우선순위: 중간**

#### 문제점
- 수집된 데이터의 품질 검증 없음
- 빈 가이드나 저품질 데이터 저장 가능

#### 해결책
```javascript
function validateGuide(guide) {
  const issues = []
  
  // 최소 내용 확인
  if (!guide.content.bestPractices?.length && !guide.content.tips?.length) {
    issues.push('내용이 부족합니다')
  }
  
  // 중복 확인
  const duplicates = findDuplicates(guide.content.bestPractices)
  if (duplicates.length > 0) {
    issues.push('중복된 내용이 있습니다')
  }
  
  // 신뢰도 계산
  const confidence = calculateConfidence(guide)
  if (confidence < 0.5) {
    issues.push('신뢰도가 낮습니다')
  }
  
  return { valid: issues.length === 0, issues, confidence }
}
```

---

### 8. **에러 분류 및 우선순위 처리** ⭐⭐
**우선순위: 중간**

#### 문제점
- 모든 에러를 동일하게 처리
- 중요한 모델과 덜 중요한 모델 구분 없음

#### 해결책
```javascript
const MODEL_PRIORITY = {
  'openai-gpt-4': 'high',
  'claude-3.5': 'high',
  'gemini-pro': 'high',
  'midjourney': 'medium',
  // ...
}

// 우선순위 높은 모델은 더 많은 재시도
const maxRetries = MODEL_PRIORITY[modelName] === 'high' ? 5 : 2
```

---

### 9. **로깅 및 모니터링 강화** ⭐
**우선순위: 낮음**

#### 문제점
- 수집 성공률, 소요 시간 등 통계 없음
- 문제 발생 시 디버깅 어려움

#### 해결책
```javascript
// 수집 통계 저장
const stats = {
  modelName,
  startTime: Date.now(),
  endTime: null,
  duration: null,
  success: false,
  error: null,
  contentCount: 0,
  retryCount: 0
}

// 데이터베이스에 저장하여 대시보드 표시
await saveCollectionStats(stats)
```

---

### 10. **알림 시스템** ⭐
**우선순위: 낮음**

#### 문제점
- 수집 완료/실패 시 사용자에게 알림 없음

#### 해결책
```typescript
// 프론트엔드에서 알림
if (result.success) {
  showNotification('가이드 수집이 완료되었습니다', 'success')
} else {
  showNotification('일부 모델 수집에 실패했습니다', 'warning')
}
```

---

## 🎯 구현 우선순위

### Phase 1: 핵심 최적화 (즉시 구현)
1. ✅ **병렬 처리** - 수집 시간 대폭 단축
2. ✅ **백그라운드 작업 큐** - 타임아웃 방지
3. ✅ **스마트 재시도** - 성공률 향상

### Phase 2: 사용자 경험 개선 (단기)
4. ✅ **실시간 진행 상황** - 사용자 피드백
5. ✅ **데이터 검증** - 품질 보장

### Phase 3: 고급 기능 (중기)
6. ✅ **캐싱 및 증분 수집** - 효율성 향상
7. ✅ **선택적 수집** - 유연성 제공

### Phase 4: 모니터링 및 알림 (장기)
8. ✅ **로깅 강화** - 운영 개선
9. ✅ **알림 시스템** - 사용자 편의성

---

## 📈 예상 효과

### 성능 개선
- **수집 시간**: 5-10분 → 1-2분 (병렬 처리)
- **성공률**: 60-70% → 85-95% (재시도 로직)
- **사용자 대기 시간**: 5-10분 → 즉시 응답 (백그라운드 작업)

### 사용자 경험
- 실시간 진행률 표시
- 작업 취소 가능
- 선택적 수집 가능
- 상세한 에러 정보

---

## 🔧 구현 예시 코드

### 병렬 처리 + 백그라운드 작업 예시
```javascript
// server/index.js
const jobQueue = new Map()

app.post('/api/guides/collect', async (req, res) => {
  const { models } = req.body
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  // 백그라운드 작업 시작
  processCollectionJob(jobId, models || Object.keys(COLLECTION_SOURCES))
  
  res.json({
    success: true,
    jobId,
    message: '수집 작업이 시작되었습니다',
    statusUrl: `/api/guides/jobs/${jobId}`
  })
})

async function processCollectionJob(jobId, modelNames) {
  const BATCH_SIZE = 3
  const results = []
  
  // 배치로 나누어 병렬 처리
  for (let i = 0; i < modelNames.length; i += BATCH_SIZE) {
    const batch = modelNames.slice(i, i + BATCH_SIZE)
    
    const batchResults = await Promise.allSettled(
      batch.map(modelName => collectWithRetry(modelName))
    )
    
    results.push(...batchResults)
    
    // 진행 상황 업데이트
    jobQueue.set(jobId, {
      total: modelNames.length,
      completed: Math.min(i + BATCH_SIZE, modelNames.length),
      results: results.map(r => r.value || r.reason)
    })
  }
  
  // 완료
  jobQueue.set(jobId, {
    ...jobQueue.get(jobId),
    status: 'completed',
    completedAt: Date.now()
  })
}

app.get('/api/guides/jobs/:jobId', (req, res) => {
  const { jobId } = req.params
  const job = jobQueue.get(jobId)
  
  if (!job) {
    return res.status(404).json({ error: '작업을 찾을 수 없습니다' })
  }
  
  res.json(job)
})
```

---

## 💡 추가 고려사항

1. **Rate Limiting**: 서버 부하 방지를 위한 요청 제한
2. **프록시 사용**: 403 봇 차단 우회 (선택적)
3. **데이터베이스 저장**: 수집된 가이드를 DB에 저장하여 영구 보관
4. **버전 관리**: 가이드 버전 관리 및 롤백 기능
5. **A/B 테스트**: 다른 수집 전략 비교

