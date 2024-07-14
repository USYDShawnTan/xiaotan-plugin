import fetch from "node-fetch";
import common from "../../../../lib/common/common.js";

export class HoroscopePlugin extends plugin {
  constructor() {
    super({
      name: "星座运势",
      dsc: "星座运势",
      event: "message",
      priority: 1045,
      rule: [
        {
          reg: "^(白羊座|金牛座|双子座|巨蟹座|狮子座|处女座|天秤座|天蝎座|射手座|摩羯座|水瓶座|双鱼座)(今日|明日|本周|本月)运势$",
          fnc: "getHoroscope",
        },
        {
          reg: "^#?星座运势$",
          fnc: "HoroscopeHelp",
        },
      ],
    });
  }

  async HoroscopeHelp(e) {
    const msg =
      "星座运势查询：\n" +
      "查询今日、明日、本周、本月的星座运势\n" +
      "命令格式：星座(今日|明日|本周|本月)运势\n" +
      "例如：狮子座今日运势";
    await e.reply(msg);
  }

  async getHoroscope(e) {
    const signMap = {
      白羊座: "aries",
      金牛座: "taurus",
      双子座: "gemini",
      巨蟹座: "cancer",
      狮子座: "leo",
      处女座: "virgo",
      天秤座: "libra",
      天蝎座: "scorpio",
      射手座: "sagittarius",
      摩羯座: "capricorn",
      水瓶座: "aquarius",
      双鱼座: "pisces",
    };

    const timeMap = {
      今日: "today",
      明日: "nextday",
      本周: "week",
      本月: "month",
    };

    // 从消息中提取星座和时间
    const match = e.msg.match(
      /^(白羊座|金牛座|双子座|巨蟹座|狮子座|处女座|天秤座|天蝎座|射手座|摩羯座|水瓶座|双鱼座)(今日|明日|本周|本月)运势$/
    );
    if (!match) return;

    const sign = signMap[match[1]];
    const time = timeMap[match[2]];

    // 构建API的URL
    const url = `https://api.vvhan.com/api/horoscope?type=${sign}&time=${time}`;
    try {
      // 从API获取响应
      const response = await fetch(url);
      // 解析响应为JSON
      const data = await response.json();

      // 构建回复内容
      const fortune = data.data;
      const forward = [];

      let replyText =
        `🕙时间: ${fortune.time}\n` +
        `✅宜: ${fortune.todo.yi}\n` +
        `🚫忌: ${fortune.todo.ji}\n`;

      if (time !== "week" && time !== "month") {
        replyText +=
          `幸运数字: ${fortune.luckynumber}\n` +
          `幸运颜色: ${fortune.luckycolor}色\n` +
          `幸运星座: ${fortune.luckyconstellation}\n`;
      }

      const getStars = (num) => "🌟".repeat(num);
      replyText +=
        `🌅综合: ${fortune.index.all} (${getStars(fortune.fortune.all)})\n` +
        `❤️爱情: ${fortune.index.love} (${getStars(fortune.fortune.love)})\n` +
        `💼事业: ${fortune.index.work} (${getStars(fortune.fortune.work)})\n` +
        `💰财富: ${fortune.index.money} (${getStars(
          fortune.fortune.money
        )})\n` +
        `💪健康: ${fortune.index.health} (${getStars(
          fortune.fortune.health
        )})\n` +
        `综合评语: ${fortune.shortcomment}\n\n` +
        `详细运势:\n` +
        `🌅综合: ${fortune.fortunetext.all}\n` +
        `❤️爱情: ${fortune.fortunetext.love}\n` +
        `💼事业: ${fortune.fortunetext.work}\n` +
        `💰财富: ${fortune.fortunetext.money}\n` +
        `💪健康: ${fortune.fortunetext.health}`;

      forward.push(replyText);

      // 制作转发消息
      const msg = await common.makeForwardMsg(
        e,
        forward,
        `🔯${fortune.title}${fortune.type}🔯`
      );

      // 制作完成，回复消息
      await this.reply(msg);
    } catch (error) {
      // 错误处理，发送错误消息
      e.reply("获取星座运势时出错了，请稍后再试。");
    }
  }
}
