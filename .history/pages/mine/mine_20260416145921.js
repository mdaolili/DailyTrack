const { KEYS } = require('../../utils/storage')

Page({
  data: {
    profile: { nickname: '时光记用户' },
    menus: [
      { key: 'clear', label: '清除缓存' }
    ]
  },

  onShow() {
    const profile = wx.getStorageSync(KEYS.PROFILE)
    if (profile) this.setData({ profile })
  },

  handleMenuTap(event) {
    const key = event.currentTarget.dataset.key
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
  }
})
