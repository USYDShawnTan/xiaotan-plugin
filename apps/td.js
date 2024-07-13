export class td extends plugin {
  constructor() {
    super({
      name: "@td",
      dsc: "快出来td",
      event: "message",
      priority: 10086,
      rule: [
        {
          reg: "td",
          fnc: "td",
        },
       
      ],
    });
  }
  async td() {
    await this.reply(segment.at('2559698787'))
    await this.reply(segment.at('2559698787'))
    await this.reply(segment.at('2559698787'))
  }
}
