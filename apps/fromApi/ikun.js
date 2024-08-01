export class KuntuPlugin extends plugin {
  constructor() {
    super({
      name: "随机坤图",
      dsc: "随机坤图",
      event: "message",
      priority: 100000,
      rule: [
        {
          reg: ".*?(坤|kun|黑子|只因|鸡|🐔|ji|zhiyin|太美|你干嘛|蔡|cxk).*",
          fnc: "kuntu",
        },
      ],
    });
  }

  async kuntu(e) {
    const base_url = "https://git.acwing.com/XT/ikun/-/raw/main/";
    const batches = {
      1: [1, 100, ".jpg"],
      2: [101, 199, ".jpg"],
      3: [200, 298, ".jpg"],
      4: [299, 397, ".jpg"],
      5: [398, 496, ".jpg"],
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
