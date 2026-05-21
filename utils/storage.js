const KEYS = {
  DIARIES: 'diaries',
  GOALS: 'goals',
  CHECKINS: 'checkins',
  PROFILE: 'profile'
}

function getList(key) {
  const data = wx.getStorageSync(key)
  return Array.isArray(data) ? data : []
}

function setList(key, list) {
  wx.setStorageSync(key, Array.isArray(list) ? list : [])
}

function getDiaries() {
  return getList(KEYS.DIARIES)
}

function saveDiary(diary) {
  const diaries = getDiaries()
  const index = diaries.findIndex((item) => item.date === diary.date)
  const payload = {
    ...diary,
    updateTime: Date.now(),
    createTime: diary.createTime || Date.now()
  }
  if (index > -1) diaries[index] = payload
  else diaries.push(payload)
  setList(KEYS.DIARIES, diaries)
}

function getDiaryByDate(date) {
  return getDiaries().find((item) => item.date === date) || null
}

/** 用于日历/统计：仅当用户真正填写过内容时视为「有日记」 */
function isDiaryMeaningful(diary) {
  if (!diary || typeof diary !== 'object') return false
  if ((diary.title || '').trim()) return true
  if ((diary.content || '').trim()) return true
  if (Array.isArray(diary.images) && diary.images.length) return true
  if ((diary.mood || '').trim()) return true
  return false
}

function getGoals() {
  return getList(KEYS.GOALS)
}

function saveGoal(goal) {
  const goals = getGoals()
  const index = goals.findIndex((item) => item.id === goal.id)
  if (index > -1) goals[index] = goal
  else goals.push(goal)
  setList(KEYS.GOALS, goals)
}

function getCheckins() {
  return getList(KEYS.CHECKINS)
}

function saveCheckins(checkins) {
  setList(KEYS.CHECKINS, checkins)
}

module.exports = {
  KEYS,
  getDiaries,
  saveDiary,
  getDiaryByDate,
  isDiaryMeaningful,
  getGoals,
  saveGoal,
  getCheckins,
  saveCheckins
}
