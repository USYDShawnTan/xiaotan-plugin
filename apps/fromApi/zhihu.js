import fetch from "node-fetch";
import common from "../../../../lib/common/common.js";


export class example extends plugin {
  constructor() {
    super({
      name: "热搜",
      dsc: "获取并展示知乎热搜",
      event: "message",
      priority: 10086,
      rule: [
        {
          reg: "热搜",
          fnc: "getHotSearch",
        },
      ],
    });
  }

  async getHotSearch(e) {
    try {
      const response = await fetch("https://backend.433200.xyz/hot?from=zhihu");
      const data = await response.json();

      if (!data.success) {
        await e.reply("获取热搜失败，请稍后再试", true);
        return true;
      }

      const forwardMessages = [];

     // 将 UTC 时间转换为北京时间
      const updateTimeUtc = new Date(data.update_time.replace(' ', 'T') + 'Z');
      const updateTimeBeijing = new Date(updateTimeUtc.getTime() + 8 * 60 * 60 * 1000);
      const formattedUpdateTime = updateTimeBeijing.toISOString().replace('T', ' ').substring(0, 19);

      // 第一条消息，添加更新时间信息
      forwardMessages.push("获取到知乎热搜如下：");
      forwardMessages.push(`更新时间：${formattedUpdateTime}`);

      // 解析返回的数据，只取前九条
      data.data.slice(0, 9).forEach((item, index) => {
        const msg = `【 ${item.index} 】${item.title}`;
        forwardMessages.push(msg);
        if (item.pic) {
          forwardMessages.push(segment.image(item.pic));
        }
        const msg2 = `${item.desc}\n🔥${item.hot}🔥\n${item.url}`
        forwardMessages.push(msg2);
        // 每隔一条发送一个分界线
        if (index < 8) {
          forwardMessages.push("————🐱————");
        }
      });

      // 制作并发送转发消息
      const forwardMsg = await common.makeForwardMsg(e, forwardMessages);
      await e.reply(forwardMsg);
    } catch (error) {
      console.error("Error fetching hot search data:", error);
      await e.reply("获取热搜失败，请稍后再试", true);
    }
    return true;
  }
}
