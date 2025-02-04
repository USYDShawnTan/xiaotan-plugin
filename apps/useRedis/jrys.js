import Tools from "../../model/tools.js";
import Apis from "../../model/api.js";

export class JrysPlugin extends plugin {
  constructor() {
    super({
      name: "今日运势",
      dsc: "今日运势与打卡系统",
      event: "message",
      priority: 5000,
      rule: [
        {
          reg: "^(#|/)?(今日运势|运势|打卡|签到|冒泡)$",
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
      SIGN_IN_COINS: { MIN: 3, MAX: 20 }, // 打卡奖励范围
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
      const userId = e.user_id;
      const now = await Tools.date_time();
      const redisKey = this.getUserKey(userId);

      let userData = await redis.get(redisKey).catch(() => null);
      let replymessage = "";

      try {
        // 获取用户当前金币
        let totalCoins = await Tools.getCoins(userId);

        if (!userData) {
          // 新用户，获取运势并发放打卡奖励
          userData = await this.getNewFortune(now);
          const coins =
            Math.floor(
              Math.random() *
                (this.config.SIGN_IN_COINS.MAX -
                  this.config.SIGN_IN_COINS.MIN +
                  1)
            ) + this.config.SIGN_IN_COINS.MIN;

          totalCoins = await Tools.addCoins(userId, coins);
          replymessage = `打卡成功！\n获得${coins}金币\n当前金币：${totalCoins}\n\n让我看看你今天的运势：\n`;
        } else {
          userData = JSON.parse(userData);
          if (now === userData.time) {
            replymessage =
              "今天已经打过卡了喵~\n当前金币：" +
              totalCoins +
              "\n\n让我找找今天的运势：\n";
          } else {
            // 新的一天，更新运势并发放打卡奖励
            userData = await this.getNewFortune(now);
            const coins =
              Math.floor(
                Math.random() *
                  (this.config.SIGN_IN_COINS.MAX -
                    this.config.SIGN_IN_COINS.MIN +
                    1)
              ) + this.config.SIGN_IN_COINS.MIN;

            totalCoins = await Tools.addCoins(userId, coins);
            replymessage = `打卡成功！\n获得${coins}金币\n当前金币：${totalCoins}\n\n让我看看你今天的运势：\n`;
          }
        }

        await redis.set(redisKey, JSON.stringify(userData), {
          EX: this.config.REDIS_EXPIRE_TIME,
        });

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
      const userId = e.user_id;
      const now = await Tools.date_time();
      const redisKey = this.getUserKey(userId);

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

      let result = await Tools.consumeCoins(userId, this.config.REGRET_COST);
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
          await Tools.addCoins(userId, this.config.REGRET_COST);
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
