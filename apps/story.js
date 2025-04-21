import plugin from '../../../lib/plugins/plugin.js'
import { Config, Data } from '../components/index.js'
import fs from 'node:fs'
import path from 'node:path'

// 全局词库，只在初始化时加载一次
let keywords = {
  '谁': ['张三', '小红', '隔壁老王'],
  '在哪': ['厕所', '办公室', '火锅店'],
  '怎么样地': ['若无其事地', '激动地', '偷偷地'],
  '干什么': ['吃泡面', '拍桌子', '敲代码']
}

// 确保数据目录存在
const ensureDir = () => {
  const dirPath = path.join(process.cwd(), 'plugins', 'xiaotan-plugin', 'data', 'story')
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true })
      logger.info('[故事式语句] 成功创建数据目录:', dirPath)
    } catch (err) {
      logger.error('[故事式语句] 创建数据目录失败:', err)
    }
  }
}

// 保存词库到文件
const saveKeywords = () => {
  try {
    ensureDir()
    Data.writeJSON('data/story/keywords', keywords)
    logger.info('[故事式语句] 词库保存成功')
  } catch (err) {
    logger.error('[故事式语句] 保存词库时出错:', err)
  }
}

// 从文件加载词库
const loadKeywords = () => {
  try {
    ensureDir()
    let data = Data.readJSON('data/story/keywords')
    if (data && Object.keys(data).length > 0) {
      // 确保所有必要的类别都存在
      const categories = ['谁', '在哪', '怎么样地', '干什么']
      categories.forEach(category => {
        if (!data[category]) {
          data[category] = keywords[category] || []
        }
      })
      keywords = data
      logger.info('[故事式语句] 成功加载词库，共有关键词：', 
        Object.values(keywords).reduce((sum, arr) => sum + arr.length, 0))
    } else {
      // 如果文件不存在或为空，保存默认词库
      logger.info('[故事式语句] 未找到现有词库，创建默认词库')
      saveKeywords()
    }
  } catch (err) {
    logger.error('[故事式语句] 加载词库时出错:', err)
  }
}

// 创建触发规则的正则表达式
const createTriggerRules = () => {
  // 为每个"谁"分类的关键词创建独立的正则表达式规则
  return keywords['谁'].map(person => {
    // 转义正则表达式中的特殊字符
    const escapedPerson = person.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return {
      reg: new RegExp(escapedPerson, 'i'), // 不区分大小写
      fnc: 'checkTrigger'
    }
  })
}

export class Story extends plugin {
  constructor() {
    super({
      name: '故事式语句',
      dsc: '触发故事式语句的模块',
      event: 'message.group',
      priority: 5000,
      rule: [
        {
          reg: '^添加\\s+(谁|在哪|怎么样地|干什么)\\s+.+$',
          fnc: 'addKeyword'
        },
        {
          reg: '^删除\\s+(谁|在哪|怎么样地|干什么)\\s+.+$',
          fnc: 'deleteKeyword'
        },
        {
          reg: '^查看词库$',
          fnc: 'viewKeywords'
        },
        {
          reg: '^故事帮助$',
          fnc: 'help'
        },
        // 自动生成触发规则
        ...createTriggerRules()
      ]
    })
    
    // 加载词库，只在初始化时加载一次
    loadKeywords()
    logger.info('[故事式语句] 插件已初始化，可触发关键词数量:', 
      Object.values(keywords).reduce((sum, arr) => sum + arr.length, 0))
  }
  
  // 当词库更新后，需要刷新触发规则
  refreshRules() {
    // 重新生成规则
    const newRules = createTriggerRules()
    
    // 替换已有的触发规则
    // 保留前四条规则（添加、删除、查看、帮助）
    this.rule = this.rule.slice(0, 4).concat(newRules)
    
    logger.info('[故事式语句] 已刷新触发规则，当前"谁"关键词数量:', keywords['谁'].length)
  }
  
  // 添加关键词
  async addKeyword(e) {
    // 检查权限（可选：只允许管理员操作词库）
    // if (!e.isMaster && !e.member?.is_admin) {
    //   await this.reply('只有管理员才能操作词库')
    //   return
    // }
    
    // 提取消息中的类别和关键词
    const match = /^添加\s+(谁|在哪|怎么样地|干什么)\s+(.+)$/.exec(e.msg)
    if (!match) return
    
    const [, category, word] = match
    
    // 检查关键词是否已存在
    if (keywords[category].includes(word)) {
      await this.reply(`「${word}」已在「${category}」类别中存在`)
      return
    }
    
    // 添加关键词
    keywords[category].push(word)
    saveKeywords()
    
    // 如果是"谁"类别，需要刷新触发规则
    if (category === '谁') {
      this.refreshRules()
    }
    
    await this.reply(`已添加「${word}」到「${category}」类别`)
  }
  
