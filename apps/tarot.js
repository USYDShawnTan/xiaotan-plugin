import lodash from "lodash";
import plugin from "../../../lib/plugins/plugin.js";
import cards from "../resources/tarots/tarot.js";
import common from "../../../lib/common/common.js";
import { gpt } from "gpti";
import { Plugin_Path } from "../components/index.js";

const tarotsPath = `${Plugin_Path}/resources/tarots/`;

export class tarot extends plugin {
  constructor() {
    super({
      name: "tarot",
      dsc: "塔罗牌",
      event: "message",
      priority: 5000,
      rule: [
        {
          reg: "^#?塔罗牌$",
          fnc: "tarot",
        },
        {
          reg: "^#?塔罗牌占卜([\\s\\S]*)$",
          fnc: "tarotgpt",
        },
      ],
    });
  }

  async tarot() {
    const { name, isUp, imagePath } = this.drawCard();
    await this.replyCard(name, isUp, imagePath, true, true);
  }

  drawCard() {
    const card = lodash.sample(cards);
    const name = card.nameCn;
    const isUp = lodash.random(0, 1);
    const imageFilename = `${card.pic}.jpg`;
    const imagePath = `${tarotsPath}${card.type}/${imageFilename}`;
    return { name, isUp, imagePath };
  }

  async replyCard(name, isUp, imagePath, includeAnalysis, includeImage) {
    let replyText = `你抽到了：\n【${name} の ${isUp ? "正位" : "逆位"}】`;
    if (includeAnalysis) {
      replyText += `\n牌面解析：${
        isUp
          ? cards.find((c) => c.nameCn === name).meaning.up
          : cards.find((c) => c.nameCn === name).meaning.down
      }`;
    }
    await this.reply(replyText, false, { at: true });
    if (includeImage) {
      const pic = segment.image(imagePath);
      await this.reply(pic);
    }
  }

  prepareGptContent(e, draws) {
    const message = e.msg;
    const replacedMsg = message.replace(/^#?塔罗牌占卜/, "").trim();
    const drawDescriptions = draws
      .map((draw) => `${draw.name}的${draw.isUp ? "正位" : "逆位"}`)
      .join(", ");
    return `我请求你担任塔罗占卜师的角色。我想占卜的内容方向是${replacedMsg}，我抽到的牌是${drawDescriptions}，请您结合我想占卜的内容来解释含义,话语尽可能详细。`;
  }

  async tarotgpt(e) {
    const draws = [];
    for (let i = 0; i < 3; i++) {
      draws.push(this.drawCard());
    }

    const forward = draws
      .map((draw, index) => {
        const text = `第${index + 1}张：【${draw.name} の ${
          draw.isUp ? "正位" : "逆位"
        }】`;
        const image = segment.image(draw.imagePath);
        return [text, image];
      })
      .flat(); // 展开嵌套数组

    // 制作转发消息，填入描述
    const msg = await common.makeForwardMsg(
      e,
      forward,
      "🔮塔罗牌抽取结果如下🔮"
    );

    // 制作完成，回复消息
    await this.reply(msg);
    const content = this.prepareGptContent(e, draws);
    if (content) {
      this.callGpt(content, e);
    } else {
      await e.reply("请输入与GPT对话的内容。", true);
    }
    return true;
  }

  callGpt(content, e) {
    e.reply("🔮正在为您占卜中🔮", true);
    gpt.v1(
      {
        prompt: content,
        model: "gpt-4",
        markdown: false,
      },
      (err, data) => {
        if (err) {
          e.reply("遇到了一些问题，请稍后再试。", true);
          return true;
        }
        if (data.code === 200) {
          let replyMsg = data.gpt;
          if (replyMsg) {
            const forward = [];
            forward.push(replyMsg);
            const msg = common.makeForwardMsg(
              e,
              forward,
              "🔮塔罗牌占卜结果如下🔮"
            );
            e.reply(msg);
            return true;
          }
        } else {
          e.reply("远程服务器返回错误，请稍后再试。", true);
          return true;
        }
      }
    );
  }
}
