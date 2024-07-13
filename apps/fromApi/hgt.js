import Apis from "../../model/api.js";
export class hgt extends plugin {
  constructor() {
    super({
      name: "海龟汤",
      dsc: "海龟汤",
      event: "message",
      priority: 1145,
      rule: [
        {
          reg: "海龟汤",
          fnc: "hgt",
        },
      ],
    });
  }
  async hgt(e) {
    e.reply("来一碗美味可口的海龟汤吧");
    await Apis.hgt(e);
    return true;
  }
}
