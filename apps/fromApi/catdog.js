import Apis from "../../model/api.js";
export class miao extends plugin {
  constructor() {
    super({
      name: "随机阿猫阿狗",
      dsc: "随机阿猫阿狗",
      event: "message",
      priority: 100000,
      rule: [
        {
          reg: ".*?(猫|miao|喵|🐱|猫猫|咪).*",
          fnc: "miao",
        },
        {
          reg: ".*?(狗|gou|🐶|勾|汪|狗子).*",
          fnc: "wang",
        },
      ],
    });
  }

  async miao(e) {
    await e.reply(await Apis.cat());
  }

  async wang(e) {
    await e.reply(await Apis.dog());
  }
}
