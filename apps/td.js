export class td extends plugin {
  constructor() {
    super({
      name: "@td",
      dsc: "快出来td",
      event: "message",
      priority: 10086,
      rule: [
        {
          reg: ".*?(td|TD).*",
          fnc: "td",
        },
      ],
    });
  }
  async td(e) {
    await this.reply(segment.at("2559698787"));
    await this.reply("日你仙人");
    await e.reply(segment.image("data/xn.jpg"));
  }
}