  // 删除关键词
  async deleteKeyword(e) {
    // 检查权限（可选：只允许管理员操作词库）
    // if (!e.isMaster && !e.member?.is_admin) {
    //   await this.reply('只有管理员才能操作词库')
    //   return
    // }
    
    // 提取消息中的类别和关键词
    const match = /^删除\s+(谁|在哪|怎么样地|干什么)\s+(.+)$/.exec(e.msg)
    if (!match) return
    
    const [, category, word] = match
    
    // 检查关键词是否存在
    const index = keywords[category].indexOf(word)
    if (index === -1) {
      await this.reply(`「${word}」在「${category}」类别中不存在`)
      return
    }
    
    // 删除关键词
    keywords[category].splice(index, 1)
    saveKeywords()
    
    // 如果是"谁"类别，需要刷新触发规则
    if (category === '谁') {
      this.refreshRules()
    }
    
    await this.reply(`已从「${category}」类别中删除「${word}」`)
  }
  
  // 查看词库
  async viewKeywords(e) {
    let msg = '【词库内容】\n'
    
    for (const category in keywords) {
      msg += `${category}：${keywords[category].join('、')}\n`
    }
    
    await this.reply(msg.trim())
  }
  
  // 显示帮助信息
  async help(e) {
    const msg = `【故事式语句触发器帮助】
功能：根据关键词自动生成故事式语句
触发方式：消息中包含"谁"分类的关键词
词库管理：
  ✓ 添加关键词：添加 类别 关键词
  ✓ 删除关键词：删除 类别 关键词
  ✓ 查看词库：查看词库
示例：${keywords['谁'][0]}在${keywords['在哪'][0]}${keywords['怎么样地'][0]}${keywords['干什么'][0]}。`
    
    await this.reply(msg)
  }
  
  // 检查触发条件并生成故事式语句
  async checkTrigger(e) {
    // 忽略命令消息
    if (e.msg.startsWith('添加') || e.msg.startsWith('删除') || e.msg === '查看词库' || e.msg === '故事帮助') {
      return
    }
    
    try {
      // 查找触发的"谁"关键词
      let who = null
      for (const person of keywords['谁']) {
        if (e.msg.includes(person)) {
          who = person
          logger.info(`[故事式语句] 找到"谁"关键词: ${person}`)
          break
        }
      }
      
      // 这应该不会发生，因为触发规则已经确保了存在"谁"关键词
      if (!who) {
        logger.warn(`[故事式语句] 触发但未找到"谁"关键词，请检查正则表达式`)
        return
      }
      
      // 查找其他类别的关键词
      let where = null
      let how = null
      let what = null
      
      // 查找"在哪"
      for (const place of keywords['在哪']) {
        if (e.msg.includes(place)) {
          where = place
          logger.info(`[故事式语句] 找到"在哪"关键词: ${place}`)
          break
        }
      }
      
      // 查找"怎么样地"
      for (const manner of keywords['怎么样地']) {
        if (e.msg.includes(manner)) {
          how = manner
          logger.info(`[故事式语句] 找到"怎么样地"关键词: ${manner}`)
          break
        }
      }
      
      // 查找"干什么"
      for (const action of keywords['干什么']) {
        if (e.msg.includes(action)) {
          what = action
          logger.info(`[故事式语句] 找到"干什么"关键词: ${action}`)
          break
        }
      }
      
      // 检查是否找到除了"谁"以外的任何关键词
      if (!where && !how && !what) {
        logger.info(`[故事式语句] 只找到"谁"关键词：${who}，需要其他类别关键词才能触发`)
        return
      }
      
      // 构建句子
      let sentence = who
      if (where) sentence += `在${where}`
      if (how) sentence += how
      if (what) sentence += what
      
      // 添加句号
      sentence += '。'
      
      logger.info(`[故事式语句] 触发成功，生成句子: ${sentence}`)
      
      // 发送句子
      await this.reply(`【触发】${sentence}`)
    } catch (error) {
      logger.error(`[故事式语句] 触发器错误：${error}`)
    }
  }
} 