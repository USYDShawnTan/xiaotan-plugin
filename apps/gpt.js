import plugin from "../../../lib/plugins/plugin.js";
import { gpt } from "gpti";
import { dalle } from "gpti";

export class gpt_use extends plugin {
  constructor() {
    super({
      name: "gpt",
      dsc: "gpt",
      event: "message",
      priority: 1009,
      rule: [
        {
          reg: "^#?(gpt|机器人)([\\s\\S]*)$",
          fnc: "gpt_content",
        },
        {
          reg: "^#?(ai画|画)([\\s\\S]*)$",
          fnc: "ai_draw",
        },
      ],
    });
  }

  async gpt_content(e) {
    let message = e.msg;
    let content = message.replace(/^#?(gpt|机器人)/, "").trim();
    if (content) {
      gpt.v1(
        {
          prompt: content,
          model: "gpt-4-32k",
          markdown: false,
        },
        (err, data) => {
          if (err) {
            e.reply("遇到了一些问题，请稍后再试。", true);
            return true;
          } else {
            if (data.code === 200) {
              let ReplyMsg = data.gpt;
              if (ReplyMsg) {
                e.reply(ReplyMsg, true);
                return true;
              }
            } else {
              e.reply("远程服务器返回错误，请稍后再试。", true);
              return true;
            }
          }
        }
      );
    } else {
      await e.reply("请输入与GPT对话的内容。", true);
      return true;
    }
  }

  async ai_draw(e) {
    let inputMessage = e.msg;
    let content = inputMessage.replace(/^#?(ai画|画)/, "").trim();
    if (content) {
      await e.reply("🎨在画了在画了，别催我🎨", true);
      dalle.v1(
        {
          prompt: content,
        },
        (error, result) => {
          if (error) {
            console.log(err);
            e.reply("遇到了一些问题，请反馈控制台日志给开发者", true);
            return true;
          } else {
            if (result.code === 200) {
              for (let element of result.images) {
                const image = segment.image(
                  "base64://" + element.replace("data:image/jpeg;base64,", "")
                );
                e.reply(image, true);
              }
              return true;
            } else {
              e.reply(
                "远程服务器返回错误代码 " + result.code + " ，请等待开发者修复",
                true
              );
              return true;
            }
          }
        }
      );
    } else {
      await e.reply("请输入 DALL-E 生成图片的描述", true);
      return true;
    }
  }
}
