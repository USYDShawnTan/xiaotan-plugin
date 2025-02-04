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

    this.config = {
      REDIS_KEY_PREFIX: "Yunz:JRYS:",
      REGRET_COST: 5,
      REDIS_EXPIRE_TIME: 86400, // 24小时过期
    };
  }

  // 获取用户的 Redis key
  getUserKey(userId) {
    return `${this.config.REDIS_KEY_PREFIX}${userId}`;
  }

  // 获取新运势
  async getNewFortune(now) {
    const { fortuneData, message } = await Apis.jrys();
    return { fortune: fortuneData, message, time: now };
  }

  async todayFortune(e) {
    try {
      logger.mark(e.user_id);
      const now = await Tools.date_time();
      const redisKey = this.getUserKey(e.user_id);

      let userData = await redis.get(redisKey).catch(() => null);
      let replymessage;

      try {
        if (!userData) {
          userData = await this.getNewFortune(now);
        } else {
          userData = JSON.parse(userData);
          if (now === userData.time) {
            replymessage = "今天已经抽过了喵,我去给你找找签:";
            replymessage += userData.message;
            e.reply(replymessage, false, { at: true });
            return true;
          }
          userData = await this.getNewFortune(now);
        }

        await redis.set(redisKey, JSON.stringify(userData), {
          EX: this.config.REDIS_EXPIRE_TIME,
        });

        replymessage = "让我看看你走的什么运:";
        replymessage += userData.message;
        e.reply(replymessage, false, { at: true });
      } catch (err) {
        logger.error(`运势获取失败: ${err}`);
        e.reply("抱歉，运势获取失败了喵...", false, { at: true });
      }
    } catch (err) {
      logger.error(`运势系统错误: ${err}`);
      e.reply("系统遇到一些问题，请稍后再试喵...", false, { at: true });
    }
    return true;
  }

  async regretFortune(e) {
    try {
      const now = await Tools.date_time();
      const redisKey = this.getUserKey(e.user_id);

      let userData = await redis.get(redisKey).catch(() => null);

      if (!userData) {
        e.reply("您今天还没有抽过运势，无法悔签。", false, { at: true });
        return true;
      }

      userData = JSON.parse(userData);
      if (now !== userData.time) {
        e.reply("您今天还没有抽过运势，无法悔签。", false, { at: true });
        return true;
      }

      let result = await Tools.consumeCoins(e.user_id, this.config.REGRET_COST);
      if (result.success) {
        try {
          userData = await this.getNewFortune(now);
          await redis.set(redisKey, JSON.stringify(userData), {
            EX: this.config.REDIS_EXPIRE_TIME,
          });

          let replymessage = `我！命！由！我！不！由！天！\n您消耗了${this.config.REGRET_COST}金币！剩余金币数：${result.totalCoins}\n改命结果：`;
          replymessage += userData.message;
          e.reply(replymessage, false, { at: true });
        } catch (err) {
          logger.error(`悔签获取新运势失败: ${err}`);
          // 退还金币
          await Tools.addCoins(e.user_id, this.config.REGRET_COST);
          e.reply("悔签失败，已退还金币，请稍后再试...", false, { at: true });
        }
      } else {
        e.reply(
          `悔签失败喵~\n你没有足够的金币，需要${this.config.REGRET_COST}金币来悔签。\n当前金币数：${result.totalCoins}`,
          false,
          { at: true }
        );
      }
    } catch (err) {
      logger.error(`悔签系统错误: ${err}`);
      e.reply("系统遇到一些问题，请稍后再试喵...", false, { at: true });
    }
    return true;
  }
}
