Component({
  properties: {
    images: {
      type: Array,
      value: []
    }
  },
  methods: {
    chooseImage() {
      wx.chooseMedia({
        count: 6,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const files = res.tempFiles.map((item) => item.tempFilePath)
          this.triggerEvent('change', { images: [...this.properties.images, ...files] })
        }
      })
    },
    previewImage(event) {
      const current = event.currentTarget.dataset.path
      wx.previewImage({
        urls: this.properties.images,
        current
      })
    },
    removeImage(event) {
      const path = event.currentTarget.dataset.path
      this.triggerEvent('change', { images: this.properties.images.filter((item) => item !== path) })
    }
  }
})
