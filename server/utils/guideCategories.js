// Guide category helpers

function getGuideCategoryFromModel(modelName) {
  if (!modelName) return 'LLM'
  const normalized = modelName.toLowerCase()
  if (['midjourney', 'dalle-3', 'stable-diffusion', 'sdxl'].some((key) => normalized.includes(key))) {
    return 'IMAGE'
  }
  if (['sora', 'veo', 'runway'].some((key) => normalized.includes(key))) {
    return 'VIDEO'
  }
  return 'LLM'
}

module.exports = {
  getGuideCategoryFromModel,
}

