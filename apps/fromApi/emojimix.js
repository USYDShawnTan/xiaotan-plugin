import fetch from "node-fetch";

export class emojimix extends plugin {
  constructor() {
    super({
      name: "emoji合成",
      dsc: "emoji合成",
      event: "message",
      priority: 1045,
      rule: [
        {
          reg: /\p{Emoji_Presentation}{2}$/gu,
          fnc: "emojimix",
        },
      ],
    });
  }

  async emojimix(e) {
    let emojis = e.msg.match(/\p{Emoji_Presentation}/gu);
    if (!emojis || emojis.length !== 2) {
      await e.reply("请输入两个emoji进行合成。");
      return;
    }

    let firstEmoji = encodeURIComponent(emojis[0]);
    let secondEmoji = encodeURIComponent(emojis[1]);

    let url = `https://backend.433200.xyz/emoji?emoji1=${firstEmoji}&emoji2=${secondEmoji}`;

    try {
      let res = await fetch(url);
      if (res.ok) {
        let data = await res.json();
        let finalUrl = data.url;
        let msg = segment.image(finalUrl);
        await e.reply(msg);
      } else {
        await e.reply("这两个emoji不能合成噢~");
      }
    } catch (error) {
      console.error("请求出错", error);
      await e.reply("请求出错，请稍后再试。");
    }
  }
}
