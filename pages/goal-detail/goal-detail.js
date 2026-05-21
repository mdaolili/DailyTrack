const { getGoals } = require('../../utils/storage')

Page({
  data: {
    goal: null,
    typeLabel: '',
    progressPercent: 0,
    checkDays: 0,
    totalDays: 0,
    monthLabel: '',
    weekLabels: ['一', '二', '三', '四', '五', '六', '日'],
    monthDays: []
  },

  onLoad(options) {
    this.goalId = options.id || ''
  },

  onShow() {
    this.loadGoalDetail()
  },

  loadGoalDetail() {
    const goal = getGoals().find((item) => item.id === this.goalId)
    if (!goal) {
      this.setData({ goal: null, monthDays: [] })
      return
    }
    const checkList = Array.isArray(goal.checkList) ? goal.checkList : []
    const progressValue = Number(goal.progress || 0)
    const progressPercent = progressValue > 1 ? Math.round(progressValue) : Math.round(progressValue * 100)
    const totalDays = this.getDateRangeDays(goal.startTime, goal.endTime)
    const monthDays = this.buildMonthDays(goal, checkList)
    const monthLabel = monthDays.length ? monthDays[0].date.slice(0, 7) : ''
    this.setData({
      goal,
      typeLabel: this.getTypeLabel(goal.type),
      progressPercent,
      checkDays: checkList.length,
      totalDays,
      monthDays,
      monthLabel
    })
  },

  getTypeLabel(type) {
    if (type === 'year') return '年目标'
    if (type === 'month') return '月目标'
    if (type === 'week') return '周目标'
    return '目标'
  },

  getDateRangeDays(startTime, endTime) {
    if (!startTime || !endTime) return 0
    const start = new Date(startTime)
    const end = new Date(endTime)
    const oneDay = 24 * 60 * 60 * 1000
    return Math.max(0, Math.floor((end - start) / oneDay) + 1)
  },

  buildMonthDays(goal, checkList) {
    if (!goal.startTime) return []
    const monthDate = new Date(goal.startTime)
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const startWeekIndex = (firstDay.getDay() + 6) % 7
    const gridStart = new Date(firstDay)
    gridStart.setDate(firstDay.getDate() - startWeekIndex)
    const days = []
    for (let i = 0; i < 35; i += 1) {
      const d = new Date(gridStart)
      d.setDate(gridStart.getDate() + i)
      const date = this.formatDate(d)
      days.push({
        date,
        day: d.getDate(),
        inMonth: d.getMonth() === month,
        done: checkList.includes(date)
      })
    }
    return days
  },

  formatDate(date) {
    const y = date.getFullYear()
    const m = `${date.getMonth() + 1}`.padStart(2, '0')
    const d = `${date.getDate()}`.padStart(2, '0')
    return `${y}-${m}-${d}`
  }
})
