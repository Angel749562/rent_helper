// pages/rooms/rooms.js
Page({
    data: {
      rooms: [],
      displayRooms: [],
      buildings: ['一号楼', '二号楼', '三号楼'],
      currentBuilding: '全部',
      totalCount: 0,
      buildingCounts: {},
      showAddModal: false,
      newRoom: {
        roomNumber: '',
        building: '一号楼',
        baseRent: '',
        electricityPrice: '1',  // 默认1元
        waterPrice: '3'         // 默认3元
      }
    },
  
    onLoad() {
      this.loadRooms()
    },
  
    onShow() {
      this.loadRooms()
    },
  
    // 加载所有房间
    loadRooms() {
      const db = wx.cloud.database()
      db.collection('rooms').get().then(res => {
        const rooms = res.data || []
        
        // 按楼栋和房间号排序
        rooms.sort((a, b) => {
          if (a.building !== b.building) {
            return a.building.localeCompare(b.building)
          }
          return a.roomNumber.localeCompare(b.roomNumber, 'zh', { numeric: true })
        })
        
        // 计算各楼栋房间数
        const buildingCounts = {}
        rooms.forEach(room => {
          if (room.building) {
            buildingCounts[room.building] = (buildingCounts[room.building] || 0) + 1
          }
        })
        
        this.setData({ 
          rooms,
          buildingCounts,
          totalCount: rooms.length
        })
        
        this.filterRooms()
      }).catch(err => {
        console.error('加载房间失败:', err)
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
    },
  
    // 筛选房间
    filterRooms() {
      let filtered = []
      if (this.data.currentBuilding === '全部') {
        filtered = this.data.rooms
      } else {
        filtered = this.data.rooms.filter(r => r.building === this.data.currentBuilding)
      }
      this.setData({ displayRooms: filtered })
    },
  
    // 按楼栋筛选
    filterByBuilding(e) {
      const building = e.currentTarget.dataset.building
      this.setData({ currentBuilding: building }, () => {
        this.filterRooms()
      })
    },
  
    // 显示添加弹窗
    showAddModal() {
      this.setData({
        showAddModal: true,
        newRoom: {
          roomNumber: '',
          building: '一号楼',
          baseRent: '',
          electricityPrice: '1',
          waterPrice: '3'
        }
      })
    },
  
    // 隐藏弹窗
    hideModal() {
      this.setData({ showAddModal: false })
    },
  
    // 输入处理
    onInput(e) {
      const { field } = e.currentTarget.dataset
      this.setData({
        [`newRoom.${field}`]: e.detail.value
      })
    },
  
    // 选择楼栋
    onBuildingChange(e) {
      const index = e.detail.value
      this.setData({
        'newRoom.building': this.data.buildings[index]
      })
    },
  
    // 保存新房间
    saveRoom() {
      if (!this.data.newRoom.roomNumber || !this.data.newRoom.baseRent) {
        wx.showToast({ title: '房间号和租金必填', icon: 'none' })
        return
      }
  
      const db = wx.cloud.database()
      const roomData = {
        roomNumber: this.data.newRoom.roomNumber,
        building: this.data.newRoom.building,
        baseRent: Number(this.data.newRoom.baseRent),
        electricityPrice: 1,  // 固定1元
        waterPrice: 3,        // 固定3元
        lastElectricityReading: 0,
        lastWaterReading: 0,
        createTime: db.serverDate()
      }
  
      wx.showLoading({ title: '保存中...' })
  
      db.collection('rooms').add({ data: roomData })
        .then(() => {
          wx.hideLoading()
          wx.showToast({ title: '添加成功' })
          this.hideModal()
          this.loadRooms()
        })
        .catch(err => {
          wx.hideLoading()
          console.error('保存失败:', err)
          wx.showToast({ title: '保存失败', icon: 'none' })
        })
    },
  
    // 删除房间
    deleteRoom(e) {
      const id = e.currentTarget.dataset.id
      
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这个房间吗？',
        success: (res) => {
          if (res.confirm) {
            const db = wx.cloud.database()
            wx.showLoading({ title: '删除中...' })
            
            db.collection('rooms').doc(id).remove()
              .then(() => {
                wx.hideLoading()
                wx.showToast({ title: '删除成功' })
                this.loadRooms()
              })
              .catch(err => {
                wx.hideLoading()
                console.error('删除失败:', err)
                wx.showToast({ title: '删除失败', icon: 'none' })
              })
          }
        }
      })
    },
  
    // 去收租
    goToCollect(e) {
      const room = e.currentTarget.dataset.room
      getApp().globalData = getApp().globalData || {}
      getApp().globalData.selectedRoom = room
      
      wx.switchTab({
        url: '/pages/index/index'
      })
    }
  })