/**
 * 推送管理类
 * 负责管理群组推送的Redis存储和消息发送
 */
class PushManager {
  constructor() {
    // Redis key前缀配置
    this.REDIS_KEYS = {
      PREFIX: "Yunz:push:", // 统一的Redis key前缀
    };
  }

  /**
   * 生成Redis存储key
   * @param {string} type - 推送类型（如NEWS、LEO等）
   * @returns {string} 完整的Redis key
   */
  getRedisKey(type) {
    return `${this.REDIS_KEYS.PREFIX}${type.toLowerCase()}:groups`;
  }

  /**
   * 获取指定类型的推送群组列表
   * @param {string} type - 推送类型
   * @returns {Promise<string[]>} 群组ID列表
   */
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

  /**
   * 保存推送群组列表
   * @param {string} type - 推送类型
   * @param {string[]} groups - 群组ID列表
   * @returns {Promise<boolean>} 保存结果
   */
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

  /**
   * 添加推送群组
   * @param {string} type - 推送类型
   * @param {string} groupId - 群组ID
   * @returns {Promise<{success: boolean, message: string}>} 操作结果
   */
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

  /**
   * 删除推送群组
   * @param {string} type - 推送类型
   * @param {string} groupId - 群组ID
   * @returns {Promise<{success: boolean, message: string}>} 操作结果
   */
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

  /**
   * 发送群组消息
   * @param {string} type - 推送类型
   * @param {string} message - 消息内容
   * @param {Object} options - 附加选项（如图片URL等）
   * @returns {Promise<{success: string[], failed: Array}>} 发送结果
   */
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

        // 如果有图片选项，先发送图片
        if (options.image) {
          await group.sendMsg(segment.image(options.image));
        }

        // 发送文本消息
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
