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
      this.loadRooms()
    },
  
    onShow() {
      this.loadRooms()
    },
  
    // 加载所有房间
loadRooms() {
    console.log('开始加载房间...')
    const db = wx.cloud.database()
    
    db.collection('rooms').get().then(res => {
      console.log('加载房间成功:', res)
      const rooms = res.data || []
      
      // 按楼栋和房间号排序
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
      console.error('加载房间失败，详细错误:', err)
      wx.showToast({ 
        title: '加载失败: ' + (err.errMsg || '未知错误'), 
        icon: 'none',
        duration: 3000
      })
    })
  },
  
    // 重置计算
    resetCalculation() {
      this.setData({
        electricityReading: '',
        waterReading: '',
        electricityUsage: 0,
        electricityFee: 0,
        waterUsage: 0,
        waterFee: 0,
        totalAmount: this.data.selectedRoom?.baseRent || 0
      })
    },
  
    // 选择房间
    onRoomChange(e) {
      const index = e.detail.value
      const room = this.data.rooms[index]
      this.setData({
        roomIndex: index,
        selectedRoom: room
      })
      this.resetCalculation()
    },
  
    // 输入本月电表
    onElectricityInput(e) {
      const value = e.detail.value
      this.setData({ electricityReading: value })
      this.calculateElectricity()
      this.calculateTotal()
    },
  
    // 计算电费（电价1元/度）
    calculateElectricity() {
      if (!this.data.selectedRoom) return
      
      const room = this.data.selectedRoom
      const current = Number(this.data.electricityReading) || 0
      const last = room.lastElectricityReading || 0
      
      if (current >= last) {
        const usage = current - last
        const fee = usage * 1  // 电价1元/度
        
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
  
    // 输入本月水表
    onWaterInput(e) {
      const value = e.detail.value
      this.setData({ waterReading: value })
      this.calculateWater()
      this.calculateTotal()
    },
  
    // 计算水费（水价3元/吨）
    calculateWater() {
      if (!this.data.selectedRoom) return
      
      const room = this.data.selectedRoom
      const current = Number(this.data.waterReading) || 0
      const last = room.lastWaterReading || 0
      
      if (current >= last) {
        const usage = current - last
        const fee = usage * 3  // 水价3元/吨
        
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
  
    // 计算总计
    calculateTotal() {
      if (!this.data.selectedRoom) return
      const rent = this.data.selectedRoom.baseRent || 0
      const total = rent + this.data.electricityFee + this.data.waterFee
      this.setData({ totalAmount: Math.round(total * 100) / 100 })
    },
  
    // 选择支付方式
    onPaymentChange(e) {
      this.setData({ paymentMethod: e.currentTarget.dataset.method })
    },
  
    // 输入备注
    onNotesInput(e) {
      this.setData({ notes: e.detail.value })
    },
  
    // 保存记录
    saveRecord() {
      if (!this.data.selectedRoom) {
        wx.showToast({ title: '请选择房间', icon: 'none' })
        return
      }
  
      const room = this.data.selectedRoom
      
      if (!this.data.electricityReading && !this.data.waterReading) {
        wx.showToast({ title: '请至少输入一个读数', icon: 'none' })
        return
      }
  
      const now = new Date()
      const readingDate = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}`
      
      const record = {
        roomId: room._id,
        roomNumber: room.roomNumber,
        building: room.building,
        
        readingDate: readingDate,
        
        lastElectricityReading: room.lastElectricityReading || 0,
        electricityReading: Number(this.data.electricityReading) || 0,
        electricityUsage: this.data.electricityUsage,
        electricityFee: this.data.electricityFee,
        
        lastWaterReading: room.lastWaterReading || 0,
        waterReading: Number(this.data.waterReading) || 0,
        waterUsage: this.data.waterUsage,
        waterFee: this.data.waterFee,
        
        rentAmount: room.baseRent,
        totalAmount: this.data.totalAmount,
        paymentMethod: this.data.paymentMethod,
        notes: this.data.notes || '',
        
        createTime: wx.cloud.database().serverDate()
      }
  
      wx.showLoading({ title: '保存中...' })
  
      const db = wx.cloud.database()
      
      // 保存记录并更新房间读数
      db.collection('records').add({ data: record })
        .then(() => {
          return db.collection('rooms').doc(room._id).update({
            data: {
              lastElectricityReading: Number(this.data.electricityReading) || room.lastElectricityReading,
              lastWaterReading: Number(this.data.waterReading) || room.lastWaterReading,
              lastReadingDate: readingDate
            }
          })
        })
        .then(() => {
          wx.hideLoading()
          wx.showToast({ title: '保存成功' })
          
          // 清空输入
          this.setData({
            electricityReading: '',
            waterReading: '',
            electricityUsage: 0,
            electricityFee: 0,
            waterUsage: 0,
            waterFee: 0,
            notes: '',
            totalAmount: room.baseRent
          })
        })
        .catch(err => {
          wx.hideLoading()
          console.error('保存失败:', err)
          wx.showToast({ title: '保存失败', icon: 'none' })
        })
    },
  
    // 测试填充
    fillTestData() {
      if (!this.data.selectedRoom) return
      const room = this.data.selectedRoom
      this.setData({
        electricityReading: (room.lastElectricityReading + 100).toString(),
        waterReading: (room.lastWaterReading + 10).toString()
      })
      this.calculateElectricity()
      this.calculateWater()
      this.calculateTotal()
    }
  })