const { getDiaries, getCheckins, getGoals, isDiaryMeaningful } = require('../../utils/storage')
const { formatDate } = require('../../utils/date')

Page({
  data: {
    stats: {
      continuousDays: 0,
      monthRate: 0,
      diaryCount: 0,
      goalCount: 0,
      goalCompletionRate: 0
    },
    overviewCards: [],
    heatmap: [],
    trendMode: 'week',
    trendTabs: [
      { value: 'week', label: '周趋势' },
      { value: 'month', label: '月趋势' }
    ],
    trendCaption: '',
    weeklyTrend: [],
    yAxisLabels: [0],
    rankings: []
  },

  onShow() {
    this.computeStats()
  },

  computeStats() {
    const diaries = getDiaries()
    const checkins = getCheckins()
    const goals = getGoals()
    const diaryCount = diaries.filter((item) => isDiaryMeaningful(item)).length
    const today = new Date()
    let continuousDays = 0
    const checkinMap = {}
    const diaryMap = {}

    checkins.forEach((item) => {
      checkinMap[item.date] = item
    })
    diaries.forEach((item) => {
      diaryMap[item.date] = item
    })

    for (let i = 0; i < 365; i += 1) {
      const day = new Date(today)
      day.setDate(today.getDate() - i)
      const date = formatDate(day)
      const checkin = checkinMap[date]
      const hasDiary = isDiaryMeaningful(diaryMap[date])
      if ((checkin && checkin.doneCount > 0) || hasDiary) continuousDays += 1
      else break
    }

    const currentYear = today.getFullYear()
    const month = today.getMonth() + 1
    const monthRecords = checkins.filter((item) => {
      const year = Number(item.date.slice(0, 4))
      const monthNum = Number(item.date.slice(5, 7))
      return year === currentYear && monthNum === month
    })
    const done = monthRecords.reduce((sum, item) => sum + item.doneCount, 0)
    const total = monthRecords.reduce((sum, item) => sum + item.totalCount, 0)
    const monthRate = total ? Math.round((done / total) * 100) : 0

    const heatmap = []
    for (let i = 89; i >= 0; i -= 1) {
      const day = new Date(today)
      day.setDate(today.getDate() - i)
      const date = formatDate(day)
      const dayCheckin = checkinMap[date]
      let level = 0
      if (dayCheckin && dayCheckin.totalCount > 0) {
        const rate = dayCheckin.doneCount / dayCheckin.totalCount
        if (rate >= 1) level = 3
        else if (rate >= 0.5) level = 2
        else if (rate > 0) level = 1
      } else if (isDiaryMeaningful(diaryMap[date])) {
        level = 1
      }
      heatmap.push({ date, level })
    }

    const weeklyTrendData = this.computeWeeklyTrend(monthRecords)
    const monthlyTrendData = this.computeMonthlyTrend(checkins)
    const rankings = this.computeRankings(goals)
    const goalCompletionRate = this.computeGoalCompletionRate(goals)

    const overviewCards = [
      {
        key: 'continuousDays',
        iconPath: '/images/icon/stats-trend.png',
        iconClass: 'icon-orange',
        label: '连续打卡',
        value: statsToNumber(continuousDays),
        unit: '天'
      },
      {
        key: 'monthRate',
        iconPath: '/images/icon/stats-calendar.png',
        iconClass: 'icon-blue',
        label: '本月完成',
        value: `${statsToNumber(monthRate)}%`,
        unit: '完成率'
      },
      {
        key: 'goalCount',
        iconPath: '/images/icon/stats-target.png',
        iconClass: 'icon-green',
        label: '总目标数',
        value: statsToNumber(goals.length),
        unit: '个目标'
      },
      {
        key: 'diaryCount',
        iconPath: '/images/icon/stats-diary.png',
        iconClass: 'icon-purple',
        label: '日记总数',
        value: statsToNumber(diaryCount),
        unit: '篇日记'
      }
    ]

    this.setData({
      stats: { continuousDays, monthRate, diaryCount, goalCount: goals.length, goalCompletionRate },
      overviewCards,
      heatmap,
      weeklyTrend: [],
      yAxisLabels: [],
      rankings
    }, () => {
      this.weekTrendData = weeklyTrendData
      this.monthTrendData = monthlyTrendData
      this.applyTrendMode()
    })
  },

  computeWeeklyTrend(monthRecords) {
    const buckets = [
      { label: '第1周', doneDays: 0 },
      { label: '第2周', doneDays: 0 },
      { label: '第3周', doneDays: 0 },
      { label: '第4周', doneDays: 0 }
    ]

    monthRecords.forEach((item) => {
      const day = Number(item.date.slice(8, 10))
      const weekIndex = Math.min(3, Math.floor((day - 1) / 7))
      if (item.doneCount > 0) {
        buckets[weekIndex].doneDays += 1
      }
    })

    const maxValue = Math.max(...buckets.map((item) => item.doneDays), 1)
    const items = buckets.map((item) => ({
      ...item,
      heightPercent: Math.round((item.doneDays / maxValue) * 100),
      displayHeightPercent: item.doneDays > 0 ? Math.max(8, Math.round((item.doneDays / maxValue) * 100)) : 0
    }))
    return {
      items,
      maxValue,
      caption: '按当月每周有打卡记录的天数统计'
    }
  },

  computeYAxisLabels(maxValue) {
    const safeMax = Math.max(1, maxValue)
    const step = Math.max(1, Math.ceil(safeMax / 4))
    const labels = []
    for (let value = step * 4; value >= 0; value -= step) {
      labels.push(value)
    }
    return labels
  },

  computeMonthlyTrend(checkins) {
    const buckets = []
    const today = new Date()
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const monthKey = `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}`
      buckets.push({
        key: monthKey,
        label: `${d.getMonth() + 1}月`,
        doneDays: 0
      })
    }
    const bucketMap = buckets.reduce((acc, item, index) => {
      acc[item.key] = index
      return acc
    }, {})
    checkins.forEach((item) => {
      const monthKey = item.date.slice(0, 7)
      const idx = bucketMap[monthKey]
      if (idx === undefined) return
      if (item.doneCount > 0) {
        buckets[idx].doneDays += 1
      }
    })
    const maxValue = Math.max(...buckets.map((item) => item.doneDays), 1)
    const items = buckets.map((item) => ({
      ...item,
      heightPercent: Math.round((item.doneDays / maxValue) * 100),
      displayHeightPercent: item.doneDays > 0 ? Math.max(8, Math.round((item.doneDays / maxValue) * 100)) : 0
    }))
    return {
      items,
      maxValue,
      caption: '按最近6个月有打卡记录的天数统计'
    }
  },

  computeGoalCompletionRate(goals) {
    if (!goals.length) return 0
    const totalProgress = goals.reduce((sum, goal) => {
      const progress = Number(goal.progress || 0)
      const normalized = progress > 1 ? Math.min(1, progress / 100) : Math.min(1, progress)
      return sum + Math.max(0, normalized)
    }, 0)
    return Math.round((totalProgress / goals.length) * 100)
  },

  switchTrendMode(event) {
    const { mode } = event.currentTarget.dataset
    if (!mode || mode === this.data.trendMode) return
    this.setData({ trendMode: mode }, () => this.applyTrendMode())
  },

  onTrendTouchStart(event) {
    this.touchStartX = event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].clientX : 0
  },

  onTrendTouchEnd(event) {
    const endX = event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].clientX : 0
    const delta = endX - (this.touchStartX || 0)
    if (Math.abs(delta) < 40) return
    const nextMode = delta < 0 ? 'month' : 'week'
    if (nextMode === this.data.trendMode) return
    this.setData({ trendMode: nextMode }, () => this.applyTrendMode())
  },

  applyTrendMode() {
    const activeTrendData = this.data.trendMode === 'week' ? this.weekTrendData : this.monthTrendData
    if (!activeTrendData) return
    this.setData({
      weeklyTrend: activeTrendData.items,
      yAxisLabels: this.computeYAxisLabels(activeTrendData.maxValue),
      trendCaption: activeTrendData.caption || ''
    })
  },

  computeRankings(goals) {
    const normalized = goals.map((item) => {
      const progress = Number(item.progress) || 0
      return {
        id: item.id,
        title: item.title || '未命名目标',
        percent: Math.max(0, Math.min(100, Math.round(progress * 100)))
      }
    })

    return normalized.sort((a, b) => b.percent - a.percent).slice(0, 3)
  },

  goDateDetail(event) {
    const { date } = event.currentTarget.dataset
    if (!date) return
    wx.navigateTo({ url: `/pages/detail/detail?date=${date}` })
  },

  goGoalDetail(event) {
    const { id } = event.currentTarget.dataset
    if (!id) return
    wx.navigateTo({ url: `/pages/goal-detail/goal-detail?id=${id}` })
  }
})

function statsToNumber(value) {
  if (typeof value !== 'number') return 0
  return Number.isFinite(value) ? value : 0
}
