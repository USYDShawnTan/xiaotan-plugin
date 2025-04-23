import lodash from "lodash";
import plugin from "../../../lib/plugins/plugin.js";
import cards from "../resources/tarots/tarot.js";
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
}
