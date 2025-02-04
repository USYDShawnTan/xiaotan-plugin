import schedule from "node-schedule";
import PushManager from "../../model/pushManage.js";
import { HoroscopePlugin } from "../fromApi/xzys.js";
import { ZhihuPlugin } from "../fromApi/zhihu.js";
import fetch from "node-fetch";

let instance = null;

/**
 * 定时推送服务插件
 * 管理各种定时推送任务和群组订阅
 */
export class DailyPush extends plugin {
  constructor() {
    super({
      name: "定时推送",
      dsc: "定时推送服务",
      event: "message",
      priority: 5000,
      rule: [
        {
          reg: "^#?(添加|删除)(.+)推送群(.*)$",
          fnc: "managePushGroup",
          permission: "master",
        },
        {
          reg: "^#?(.+)推送群列表$",
          fnc: "listPushGroups",
          permission: "master",
        },
      ],
    });

    // 单例模式：如果实例已存在，直接返回
    if (instance) {
      return instance;
    }
    instance = this;

    // 推送类型配置：显示名称 -> Redis key映射
    this.pushTypes = {
      "新闻": "NEWS",
      "狮子座运势": "LEO",
      "澳币汇率": "AUD",
      "知乎热搜": "ZHIHU",
    };

    // API接口配置
    this.newsUrl = "https://api.jun.la/60s.php?format=image";
    this.audUrl = "https://api.433200.xyz/api/exchange_rate?currency1=AUD";
    this.horoscope = new HoroscopePlugin();
    this.zhihu = new ZhihuPlugin();

    // 存储定时任务
    this.scheduledJobs = new Map();

    // 初始化定时任务
    this.initSchedule();
    logger.info('[DailyPush] 插件初始化完成');
  }

  /**
   * 初始化所有定时推送任务
   */
  initSchedule() {
    logger.info('[DailyPush] 开始初始化定时任务');

    // 清理旧的定时任务
    this.scheduledJobs.forEach(job => job.cancel());
    this.scheduledJobs.clear();

    // 早间新闻 (8:00)
    this.scheduledJobs.set('news', 
      schedule.scheduleJob("0 0 8 * * ?", () => this.morningNews())
    );

    // 狮子座运势 (7:00)
    this.scheduledJobs.set('leo',
      schedule.scheduleJob("0 0 7 * * ?", () => this.leoHoroscope())
    );

    // 澳币汇率 (9:00)
    this.scheduledJobs.set('aud',
      schedule.scheduleJob("0 0 9 * * ?", () => this.audExchangeRate())
    );

    // 知乎热搜 (每3分钟)
    const zhihuRule = new schedule.RecurrenceRule();
    zhihuRule.minute = new schedule.Range(0, 59, 3);
    zhihuRule.second = 0;
    this.scheduledJobs.set('zhihu',
      schedule.scheduleJob(zhihuRule, () => this.zhihuHotSearch())
    );

    logger.info('[DailyPush] 定时任务初始化完成');
  }

  //早间推送
  async morningNews() {
    logger.info("推送早间新闻");
    await PushManager.sendGroupMsg("DAILY", "☀️早上好~");
  }

  //晚间推送
  async nightReminder() {
    logger.info("推送晚间提醒");
    await PushManager.sendGroupMsg("DAILY", "🌙晚安安群友们~");
  }

  /**
   * 知乎热搜推送
   */
  async zhihuHotSearch() {
    logger.info('[DailyPush] 开始推送知乎热搜');
    try {
      let callCount = 0;
      
      const mockE = {
        msg: "热搜",
        user_id: Bot.uin,
        reply: async (msg) => {
          callCount++;
          if (callCount === 1) {
            await PushManager.sendGroupMsg("ZHIHU", msg);
          }
        },
      };

      await this.zhihu.getHotSearch(mockE);
    } catch (err) {
      logger.error(`[DailyPush] 知乎热搜推送失败: ${err}`);
    }
  }

  //澳币汇率推送
  async audExchangeRate() {
    logger.info("推送澳币汇率");

    try {
      const response = await fetch(this.audUrl);
      const data = await response.json();

      if (data && data.conversion_rates) {
        const cnyRate = data.conversion_rates.CNY;
        if (cnyRate) {
          const message = `🇦🇺 澳币汇率: ${cnyRate.rate} CNY`;
          await PushManager.sendGroupMsg("AUD", message);
        } else {
          logger.error("未找到人民币汇率信息");
          await PushManager.sendGroupMsg(
            "AUD",
            "未找到人民币 (CNY) 的汇率信息"
          );
        }
      } else {
        logger.error("获取汇率数据失败");
        await PushManager.sendGroupMsg("AUD", "获取汇率数据失败，请稍后再试");
      }
    } catch (err) {
      logger.error(`澳币汇率推送失败: ${err}`);
      await PushManager.sendGroupMsg("AUD", "汇率数据获取失败，请稍后再试");
    }
  }

  /**
   * 管理推送群组
   * @param {*} e - 消息事件对象
   */
  async managePushGroup(e) {
    if (!e.isMaster) return false;

    // 解析命令
    const match = e.msg.match(/^#?(添加|删除)(.+)推送群(.*)$/);
    if (!match) return false;

    const [, action, typeName, groupId] = match;
    const typeKey = this.pushTypes[typeName];

    if (!typeKey) {
      e.reply(
        `未知的推送类型：${typeName}\n可用类型：${Object.keys(
          this.pushTypes
        ).join("、")}`
      );
      return true;
    }

    if (!groupId.trim()) {
      e.reply("请指定群号");
      return true;
    }

    const result =
      action === "添加"
        ? await PushManager.addGroup(typeKey, groupId.trim())
        : await PushManager.removeGroup(typeKey, groupId.trim());

    e.reply(result.message);
    return true;
  }

  /**
   * 查看推送群列表
   * @param {*} e - 消息事件对象
   */
  async listPushGroups(e) {
    if (!e.isMaster) return false;

    const match = e.msg.match(/^#?(.+)推送群列表$/);
    if (!match) return false;

    const typeName = match[1];
    const typeKey = this.pushTypes[typeName];

    if (!typeKey) {
      e.reply(
        `未知的推送类型：${typeName}\n可用类型：${Object.keys(
          this.pushTypes
        ).join("、")}`
      );
      return true;
    }

    const groups = await PushManager.getGroupList(typeKey);
    if (groups.length === 0) {
      e.reply(`当前没有${typeName}推送群`);
    } else {
      e.reply(`${typeName}推送群列表：\n` + groups.join("\n"));
    }
    return true;
  }
}
