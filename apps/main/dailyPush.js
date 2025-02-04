import schedule from "node-schedule";
import PushManager from "../../model/pushManage.js";
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

    if (instance) return instance;
    instance = this;

    // 推送类型配置：显示名称 -> Redis key映射
    this.pushTypes = {
      每日: "DAILY",
      澳币: "AUD",
      知乎: "ZHIHU",
    };

    // API接口配置
    this.newsUrl = "https://api.jun.la/60s.php?format=image";
    this.audUrl = "https://api.433200.xyz/api/exchange_rate?currency1=AUD";
    this.zhihu = new ZhihuPlugin();
    this.initSchedule();
    logger.info("[DailyPush] 插件初始化完成");
  }

  /**
   * 初始化所有定时推送任务
   */
  initSchedule() {
    logger.info("[DailyPush] 开始初始化定时任务");

    // 每日早安 (8:00)
    schedule.scheduleJob("0 0 8 * * *", () => this.morningNews());

    // 澳币汇率 (9:00)
    schedule.scheduleJob("0 0 9 * * *", () => this.audExchangeRate());

    // 知乎热搜 (每3分钟)
    schedule.scheduleJob("0 */3 * * * *", () => this.zhihuHotSearch());

    logger.info("[DailyPush] 定时任务初始化完成");
  }

  //早间推送
  async morningNews() {
    logger.info("[DailyPush] 推送每日早安");
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
    logger.info("[DailyPush] 推送知乎热搜");
    try {
      const mockE = {
        msg: "热搜",
        reply: async (msg) => {
          await PushManager.sendGroupMsg("ZHIHU", msg);
        },
      };
      await this.zhihu.getHotSearch(mockE);
    } catch (err) {
      logger.error(`[DailyPush] 知乎热搜推送失败: ${err}`);
    }
  }

  //澳币汇率推送
  async audExchangeRate() {
    logger.info("[DailyPush] 推送澳币汇率");
    try {
      const response = await fetch(
        "https://api.433200.xyz/api/exchange_rate?currency1=AUD"
      );
      const data = await response.json();

      if (data?.conversion_rates?.CNY) {
        const message = `🇦🇺 澳币汇率: ${data.conversion_rates.CNY} CNY`;
        await PushManager.sendGroupMsg("AUD", message);
      } else {
        logger.error("[DailyPush] 获取汇率数据失败");
      }
    } catch (err) {
      logger.error(`[DailyPush] 澳币汇率推送失败: ${err}`);
    }
  }

  /**
   * 管理推送群组
   * @param {*} e - 消息事件对象
   */
  async managePushGroup(e) {
    if (!e.isMaster) return false;

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
