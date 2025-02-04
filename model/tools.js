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
      },
    };
  }

  // Redis key 生成器
  getRedisKey(type, userId) {
    if (!this.REDIS_KEYS.TYPES[type.toUpperCase()]) {
      throw new Error(`Invalid Redis key type: ${type}`);
    }
    return `${this.REDIS_KEYS.PREFIX}${
      this.REDIS_KEYS.TYPES[type.toUpperCase()]
    }:${userId}`;
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
}

export default new Tools();
