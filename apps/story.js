import plugin from '../../../lib/plugins/plugin.js'
import { Config, Data } from '../components/index.js'
import fs from 'node:fs'
import path from 'node:path'
import common from '../../../lib/common/common.js'

// 全局词库，只在初始化时加载一次
let keywords = {
  'who': ['张三', '小红', '隔壁老王'],
  'where': ['厕所', '办公室', '火锅店'],
  'how': ['若无其事地', '激动地', '偷偷地'],
  'what': ['吃泡面', '拍桌子', '敲代码']
}

// 分类名称映射（用于显示中文名称）
const categoryNames = {
  'who': '谁',
  'where': '在哪',
  'how': '怎么样地',
  'what': '干什么'
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
      const categories = ['who', 'where', 'how', 'what']
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
  return keywords['who'].map(person => {
    // 转义正则表达式中的特殊字符
    const escapedPerson = person.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return {
      reg: new RegExp(escapedPerson, 'i'), // 不区分大小写
      fnc: 'checkTrigger'
    }
  })
}

// 解析自定义模板
const parseTemplate = (template) => {
  // 匹配 /xxx/ 格式的标记
  const regex = /\/([^/]+)\//g
  let match
  let variables = []
  
  // 提取所有变量
  while ((match = regex.exec(template)) !== null) {
    variables.push({
      full: match[0],
      name: match[1],
      start: match.index,
      end: match.index + match[0].length
    })
  }
  
  return variables
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
          reg: '^添加\\s+(who|where|how|what)\\s+.+$',
          fnc: 'addKeyword'
        },
        {
          reg: '^删除\\s+(who|where|how|what)\\s+.+$',
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
        {
          reg: '^故事测试$',
          fnc: 'testStory'
        },
        {
          reg: '^强制触发\\s+.+$',
          fnc: 'forceStory'
        },
        {
          reg: '^#T\\s+.+$',
          fnc: 'customTemplate'
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
  
  // 自定义模板触发
  async customTemplate(e) {
    try {
      // 提取模板内容
      const template = e.msg.replace(/^#T\s+/, '').trim()
      
      // 解析模板中的变量
      const variables = parseTemplate(template)
      
      if (variables.length === 0) {
        await this.reply('模板格式错误，请使用 /xxx/ 表示词库变量，如：#T /who/和/who/在/where/')
        return
      }
      
      // 生成故事
      let story = template
      
      // 逆序替换变量（从后向前，避免位置偏移）
      for (let i = variables.length - 1; i >= 0; i--) {
        const variable = variables[i]
        
        // 检查变量名是否有效
        if (!keywords[variable.name]) {
          await this.reply(`未知的变量类型：${variable.name}，有效变量为：who, where, how, what`)
          return
        }
        
        // 随机选择一个关键词
        const keyword = keywords[variable.name][Math.floor(Math.random() * keywords[variable.name].length)]
        
        // 替换变量
        story = story.substring(0, variable.start) + keyword + story.substring(variable.end)
      }
      
      // 如果句子末尾没有标点，添加句号
      if (!/[。！？\.!?]$/.test(story)) {
        story += '。'
      }
      
      logger.info(`[故事式语句] 自定义模板生成故事: ${story}`)
      
      // 发送故事
      await this.reply(`【自定义】${story}`)
    } catch (error) {
      logger.error(`[故事式语句] 自定义模板错误: ${error}`)
      await this.reply('生成故事失败，请检查模板格式')
    }
  }
  
  // 当词库更新后，需要刷新触发规则
  refreshRules() {
    // 重新生成规则
    const newRules = createTriggerRules()
    
    // 替换已有的触发规则
    // 保留前七条规则（添加、删除、查看、帮助、测试、强制触发、自定义）
    this.rule = this.rule.slice(0, 7).concat(newRules)
    
    logger.info('[故事式语句] 已刷新触发规则，当前"谁"关键词数量:', keywords['who'].length)
  }
  
  // 添加关键词
  async addKeyword(e) {
    // 检查权限（可选：只允许管理员操作词库）
    // if (!e.isMaster && !e.member?.is_admin) {
    //   await this.reply('只有管理员才能操作词库')
    //   return
    // }
    
    // 提取消息中的类别和关键词
    const match = /^添加\s+(who|where|how|what)\s+(.+)$/.exec(e.msg)
    if (!match) return
    
    const [, category, word] = match
    
    // 检查关键词是否已存在
    if (keywords[category].includes(word)) {
      await this.reply(`「${word}」已在「${categoryNames[category]}」类别中存在`)
      return
    }
    
    // 添加关键词
    keywords[category].push(word)
    saveKeywords()
    
    // 如果是"谁"类别，需要刷新触发规则
    if (category === 'who') {
      this.refreshRules()
    }
    
    await this.reply(`已添加「${word}」到「${categoryNames[category]}」类别`)
  }
  
  // 删除关键词
  async deleteKeyword(e) {
    // 检查权限（可选：只允许管理员操作词库）
    // if (!e.isMaster && !e.member?.is_admin) {
    //   await this.reply('只有管理员才能操作词库')
    //   return
    // }
    
    // 提取消息中的类别和关键词
    const match = /^删除\s+(who|where|how|what)\s+(.+)$/.exec(e.msg)
    if (!match) return
    
    const [, category, word] = match
    
    // 检查关键词是否存在
    const index = keywords[category].indexOf(word)
    if (index === -1) {
      await this.reply(`「${word}」在「${categoryNames[category]}」类别中不存在`)
      return
    }
    
    // 删除关键词
    keywords[category].splice(index, 1)
    saveKeywords()
    
    // 如果是"谁"类别，需要刷新触发规则
    if (category === 'who') {
      this.refreshRules()
    }
    
    await this.reply(`已从「${categoryNames[category]}」类别中删除「${word}」`)
  }
  
  // 查看词库（使用转发消息）
  async viewKeywords(e) {
    // 创建转发消息数组
    const forwardMsgs = []
    
    // 添加标题
    forwardMsgs.push('【故事式语句 - 词库内容】')
    
    // 添加各分类的内容
    for (const category in keywords) {
      forwardMsgs.push(`▌${categoryNames[category]}（${category}）▐`)
      
      if (keywords[category].length === 0) {
        forwardMsgs.push('暂无内容')
      } else {
        // 每行显示3个关键词，格式化为表格样式
        let content = ''
        keywords[category].forEach((word, index) => {
          content += `${word}${(index + 1) % 3 === 0 ? '\n' : '\t'}`
        })
        forwardMsgs.push(content.trim())
      }
      
      // 添加分隔线（最后一个分类不添加）
      if (category !== 'what') {
        forwardMsgs.push('————————————')
      }
    }
    
    // 添加使用说明
    forwardMsgs.push('📝 添加: 添加 分类 关键词')
    forwardMsgs.push('📝 删除: 删除 分类 关键词')
    forwardMsgs.push('📝 测试: 故事测试')
    forwardMsgs.push('📝 帮助: 故事帮助')
    
    // 生成并发送转发消息
    const forwardMsg = await common.makeForwardMsg(e, forwardMsgs, '故事式语句 - 词库管理')
    await this.reply(forwardMsg)
  }
  
  // 显示帮助信息
  async help(e) {
    const msg = `【故事式语句触发器帮助】
功能：根据关键词自动生成故事式语句
触发方式：消息中包含"谁"分类的关键词，其他部分会自动随机补充
词库管理：
  ✓ 添加关键词：添加 分类 关键词（分类：who, where, how, what）
  ✓ 删除关键词：删除 分类 关键词
  ✓ 查看词库：查看词库
  
测试命令：
  ✓ 故事测试：生成一个随机故事句子
  ✓ 强制触发 [内容]：基于内容生成故事句子
  ✓ #T /分类/内容/分类/：使用自定义模板生成故事
  
示例：
  ① 只需发送"${keywords['who'][0]}"，机器人就会生成随机故事
  ② 自定义模板：#T /who/在/where//how//what/
  ③ 自定义文本模板：#T 今天我看到/who/正在/where//what/`
    
    await this.reply(msg)
  }
  
  // 检查触发条件并生成故事式语句
  async checkTrigger(e) {
    // 忽略命令消息
    if (e.msg.startsWith('添加') || e.msg.startsWith('删除') || 
        e.msg === '查看词库' || e.msg === '故事帮助' || 
        e.msg === '故事测试' || e.msg.startsWith('强制触发') ||
        e.msg.startsWith('#T')) {
      return
    }
    
    try {
      // 查找触发的"谁"关键词
      let who = null
      for (const person of keywords['who']) {
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
      
      // 查找其他类别的关键词，如果找不到就随机选择
      let where = null
      let how = null
      let what = null
      
      // 查找"在哪"，如果没找到就随机选择
      for (const place of keywords['where']) {
        if (e.msg.includes(place)) {
          where = place
          logger.info(`[故事式语句] 找到"在哪"关键词: ${place}`)
          break
        }
      }
      if (!where) {
        where = keywords['where'][Math.floor(Math.random() * keywords['where'].length)]
        logger.info(`[故事式语句] 随机选择"在哪"关键词: ${where}`)
      }
      
      // 查找"怎么样地"，如果没找到就随机选择
      for (const manner of keywords['how']) {
        if (e.msg.includes(manner)) {
          how = manner
          logger.info(`[故事式语句] 找到"怎么样地"关键词: ${manner}`)
          break
        }
      }
      if (!how) {
        how = keywords['how'][Math.floor(Math.random() * keywords['how'].length)]
        logger.info(`[故事式语句] 随机选择"怎么样地"关键词: ${how}`)
      }
      
      // 查找"干什么"，如果没找到就随机选择
      for (const action of keywords['what']) {
        if (e.msg.includes(action)) {
          what = action
          logger.info(`[故事式语句] 找到"干什么"关键词: ${action}`)
          break
        }
      }
      if (!what) {
        what = keywords['what'][Math.floor(Math.random() * keywords['what'].length)]
        logger.info(`[故事式语句] 随机选择"干什么"关键词: ${what}`)
      }
      
      // 构建句子
      let sentence = who
      sentence += `在${where}`
      sentence += how
      sentence += what
      
      // 添加句号
      sentence += '。'
      
      logger.info(`[故事式语句] 触发成功，生成句子: ${sentence}`)
      
      // 发送句子
      await this.reply(`【触发】${sentence}`)
    } catch (error) {
      logger.error(`[故事式语句] 触发器错误：${error}`)
    }
  }

  // 测试故事生成功能
  async testStory(e) {
    try {
      // 随机选择一个"谁"关键词
      const who = keywords['who'][Math.floor(Math.random() * keywords['who'].length)]
      
      // 随机选择一个"在哪"关键词
      const where = keywords['where'][Math.floor(Math.random() * keywords['where'].length)]
      
      // 随机选择一个"怎么样地"关键词
      const how = keywords['how'][Math.floor(Math.random() * keywords['how'].length)]
      
      // 随机选择一个"干什么"关键词
      const what = keywords['what'][Math.floor(Math.random() * keywords['what'].length)]
      
      // 构建句子
      const sentence = `${who}在${where}${how}${what}。`
      
      logger.info(`[故事式语句] 测试生成句子: ${sentence}`)
      
      // 发送句子
      await this.reply(`【测试】${sentence}\n\n提示：你可以发送消息包含多个关键词来触发，如"${who}在${where}"`)
    } catch (error) {
      logger.error(`[故事式语句] 测试错误：${error}`)
      await this.reply('测试失败，请查看日志')
    }
  }

  // 强制触发故事生成
  async forceStory(e) {
    try {
      // 提取消息内容
      const content = e.msg.replace(/^强制触发\s+/, '').trim()
      
      // 记录消息内容
      logger.info(`[故事式语句] 强制触发，内容: ${content}`)
      
      // 查找触发的"谁"关键词
      let who = null
      for (const person of keywords['who']) {
        if (content.includes(person)) {
          who = person
          logger.info(`[故事式语句] 找到"谁"关键词: ${person}`)
          break
        }
      }
      
      // 如果没有找到"谁"，随机选择一个
      if (!who) {
        who = keywords['who'][Math.floor(Math.random() * keywords['who'].length)]
        logger.info(`[故事式语句] 未找到"谁"关键词，随机选择: ${who}`)
      }
      
      // 查找其他类别的关键词
      let where = null
      let how = null
      let what = null
      
      // 查找"在哪"
      for (const place of keywords['where']) {
        if (content.includes(place)) {
          where = place
          logger.info(`[故事式语句] 找到"在哪"关键词: ${place}`)
          break
        }
      }
      
      // 查找"怎么样地"
      for (const manner of keywords['how']) {
        if (content.includes(manner)) {
          how = manner
          logger.info(`[故事式语句] 找到"怎么样地"关键词: ${manner}`)
          break
        }
      }
      
      // 查找"干什么"
      for (const action of keywords['what']) {
        if (content.includes(action)) {
          what = action
          logger.info(`[故事式语句] 找到"干什么"关键词: ${action}`)
          break
        }
      }
      
      // 如果没有找到任何其他关键词，随机选择
      if (!where && !how && !what) {
        where = keywords['where'][Math.floor(Math.random() * keywords['where'].length)]
        how = keywords['how'][Math.floor(Math.random() * keywords['how'].length)]
        what = keywords['what'][Math.floor(Math.random() * keywords['what'].length)]
        logger.info(`[故事式语句] 未找到其他关键词，随机选择补充`)
      }
      
      // 构建句子
      let sentence = who
      if (where) sentence += `在${where}`
      if (how) sentence += how
      if (what) sentence += what
      
      // 添加句号
      sentence += '。'
      
      logger.info(`[故事式语句] 强制生成句子: ${sentence}`)
      
      // 发送句子
      await this.reply(`【强制触发】${sentence}`)
    } catch (error) {
      logger.error(`[故事式语句] 强制触发错误：${error}`)
      await this.reply('强制触发失败，请查看日志')
    }
  }
} 