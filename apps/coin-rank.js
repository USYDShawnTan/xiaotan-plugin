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
    let result = await this.getGroupMembersInfo(e)
    if (result.success) {
      // 2. 收集所有成员的金币数据
      let rankings = await this.collectMembersCoins(result.data)
      
      // 3. 渲染排行榜
      await this.renderRankingImage(e, rankings)
    } else {
      // 获取失败，返回具体错误信息
      await e.reply(`获取群成员信息失败: ${result.error}\n请稍后再试或联系管理员`, true)
    }
    
    return true
  }
  
  // 获取群成员信息
  async getGroupMembersInfo(e) {
    try {
      // 获取群号
      const groupId = e.group_id
      logger.info(`[金币排行榜] 开始获取群 ${groupId} 的成员信息`)
      
      // 尝试使用不同的方法获取群成员信息
      let memberMap
      let errors = []
      
      // 方法1: 使用 getMemberMap
      try {
        logger.info(`[金币排行榜] 尝试使用 getMemberMap 方法获取群成员`)
        if (e.group && typeof e.group.getMemberMap === 'function') {
          memberMap = await e.group.getMemberMap()
          if (memberMap && Object.keys(memberMap).length > 0) {
            logger.info(`[金币排行榜] getMemberMap 方法成功获取 ${Object.keys(memberMap).length} 个群成员`)
            return { success: true, data: memberMap }
          } else {
            errors.push('getMemberMap 返回空结果')
          }
        } else {
          errors.push('e.group.getMemberMap 方法不存在')
        }
      } catch (err) {
        let errMsg = `getMemberMap方法获取群成员失败: ${err.message || err}`
        logger.warn(`[金币排行榜] ${errMsg}`)
        errors.push(errMsg)
      }
      
      // 方法2: 使用 group.getMemberList
      try {
        logger.info(`[金币排行榜] 尝试使用 getMemberList 方法获取群成员`)
        if (e.group && typeof e.group.getMemberList === 'function') {
          const memberList = await e.group.getMemberList()
          if (memberList && memberList.length > 0) {
            // 转换为Map结构
            memberMap = new Map()
            for (const member of memberList) {
              memberMap.set(member.user_id, member)
            }
            logger.info(`[金币排行榜] getMemberList 方法成功获取 ${memberList.length} 个群成员`)
            
            // 检查转换后的Map是否为空
            if (memberMap.size === 0) {
              logger.warn(`[金币排行榜] 警告: 成员列表转换为Map后大小为0，可能缺少user_id字段`)
              
              // 打印第一个成员的结构，帮助调试
              if (memberList.length > 0) {
                logger.info(`[金币排行榜] 第一个成员对象结构: ${JSON.stringify(memberList[0])}`)
                
                // 尝试使用其他可能的ID字段名
                const possibleIdFields = ['uin', 'qq', 'uid', 'id'];
                for (const field of possibleIdFields) {
                  if (memberList[0][field]) {
                    logger.info(`[金币排行榜] 找到可能的ID字段: ${field}`)
                    // 使用这个字段重新转换
                    memberMap = new Object() // 使用对象而非Map
                    for (const member of memberList) {
                      memberMap[member[field]] = member
                    }
                    logger.info(`[金币排行榜] 使用字段 ${field} 重新转换后的成员数: ${Object.keys(memberMap).length}`)
                    return { success: true, data: memberMap }
                  }
                }
              }
              
              errors.push('成员列表转换为Map后为空，可能缺少user_id字段')
            } else {
              // 将Map转换为普通对象，确保能正确遍历
              const memberObj = {}
              memberMap.forEach((value, key) => {
                memberObj[key] = value
              })
              logger.info(`[金币排行榜] 成员Map转换为对象，大小: ${Object.keys(memberObj).length}`)
              return { success: true, data: memberObj }
            }
          } else {
            errors.push('getMemberList 返回空结果')
          }
        } else {
          errors.push('e.group.getMemberList 方法不存在')
        }
      } catch (err) {
        let errMsg = `getMemberList方法获取群成员失败: ${err.message || err}`
        logger.warn(`[金币排行榜] ${errMsg}`)
        errors.push(errMsg)
      }
      
      // 方法3: 尝试使用client.pickGroup获取群对象，然后获取成员列表
      try {
        logger.info(`[金币排行榜] 尝试使用 pickGroup 方法获取群成员`)
        if (e.bot || e.client) {
          const client = e.bot || e.client
          if (client && typeof client.pickGroup === 'function') {
            const group = client.pickGroup(groupId)
            if (group) {
              if (typeof group.getMemberMap === 'function') {
                memberMap = await group.getMemberMap()
                if (memberMap && Object.keys(memberMap).length > 0) {
                  logger.info(`[金币排行榜] pickGroup+getMemberMap 方法成功获取 ${Object.keys(memberMap).length} 个群成员`)
                  return { success: true, data: memberMap }
                } else {
                  errors.push('pickGroup.getMemberMap 返回空结果')
                }
              } else {
                errors.push('pickGroup.getMemberMap 方法不存在')
              }
            } else {
              errors.push('pickGroup 返回空群对象')
            }
          } else {
            errors.push('client.pickGroup 方法不存在')
          }
        } else {
          errors.push('e.bot 或 e.client 对象不存在')
        }
      } catch (err) {
        let errMsg = `通过pickGroup获取群成员失败: ${err.message || err}`
        logger.warn(`[金币排行榜] ${errMsg}`)
        errors.push(errMsg)
      }
      
      // 方法4: 尝试使用Bot.getGroupMemberList方法
      try {
        logger.info(`[金币排行榜] 尝试使用 Bot.getGroupMemberList 方法获取群成员`)
        if (global.Bot && typeof global.Bot.getGroupMemberList === 'function') {
          const memberList = await global.Bot.getGroupMemberList(groupId)
          if (memberList && memberList.length > 0) {
            // 转换为Map结构
            memberMap = new Map()
            for (const member of memberList) {
              memberMap.set(member.user_id, member)
            }
            logger.info(`[金币排行榜] Bot.getGroupMemberList 方法成功获取 ${memberList.length} 个群成员`)
            return { success: true, data: memberMap }
          } else {
            errors.push('Bot.getGroupMemberList 返回空结果')
          }
        } else {
          errors.push('global.Bot.getGroupMemberList 方法不存在')
        }
      } catch (err) {
        let errMsg = `通过Bot.getGroupMemberList获取群成员失败: ${err.message || err}`
        logger.warn(`[金币排行榜] ${errMsg}`)
        errors.push(errMsg)
      }
      
      // 所有方法都失败，返回错误信息
      let errorMessage = `获取群成员失败，已尝试所有方法。详细错误: ${errors.join('; ')}`
      logger.error(`[金币排行榜] ${errorMessage}`)
      return { success: false, error: errorMessage }
    } catch (err) {
      let errorMessage = `获取群成员总体失败: ${err.message || err}`
      logger.error(`[金币排行榜] ${errorMessage}`)
      return { success: false, error: errorMessage }
    }
  }
  
  // 收集成员金币数据
  async collectMembersCoins(memberMap) {
    try {
      // 创建一个包含用户信息和金币的数组
      let userCoins = []
      
      // 检查memberMap的类型并记录
      const mapType = memberMap instanceof Map ? 'Map' : 
                      (Array.isArray(memberMap) ? 'Array' : 'Object')
      logger.info(`[金币排行榜] memberMap的类型是: ${mapType}`)
      
      // 记录成员总数
      let totalMembers = 0
      if (mapType === 'Map') {
        totalMembers = memberMap.size
      } else if (mapType === 'Array') {
        totalMembers = memberMap.length
      } else {
        totalMembers = Object.keys(memberMap).length
      }
      
      logger.info(`[金币排行榜] 开始收集 ${totalMembers} 名成员的金币数据`)
      
      // 根据不同类型遍历成员获取金币
      if (mapType === 'Map') {
        // 如果是Map类型
        for (const [userId, member] of memberMap.entries()) {
          try {
            const coins = await Tools.getCoins(userId)
            if (coins > 0) {
              userCoins.push({
                userId,
                nickname: member.card || member.nickname,
                avatar: `https://q1.qlogo.cn/g?b=qq&nk=${userId}&s=100`,
                coins
              })
            }
          } catch (err) {
            logger.warn(`[金币排行榜] 获取用户 ${userId} 的金币失败: ${err.message || err}`)
          }
        }
      } else if (mapType === 'Array') {
        // 如果是数组类型
        for (const member of memberMap) {
          try {
            const userId = member.user_id || member.uin || member.qq || member.uid || member.id
            if (!userId) {
              logger.warn(`[金币排行榜] 成员对象缺少ID字段: ${JSON.stringify(member)}`)
              continue
            }
            
            const coins = await Tools.getCoins(userId)
            if (coins > 0) {
              userCoins.push({
                userId,
                nickname: member.card || member.nickname,
                avatar: `https://q1.qlogo.cn/g?b=qq&nk=${userId}&s=100`,
                coins
              })
            }
          } catch (err) {
            logger.warn(`[金币排行榜] 获取数组成员的金币失败: ${err.message || err}`)
          }
        }
      } else {
        // 如果是普通对象
        for (const [userId, member] of Object.entries(memberMap)) {
          try {
            // 打印第一个成员信息以便调试
            if (userCoins.length === 0) {
              logger.info(`[金币排行榜] 第一个成员信息: userId=${userId}, member=${JSON.stringify(member)}`)
            }
            
            const coins = await Tools.getCoins(userId)
            if (coins > 0) {
              userCoins.push({
                userId,
                nickname: member.card || member.nickname,
                avatar: `https://q1.qlogo.cn/g?b=qq&nk=${userId}&s=100`,
                coins
              })
            }
          } catch (err) {
            logger.warn(`[金币排行榜] 获取用户 ${userId} 的金币失败: ${err.message || err}`)
          }
        }
      }
      
      // 记录有金币的成员数
      logger.info(`[金币排行榜] 成功收集到 ${userCoins.length}/${totalMembers} 名成员的金币数据`)
      
      // 如果没有收集到任何金币数据，但有成员
      if (userCoins.length === 0 && totalMembers > 0) {
        logger.warn(`[金币排行榜] 警告: 有 ${totalMembers} 名成员但没有收集到任何金币数据`)
      }
      
      // 按金币数量排序（降序）
      userCoins.sort((a, b) => b.coins - a.coins)
      
      // 限制数量为前20名
      return userCoins.slice(0, 20)
    } catch (err) {
      logger.error(`[金币排行榜] 收集成员金币数据失败: ${err.message || err}`)
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
      
      logger.info(`[金币排行榜] 开始渲染排行榜，共有 ${rankings.length} 名成员`)
      
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