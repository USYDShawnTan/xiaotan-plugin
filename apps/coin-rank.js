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
            // 打印原始成员列表的前两个成员，帮助调试
            logger.info(`[金币排行榜] 原始memberList结构: ${JSON.stringify(memberList.slice(0, 2))}`)
            
            // 检查memberList是否是数组
            if (Array.isArray(memberList)) {
              // 尝试提取成员ID
              const isNumericArray = memberList.every(item => typeof item === 'number')
              
              if (isNumericArray) {
                // 如果memberList只是QQ号数组，直接构建对象
                logger.info(`[金币排行榜] memberList是QQ号数组`)
                const memberObj = {}
                for (const qqNum of memberList) {
                  memberObj[qqNum] = {
                    user_id: qqNum,
                    qq: qqNum,
                    nickname: `用户${qqNum}`
                  }
                }
                logger.info(`[金币排行榜] 从QQ号数组构建的成员对象大小: ${Object.keys(memberObj).length}`)
                return { success: true, data: memberObj }
              } else {
                // 检查成员对象的结构
                const firstMember = memberList[0]
                logger.info(`[金币排行榜] 第一个成员结构: ${JSON.stringify(firstMember)}`)
                
                // 尝试确定ID字段
                let idField = null
                const possibleIdFields = ['user_id', 'uin', 'qq', 'uid', 'id', 'userId', 'member_id'];
                for (const field of possibleIdFields) {
                  if (firstMember && firstMember[field] !== undefined) {
                    idField = field
                    logger.info(`[金币排行榜] 找到ID字段: ${field}`)
                    break
                  }
                }
                
                if (idField) {
                  // 将成员列表转换为对象
                  const memberObj = {}
                  for (const member of memberList) {
                    if (member && member[idField] !== undefined) {
                      memberObj[member[idField]] = member
                    }
                  }
                  logger.info(`[金币排行榜] 使用字段 ${idField} 转换后的成员对象大小: ${Object.keys(memberObj).length}`)
                  return { success: true, data: memberObj }
                } else {
                  // 如果无法确定ID字段，将整个数组作为成员列表
                  logger.warn(`[金币排行榜] 无法确定ID字段，将使用整个数组`)
                  return { success: true, data: memberList }
                }
              }
            } else {
              logger.warn(`[金币排行榜] memberList不是数组类型: ${typeof memberList}`)
              errors.push('getMemberList 返回值不是数组')
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
              const nickname = typeof member === 'object' ? (member.card || member.nickname || `用户${userId}`) : `用户${userId}`
              userCoins.push({
                userId,
                nickname,
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
        for (const item of memberMap) {
          try {
            // 如果数组元素就是数字（QQ号）
            if (typeof item === 'number') {
              const userId = item
              const coins = await Tools.getCoins(userId)
              if (coins > 0) {
                userCoins.push({
                  userId,
                  nickname: `用户${userId}`,
                  avatar: `https://q1.qlogo.cn/g?b=qq&nk=${userId}&s=100`,
                  coins
                })
              }
              continue
            }
            
            // 如果是对象，尝试获取ID
            const userId = item?.user_id || item?.uin || item?.qq || item?.uid || item?.id
            if (!userId) {
              logger.warn(`[金币排行榜] 成员对象缺少ID字段: ${JSON.stringify(item)}`)
              continue
            }
            
            const coins = await Tools.getCoins(userId)
            if (coins > 0) {
              userCoins.push({
                userId,
                nickname: item.card || item.nickname || `用户${userId}`,
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
        for (const [key, value] of Object.entries(memberMap)) {
          try {
            // 显示前两个键值对，帮助调试
            if (userCoins.length === 0) {
              logger.info(`[金币排行榜] 对象键值对示例: key=${key}, value类型=${typeof value}, value=${JSON.stringify(value).substring(0, 100)}`)
            }
            
            // 如果值是一个数字（可能是QQ号）
            if (typeof value === 'number') {
              const userId = value
              const coins = await Tools.getCoins(userId)
              if (coins > 0) {
                userCoins.push({
                  userId,
                  nickname: `用户${userId}`,
                  avatar: `https://q1.qlogo.cn/g?b=qq&nk=${userId}&s=100`,
                  coins
                })
              }
              continue
            }
            
            // 确定用户ID
            let userId
            if (!isNaN(key)) {
              // 如果键是数字字符串，可能是QQ号
              userId = key
            } else if (value && typeof value === 'object') {
              // 如果值是对象，尝试从中提取ID
              userId = value.user_id || value.uin || value.qq || value.uid || value.id
            } else {
              // 如果都不是，跳过
              logger.warn(`[金币排行榜] 无法确定用户ID: key=${key}, value=${value}`)
              continue
            }
            
            const coins = await Tools.getCoins(userId)
            if (coins > 0) {
              let nickname
              if (value && typeof value === 'object') {
                nickname = value.card || value.nickname || `用户${userId}`
              } else {
                nickname = `用户${userId}`
              }
              
              userCoins.push({
                userId,
                nickname,
                avatar: `https://q1.qlogo.cn/g?b=qq&nk=${userId}&s=100`,
                coins
              })
            }
          } catch (err) {
            logger.warn(`[金币排行榜] 获取用户金币失败: ${err.message || err}`)
          }
        }
      }
      
      // 记录有金币的成员数
      logger.info(`[金币排行榜] 成功收集到 ${userCoins.length}/${totalMembers} 名成员的金币数据`)
      
      // 如果没有收集到任何金币数据，但有成员
      if (userCoins.length === 0 && totalMembers > 0) {
        logger.warn(`[金币排行榜] 警告: 有 ${totalMembers} 名成员但没有收集到任何金币数据，可能是未找到金币数据或格式问题`)
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
        // 添加排名数据，用于样式渲染
        ranks: {
          1: 2, // 下标1是第2名
          2: 3  // 下标2是第3名
        },
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