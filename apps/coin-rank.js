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
    let memberMap = await this.getGroupMembersInfo(e)
    if (!memberMap || Object.keys(memberMap).length === 0) {
      await e.reply('获取群成员信息失败，请稍后再试', true)
      return true
    }
    
    // 2. 收集所有成员的金币数据
    let rankings = await this.collectMembersCoins(memberMap)
    
    // 3. 渲染排行榜
    await this.renderRankingImage(e, rankings)
    
    return true
  }
  
  // 获取群成员信息
  async getGroupMembersInfo(e) {
    try {
      // 获取群号
      const groupId = e.group_id
      
      // 尝试使用不同的方法获取群成员信息
      let memberMap
      
      // 方法1: 使用 getMemberMap
      try {
        memberMap = await e.group.getMemberMap()
        if (memberMap && Object.keys(memberMap).length > 0) {
          return memberMap
        }
      } catch (err) {
        logger.warn(`[金币排行榜] getMemberMap方法获取群成员失败: ${err}`)
      }
      
      // 方法2: 使用 group.getMemberList
      try {
        if (e.group && typeof e.group.getMemberList === 'function') {
          const memberList = await e.group.getMemberList()
          if (memberList && memberList.length > 0) {
            // 转换为Map结构
            memberMap = new Map()
            for (const member of memberList) {
              memberMap.set(member.user_id, member)
            }
            return memberMap
          }
        }
      } catch (err) {
        logger.warn(`[金币排行榜] getMemberList方法获取群成员失败: ${err}`)
      }
      
      // 方法3: 尝试使用client.pickGroup获取群对象，然后获取成员列表
      try {
        if (e.bot || e.client) {
          const client = e.bot || e.client
          const group = client.pickGroup(groupId)
          if (group) {
            memberMap = await group.getMemberMap()
            if (memberMap && Object.keys(memberMap).length > 0) {
              return memberMap
            }
          }
        }
      } catch (err) {
        logger.warn(`[金币排行榜] 通过pickGroup获取群成员失败: ${err}`)
      }
      
      // 方法4: 尝试使用Bot.getGroupMemberList方法
      try {
        if (global.Bot && typeof global.Bot.getGroupMemberList === 'function') {
          const memberList = await global.Bot.getGroupMemberList(groupId)
          if (memberList && memberList.length > 0) {
            // 转换为Map结构
            memberMap = new Map()
            for (const member of memberList) {
              memberMap.set(member.user_id, member)
            }
            return memberMap
          }
        }
      } catch (err) {
        logger.warn(`[金币排行榜] 通过Bot.getGroupMemberList获取群成员失败: ${err}`)
      }
      
      // 所有方法都失败，返回空对象
      logger.error(`[金币排行榜] 所有方法获取群成员都失败`)
      return {}
    } catch (err) {
      logger.error(`[金币排行榜] 获取群成员失败: ${err}`)
      return {}
    }
  }
  
  // 收集成员金币数据
  async collectMembersCoins(memberMap) {
    try {
      // 创建一个包含用户信息和金币的数组
      let userCoins = []
      
      // 遍历成员获取金币
      for (const [userId, member] of Object.entries(memberMap)) {
        // 获取金币
        const coins = await Tools.getCoins(userId)
        
        // 如果有金币，添加到列表
        if (coins > 0) {
          userCoins.push({
            userId,
            nickname: member.card || member.nickname,
            avatar: `https://q1.qlogo.cn/g?b=qq&nk=${userId}&s=100`,
            coins
          })
        }
      }
      
      // 按金币数量排序（降序）
      userCoins.sort((a, b) => b.coins - a.coins)
      
      // 限制数量为前20名
      return userCoins.slice(0, 20)
    } catch (err) {
      logger.error(`[金币排行榜] 收集成员金币数据失败: ${err}`)
      return []
    }
  }
  
  // 渲染排行榜图片
  async renderRankingImage(e, rankings) {
    try {
      // 如果排行榜为空
      if (rankings.length === 0) {
        await e.reply('暂无金币排行数据', true)
        return
      }
      
      // 添加发送者的排名信息
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
    } catch (err) {
      logger.error(`[金币排行榜] 渲染排行榜失败: ${err}`)
      await e.reply('生成排行榜失败，请稍后再试', true)
    }
  }
  
  // 获取用户排名信息
  getUserRank(userId, rankings) {
    // 在排行榜中查找用户
    const index = rankings.findIndex(item => item.userId == userId)
    
    if (index !== -1) {
      // 用户在排行榜中
      return {
        rank: index + 1,
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