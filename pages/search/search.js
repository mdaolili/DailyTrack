const { getDiaries } = require('../../utils/storage')

Page({
  data: {
    keyword: '',
    results: [],
    resultCount: 0
  },

  onKeywordInput(event) {
    const keyword = (event.detail.value || '').trim()
    this.setData({ keyword }, () => this.searchDiaries())
  },

  clearKeyword() {
    this.setData({
      keyword: '',
      results: [],
      resultCount: 0
    })
  },

  searchDiaries() {
    const keyword = this.data.keyword.toLowerCase()
    if (!keyword) {
      this.setData({ results: [], resultCount: 0 })
      return
    }
    const diaries = getDiaries()
    const matched = diaries
      .filter((item) => {
        const title = `${item.title || ''}`.toLowerCase()
        const content = `${item.content || ''}`.toLowerCase()
        return title.includes(keyword) || content.includes(keyword)
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map((item) => ({
        ...item,
        preview: (item.content || '无正文内容').replace(/\s+/g, ' ').slice(0, 46)
      }))
    this.setData({
      results: matched,
      resultCount: matched.length
    })
  },

  goDetail(event) {
    const { date } = event.currentTarget.dataset
    if (!date) return
    wx.navigateTo({ url: `/pages/detail/detail?date=${date}` })
  }
})
