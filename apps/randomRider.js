import plugin from "../../../lib/plugins/plugin.js";
import fetch from "node-fetch";

// API URL
const RIDER_API = "https://api.433200.xyz/api/kamen-riders-random";

export class randomRider extends plugin {
  constructor() {
    super({
      name: "随机骑士",
      dsc: "随机获取一位假面骑士的信息",
      event: "message",
      priority: 5000,
      rule: [
        {
          reg: "^#?(随机骑士)$",
          fnc: "getRider",
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

      // 构建回复消息
      let replyMsg = `随机到的骑士是: ${rider}\n形态是: ${riderName}`;

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
}
