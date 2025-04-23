// apps/coin-rank.js
import plugin from '../../../lib/plugins/plugin.js'
import { Common } from '../components/index.js'
import Tools from '../model/tools.js'

// 金币排行榜插件
export class CoinRanking extends plugin {
  constructor() {
    super({
      name: '金币排行榜',
      dsc: '查看群内金币排行',
      event: 'message.group',
      priority: 5000,
      rule: [
        {
          reg: '^#?(金币|财富|余额)(排行榜|排名|榜单)$',
          fnc: 'coinRanking'
        },
        {
          reg: '^#?(我的|查询)(金币|财富|余额)$',
          fnc: 'myCoin'
        }
      ]
    })
  }

  // 查询个人金币
  async myCoin(e) {
    const userId = e.user_id
    const nickname = e.sender.card || e.sender.nickname
    
    // 获取用户金币
    const coins = await Tools.getCoins(userId)
    
    // 返回结果
    await e.reply(`${nickname}当前拥有 ${coins} 枚金币`, true)
    return true
  }
  
  // 生成金币排行榜
  async coinRanking(e) {
    // 1. 获取群成员列表
    let memberList = await this.getGroupMembers(e)
    if (!memberList || memberList.length === 0) {
      await e.reply('获取群成员信息失败，请稍后再试', true)
      return true
    }
    
    // 2. 收集所有成员的金币数据
    let rankings = await this.collectCoinsRanking(memberList)
    
    // 3. 渲染排行榜
    await this.renderRanking(e, rankings)
    
    return true
  }
  
  // 获取群成员列表（简化版）
  async getGroupMembers(e) {
    try {
      const groupId = e.group_id
      logger.info(`[金币排行榜] 开始获取群 ${groupId} 的成员信息`)
      
      // 方法1: 使用getMemberList获取群成员QQ号数组
      try {
        if (e.group && typeof e.group.getMemberList === 'function') {
          const memberList = await e.group.getMemberList()
          if (memberList && memberList.length > 0) {
            logger.info(`[金币排行榜] 原始memberList结构: ${JSON.stringify(memberList.slice(0, 2))}`)
            
            // 如果是QQ号数组
            if (Array.isArray(memberList) && memberList.every(item => typeof item === 'number' || !isNaN(item))) {
              logger.info(`[金币排行榜] memberList是QQ号数组`)
              
              // 获取群成员详细信息
              const memberDetails = {}
              for (const qq of memberList) {
                try {
                  // 尝试获取群成员详细信息
                  const member = e.group.pickMember?.(qq) || { user_id: qq }
                  // 获取群名片或昵称
                  if (typeof member.getInfo === 'function') {
                    const info = await member.getInfo()
                    member.card = info?.card || info?.nickname || `用户${qq}`
                    member.nickname = info?.nickname || `用户${qq}`
                  } else {
                    member.card = member.card || member.nickname || `用户${qq}`
                    member.nickname = member.nickname || `用户${qq}`
                  }
                  memberDetails[qq] = member
                } catch (err) {
                  // 如果获取详情失败，使用默认信息
                  memberDetails[qq] = { 
                    user_id: qq, 
                    qq: qq,
                    card: `用户${qq}`,
                    nickname: `用户${qq}`
                  }
                }
              }
              logger.info(`[金币排行榜] 从QQ号数组构建的成员对象大小: ${Object.keys(memberDetails).length}`)
              return memberDetails
            }
          }
        }
      } catch (err) {
        logger.warn(`[金币排行榜] getMemberList方法获取群成员失败: ${err.message || err}`)
      }
      
      // 备用方法：尝试使用Bot.getGroupMemberList方法
      try {
        if (global.Bot && typeof global.Bot.getGroupMemberList === 'function') {
          const members = await global.Bot.getGroupMemberList(groupId)
          if (members && members.length > 0) {
            const memberDetails = {}
            for (const member of members) {
              const userId = member.user_id || member.uin || member.qq
              if (userId) {
                memberDetails[userId] = {
                  ...member,
                  card: member.card || member.nickname || `用户${userId}`,
                  nickname: member.nickname || `用户${userId}`
                }
              }
            }
            logger.info(`[金币排行榜] 使用Bot.getGroupMemberList获取成员数: ${Object.keys(memberDetails).length}`)
            return memberDetails
          }
        }
      } catch (err) {
        logger.warn(`[金币排行榜] Bot.getGroupMemberList方法获取群成员失败: ${err.message || err}`)
      }
      
      logger.error(`[金币排行榜] 所有方法获取群成员都失败`)
      return {}
    } catch (err) {
      logger.error(`[金币排行榜] 获取群成员总体失败: ${err.message || err}`)
      return {}
    }
  }
  
