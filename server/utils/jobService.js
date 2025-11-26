const { prisma } = require('../db/prisma')
const { JOB_STATUS } = require('./jobQueue')

async function persistJobProgress(jobId, progress = {}) {
  if (!jobId) return null
  return prisma.guideCollectionJob.update({
    where: { id: jobId },
    data: {
      status: progress.status || JOB_STATUS.RUNNING,
      startedAt: progress.startedAt ? new Date(progress.startedAt) : undefined,
      completedAt: progress.completedAt ? new Date(progress.completedAt) : undefined,
      progress: progress.progress || undefined,
    },
  }).catch(() => null)
}

async function finalizeJobRecord(jobId, payload = {}) {
  if (!jobId) return null
  return prisma.guideCollectionJob.update({
    where: { id: jobId },
    data: {
      status: payload.status || JOB_STATUS.COMPLETED,
      successCount: payload.successCount,
      failCount: payload.failCount,
      errorMessage: payload.error || null,
      completedAt: new Date(),
    },
  }).catch(() => null)
}

async function getJobSummary(filter = {}) {
  const jobs = await prisma.guideCollectionJob.findMany({
    where: filter,
    orderBy: { startedAt: 'desc' },
    take: 20,
  })
  return jobs
}

module.exports = {
  persistJobProgress,
  finalizeJobRecord,
  getJobSummary,
}

