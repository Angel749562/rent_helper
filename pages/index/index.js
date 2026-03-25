// pages/index/index.js
Page({
    data: {
      rooms: [],
      selectedRoom: null,
      roomIndex: 0,
      electricityReading: '',
      electricityUsage: 0,
      electricityFee: 0,
      waterReading: '',
      waterUsage: 0,
      waterFee: 0,
      paymentMethod: '微信',
      notes: '',
      totalAmount: 0
    },
  
    onLoad() {
      // 初始化云开发环境（替换成你的环境ID）
      wx.cloud.init({
        env: 'cloud1-1gzaw4kw323a23a9', 
        traceUser: true
      })
      this.loadRooms()
    },
  
    onShow() {
      this.loadRooms() // 每次显示页面重新加载房间，确保拿到最新读数
    },
  
    // 加载所有房间
    loadRooms() {
      console.log('开始加载房间...')
      const db = wx.cloud.database()
      
      db.collection('rooms').get().then(res => {
        console.log('加载房间成功:', res)
        const rooms = res.data || []
        
        // 排序
        rooms.sort((a, b) => {
          if (a.building !== b.building) {
            return a.building.localeCompare(b.building)
          }
          return a.roomNumber.localeCompare(b.roomNumber, 'zh', { numeric: true })
        })
        
        this.setData({ 
          rooms,
          selectedRoom: rooms[0] || null
        })
        
        if (rooms.length > 0) {
          this.resetCalculation()
        } else {
          wx.showToast({ 
            title: '暂无房间，请先添加', 
            icon: 'none',
            duration: 3000
          })
        }
      }).catch(err => {
        console.error('加载房间失败:', err)
        wx.showToast({ 
          title: '加载失败: ' + (err.errMsg || '未知错误'), 
          icon: 'none',
          duration: 3000
        })
      })
    },
  
    resetCalculation() {
      const baseRent = this.data.selectedRoom?.baseRent || 0
      this.setData({
        electricityReading: '',
        waterReading: '',
        electricityUsage: 0,
        electricityFee: 0,
        waterUsage: 0,
        waterFee: 0,
        totalAmount: baseRent
      })
    },
  
    onRoomChange(e) {
      const index = e.detail.value
      const room = this.data.rooms[index]
      this.setData({
        roomIndex: index,
        selectedRoom: room
      })
      this.resetCalculation()
    },
  
    onElectricityInput(e) {
      const value = e.detail.value.trim()
      this.setData({ electricityReading: value })
      this.calculateElectricity()
      this.calculateTotal()
    },
  
    calculateElectricity() {
      if (!this.data.selectedRoom) return
      
      const room = this.data.selectedRoom
      const current = Number(this.data.electricityReading) || 0
      const last = Number(room.lastElectricityReading) || 0
      
      if (current >= last) {
        const usage = current - last
        const fee = usage * 1
        this.setData({
          electricityUsage: usage,
          electricityFee: Math.round(fee * 100) / 100
        })
      } else {
        this.setData({
          electricityUsage: 0,
          electricityFee: 0
        })
        if (current > 0) {
          wx.showToast({ title: '本月读数不能小于上月', icon: 'none' })
        }
      }
    },
  
    onWaterInput(e) {
      const value = e.detail.value.trim()
      this.setData({ waterReading: value })
      this.calculateWater()
      this.calculateTotal()
    },
  
    calculateWater() {
      if (!this.data.selectedRoom) return
      
      const room = this.data.selectedRoom
      const current = Number(this.data.waterReading) || 0
      const last = Number(room.lastWaterReading) || 0
      
      if (current >= last) {
        const usage = current - last
        const fee = usage * 3
        this.setData({
          waterUsage: usage,
          waterFee: Math.round(fee * 100) / 100
        })
      } else {
        this.setData({
          waterUsage: 0,
          waterFee: 0
        })
        if (current > 0) {
          wx.showToast({ title: '本月读数不能小于上月', icon: 'none' })
        }
      }
    },
  
    calculateTotal() {
      if (!this.data.selectedRoom) return
      const rent = Number(this.data.selectedRoom.baseRent) || 0
      const total = rent + this.data.electricityFee + this.data.waterFee
      this.setData({ totalAmount: Math.round(total * 100) / 100 })
    },
  
    onPaymentChange(e) {
      this.setData({ paymentMethod: e.currentTarget.dataset.method })
    },
  
    onNotesInput(e) {
      this.setData({ notes: e.detail.value })
    },
  
    // 核心修复：保存记录 + 正确更新读数
    saveRecord() {
      if (!this.data.selectedRoom) {
        wx.showToast({ title: '请选择房间', icon: 'none' })
        return
      }
  
      const room = this.data.selectedRoom
      // 空值判断：空字符串视为未输入，用 null 标记
      const elecVal = this.data.electricityReading.trim() ? Number(this.data.electricityReading) : null
      const waterVal = this.data.waterReading.trim() ? Number(this.data.waterReading) : null
  
      // 至少输入一个有效读数
      if (elecVal === null && waterVal === null) {
        wx.showToast({ title: '请至少输入一个有效读数', icon: 'none' })
        return
      }
  
      const now = new Date()
      const readingDate = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}`
      
      const record = {
        roomId: room._id,
        roomNumber: room.roomNumber,
        building: room.building,
        readingDate: readingDate,
        lastElectricityReading: Number(room.lastElectricityReading) || 0,
        electricityReading: elecVal || 0,
        electricityUsage: this.data.electricityUsage,
        electricityFee: this.data.electricityFee,
        lastWaterReading: Number(room.lastWaterReading) || 0,
        waterReading: waterVal || 0,
        waterUsage: this.data.waterUsage,
        waterFee: this.data.waterFee,
        rentAmount: Number(room.baseRent) || 0,
        totalAmount: this.data.totalAmount,
        paymentMethod: this.data.paymentMethod,
        notes: this.data.notes || '',
        createTime: wx.cloud.database().serverDate()
      }
  
      wx.showLoading({ title: '保存中...' })
      const db = wx.cloud.database()
  
      // 1. 保存记录到 records 集合
      db.collection('records').add({ data: record })
        .then(() => {
          // 2. 构造更新数据：只更新有输入的字段
          const updateData = { lastReadingDate: readingDate }
          if (elecVal !== null) updateData.lastElectricityReading = elecVal
          if (waterVal !== null) updateData.lastWaterReading = waterVal
  
          // 3. 更新 rooms 集合的最新读数
          return db.collection('rooms').doc(room._id).update({ data: updateData })
        })
        .then(() => {
          wx.hideLoading()
          wx.showToast({ title: '保存成功', icon: 'success' })
          
          // 4. 清空输入框
          this.setData({
            electricityReading: '',
            waterReading: '',
            electricityUsage: 0,
            electricityFee: 0,
            waterUsage: 0,
            waterFee: 0,
            notes: '',
            totalAmount: Number(room.baseRent) || 0
          })
  
          // 5. 关键：重新加载房间数据，刷新界面显示最新读数
          this.loadRooms()
        })
        .catch(err => {
          wx.hideLoading()
          console.error('保存失败:', err)
          wx.showToast({ title: '保存失败：' + err.errMsg, icon: 'none' })
        })
    }, // 重点：补全这个逗号！
  
    // 测试填充数据
    fillTestData() {
      if (!this.data.selectedRoom) return
      const room = this.data.selectedRoom
      const lastElec = Number(room.lastElectricityReading) || 0
      const lastWater = Number(room.lastWaterReading) || 0
      this.setData({
        electricityReading: (lastElec + 100).toString(),
        waterReading: (lastWater + 10).toString()
      })
      this.calculateElectricity()
      this.calculateWater()
      this.calculateTotal()
    }
  })