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
      { value: '开心', icon: '/images/icon/mood-happy.png', isImage: true },
      { value: '平静', icon: '/images/icon/mood-calm.png', isImage: true },
      { value: '疲惫', icon: '/images/icon/mood-tired.png', isImage: true },
      { value: '努力', icon: '/images/icon/mood-effort.png', isImage: true },
      { value: '焦虑', icon: '/images/icon/mood-anxious.png', isImage: true },
      { value: '兴奋', icon: '/images/icon/mood-excited.png', isImage: true }
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
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight || 20,
      dateTitle: `${dateObj.getFullYear()}年${`${dateObj.getMonth() + 1}`.padStart(2, '0')}月${`${dateObj.getDate()}`.padStart(2, '0')}日`,
      dateWeek: weekMap[dateObj.getDay()]
    }, () => this.ensureDiaryAccess(() => this.loadPageData(date, options)))
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
    // 快速打卡与手动点选待办一致：必须把完成状态写回 goals，否则统计/目标页进度与打卡记录脱节
    if (shouldQuickCheckin && nextTodoList.length) {
      const first = nextTodoList[0]
      if (first.done) {
        if (first.source === 'goal') this.syncGoalCheckState(first.id, date, true)
        if (first.source === 'weekGoal') this.syncWeekGoalTodoState(first.goalId, first.id, true)
      }
    }
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
  },

  ensureDiaryAccess(successCallback) {
    const settings = wx.getStorageSync('settings') || {}
    if (!settings.diaryLockEnabled) {
      successCallback()
      return
    }
    wx.showModal({
      title: '请输入日记密码',
      editable: true,
      placeholderText: '输入密码后查看详情',
      success: (res) => {
        if (!res.confirm) {
          wx.navigateBack()
          return
        }
        if ((res.content || '') !== (settings.diaryPassword || '')) {
          wx.showToast({ title: '密码错误', icon: 'none' })
          setTimeout(() => wx.navigateBack(), 350)
          return
        }
        successCallback()
      }
    })
  }
})
