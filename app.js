// app.js
App({
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      }
    })
  },
  globalData: {
    userInfo: null
  }
})
// app.js
App({
    onLaunch: function () {
      // 初始化云开发环境
      wx.cloud.init({
        env: 'cloud1-1gzaw4kw323a23a9', // 这里填你的环境ID
        traceUser: true // 追踪用户
      })
  
      // 获取系统信息
      wx.getSystemInfo({
        success: e => {
          this.globalData.systemInfo = e
        }
      })
    },
    
    globalData: {
      systemInfo: null,
      selectedRoom: null // 用于跨页面传参
    }
  })