import Tools from "../../model/tools.js";
import Apis from "../../model/api.js";

export class JrysPlugin extends plugin {
  constructor() {
    super({
      name: "今日运势",
      dsc: "今日运势",
      event: "message",
      priority: 5000,
      rule: [
        {
          reg: "^(#|/)?(今日运势|运势)$",
          fnc: "todayFortune",
        },
        {
          reg: "^(#|/)?(悔签|改命|逆天改命)$",
          fnc: "regretFortune",
        },
      ],
    });
  }

  async todayFortune(e) {
    logger.mark(e.user_id);
    const now = await Tools.date_time();
    let userData = await redis.get(`Yunz:JRYS:${e.user_id}`);

    let replymessage;
    if (userData) {
      userData = JSON.parse(userData);
      const lastFortuneDatetime = userData.time;

      // 如果用户已经有当天的运势,就使用已存储的数据
      if (now === lastFortuneDatetime) {
        replymessage = "今天已经抽过了喵,我去给你找找签:";
        replymessage += userData.message;
      } else {
        // 否则随机抽取新的运势
        let { fortuneData, message } = await Apis.jrys();
        userData.fortune = fortuneData;
        userData.message = message;
        userData.time = now;
        await redis.set(`Yunz:JRYS:${e.user_id}`, JSON.stringify(userData));
        replymessage = "让我看看你走的什么运:";
        replymessage += message;
      }
    } else {
      // 如果用户没有运势记录,则新建一条
      let { fortuneData, message } = await Apis.jrys();
      let userData = { fortune: fortuneData, message: message, time: now };
      await redis.set(`Yunz:JRYS:${e.user_id}`, JSON.stringify(userData));
      replymessage = "让我看看你走的什么运:";
      replymessage += message;
    }

    e.reply(replymessage, false, { at: true });
    return true;
  }

  async regretFortune(e) {
    const regretCost = 5; // 悔签需要的金币数
    let now = await Tools.date_time();
    let userData = await redis.get(`Yunz:JRYS:${e.user_id}`);

    if (!userData) {
      e.reply("您今天还没有抽过运势，无法悔签。");
      return true;
    }

    userData = JSON.parse(userData);
    if (now !== userData.time) {
      e.reply("您今天还没有抽过运势，无法悔签。");
      return true;
    }

    let result = await Tools.consumeCoins(e.user_id, regretCost);
    if (result.success) {
      let { fortuneData, message } = await Apis.jrys();
      userData.fortune = fortuneData; // 更新运势
      userData.message = message;

      await redis.set(`Yunz:JRYS:${e.user_id}`, JSON.stringify(userData));
      let replymessage = `我！命！由！我！不！由！天！\n您消耗了${regretCost}金币！剩余金币数：${result.totalCoins}\n改命结果：`;
      replymessage += message;
      e.reply(replymessage, false, { at: true });
    } else {
      e.reply(
        `悔签失败喵~\n你没有足够的金币，需要${regretCost}金币来悔签。\n当前金币数：${result.totalCoins}`,
        false,
        { at: true }
      );
    }

    return true;
  }
}