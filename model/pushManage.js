class PushManager {
  constructor() {
    this.REDIS_KEYS = {
      PREFIX: "Yunz:push:",
      TYPES: {
        NEWS: "news",
        LOTTERY: "lottery",
        NOTICE: "notice",
        LEO: "leo",
      },
    };
  }

  // 获取Redis key
  getRedisKey(type) {
    if (!this.REDIS_KEYS.TYPES[type.toUpperCase()]) {
      throw new Error(`Invalid push type: ${type}`);
    }
    return `${this.REDIS_KEYS.PREFIX}${
      this.REDIS_KEYS.TYPES[type.toUpperCase()]
    }:groups`;
  }

  // 获取推送群组列表
  async getGroupList(type) {
    try {
      const key = this.getRedisKey(type);
      let groups = await redis.get(key);
      return groups ? JSON.parse(groups) : [];
    } catch (err) {
      logger.error(`获取${type}推送群组失败: ${err}`);
      return [];
    }
  }

  // 保存推送群组列表
  async saveGroupList(type, groups) {
    try {
      const key = this.getRedisKey(type);
      await redis.set(key, JSON.stringify(groups));
      return true;
    } catch (err) {
      logger.error(`保存${type}推送群组失败: ${err}`);
      return false;
    }
  }

  // 添加推送群组
  async addGroup(type, groupId) {
    try {
      let groups = await this.getGroupList(type);
      if (groups.includes(groupId)) {
        return { success: false, message: "该群已在推送列表中" };
      }
      groups.push(groupId);
      await this.saveGroupList(type, groups);
      return { success: true, message: "添加成功" };
    } catch (err) {
      logger.error(`添加${type}推送群组失败: ${err}`);
      return { success: false, message: "添加失败，请稍后重试" };
    }
  }

  // 删除推送群组
  async removeGroup(type, groupId) {
    try {
      let groups = await this.getGroupList(type);
      if (!groups.includes(groupId)) {
        return { success: false, message: "该群不在推送列表中" };
      }
      groups = groups.filter((g) => g !== groupId);
      await this.saveGroupList(type, groups);
      return { success: true, message: "删除成功" };
    } catch (err) {
      logger.error(`删除${type}推送群组失败: ${err}`);
      return { success: false, message: "删除失败，请稍后重试" };
    }
  }

  // 发送推送消息
  async sendGroupMsg(type, message, options = {}) {
    const groups = await this.getGroupList(type);
    const results = {
      success: [],
      failed: [],
    };

    for (const groupId of groups) {
      try {
        let group = Bot.pickGroup(groupId);
        if (!group) {
          results.failed.push({ groupId, error: "Group not found" });
          continue;
        }

        if (options.image) {
          await group.sendMsg(segment.image(options.image));
        }

        if (message) {
          await group.sendMsg(message);
        }

        results.success.push(groupId);
      } catch (err) {
        logger.error(`群 ${groupId} 消息推送失败: ${err}`);
        results.failed.push({ groupId, error: err.message });
      }
    }

    return results;
  }
}

export default new PushManager();
