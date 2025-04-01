import plugin from "../../../lib/plugins/plugin.js";
import fetch from "node-fetch";

// API URL
const BASE_API = "https://api.433200.xyz/api/kamen-riders";

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
      name: "卡面来打",
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
        {
          reg: "^#?骑士列表$",
          fnc: "getRiderList",
        },
      ],
    });
  }

  async getRiderList(e) {
    try {
      await this.reply("正在获取骑士列表，请稍候...");

      // 调用API获取骑士列表
      const response = await fetch(`${BASE_API}`);
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const data = await response.json();
      const riders = data.riders;

      if (!riders || !Array.isArray(riders) || riders.length === 0) {
        return this.reply("未找到任何骑士信息。");
      }

      // 将英文名转换为中文名
      const riderList = riders
        .map((rider) => RIDER_MAP[rider] || rider)
        .join("、");

      await this.reply(`当前已导入的骑士列表：\n${riderList}`);
      return true;
    } catch (error) {
      logger.error(`[骑士列表]插件错误: ${error}`);
      await this.reply(`获取骑士列表失败: ${error.message}`);
      return false;
    }
  }

  async getRider(e) {
    try {
      await this.reply("正在寻找随机骑士中...");

      // 调用API获取随机骑士数据
      const response = await fetch(`${BASE_API}?random=true`);

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const data = await response.json();

      const rider = data.rider;
      const riderName = data.image.name;
      const imageUrl = data.image.src;

      const riderChineseName = RIDER_MAP[rider] || rider;

      let replyMsg = `随机到的骑士是: ${riderChineseName}(${rider})\n形态是: ${riderName}`;

      await this.reply(replyMsg);

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
      const riderNameCn = e.msg.match(/^#?随机(.+)$/)[1];
      let riderNameEng = RIDER_MAP_REVERSE[riderNameCn];

      if (!riderNameEng) {
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

      const apiUrl = `${BASE_API}?rider=${riderNameEng}&random=true`;

      await this.reply(`正在寻找随机${riderNameCn}形态中...`);

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const data = await response.json();

      const formName = data.image.name || "未知形态";
      const imageUrl = data.image.src;

      let replyMsg = `随机到的${riderNameCn}形态是: ${formName}`;

      await this.reply(replyMsg);

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
      const riderNameCn = e.msg.match(/^#?所有(.+)$/)[1];
      let riderNameEng = RIDER_MAP_REVERSE[riderNameCn];

      if (!riderNameEng) {
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

      const apiUrl = `${BASE_API}?rider=${riderNameEng}`;

      await this.reply(`正在获取${riderNameCn}的所有形态，请稍候...`);

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const data = await response.json();

      if (
        !data ||
        !data.images ||
        !Array.isArray(data.images) ||
        data.images.length === 0
      ) {
        return this.reply(`未找到${riderNameCn}的形态信息`);
      }

      await this.reply(
        `${riderNameCn}的所有形态（共${data.images.length}个），根据wiki爬取的可能不全，将分批发送...`
      );

      const BATCH_SIZE = 5;

      for (
        let batchIndex = 0;
        batchIndex < Math.ceil(data.images.length / BATCH_SIZE);
        batchIndex++
      ) {
        const forwardMsgs = [];
        const startIndex = batchIndex * BATCH_SIZE;
        const endIndex = Math.min(startIndex + BATCH_SIZE, data.images.length);

        forwardMsgs.push({
          message: `${riderNameCn}的形态（${startIndex + 1}-${endIndex}/${
            data.images.length
          }）：`,
          nickname: "假面骑士图鉴",
          user_id: this.e.bot.uin,
        });

        for (let i = startIndex; i < endIndex; i++) {
          const image = data.images[i];
          const formName = image.name;
          const imageUrl = image.src;

          forwardMsgs.push({
            message: [`形态${i + 1}: ${formName}`, segment.image(imageUrl)],
            nickname: "假面骑士图鉴",
            user_id: this.e.bot.uin,
          });
        }

        await this.reply(await this.makeForwardMsg(forwardMsgs));

        if (batchIndex < Math.ceil(data.images.length / BATCH_SIZE) - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      return true;
    } catch (error) {
      logger.error(`[所有形态]插件错误: ${error}`);
      await this.reply(`获取${riderNameCn}的所有形态失败: ${error.message}`);
      return false;
    }
  }

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

    if (this.e.isGroup) {
      return await this.e.group.makeForwardMsg(forwardMsg);
    } else {
      return await this.e.friend.makeForwardMsg(forwardMsg);
    }
  }
}
