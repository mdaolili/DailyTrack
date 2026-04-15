Component({
  properties: {
    item: Object
  },
  methods: {
    onToggle() {
      this.triggerEvent('toggle', { id: this.properties.item.id })
    },
    onDelete() {
      this.triggerEvent('remove', { id: this.properties.item.id })
    }
  }
})
