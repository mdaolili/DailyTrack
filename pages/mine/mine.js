const { KEYS } = require('../../utils/storage')
const SETTINGS_KEY = 'settings'

Page({
  data: {
    profile: { nickname: '时光记用户' },
    menus: [
      { key: 'lock', label: '日记加密' },
      { key: 'theme', label: '主题切换' },
      { key: 'export', label: '数据导出' },
      { key: 'help', label: '帮助与反馈' },
      { key: 'clear', label: '清除缓存' }
    ],
    settings: {
      diaryLockEnabled: false,
      theme: 'light'
    }
  },

  onShow() {
    const profile = wx.getStorageSync(KEYS.PROFILE)
    if (profile) this.setData({ profile })
    const settings = wx.getStorageSync(SETTINGS_KEY) || {}
    this.setData({
      settings: {
        diaryLockEnabled: Boolean(settings.diaryLockEnabled),
        theme: settings.theme || 'light'
      }
    })
  },

  handleMenuTap(event) {
    const key = event.currentTarget.dataset.key
    if (key === 'lock') {
      this.toggleDiaryLock()
      return
    }
    if (key === 'theme') {
      this.toggleTheme()
      return
    }
    if (key === 'export') {
      this.exportData()
      return
    }
    if (key === 'help') {
      wx.showModal({
        title: '帮助与反馈',
        content: '如遇到数据异常，请先进行数据导出备份，再尝试清除缓存。',
        showCancel: false
      })
      return
    }
    if (key === 'clear') {
      wx.showModal({
        title: '确认清除',
        content: '将清除缓存但保留核心数据（目标/日记/打卡）',
        success: (res) => {
          if (!res.confirm) return
          const diaries = wx.getStorageSync('diaries')
          const goals = wx.getStorageSync('goals')
          const checkins = wx.getStorageSync('checkins')
          wx.clearStorageSync()
          wx.setStorageSync('diaries', diaries)
          wx.setStorageSync('goals', goals)
          wx.setStorageSync('checkins', checkins)
          wx.showToast({ title: '已清除', icon: 'success' })
        }
      })
      return
    }
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  saveSettings(nextSettings) {
    wx.setStorageSync(SETTINGS_KEY, nextSettings)
    this.setData({ settings: nextSettings })
  },

  toggleTheme() {
    const nextTheme = this.data.settings.theme === 'light' ? 'dark' : 'light'
    const nextSettings = { ...this.data.settings, theme: nextTheme }
    this.saveSettings(nextSettings)
    wx.showToast({ title: `已切换${nextTheme === 'light' ? '浅色' : '深色'}主题`, icon: 'none' })
  },

  toggleDiaryLock() {
    if (this.data.settings.diaryLockEnabled) {
      const nextSettings = { ...this.data.settings, diaryLockEnabled: false }
      this.saveSettings(nextSettings)
      wx.showToast({ title: '已关闭日记加密', icon: 'none' })
      return
    }
    wx.showModal({
      title: '设置日记密码',
      editable: true,
      placeholderText: '请输入6位以上密码',
      success: (res) => {
        if (!res.confirm) return
        const password = (res.content || '').trim()
        if (password.length < 6) {
          wx.showToast({ title: '密码至少6位', icon: 'none' })
          return
        }
        const nextSettings = {
          ...this.data.settings,
          diaryLockEnabled: true,
          diaryPassword: password
        }
        this.saveSettings(nextSettings)
        wx.showToast({ title: '日记加密已开启', icon: 'success' })
      }
    })
  },

  exportData() {
    const payload = {
      diaries: wx.getStorageSync('diaries') || [],
      goals: wx.getStorageSync('goals') || [],
      checkins: wx.getStorageSync('checkins') || [],
      exportTime: Date.now()
    }
    const text = JSON.stringify(payload, null, 2)
    const filePath = `${wx.env.USER_DATA_PATH}/daily-track-export-${Date.now()}.txt`
    wx.getFileSystemManager().writeFile({
      filePath,
      data: text,
      encoding: 'utf8',
      success: () => {
        wx.showModal({
          title: '导出成功',
          content: '数据文件已生成，可复制内容做备份。',
          confirmText: '复制内容',
          success: (res) => {
            if (!res.confirm) return
            wx.setClipboardData({ data: text })
          }
        })
      },
      fail: () => {
        wx.setClipboardData({
          data: text,
          success: () => wx.showToast({ title: '已复制导出数据', icon: 'none' })
        })
      }
    })
  }
})
