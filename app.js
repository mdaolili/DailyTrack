const { syncHolidayConfigs } = require('./utils/date')

App({
  onLaunch() {
    // 初始化核心数据，确保离线模式首启可用。
    const keys = ['diaries', 'goals', 'checkins', 'theme', 'profile']
    keys.forEach((key) => {
      if (wx.getStorageSync(key) === '') {
        if (key === 'theme') {
          wx.setStorageSync(key, 'light')
        } else if (key === 'profile') {
          wx.setStorageSync(key, { nickname: '时光记用户', avatar: '' })
        } else {
          wx.setStorageSync(key, [])
        }
      }
    })

    // 预热当前年与下一年的节假日配置，失败时由本地兜底，不影响正常使用。
    const currentYear = new Date().getFullYear()
    syncHolidayConfigs([currentYear, currentYear + 1]).catch(() => {})
  },
  globalData: {
    primaryColor: '#4C6FFF'
  }
})
