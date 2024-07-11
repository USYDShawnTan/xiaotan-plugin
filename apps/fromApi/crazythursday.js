import fetch from "node-fetch";

export class crazythursday extends plugin {
  constructor() {
    super({
      name: "疯狂星期四",
      // 功能描述
      dsc: "疯狂星期四",
      event: "message",
      // 优先级,数字越小等级越高
      priority: 1045,
      rule: [
        {
          reg: ".*?(星期四|疯狂|肯德基|v我|50).*",
          fnc: "crazythursday",
        },
      ],
    });
  }

  async crazythursday(e) {
    // API的URL
    const url = "https://backend.433200.xyz/crazythursday?type=txt";
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
}