  // 收集成员金币数据并排序
  async collectCoinsRanking(memberMap) {
    try {
      // 创建一个包含用户信息和金币的数组
      let userCoins = []
      const totalMembers = Object.keys(memberMap).length
      
      logger.info(`[金币排行榜] 开始收集 ${totalMembers} 名成员的金币数据`)
      
      // 遍历成员获取金币
      for (const [userId, member] of Object.entries(memberMap)) {
        try {
          // 获取金币
          const coins = await Tools.getCoins(userId)
          
          // 如果有金币，添加到列表
          if (coins > 0) {
            userCoins.push({
              userId,
              nickname: member.card || member.nickname || `用户${userId}`,
              avatar: `https://q1.qlogo.cn/g?b=qq&nk=${userId}&s=100`,
              coins
            })
          }
        } catch (err) {
          logger.warn(`[金币排行榜] 获取用户 ${userId} 的金币失败: ${err.message || err}`)
        }
      }
      
      logger.info(`[金币排行榜] 成功收集到 ${userCoins.length}/${totalMembers} 名成员的金币数据`)
      
      // 按金币数量排序（降序）
      userCoins.sort((a, b) => b.coins - a.coins)
      
      // 添加排名信息
      userCoins = userCoins.map((item, index) => {
        // 排名顺序从1开始
        const rankNumber = index + 1
        
        // 根据排名添加排名类
        let rankClass = ''
        if (rankNumber === 1) rankClass = 'rank-1'
        else if (rankNumber === 2) rankClass = 'rank-2'
        else if (rankNumber === 3) rankClass = 'rank-3'
        
        return {
          ...item,
          rank: rankNumber,
          rankClass
        }
      })
      
      // 限制数量为前20名
      return userCoins.slice(0, 20)
    } catch (err) {
      logger.error(`[金币排行榜] 收集成员金币数据失败: ${err.message || err}`)
      return []
    }
  }
  
  // 渲染排行榜图片
  async renderRanking(e, rankings) {
    try {
      // 如果排行榜为空
      if (rankings.length === 0) {
        await e.reply('暂无金币排行数据', true)
        return
      }
      
      logger.info(`[金币排行榜] 开始渲染排行榜，共有 ${rankings.length} 名成员`)
      
      // 获取用户自己的排名信息
      const userRank = this.getUserRank(e.user_id, rankings)
      
      // 准备渲染数据
      const renderData = {
        rankings,
        user: {
          userId: e.user_id,
          nickname: e.sender.card || e.sender.nickname,
          avatar: `https://q1.qlogo.cn/g?b=qq&nk=${e.user_id}&s=100`,
          rank: userRank.rank,
          coins: userRank.coins
        },
        groupName: e.group_name || '群聊',
        date: new Date().toLocaleDateString('zh-CN'),
        time: new Date().toLocaleTimeString('zh-CN', { hour12: false })
      }
      
      // 使用puppeteer渲染HTML模板
      await Common.render('coin/ranking', renderData, {
        e,
        scale: 1.2 // 图片缩放比例
      })
      
      logger.info(`[金币排行榜] 排行榜渲染完成并已发送`)
    } catch (err) {
      let errorMsg = `渲染排行榜失败: ${err.message || err}`
      logger.error(`[金币排行榜] ${errorMsg}`)
      await e.reply(`生成排行榜失败: ${errorMsg}\n请稍后再试`, true)
    }
  }
  
  // 获取用户排名信息
  getUserRank(userId, rankings) {
    // 在排行榜中查找用户
    const index = rankings.findIndex(item => item.userId == userId)
    
    if (index !== -1) {
      // 用户在排行榜中
      return {
        rank: rankings[index].rank || (index + 1),
        coins: rankings[index].coins
      }
    } else {
      // 用户不在排行榜中，获取其金币数
      return {
        rank: '未上榜',
        coins: 0
      }
    }
  }
}