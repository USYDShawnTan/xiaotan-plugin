import Tools from "../../model/tools.js";

export class LotteryPlugin extends plugin {
  constructor() {
    super({
      name: "彩票",
      dsc: "彩票系统",
      event: "message",
      priority: 5000,
      rule: [
        {
          reg: "^#购买彩票(.*)$",
          fnc: "buyLottery",
        },
        {
          reg: "^(#出卖彩票|#出售彩票|#售出彩票|#卖彩票)$",
          fnc: "sellLottery",
        },
        {
          reg: "^#彩票开奖$",
          fnc: "draw",
        },
        {
          reg: "^#彩票历史$",
          fnc: "lotteryHistory",
        },
        {
          reg: "^#我的历史$",
          fnc: "myHistory",
        },
        {
          reg: "^#我的彩票$",
          fnc: "myLottery",
        },
      ],
    });
  }

  async buyLottery(e) {
    try {
      const userId = e.user_id;
      const nickname = e.member.card || e.member.nickname;
      const groupInfo = await e.group.getInfo();

      // 检查用户是否有足够的金币
      const result = await Tools.consumeCoins(
        userId,
        Tools.LOTTERY_CONFIG.TICKET_PRICE
      );
      if (!result.success) {
        e.reply(
          `购买失败喵~\n你没有足够的金币，需要${Tools.LOTTERY_CONFIG.TICKET_PRICE}金币来购买彩票。\n当前金币数：${result.totalCoins}`,
          false,
          { at: true }
        );
        return true;
      }

      // 获取当前轮次信息
      const lotteryInfo = await Tools.getLotteryInfo();

      // 检查用户是否已购买本轮彩票
      const userLottery = await Tools.getUserLottery(userId);
      if (userLottery && userLottery.turns === lotteryInfo.turns) {
        // 退还金币
        await Tools.addCoins(userId, Tools.LOTTERY_CONFIG.TICKET_PRICE);
        e.reply("您在本轮已经购买过彩票了喵~", false, { at: true });
        return true;
      }

      // 处理彩票号码
      let lotteryNum;
      if (e.msg.length === 4) {
        // 随机号码
        lotteryNum = Tools.getRandomNum();
      } else {
        // 指定号码
        lotteryNum = parseInt(e.msg.slice(4).trim());
        if (
          isNaN(lotteryNum) ||
          lotteryNum < Tools.LOTTERY_CONFIG.MIN_NUMBER ||
          lotteryNum > Tools.LOTTERY_CONFIG.MAX_NUMBER
        ) {
          await Tools.addCoins(userId, Tools.LOTTERY_CONFIG.TICKET_PRICE);
          e.reply(
            `彩票号码必须在${Tools.LOTTERY_CONFIG.MIN_NUMBER}-${Tools.LOTTERY_CONFIG.MAX_NUMBER}之间`,
            false,
            { at: true }
          );
          return true;
        }
      }

      // 检查号码是否已被购买
      if (lotteryInfo.used.some((ticket) => ticket.lotteryNum === lotteryNum)) {
        await Tools.addCoins(userId, Tools.LOTTERY_CONFIG.TICKET_PRICE);
        e.reply(`该号码已被购买，请选择其他号码`, false, { at: true });
        return true;
      }

      // 保存用户彩票信息
      const ticketData = {
        turns: lotteryInfo.turns,
        lotteryNum,
        groupId: e.group_id,
        groupName: groupInfo.group_name,
        time: await Tools.date_time(),
        userId,
        nickname,
      };

      await Tools.setUserLottery(userId, ticketData);

      // 更新轮次信息
      lotteryInfo.used.push({
        userId,
        nickname,
        lotteryNum,
      });
      await redis.set(
        Tools.getRedisKey("LOTTERY_INFO"),
        JSON.stringify(lotteryInfo)
      );

      // 发送购买成功消息
      e.reply(
        `购买成功！\n号码：${lotteryNum}\n花费：${Tools.LOTTERY_CONFIG.TICKET_PRICE}金币\n剩余金币：${result.totalCoins}`,
        false,
        { at: true }
      );
    } catch (err) {
      logger.error(`彩票购买错误: ${err}`);
      e.reply("购买失败，请稍后再试...", false, { at: true });
    }
    return true;
  }

  async sellLottery(e) {
    try {
      const userId = e.user_id;

      // 获取用户彩票信息
      const userLottery = await Tools.getUserLottery(userId);
      const lotteryInfo = await Tools.getLotteryInfo();

      if (!userLottery || userLottery.turns !== lotteryInfo.turns) {
        e.reply("您在本轮没有可以出售的彩票喵~", false, { at: true });
        return true;
      }

      // 退还部分金币
      const refundAmount = Math.floor(Tools.LOTTERY_CONFIG.TICKET_PRICE * 0.8); // 退还80%
      await Tools.addCoins(userId, refundAmount);

      // 从轮次信息中移除用户的彩票
      lotteryInfo.used = lotteryInfo.used.filter(
        (ticket) => ticket.userId !== userId
      );
      await redis.set(
        Tools.getRedisKey("LOTTERY_INFO"),
        JSON.stringify(lotteryInfo)
      );

      // 删除用户彩票信息
      await redis.del(Tools.getRedisKey("LOTTERY", userId));

      e.reply(`彩票已售出！\n退还金币：${refundAmount}`, false, { at: true });
    } catch (err) {
      logger.error(`彩票售出错误: ${err}`);
      e.reply("售出失败，请稍后再试...", false, { at: true });
    }
    return true;
  }

