Component({
  properties: {
    currentMonth: String,
    days: {
      type: Array,
      value: []
    }
  },
  lifetimes: {
    attached() {
      this.touchStartX = 0
    }
  },
  methods: {
    onPrevMonth() {
      this.triggerEvent('changemonth', { direction: 'prev' })
    },
    onNextMonth() {
      this.triggerEvent('changemonth', { direction: 'next' })
    },
    onSelectDay(event) {
      this.triggerEvent('selectday', { date: event.currentTarget.dataset.date })
    },
    onLongPressDay(event) {
      this.triggerEvent('longpressday', { date: event.currentTarget.dataset.date })
    },
    onTouchStart(event) {
      const touch = event.touches && event.touches[0]
      this.touchStartX = touch ? touch.pageX : 0
    },
    onTouchEnd(event) {
      const touch = event.changedTouches && event.changedTouches[0]
      const endX = touch ? touch.pageX : 0
      const offsetX = endX - this.touchStartX
      if (Math.abs(offsetX) < 60) return
      const direction = offsetX > 0 ? 'prev' : 'next'
      this.triggerEvent('changemonth', { direction })
    }
  }
})
