import Apis from "../../model/api.js";

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
    await Apis.crazythursday(e);
    return true;
  }

}
