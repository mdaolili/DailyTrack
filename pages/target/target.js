const { getGoals } = require('../../utils/storage')
const { formatDate } = require('../../utils/date')

Page({
  data: {
    tabs: [
      { value: 'year', label: '年目标' },
      { value: 'month', label: '月目标' },
      { value: 'week', label: '周目标' }
    ],
    activeTab: 'year',
    goals: [],
    displayGoals: [],
    modalMode: 'edit',
    showEditModal: false,
    editForm: {
      id: '',
      type: 'year',
      title: '',
      description: '',
      startTime: '',
      endTime: ''
    }
  },

  onShow() {
    this.consumeFocusGoal()
    this.loadGoals()
  },

  consumeFocusGoal() {
    const focusGoalId = wx.getStorageSync('focusGoalId')
    if (!focusGoalId) {
      this.focusGoalId = ''
      return
    }
    this.focusGoalId = focusGoalId
    wx.removeStorageSync('focusGoalId')
  },

  loadGoals() {
    const goals = getGoals()
    this.setData({ goals }, () => this.updateDisplayGoals())
  },

  updateDisplayGoals() {
    let list = this.data.goals
      .filter((item) => item.type === this.data.activeTab)
      .map((item) => {
        const progressValue = Number(item.progress || 0)
        const progressPercent = progressValue > 1 ? Math.round(progressValue) : Math.round(progressValue * 100)
        const checkDays = Array.isArray(item.checkList) ? item.checkList.length : 0
        return {
          ...item,
          progressPercent,
          checkDays
        }
      })
    if (this.focusGoalId) {
      const focusedGoal = this.data.goals.find((item) => item.id === this.focusGoalId)
      if (focusedGoal && focusedGoal.type !== this.data.activeTab) {
        this.setData({ activeTab: focusedGoal.type })
        list = this.data.goals
          .filter((item) => item.type === focusedGoal.type)
          .map((item) => {
            const progressValue = Number(item.progress || 0)
            const progressPercent = progressValue > 1 ? Math.round(progressValue) : Math.round(progressValue * 100)
            const checkDays = Array.isArray(item.checkList) ? item.checkList.length : 0
            return {
              ...item,
              progressPercent,
              checkDays
            }
          })
      }
      const focused = list.find((item) => item.id === this.focusGoalId)
      if (focused) {
        wx.showToast({ title: `已定位：${focused.title}`, icon: 'none' })
      }
      this.focusGoalId = ''
    }
    this.setData({ displayGoals: list })
  },

  switchTab(event) {
    this.setData({ activeTab: event.currentTarget.dataset.type }, () => this.updateDisplayGoals())
  },

  goGoalDetail(event) {
    const { id } = event.currentTarget.dataset
    if (!id) return
    wx.navigateTo({ url: `/pages/goal-detail/goal-detail?id=${id}` })
  },

  openCreateModal() {
    const type = this.data.activeTab
    const startTime = formatDate(new Date())
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + (type === 'year' ? 12 : type === 'month' ? 1 : 0))
    endDate.setDate(endDate.getDate() + (type === 'week' ? 7 : 0))
    this.setData({
      modalMode: 'create',
      showEditModal: true,
      editForm: {
        id: '',
        type,
        title: '',
        description: '',
        startTime,
        endTime: formatDate(endDate)
      }
    })
  },

  removeGoal(event) {
    const id = event.currentTarget.dataset.id
    const goals = this.data.goals.filter((item) => item.id !== id)
    wx.setStorageSync('goals', goals)
    this.setData({ goals }, () => this.updateDisplayGoals())
  },

  openEditModal(event) {
    const id = event.currentTarget.dataset.id
    const goal = this.data.goals.find((item) => item.id === id)
    if (!goal) return
    this.setData({
      modalMode: 'edit',
      showEditModal: true,
      editForm: {
        id: goal.id,
        type: goal.type,
        title: goal.title || '',
        description: goal.description || '',
        startTime: goal.startTime || '',
        endTime: goal.endTime || ''
      }
    })
  },

  closeEditModal() {
    this.setData({ showEditModal: false })
  },

  noop() {},

  onEditTitleInput(event) {
    this.setData({ 'editForm.title': event.detail.value })
  },

  onEditDescInput(event) {
    this.setData({ 'editForm.description': event.detail.value })
  },

  onEditStartChange(event) {
    this.setData({ 'editForm.startTime': event.detail.value })
  },

  onEditEndChange(event) {
    this.setData({ 'editForm.endTime': event.detail.value })
  },

  submitGoalForm() {
    const { editForm, goals } = this.data
    if (!editForm.title.trim()) {
      wx.showToast({ title: '请填写目标标题', icon: 'none' })
      return
    }
    if (!editForm.startTime || !editForm.endTime) {
      wx.showToast({ title: '请选择开始和结束日期', icon: 'none' })
      return
    }
    if (editForm.startTime > editForm.endTime) {
      wx.showToast({ title: '开始日期不能晚于结束日期', icon: 'none' })
      return
    }

    if (this.data.modalMode === 'create') {
      const goalId = `${Date.now()}`
      const newGoal = {
        id: goalId,
        type: editForm.type,
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        progress: 0,
        checkList: [],
        todoList: editForm.type === 'week'
          ? createDailyTodos(editForm.startTime, editForm.endTime, editForm.title.trim(), goalId)
          : [],
        parentId: '',
        isCompleted: false
      }
      const nextGoals = [...goals, newGoal]
      wx.setStorageSync('goals', nextGoals)
      this.setData({ goals: nextGoals, showEditModal: false }, () => this.updateDisplayGoals())
      wx.showToast({ title: '目标已新增', icon: 'success' })
      return
    }

    const nextGoals = goals.map((item) => {
      if (item.id !== editForm.id) return item
      return {
        ...item,
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        startTime: editForm.startTime,
        endTime: editForm.endTime
      }
    })
    wx.setStorageSync('goals', nextGoals)
    this.setData({ goals: nextGoals, showEditModal: false }, () => this.updateDisplayGoals())
    wx.showToast({ title: '目标已更新', icon: 'success' })
  }
})

function createDailyTodos(startTime, endTime, title, goalId) {
  if (!startTime || !endTime) return []
  const start = new Date(startTime)
  const end = new Date(endTime)
  const list = []
  let cursor = new Date(start)
  while (cursor <= end && list.length < 31) {
    const date = formatDate(cursor)
    list.push({
      id: `${goalId}_${date}`,
      date,
      content: `${title}（每日）`,
      done: false
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return list
}
