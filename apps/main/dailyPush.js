import schedule from "node-schedule";
import PushManager from "../../model/pushManage.js";
import { HoroscopePlugin } from "../fromApi/xzys.js";

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

    // 推送类型配置
    this.pushTypes = {
      新闻: "NEWS",
      狮子座运势: "LEO",
      // 在这里添加新的推送类型
      // "xxx": "XXX",
    };

    this.newsUrl = "https://api.jun.la/60s.php?format=image";
    this.horoscope = new HoroscopePlugin();
    this.initSchedule();
  }

  initSchedule() {
    // 早间新闻 (8:00)
    schedule.scheduleJob("0 0 8 * * ?", () => this.morningNews());

    // 狮子座运势 (7:00)
    schedule.scheduleJob("0 0 7 * * ?", () => this.leoHoroscope());

    // 晚间提醒 (0:00)
    schedule.scheduleJob("0 0 0 * * ?", () => this.nightReminder());
  }

  // 早间新闻推送
  async morningNews() {
    logger.info("推送早间新闻");
    await PushManager.sendGroupMsg("NEWS", "☀️早上好~\n📰今日新闻已送达", {
      image: this.newsUrl,
    });
  }

  // 模拟用户消息触发星座运势
  async leoHoroscope() {
    logger.info("推送狮子座运势");
    try {
      // 创建模拟消息对象
      const mockE = {
        msg: "狮子座今日运势",
        reply: async (msg) => {
          await PushManager.sendGroupMsg("LEO", msg);
        },
      };

      // 调用现有的星座运势功能
      await this.horoscope.getHoroscope(mockE);
    } catch (err) {
      logger.error(`狮子座运势推送失败: ${err}`);
    }
  }

  // 晚间提醒
  async nightReminder() {
    logger.info("推送晚间提醒");
    await PushManager.sendGroupMsg(
      "NEWS",
      "🌙晚安安群友们~新的一天开始啦，记得打卡喔~"
    );
  }

  // 管理推送群组
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

  // 查看推送群列表
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
