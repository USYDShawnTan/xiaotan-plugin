import plugin from "../../../lib/plugins/plugin.js";
import fetch from "node-fetch";

// API URL
const RIDER_API = "https://api.433200.xyz/api/kamen-riders-random";
const SPECIFIC_RIDER_API =
  "https://api.433200.xyz/api/kamen-riders/{rider}/random";
const ALL_FORMS_API = "https://api.433200.xyz/api/kamen-riders/{rider}";

// 骑士映射表（英文名到中文名）
const RIDER_MAP = {
  Kuuga: "空我",
  Agito: "亚极陀",
  Ryuki: "龙骑",
  Faiz: "555",
  Blade: "剑",
  Hibiki: "响鬼",
  Kabuto: "甲斗",
  "Den-O": "电王",
  Kiva: "键骑",
  Decade: "帝骑",
  W: "双骑",
  OOO: "OOO",
  Fourze: "四骑",
  Wizard: "魔法师",
  Gaim: "铠武",
  Drive: "驱动",
  Ghost: "幽灵",
  "Ex-Aid": "Ex-Aid",
  Build: "Build",
  "Zi-O": "时王",
  "Zero-One": "零一",
  Saber: "圣刃",
  Revice: "利维斯",
  Geats: "基茨",
  Gavv: "Gavv",
};

// 反向映射表（中文名到英文名）
const RIDER_MAP_REVERSE = {};
Object.entries(RIDER_MAP).forEach(([engName, cnName]) => {
  RIDER_MAP_REVERSE[cnName] = engName;
});

export class randomRider extends plugin {
  constructor() {
    super({
      name: "随机骑士",
      dsc: "随机获取假面骑士的信息",
      event: "message",
      priority: 5000,
      rule: [
        {
          reg: "^#?(随机骑士)$",
          fnc: "getRider",
        },
        {
          reg: "^#?随机(.+)$",
          fnc: "getSpecificRider",
        },
        {
          reg: "^#?所有(.+)$",
          fnc: "getAllForms",
        },
      ],
    });
  }

  async getRider(e) {
    try {
      // 发送等待消息
      await this.reply("正在寻找随机骑士中...");

      // 调用API获取随机骑士数据
      const response = await fetch(RIDER_API);

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const data = await response.json();

      // 获取骑士信息
      const rider = data.rider;
      const riderName = data.image.name;
      const imageUrl = data.image.src;

      // 获取中文名称（如果存在）
      const riderChineseName = RIDER_MAP[rider] || rider;

      // 构建回复消息
      let replyMsg = `随机到的骑士是: ${riderChineseName}(${rider})\n形态是: ${riderName}`;

      // 发送文字消息
      await this.reply(replyMsg);

      // 发送图片
      if (imageUrl) {
        const imageSegment = segment.image(imageUrl);
        await this.reply(imageSegment);
      }

      return true;
    } catch (error) {
      logger.error(`[随机骑士]插件错误: ${error}`);
      await this.reply(`获取随机骑士失败: ${error.message}`);
      return false;
    }
  }

  async getSpecificRider(e) {
    try {
      // 从正则匹配中获取骑士名称
      const riderNameCn = e.msg.match(/^#?随机(.+)$/)[1];

      // 获取骑士的英文名
      let riderNameEng = RIDER_MAP_REVERSE[riderNameCn];

      // 如果找不到对应的英文名，尝试直接使用输入的名称
      if (!riderNameEng) {
        // 查找是否有匹配的英文名（忽略大小写）
        const foundRider = Object.keys(RIDER_MAP).find(
          (engName) => engName.toLowerCase() === riderNameCn.toLowerCase()
        );

        if (foundRider) {
          riderNameEng = foundRider;
        } else {
          return this.reply(
            `未找到骑士 "${riderNameCn}" 的信息，请检查名称是否正确。`
          );
        }
      }

      // 构建API URL
      const apiUrl = SPECIFIC_RIDER_API.replace("{rider}", riderNameEng);

      // 发送等待消息
      await this.reply(`正在寻找随机${riderNameCn}形态中...`);

      // 调用API获取特定骑士的随机数据
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const data = await response.json();

      // 获取信息 - 使用data.image.name作为形态名
      const formName = data.image.name || "未知形态";
      const imageUrl = data.image.src;

      // 构建回复消息
      let replyMsg = `随机到的${riderNameCn}形态是: ${formName}`;

      // 发送文字消息
      await this.reply(replyMsg);

      // 发送图片
      if (imageUrl) {
        const imageSegment = segment.image(imageUrl);
        await this.reply(imageSegment);
      }

      return true;
    } catch (error) {
      logger.error(`[随机特定骑士]插件错误: ${error}`);
      await this.reply(`获取随机骑士形态失败: ${error.message}`);
      return false;
    }
  }

  async getAllForms(e) {
    try {
      // 从正则匹配中获取骑士名称
      const riderNameCn = e.msg.match(/^#?所有(.+)$/)[1];

      // 获取骑士的英文名
      let riderNameEng = RIDER_MAP_REVERSE[riderNameCn];

      // 如果找不到对应的英文名，尝试直接使用输入的名称
      if (!riderNameEng) {
        // 查找是否有匹配的英文名（忽略大小写）
        const foundRider = Object.keys(RIDER_MAP).find(
          (engName) => engName.toLowerCase() === riderNameCn.toLowerCase()
        );

        if (foundRider) {
          riderNameEng = foundRider;
        } else {
          return this.reply(
            `未找到骑士 "${riderNameCn}" 的信息，请检查名称是否正确。`
          );
        }
      }

      // 构建API URL
      const apiUrl = ALL_FORMS_API.replace("{rider}", riderNameEng);

      // 发送等待消息
      await this.reply(`正在获取${riderNameCn}的所有形态，请稍候...`);

      // 调用API获取所有形态数据
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const data = await response.json();

      // 检查返回的数据是否包含形态信息
      if (
        !data ||
        !data.forms ||
        !Array.isArray(data.forms) ||
        data.forms.length === 0
      ) {
        return this.reply(`未找到${riderNameCn}的形态信息`);
      }

      // 准备转发消息
      const forwardMsgs = [];

      // 添加标题消息
      forwardMsgs.push({
        message: `${riderNameCn}的所有形态（共${data.forms.length}个）：`,
        nickname: "假面骑士图鉴",
        user_id: this.e.bot.uin,
      });

      // 遍历所有形态
      for (let i = 0; i < data.forms.length; i++) {
        const form = data.forms[i];
        const formName = form.name;
        const imageUrl = form.image;

        // 构建形态信息消息
        forwardMsgs.push({
          message: [`形态${i + 1}: ${formName}`, segment.image(imageUrl)],
          nickname: "假面骑士图鉴",
          user_id: this.e.bot.uin,
        });
      }

      // 发送合并消息
      await this.reply(await this.makeForwardMsg(forwardMsgs));

      return true;
    } catch (error) {
      logger.error(`[所有形态]插件错误: ${error}`);
      await this.reply(`获取${riderNameCn}的所有形态失败: ${error.message}`);
      return false;
    }
  }

  // 构建合并转发消息
  async makeForwardMsg(msgs) {
    let botInfo = {
      nickname: "假面骑士图鉴",
      user_id: this.e.bot.uin,
    };

    let forwardMsg = [];
    for (let msg of msgs) {
      forwardMsg.push({
        ...botInfo,
        ...msg,
      });
    }

    // 制作转发消息
    if (this.e.isGroup) {
      return await this.e.group.makeForwardMsg(forwardMsg);
    } else {
      return await this.e.friend.makeForwardMsg(forwardMsg);
    }
  }
}
