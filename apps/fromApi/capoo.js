import Apis from "../../model/api.js";
export class example extends plugin {
  constructor() {
    super({
      name: "capoo",
      dsc: "简单开发示例",
      event: "message",
      priority: 9999999999999,
      rule: [
        {
          reg: ".*?(哇|好|你).*",
          fnc: "capoo",
        }
      ],
    });
  }

  async capoo(e) {
    await Apis.Capoo(e);
    return true;
  }
}
