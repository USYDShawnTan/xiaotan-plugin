import Apis from "../../model/api.js";

export class example extends plugin {
  constructor() {
    super({
      name: "答案之书",
      dsc: "answerbook",
      event: "message",
      priority: 1,
      rule: [
        {
          reg: "^#?答案之书([\\s\\S]*)$",
          fnc: "answerbook",
        },
      ],
    });
  }
  async answerbook(e) {
    const text = await Apis.answerbook();
    const replymessage = `📚答案之书提示您:📚\n${text}`;
    e.reply(replymessage, false, { at: true });
    return true;
  }
}
