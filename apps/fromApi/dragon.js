export class longtu extends plugin {
  constructor() {
    super({
      name: "随机龙图",
      dsc: "随机龙图",
      event: "message",
      priority: 100000,
      rule: [
        {
          reg: ".*?(龙|🐉|long|妈|md|cao|艹|草).*",
          fnc: "longtu",
        },
      ],
    });
  }
    async longtu(e) {
      // 基础 URL，所有图片的基本路径
      const base_url = "https://git.acwing.com/XT/long/-/raw/main/";
      // 定义批次信息
      const batches = {
          "1": [1, 190, ".gif"],
          "2": [191, 522, ".jpg"],
          "3": [523, 854, ".jpg"],
          "4": [855, 1185, ".jpg"],
          "5": [1186, 1516, ".jpg"]
      };
      
      // 随机选择一个批次
      const batch_choice = Object.keys(batches)[Math.floor(Math.random() * Object.keys(batches).length)];
      const [start, end, extension] = batches[batch_choice];
      
      // 生成随机图片编号
      const image_number = Math.floor(Math.random() * (end - start + 1)) + start;
      
      // 拼接图片 URL
      const image_url = `${base_url}${batch_choice}/${image_number}${extension}`;
      
      try {
          // 使用 segment 对象发送图片
          await e.reply(segment.image(image_url), true);
          return true;
      } catch (error) {
          // 错误处理，发送错误消息
          console.error("Error sending image:", error);
          await e.reply("出错啦~稍后再试噢");
          return false;
      }
  }

}
