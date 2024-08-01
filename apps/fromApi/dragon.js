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
    const base_url = "https://git.acwing.com/XT/long/-/raw/main/";
    const batches = {
      1: [1, 190, ".gif"],
      2: [191, 522, ".jpg"],
      3: [523, 854, ".jpg"],
      4: [855, 1185, ".jpg"],
      5: [1186, 1516, ".jpg"],
    };

    const batch_choice =
      Object.keys(batches)[
        Math.floor(Math.random() * Object.keys(batches).length)
      ];
    const [start, end, extension] = batches[batch_choice];
    const image_number = Math.floor(Math.random() * (end - start + 1)) + start;
    const image_url = `${base_url}${batch_choice}/${image_number}${extension}`;

    try {
      await e.reply(segment.image(image_url), false);
      return true;
    } catch (error) {
      console.error("Error sending image:", error);
      await e.reply("出错啦~稍后再试噢");
      return false;
    }
  }
}
