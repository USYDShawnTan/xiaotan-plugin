import Apis from "../../model/api.js";
export class ff extends plugin {
  constructor() {
    super({
      name: "发疯",
      dsc: "ff",
      event: "message",
      priority: 1009,
      rule: [
        {
          reg: "^#?发疯$",
          fnc: "ff1",
        },
        {
          reg: "^#?发疯([\\s\\S]*)$",
          fnc: "ff2",
        },
      ],
    });
  }

  async ff1(e) {
    let Complaint = await Apis.getComplaint();
    let Name = e.sender.card || e.sender.nickname || e.nickname || e.user_id;
    let msg = Complaint.replace(/{target_name}/g, Name);
    await e.reply(msg);
  }
  async ff2(e) {
    let Complaint = await Apis.getComplaint();
    let message = e.msg;
    let Name = message.replace(/^#?发疯/, "").trim();
    let msg = Complaint.replace(/{target_name}/g, Name);
    await e.reply(msg);
  }
}
