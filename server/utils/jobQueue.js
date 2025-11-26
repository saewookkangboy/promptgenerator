// 백그라운드 작업 큐 관리

const jobQueue = new Map()

// 작업 상태
const JOB_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
}

// 작업 ID 생성
function generateJobId() {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 작업 생성
function createJob(type, params = {}) {
  const jobId = generateJobId()
  const job = {
    id: jobId,
    type,
    params,
    status: JOB_STATUS.PENDING,
    createdAt: Date.now(),
    startedAt: null,
    completedAt: null,
    progress: {
      total: 0,
      completed: 0,
      current: null,
    },
    results: null,
    error: null,
  }
  
  jobQueue.set(jobId, job)
  return job
}

// 작업 조회
function getJob(jobId) {
  return jobQueue.get(jobId)
}

// 작업 업데이트
function updateJob(jobId, updates) {
  const job = jobQueue.get(jobId)
  if (!job) return null
  
  Object.assign(job, updates)
  jobQueue.set(jobId, job)
  return job
}

// 작업 진행 상황 업데이트
function updateJobProgress(jobId, progress) {
  const job = jobQueue.get(jobId)
  if (!job) return null
  
  job.progress = { ...job.progress, ...progress }
  jobQueue.set(jobId, job)
  return job
}

// 작업 완료
function completeJob(jobId, results, error = null) {
  const job = jobQueue.get(jobId)
  if (!job) return null
  
  job.status = error ? JOB_STATUS.FAILED : JOB_STATUS.COMPLETED
  job.completedAt = Date.now()
  job.results = results
  job.error = error
  job.progress.completed = job.progress.total
  
  jobQueue.set(jobId, job)
  return job
}

// 작업 취소
function cancelJob(jobId) {
  const job = jobQueue.get(jobId)
  if (!job) return null
  
  if (job.status === JOB_STATUS.RUNNING) {
    job.status = JOB_STATUS.CANCELLED
    job.completedAt = Date.now()
    jobQueue.set(jobId, job)
    return job
  }
  
  return null
}

// 오래된 작업 정리 (24시간 이상)
function cleanupOldJobs() {
  const now = Date.now()
  const maxAge = 24 * 60 * 60 * 1000 // 24시간
  
  for (const [jobId, job] of jobQueue.entries()) {
    if (now - job.completedAt > maxAge && 
        (job.status === JOB_STATUS.COMPLETED || job.status === JOB_STATUS.FAILED)) {
      jobQueue.delete(jobId)
    }
  }
}

// 주기적으로 오래된 작업 정리 (1시간마다)
setInterval(cleanupOldJobs, 60 * 60 * 1000)

module.exports = {
  JOB_STATUS,
  generateJobId,
  createJob,
  getJob,
  updateJob,
  updateJobProgress,
  completeJob,
  cancelJob,
  cleanupOldJobs,
}

