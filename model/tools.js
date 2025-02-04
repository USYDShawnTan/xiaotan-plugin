import fsPromises from "fs/promises";

class Tools {
  constructor() {
    // Redis key 前缀配置
    this.REDIS_KEYS = {
      PREFIX: "Yunz:",
      TYPES: {
        COIN: "coin",
        STICK: "stick",
        JRYS: "jrys",
        LOTTERY: "lottery",
        LOTTERY_INFO: "lottery:info",
        LOTTERY_HISTORY: "lottery:history",
      },
    };

    // 彩票系统配置
    this.LOTTERY_CONFIG = {
      TICKET_PRICE: 10, // 彩票价格（金币）
      REGRET_COST: 20, // 悔签价格
      EXPIRE_TIME: 86400, // Redis 过期时间（24小时）
      MIN_NUMBER: 10, // 最小彩票号码
      MAX_NUMBER: 99, // 最大彩票号码
    };
  }

  // Redis key 生成器
  getRedisKey(type, id = "") {
    if (!this.REDIS_KEYS.TYPES[type.toUpperCase()]) {
      throw new Error(`Invalid Redis key type: ${type}`);
    }
    return `${this.REDIS_KEYS.PREFIX}${
      this.REDIS_KEYS.TYPES[type.toUpperCase()]
    }${id ? ":" + id : ""}`;
  }

  // 获取当前日期
  async date_time() {
    const today = new Date();
    return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  }

  // 获取当前金币总数
  async getCoins(userId) {
    let totalCoins = await redis.get(this.getRedisKey("COIN", userId));
    return totalCoins ? parseInt(totalCoins) : 0;
  }

  // 增加金币
  async addCoins(userId, coins) {
    let totalCoins = await this.getCoins(userId);
    totalCoins += coins;
    await redis.set(this.getRedisKey("COIN", userId), totalCoins.toString());
    return totalCoins;
  }

  // 消费金币
  async consumeCoins(userId, coins) {
    let totalCoins = await this.getCoins(userId);
    if (totalCoins >= coins) {
      totalCoins -= coins;
      await redis.set(this.getRedisKey("COIN", userId), totalCoins.toString());
      return { success: true, totalCoins };
    }
    return { success: false, totalCoins };
  }

  // 读取文件内容
  async readFile(filePath) {
    try {
      const data = await fsPromises.readFile(filePath, "utf8");
      return data;
    } catch (err) {
      console.error("Error reading file:", err);
      throw err; // or handle the error as needed
    }
  }

  // 获取用户金箍棒的长度
  async getStickLength(userId) {
    let length = await redis.get(this.getRedisKey("STICK", userId));
    return length ? parseFloat(length) : null;
  }

  // 设置金箍棒的初始长度
  async initStickLength(userId, length = null) {
    const initialLength =
      length !== null ? length : Math.floor(Math.random() * 18) + 3;
    await redis.set(
      this.getRedisKey("STICK", userId),
      initialLength.toString()
    );
    return initialLength;
  }

  // 增加或减少金箍棒的长度
  async addStickLength(userId, length) {
    let currentLength = await this.getStickLength(userId);
    if (currentLength === null) {
      throw new Error("用户还没有领养金箍棒");
    }
    currentLength += length;
    await redis.set(
      this.getRedisKey("STICK", userId),
      currentLength.toString()
    );
    return currentLength;
  }

  // 获取当前轮次信息
  async getLotteryInfo() {
    const key = this.getRedisKey("LOTTERY_INFO");
    let info = await redis.get(key);

    if (!info) {
      // 初始化第一轮
      info = {
        turns: 1,
        award: this.getRandomNum(),
        used: [],
      };
      await redis.set(key, JSON.stringify(info));
    } else {
      info = JSON.parse(info);
    }

    return info;
  }

  // 获取用户彩票信息
  async getUserLottery(userId) {
    const key = this.getRedisKey("LOTTERY", userId);
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  // 保存用户彩票信息
  async setUserLottery(userId, lotteryData) {
    const key = this.getRedisKey("LOTTERY", userId);
    await redis.set(key, JSON.stringify(lotteryData), {
      EX: this.LOTTERY_CONFIG.EXPIRE_TIME,
    });
  }

  // 获取彩票历史记录
  async getLotteryHistory() {
    const key = this.getRedisKey("LOTTERY_HISTORY");
    const history = await redis.get(key);
    return history ? JSON.parse(history) : [];
  }

  // 添加彩票历史记录
  async addLotteryHistory(historyData) {
    const key = this.getRedisKey("LOTTERY_HISTORY");
    let history = await this.getLotteryHistory();
    history.push(historyData);
    await redis.set(key, JSON.stringify(history));
  }

  // 生成随机彩票号码
  getRandomNum() {
    return (
      Math.floor(
        Math.random() *
          (this.LOTTERY_CONFIG.MAX_NUMBER - this.LOTTERY_CONFIG.MIN_NUMBER + 1)
      ) + this.LOTTERY_CONFIG.MIN_NUMBER
    );
  }
}

export default new Tools();
