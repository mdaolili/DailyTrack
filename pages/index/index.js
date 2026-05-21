const { formatDate, formatMonthLabel, getMonthMatrix, getPrevMonth, getNextMonth, getHolidayAndSolarTerm, syncHolidayConfigByYear } = require('../../utils/date')
const { getDiaries, getCheckins, getDiaryByDate, isDiaryMeaningful } = require('../../utils/storage')

Page({
  data: {
    currentMonth: '',
    calendarDays: [],
    todayLabel: '',
    todayMMDD: '',
    todayTodoCount: 0,
    todayHasDone: false,
    todayDiaryText: '未记录'
  },

  onLoad() {
    this.currentDateObj = new Date()
  },

  async onShow() {
    await this.syncHolidayData()
    this.refreshCalendar()
  },

  async syncHolidayData() {
    const currentDateObj = this.currentDateObj || new Date()
    const currentYear = currentDateObj.getFullYear()
    await Promise.all([
      syncHolidayConfigByYear(currentYear),
      syncHolidayConfigByYear(currentYear + 1)
    ])
  },

  refreshCalendar() {
    const currentDateObj = this.currentDateObj || new Date()
    const diaries = getDiaries()
    const checkins = getCheckins()
    const diaryMap = diaries.reduce((acc, item) => ({ ...acc, [item.date]: item }), {})
    const checkinMap = checkins.reduce((acc, item) => ({ ...acc, [item.date]: item }), {})
    const today = formatDate(new Date())
    const monthDays = getMonthMatrix(currentDateObj).map((item) => {
      const checkin = checkinMap[item.date]
      const dateLabel = getHolidayAndSolarTerm(item.date)
      return {
        ...item,
        isToday: item.date === today,
        hasDiary: isDiaryMeaningful(diaryMap[item.date]),
        hasCheckin: Boolean(checkin && checkin.doneCount > 0),
        hasPending: Boolean(checkin && checkin.totalCount > checkin.doneCount),
        dateLabel: dateLabel.label,
        dayType: dateLabel.dayType,
        dayTag: dateLabel.dayTag
      }
    })
    const todayCheckin = checkinMap[today]

    this.setData({
      currentMonth: formatMonthLabel(currentDateObj),
      calendarDays: monthDays,
      todayLabel: today,
      todayMMDD: today.slice(5),
      todayTodoCount: todayCheckin ? todayCheckin.totalCount : 0,
      todayHasDone: Boolean(todayCheckin && todayCheckin.doneCount > 0),
      todayDiaryText: isDiaryMeaningful(diaryMap[today]) ? '已记录' : '未记录'
    })
  },

  handleChangeMonth(event) {
    const { direction } = event.detail
    const currentDateObj = this.currentDateObj || new Date()
    this.currentDateObj = direction === 'prev' ? getPrevMonth(currentDateObj) : getNextMonth(currentDateObj)
    this.refreshCalendar()
  },

  handleSelectDay(event) {
    const { date } = event.detail
    wx.navigateTo({ url: `/pages/detail/detail?date=${date}` })
  },

  handleLongPressDay(event) {
    const { date } = event.detail
    wx.showActionSheet({
      itemList: ['写日记', '快速打卡'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.navigateTo({ url: `/pages/detail/detail?date=${date}&focus=1` })
          return
        }
        if (res.tapIndex === 1) {
          const diary = getDiaryByDate(date)
          wx.navigateTo({ url: `/pages/detail/detail?date=${date}&quickCheckin=1${diary ? '' : '&focus=1'}` })
        }
      }
    })
  },

  goTodayDetail() {
    wx.navigateTo({ url: `/pages/detail/detail?date=${formatDate(new Date())}&focus=1` })
  },

  goSearch() {
    wx.navigateTo({ url: '/pages/search/search' })
  },

  goMine() {
    wx.switchTab({ url: '/pages/mine/mine' })
  }
})