  async draw(e) {
    try {
      if (!e.isMaster) {
        e.reply("只有主人才能开奖喵~", false, { at: true });
        return true;
      }

      const lotteryInfo = await Tools.getLotteryInfo();
      const winningNumber = lotteryInfo.award;
      const winner = lotteryInfo.used.find(
        (ticket) => ticket.lotteryNum === winningNumber
      );

      // 记录开奖历史
      const historyData = {
        turns: lotteryInfo.turns,
        award: winningNumber,
        drawTime: await Tools.date_time(),
        totalTickets: lotteryInfo.used.length,
        winner: winner
          ? {
              userId: winner.userId,
              nickname: winner.nickname,
            }
          : null,
      };
      await Tools.addLotteryHistory(historyData);

      // 发奖励
      if (winner) {
        const prize =
          Tools.LOTTERY_CONFIG.TICKET_PRICE * lotteryInfo.used.length; // 奖池
        await Tools.addCoins(winner.userId, prize);
        e.reply(
          `开奖结果：\n中奖号码：${winningNumber}\n中奖者：${winner.nickname}\n奖励金币：${prize}`,
          false
        );
      } else {
        e.reply(
          `开奖结果：\n中奖号码：${winningNumber}\n很遗憾，本轮无人中奖`,
          false
        );
      }

      // 开启新一轮
      const newInfo = {
        turns: lotteryInfo.turns + 1,
        award: Tools.getRandomNum(),
        used: [],
      };
      await redis.set(
        Tools.getRedisKey("LOTTERY_INFO"),
        JSON.stringify(newInfo)
      );
      e.reply("新一轮彩票已开启，欢迎购买！", false);
    } catch (err) {
      logger.error(`彩票开奖错误: ${err}`);
      e.reply("开奖失败，请稍后再试...", false);
    }
    return true;
  }

  async lotteryHistory(e) {
    try {
      const history = await Tools.getLotteryHistory();
      if (!history.length) {
        e.reply("还没有彩票历史记录喵~", false, { at: true });
        return true;
      }

      // 只显示最近10条记录
      const recentHistory = history.slice(-10);
      let msg = "彩票历史记录：\n";
      msg += "----------------\n";

      for (const record of recentHistory) {
        msg += `轮次：${record.turns}\n`;
        msg += `中奖号码：${record.award}\n`;
        msg += `参与人数：${record.totalTickets}\n`;
        msg += `中奖者：${
          record.winner ? record.winner.nickname : "无人中奖"
        }\n`;
        msg += `开奖时间：${record.drawTime}\n`;
        msg += "----------------\n";
      }

      e.reply(msg, false, { at: true });
    } catch (err) {
      logger.error(`获取彩票历史错误: ${err}`);
      e.reply("获取历史记录失败，请稍后再试...", false, { at: true });
    }
    return true;
  }

  async myHistory(e) {
    try {
      const userId = e.user_id;
      const history = await Tools.getLotteryHistory();
      if (!history.length) {
        e.reply("还没有彩票历史记录喵~", false, { at: true });
        return true;
      }

      // 筛选用户相关的记录
      const userHistory = history.filter(
        (record) => record.winner && record.winner.userId === userId
      );

      if (!userHistory.length) {
        e.reply("您还没有中奖记录喵~", false, { at: true });
        return true;
      }

      let msg = "您的中奖记录：\n";
      msg += "----------------\n";

      for (const record of userHistory) {
        msg += `轮次：${record.turns}\n`;
        msg += `中奖号码：${record.award}\n`;
        msg += `开奖时间：${record.drawTime}\n`;
        msg += "----------------\n";
      }

      e.reply(msg, false, { at: true });
    } catch (err) {
      logger.error(`获取用户历史错误: ${err}`);
      e.reply("获取历史记录失败，请稍后再试...", false, { at: true });
    }
    return true;
  }

  async myLottery(e) {
    try {
      const userId = e.user_id;
      const userLottery = await Tools.getUserLottery(userId);
      const lotteryInfo = await Tools.getLotteryInfo();

      if (!userLottery || userLottery.turns !== lotteryInfo.turns) {
        e.reply("您当前没有持有彩票喵~", false, { at: true });
        return true;
      }

      let msg = "您的彩票信息：\n";
      msg += "----------------\n";
      msg += `轮次：${userLottery.turns}\n`;
      msg += `号码：${userLottery.lotteryNum}\n`;
      msg += `购买时间：${userLottery.time}\n`;
      msg += `购买群：${userLottery.groupName}\n`;
      msg += "----------------\n";

      e.reply(msg, false, { at: true });
    } catch (err) {
      logger.error(`获取用户彩票错误: ${err}`);
      e.reply("获取彩票信息失败，请稍后再试...", false, { at: true });
    }
    return true;
  }
}
