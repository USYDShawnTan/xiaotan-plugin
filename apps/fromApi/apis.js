import Apis from "../../model/api.js";

export class api extends plugin {
  constructor() {
    super({
      name: "API",
      dsc: "从api网页返回信息.",
      event: "message",
      priority: 10086,
      rule: [
        {
          reg: "^#?答案之书([\\s\\S]*)$",
          fnc: "answerbook",
        },
        {
          reg: ".*?(猫|miao|喵|咪).*",
          fnc: "miao",
        },
        {
          reg: /^(?!.*菜狗).*?(狗|gou|勾|汪).*$/,
          fnc: "wang",
        },
        {
          reg: ".*?(哇).*",
          fnc: "capoo",
        },
        {
          reg: ".*?(星期四|疯狂|肯德基|v我50|v我|vivo).*",
          fnc: "crazythursday",
        },
        {
          reg: /(?:[\p{Emoji}][\u200D\uFE0F]*){2}$/u,
          fnc: "emojimix",
        },
        {
          reg: /[\p{Emoji}][\u200D\uFE0F]*$/u,
          fnc: "dynamicEmoji",
        },
        {
          reg: ".*?(龙|🐉|long|妈|md|cao|艹|草).*",
          fnc: "longtu",
        },
        {
          reg: ".*?(坤|kun|黑子|只因|鸡|ji|zhiyin|太美|你干嘛|蔡|cxk|gie).*",
          fnc: "kuntu",
        },
        {
          reg: "^#?发疯$",
          fnc: "ff1",
        },
        {
          reg: "^#?发疯([\\s\\S]*)$",
          fnc: "ff2",
        },
        {
          reg: "海龟汤",
          fnc: "hgt",
        },
        {
          reg: "一言",
          fnc: "yy",
        },
        {
          reg: "骚话",
          fnc: "sh",
        },
        {
          reg: "情话",
          fnc: "qh",
        },
        {
          reg: "笑话",
          fnc: "xh",
        },
        {
          reg: "恐怖",
          fnc: "horror",
        },
      ],
    });
  }
  async answerbook(e) {
    const text = await Apis.answerbook();
    const replymessage = `📚答案之书提示您:📚\n${text}`;
    e.reply(replymessage, false, { at: true });
    return true;
  }
  async miao(e) {
    await Apis.cat(e);
    return true;
  }
  async wang(e) {
    await Apis.dog(e);
    return true;
  }
  async capoo(e) {
    await Apis.Capoo(e);
    return true;
  }
  async crazythursday(e) {
    await Apis.crazythursday(e);
    return true;
  }
  async dynamicEmoji(e) {
    return this.processEmojiRequest(
      e, 
      1, 
      (emojis) => `https://api.433200.xyz/api/dynamic-emoji?emoji=${encodeURIComponent(emojis[0])}`,
      `这个emoji没有动态版本噢~`
    );
  }
  
  async emojimix(e) {
    return this.processEmojiRequest(
      e, 
      2, 
      (emojis) => `https://api.433200.xyz/api/emoji?emoji1=${encodeURIComponent(emojis[0])}&emoji2=${encodeURIComponent(emojis[1])}`,
      "这两个emoji不能合成噢~"
    );
  }
  
  async longtu(e) {
    await Apis.longtu(e);
    return true;
  }
  async kuntu(e) {
    await Apis.kuntu(e);
    return true;
  }
  async ff1(e) {
    let Complaint = await Apis.fafeng();
    let Name = e.sender.card || e.sender.nickname || e.nickname || e.user_id;
    let msg = Complaint.replace(/{target_name}/g, Name);
    await e.reply(msg);
  }
  async ff2(e) {
    let Complaint = await Apis.fafeng();
    let message = e.msg;
    let Name = message.replace(/^#?发疯/, "").trim();
    let msg = Complaint.replace(/{target_name}/g, Name);
    await e.reply(msg);
  }
  async hgt(e) {
    e.reply("来一碗美味可口的海龟汤吧");
    await Apis.hgt(e);
    return true;
  }
  async yy(e) {
    // API的URL
    const url = "https://api.433200.xyz/api/hitokoto";
    try {
      // 从API获取响应
      const response = await fetch(url);
      // 解析响应为JSON
      const data = await response.json();

      // 构建回复消息，包含一言内容和来源信息
      const message = `${data.hitokoto}\n——${
        data.from_who ? data.from_who + "「" : ""
      }${data.from}${data.from_who ? "」" : ""}`;

      // 发送消息
      e.reply(message);
    } catch (error) {
      // 错误处理，发送错误消息
      e.reply("出错啦~稍后再试噢");
    }
  }
  //已经用不了😭😭
  async sh(e) {
    // API的URL
    const url = "https://api.vvhan.com/api/text/sexy";
    try {
      // 从API获取响应
      const response = await fetch(url);
      // 解析响应为文本
      const text = await response.text();

      // 将文本作为消息回复
      e.reply(text);
    } catch (error) {
      // 错误处理，发送错误消息
      e.reply("出错啦~稍后再试噢");
    }
  }
  async qh(e) {
    // API的URL
    const url = "https://api.vvhan.com/api/text/love";
    try {
      // 从API获取响应
      const response = await fetch(url);
      // 解析响应为文本
      const text = await response.text();

      // 将文本作为消息回复
      e.reply(text);
    } catch (error) {
      // 错误处理，发送错误消息
      e.reply("出错啦~稍后再试噢");
    }
  }
  async xh(e) {
    // API的URL
    const url = "https://api.vvhan.com/api/text/joke";
    try {
      // 从API获取响应
      const response = await fetch(url);
      // 解析响应为文本
      const text = await response.text();

      // 将文本作为消息回复
      e.reply(text);
    } catch (error) {
      // 错误处理，发送错误消息
      e.reply("出错啦~稍后再试噢");
    }
  }
  async horror(e) {
    await Apis.horror(e);
    return true;
  }

  // 公共函数处理emoji请求
  async processEmojiRequest(e, requiredCount, makeUrl, errorMessage) {
    // 更全面的emoji正则表达式，包括变体选择符和零宽连接符
    const emojiRegex = /[\p{Emoji}][\u200D\uFE0F]*/gu;
    
    let emojis = e.msg.match(emojiRegex);
    if (!emojis || emojis.length !== requiredCount) {
      await e.reply(requiredCount === 1 ? "请输入一个emoji进行查询" : "请输入两个emoji进行合成");
      return false;
    }
    
    const url = makeUrl(emojis);
    
    try {
      let res = await fetch(url);
      if (res.ok) {
        let data = await res.json();
        let finalUrl = data.url;
        let msg = segment.image(finalUrl);
        await e.reply(msg);
      } else {
        await e.reply(errorMessage);
      }
    } catch (error) {
      console.error("请求出错", error);
      await e.reply("请求出错，请稍后再试。");
    }
    
    return true;
  }
}
