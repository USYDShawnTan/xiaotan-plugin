export class example extends plugin {
  constructor() {
    super({
      name: "测试",
      dsc: "简单开发示例",
      event: "message",
      priority: 10086,
      rule: [
        {
          reg: "小谈",
          fnc: "xt",
        },
        {
          reg: "测试",
          fnc: "cs",
        },
      ],
    });
  }

  async xt() {
    const msg = "小谈yyds";
    await this.e.reply(msg);
  }
  async cs() {
    const msg = "测试成功";
    await this.e.reply(msg);
  }
}
