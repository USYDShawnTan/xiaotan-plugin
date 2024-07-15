import schedule from "node-schedule";
let groupnumber_list = ["103382278", "865913474"];
let url = "https://backend.433200.xyz/moyu?type=pic";

export class news extends plugin {
  constructor() {
    super({
      name: "摸鱼",
      dsc: "摸鱼人日历",
      event: "message",
      priority: 5000,
      rule: [
        {
          reg: "^#?摸鱼.*$",
          fnc: "moyu",
        },
      ],
    });
  }

  async nemoyuws(e) {
    e.reply(segment.image(url));
    return true;
  }
}

schedule.scheduleJob("0 0 8 * * ?", async () => {
  for (var i = 0; i < groupnumber_list.length; i++) {
    let group = Bot.pickGroup(groupnumber_list[i]);
    group.sendMsg(segment.image(url));
    group.sendMsg("🐟今日份摸鱼人日历~");
  }
});

