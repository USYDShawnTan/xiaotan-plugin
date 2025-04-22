import fetch from "node-fetch";
import common from "../../../../lib/common/common.js";

export class ZhihuPlugin extends plugin {
  constructor() {
    super({
      name: "热搜",
      dsc: "获取并展示知乎热搜",
      event: "message",
      priority: 10086,
      rule: [
        {
          reg: "^#?热搜$",
          fnc: "getHotSearch",
        },
      ],
    });
  }

  async getHotSearch(e) {
    try {
      const response = await fetch("https://api.433200.xyz/api/hot?from=zhihu");
      const data = await response.json();

      if (!data.success) {
        await e.reply("获取热搜失败，请稍后再试", true);
        return true;
      }

      const forwardMessages = [];

      // 安全处理时间格式
      let formattedUpdateTime;
      try {
        // 尝试解析API返回的时间格式
        let updateTimeStr = data.update_time;
        
        // 检查日期格式，并尝试修复常见问题
        if (updateTimeStr && typeof updateTimeStr === 'string') {
          // 替换斜杠为破折号，使其符合标准格式
          updateTimeStr = updateTimeStr.replace(/(\d+)\/(\d+)\/(\d+)/, '$1-$2-$3');
          
          // 创建日期对象
          const updateTime = new Date(updateTimeStr);
          
          // 检查日期是否有效
          if (!isNaN(updateTime.getTime())) {
            // 格式化为易读的时间字符串
            formattedUpdateTime = updateTime.toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            });
          } else {
            // 如果日期无效，使用当前时间
            formattedUpdateTime = new Date().toLocaleString('zh-CN', {
              hour12: false
            });
            console.log(`[热搜] 无效的日期格式: ${data.update_time}，已使用当前时间代替`);
          }
        } else {
          // 如果没有提供时间，使用当前时间
          formattedUpdateTime = new Date().toLocaleString('zh-CN', {
            hour12: false
          });
          console.log(`[热搜] 未提供更新时间，已使用当前时间`);
        }
      } catch (err) {
        // 出现任何错误，使用当前时间
        formattedUpdateTime = new Date().toLocaleString('zh-CN', {
          hour12: false
        });
        console.error(`[热搜] 处理时间出错: ${err.message}，已使用当前时间代替`);
      }

      // 第一条消息，添加更新时间信息
      forwardMessages.push("获取到知乎热搜如下：");
      forwardMessages.push(`更新时间：${formattedUpdateTime}`);

      // 解析返回的数据，只取前九条
      data.data.slice(0, 9).forEach((item, index) => {
        const msg = `【 ${item.index} 】${item.title}`;
        forwardMessages.push(msg);
        if (item.pic) {
          forwardMessages.push(segment.image(item.pic));
        }
        const msg2 = `${item.desc}\n🔥${item.hot}🔥\n${item.url}`;
        forwardMessages.push(msg2);
        // 每隔一条发送一个分界线
        if (index < 8) {
          forwardMessages.push("————🐱————");
        }
      });

      // 制作并发送转发消息
      const forwardMsg = await common.makeForwardMsg(e, forwardMessages);
      await e.reply(forwardMsg);
    } catch (error) {
      console.error("Error fetching hot search data:", error);
      // 提供更具体的错误信息
      let errorMsg = "获取热搜失败，请稍后再试";
      
      // 针对日期错误提供特别说明
      if (error instanceof RangeError && error.message.includes("Invalid time value")) {
        errorMsg = "热搜数据时间格式异常，开发者已收到报告，请稍后再试";
        console.error("[热搜] 时间格式错误，请检查API返回的update_time字段格式");
      }
      
      await e.reply(errorMsg, true);
    }
    return true;
  }
}
