const { formatDate } = require('../../utils/date')
const { getDiaryByDate, saveDiary, getCheckins, saveCheckins, getGoals, saveGoal } = require('../../utils/storage')

function createId() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`
}

Page({
  data: {
    date: '',
    dateTitle: '',
    dateWeek: '',
    statusBarHeight: 20,
    todoFold: false,
    todoList: [],
    newTask: '',
    diary: { date: '', title: '', content: '', images: [], mood: '' },
    moods: [
      { value: '开心', icon: '☺' },
      { value: '平静', icon: '😐' },
      { value: '疲惫', icon: '☹' },
      { value: '努力', icon: '⚡' },
      { value: '焦虑', icon: '😣' },
      { value: '兴奋', icon: '🤩' }
    ],
    saveTip: '自动保存已开启',
    focusDiaryEditor: false
  },

  onLoad(options) {
    const date = options.date || formatDate(new Date())
    this.currentDate = date
    this.isDeleted = false
    const systemInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const dateObj = new Date(date)
    this.initialLoadDone = false
    this.loadPageData(date, options)
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight || 20,
      dateTitle: `${dateObj.getFullYear()}年${`${dateObj.getMonth() + 1}`.padStart(2, '0')}月${`${dateObj.getDate()}`.padStart(2, '0')}日`,
      dateWeek: weekMap[dateObj.getDay()]
    })
  },

  onShow() {
    if (!this.initialLoadDone) {
      this.initialLoadDone = true
      return
    }
    if (this.currentDate) {
      this.loadPageData(this.currentDate)
    }
  },

  loadPageData(date, options = {}) {
    const diary = getDiaryByDate(date) || { date, title: '', content: '', images: [], mood: '' }
    const checkinRecord = getCheckins().find((item) => item.date === date) || { date, items: [] }
    const todoList = this.syncGoalTodosWithCheckins(date, checkinRecord.items || [])
    const shouldFocus = Number(options.focus || 0) === 1
    const shouldQuickCheckin = Number(options.quickCheckin || 0) === 1
    const nextTodoList = shouldQuickCheckin && todoList.length
      ? todoList.map((item, index) => (index === 0 ? { ...item, done: true } : item))
      : todoList
    this.setData({
      date,
      diary,
      todoList: nextTodoList,
      focusDiaryEditor: shouldFocus
    }, () => this.persistAll())
  },

  syncGoalTodosWithCheckins(date, checkinItems) {
    const goals = getGoals().filter((goal) => {
      if (goal.isCompleted) return false
      const start = goal.startTime || ''
      const end = goal.endTime || ''
      return start <= date && date <= end
    })
    const goalItemMap = checkinItems.reduce((acc, item) => ({ ...acc, [item.id]: item }), {})
    const goalItems = goals
      .filter((goal) => !(goal.type === 'week' && Array.isArray(goal.todoList) && goal.todoList.length))
      .map((goal) => {
        const oldItem = goalItemMap[goal.id]
        return {
          id: goal.id,
          content: goal.title,
          done: Boolean(oldItem && oldItem.done),
          source: 'goal'
        }
      })

    const weekTodoItems = []
    goals
      .filter((goal) => goal.type === 'week' && Array.isArray(goal.todoList) && goal.todoList.length)
      .forEach((goal) => {
        goal.todoList.forEach((todo, index) => {
          if (todo.date !== date) return
          const todoId = todo.id || `${goal.id}_${todo.date}_${index}`
          const oldItem = goalItemMap[todoId]
          weekTodoItems.push({
            id: todoId,
            content: todo.content || goal.title,
            done: Boolean(oldItem ? oldItem.done : todo.done),
            source: 'weekGoal',
            goalId: goal.id,
            todoDate: todo.date
          })
        })
      })

    const tempItems = checkinItems.filter((item) => item.source !== 'goal' && item.source !== 'weekGoal')
    return [...goalItems, ...weekTodoItems, ...tempItems]
  },

  onUnload() {
    if (this.isDeleted) return
    this.persistAll()
  },

  persistAll() {
    const { diary, date, todoList } = this.data
    saveDiary({ ...diary, date })
    const checkins = getCheckins()
    const record = {
      date,
      targetIds: todoList.filter((item) => item.done).map((item) => item.id),
      doneCount: todoList.filter((item) => item.done).length,
      totalCount: todoList.length,
      items: todoList
    }
    const index = checkins.findIndex((item) => item.date === date)
    if (index > -1) checkins[index] = record
    else checkins.push(record)
    saveCheckins(checkins)
  },

  autoSaveDiary(nextDiary) {
    this.setData({ diary: nextDiary, saveTip: '正在保存...' })
    saveDiary(nextDiary)
    this.setData({ saveTip: '已自动保存' })
  },

  goBack() {
    wx.navigateBack()
  },

  openMoreActions() {
    wx.showActionSheet({
      itemList: ['分享', '导出图片', '删除当日内容'],
      itemColor: '#111827',
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.showShareMenu({ withShareTicket: true })
          wx.showToast({ title: '已打开分享', icon: 'none' })
          return
        }
        if (res.tapIndex === 1) {
          this.exportDiaryImage()
          return
        }
        if (res.tapIndex === 2) {
          this.deleteCurrentDetail()
        }
      }
    })
  },

  exportDiaryImage() {
    const { date, diary, todoList } = this.data
    wx.showLoading({ title: '正在导出' })
    const systemInfo = wx.getSystemInfoSync()
    const pxPerRpx = systemInfo.windowWidth / 750
    const canvasWidth = Math.floor(690 * pxPerRpx)
    const canvasHeight = Math.floor(1080 * pxPerRpx)
    const padding = Math.floor(40 * pxPerRpx)
    const lineHeight = Math.floor(42 * pxPerRpx)
    const contentWidth = canvasWidth - padding * 2
    const doneCount = todoList.filter((item) => item.done).length
    const title = diary.title || '今日日记'
    const moodText = diary.mood || '未选择'
    const content = diary.content || '今天还没有记录正文内容。'

    const ctx = wx.createCanvasContext('exportCanvas', this)
    ctx.setFillStyle('#F8FAFC')
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    ctx.setFillStyle('#FFFFFF')
    ctx.fillRect(Math.floor(16 * pxPerRpx), Math.floor(16 * pxPerRpx), canvasWidth - Math.floor(32 * pxPerRpx), canvasHeight - Math.floor(32 * pxPerRpx))

    let cursorY = padding + Math.floor(10 * pxPerRpx)

    ctx.setFillStyle('#111827')
    ctx.setFontSize(Math.floor(34 * pxPerRpx))
    ctx.fillText('时光记 · 日记导出', padding, cursorY)
    cursorY += Math.floor(56 * pxPerRpx)

    ctx.setFillStyle('#334155')
    ctx.setFontSize(Math.floor(24 * pxPerRpx))
    ctx.fillText(`日期：${date}`, padding, cursorY)
    cursorY += Math.floor(40 * pxPerRpx)
    ctx.fillText(`心情：${moodText}`, padding, cursorY)
    cursorY += Math.floor(40 * pxPerRpx)
    ctx.fillText(`待办完成：${doneCount}/${todoList.length}`, padding, cursorY)
    cursorY += Math.floor(52 * pxPerRpx)

    ctx.setFillStyle('#0F172A')
    ctx.setFontSize(Math.floor(30 * pxPerRpx))
    ctx.fillText(title, padding, cursorY)
    cursorY += Math.floor(48 * pxPerRpx)

    ctx.setStrokeStyle('#E2E8F0')
    ctx.strokeRect(padding, cursorY - Math.floor(32 * pxPerRpx), contentWidth, Math.floor(2 * pxPerRpx))
    cursorY += Math.floor(16 * pxPerRpx)

    ctx.setFillStyle('#1F2937')
    ctx.setFontSize(Math.floor(24 * pxPerRpx))
    const lines = this.wrapCanvasText(content, contentWidth, ctx)
    lines.forEach((line) => {
      ctx.fillText(line, padding, cursorY)
      cursorY += lineHeight
    })

    cursorY += Math.floor(20 * pxPerRpx)
    ctx.setFillStyle('#64748B')
    ctx.setFontSize(Math.floor(20 * pxPerRpx))
    ctx.fillText(`导出时间：${new Date().toLocaleString()}`, padding, cursorY)

    ctx.draw(false, () => {
      wx.canvasToTempFilePath({
        canvasId: 'exportCanvas',
        width: canvasWidth,
        height: canvasHeight,
        destWidth: canvasWidth * 2,
        destHeight: canvasHeight * 2,
        success: (res) => {
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.hideLoading()
              wx.showToast({ title: '已保存到相册', icon: 'success' })
            },
            fail: () => {
              wx.hideLoading()
              wx.showModal({
                title: '保存失败',
                content: '需要相册权限才能保存图片，请在设置中授权后重试。',
                confirmText: '去设置',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    wx.openSetting()
                  }
                }
              })
            }
          })
        },
        fail: () => {
          wx.hideLoading()
          wx.showToast({ title: '导出失败，请重试', icon: 'none' })
        }
      }, this)
    })
  },

  wrapCanvasText(text, maxWidth, ctx) {
    const lines = []
    const paragraphs = `${text}`.split('\n')
    paragraphs.forEach((paragraph) => {
      if (!paragraph) {
        lines.push('')
        return
      }
      let currentLine = ''
      for (let i = 0; i < paragraph.length; i += 1) {
        const char = paragraph[i]
        const testLine = `${currentLine}${char}`
        const metrics = ctx.measureText(testLine)
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine)
          currentLine = char
        } else {
          currentLine = testLine
        }
      }
      if (currentLine) lines.push(currentLine)
    })
    return lines.slice(0, 28)
  },

  deleteCurrentDetail() {
    const { date } = this.data
    wx.showModal({
      title: '删除当日内容',
      content: '删除后将清空该日期的日记与打卡记录，是否继续？',
      confirmColor: '#C4232A',
      success: (res) => {
        if (!res.confirm) return
        this.isDeleted = true

        const diaries = (wx.getStorageSync('diaries') || []).filter((item) => item.date !== date)
        const checkins = (wx.getStorageSync('checkins') || []).filter((item) => item.date !== date)
        wx.setStorageSync('diaries', diaries)
        wx.setStorageSync('checkins', checkins)

        const goals = getGoals().map((goal) => {
          const checkList = (goal.checkList || []).filter((item) => item !== date)
          const todoList = Array.isArray(goal.todoList)
            ? goal.todoList.map((todo) => (todo.date === date ? { ...todo, done: false } : todo))
            : []
          return {
            ...goal,
            checkList,
            todoList,
            progress: this.calculateGoalProgress(goal.startTime, goal.endTime, checkList)
          }
        })
        goals.forEach((goal) => saveGoal(goal))

        wx.showToast({
          title: '已删除',
          icon: 'success',
          success: () => {
            setTimeout(() => {
              wx.navigateBack()
            }, 350)
          }
        })
      }
    })
  },

  toggleTodoFold() {
    this.setData({ todoFold: !this.data.todoFold })
  },

  onTaskInput(event) {
    this.setData({ newTask: event.detail.value })
  },

  addTempTodo() {
    const value = this.data.newTask.trim()
    if (!value) return
    this.setData({
      todoList: [...this.data.todoList, { id: createId(), content: value, done: false, source: '临时' }],
      newTask: ''
    }, () => this.persistAll())
  },

  toggleTodo(event) {
    const { id } = event.detail
    const list = this.data.todoList.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    const changed = list.find((item) => item.id === id)
    if (changed && changed.source === 'goal') {
      this.syncGoalCheckState(id, this.data.date, changed.done)
    }
    if (changed && changed.source === 'weekGoal') {
      this.syncWeekGoalTodoState(changed.goalId, changed.id, changed.done)
    }
    this.setData({ todoList: list }, () => this.persistAll())
  },

  syncWeekGoalTodoState(goalId, todoId, done) {
    const goals = getGoals()
    const nextGoals = goals.map((goal) => {
      if (goal.id !== goalId) return goal
      const todoList = (goal.todoList || []).map((todo, index) => {
        const currentId = todo.id || `${goal.id}_${todo.date}_${index}`
        if (currentId !== todoId) return todo
        return { ...todo, id: currentId, done }
      })
      const checkList = todoList.filter((todo) => todo.done).map((todo) => todo.date)
      return {
        ...goal,
        todoList,
        checkList,
        progress: this.calculateGoalProgress(goal.startTime, goal.endTime, checkList)
      }
    })
    nextGoals.forEach((goal) => saveGoal(goal))
  },

  removeTodo(event) {
    const { id } = event.detail
    this.setData({ todoList: this.data.todoList.filter((item) => item.id !== id) }, () => this.persistAll())
  },

  onDiaryTitleInput(event) {
    this.autoSaveDiary({ ...this.data.diary, title: event.detail.value })
  },

  onDiaryContentInput(event) {
    if (this.data.focusDiaryEditor) {
      this.setData({ focusDiaryEditor: false })
    }
    this.autoSaveDiary({ ...this.data.diary, content: event.detail.value })
  },

  onImageChange(event) {
    this.autoSaveDiary({ ...this.data.diary, images: event.detail.images })
  },

  selectMood(event) {
    this.autoSaveDiary({ ...this.data.diary, mood: event.currentTarget.dataset.value })
  },

  syncGoalCheckState(goalId, date, done) {
    const goals = getGoals()
    const nextGoals = goals.map((goal) => {
      if (goal.id !== goalId) return goal
      const checkList = Array.isArray(goal.checkList) ? goal.checkList : []
      const hasDate = checkList.includes(date)
      const nextCheckList = done
        ? (hasDate ? checkList : [...checkList, date])
        : checkList.filter((item) => item !== date)
      return {
        ...goal,
        checkList: nextCheckList,
        progress: this.calculateGoalProgress(goal.startTime, goal.endTime, nextCheckList)
      }
    })
    nextGoals.forEach((goal) => saveGoal(goal))
  },

  calculateGoalProgress(startTime, endTime, checkList) {
    if (!startTime || !endTime) return 0
    const start = new Date(startTime)
    const end = new Date(endTime)
    const oneDay = 24 * 60 * 60 * 1000
    const totalDays = Math.max(1, Math.floor((end - start) / oneDay) + 1)
    return Math.min(1, (checkList || []).length / totalDays)
  }
})
