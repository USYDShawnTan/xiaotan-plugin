import { Plugin_Path } from "../components/index.js";
let shyResponses = [
  "讨厌，别戳人家嘛~",
  "哼，再戳就不理你啦~",
  "不要这样啦，人家会害羞的~",
  "真是的，你怎么这样~",
  "哎呀，不要这样啦，人家会脸红的~",
  "你讨厌，再这样人家生气了哦~",
  "哼，你再这样人家真的不理你了~",
  "不要再戳啦，人家会害羞啦~",
  "哎呀，你怎么这么坏~",
  "哼，再这样我生气了哦~",
  "讨厌，再这样我真的不理你了~",
  "你真坏，让人家害羞~",
  "哼，你再这样我就不理你了~",
  "不要再戳啦，讨厌~",
  "真是的，再这样人家生气了哦~",
  "哎呀，你真是的，让人家脸红~",
  "讨厌，别这样啦，人家害羞~",
  "哼，再这样我不理你了~",
  "真讨厌，你这样让我怎么好意思~",
  "哎呀，你真是个坏蛋~",
];
const imgPath = `${Plugin_Path}/resources/pic/`;

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

export class xnncyc extends plugin {
  constructor() {
    super({
      name: "戳一戳",
      dsc: "戳一戳发送图片",
      event: "notice.group.poke",
      priority: -45,
      rule: [
        {
          reg: ".*",
          log: false,
          fnc: "X",
        },
      ],
    });
  }

  async X(e) {
    if (e.target_id !== e.self_id) return false;

    // 生成随机数，范围是 1 到 14
    let randomGifNumber = getRandomInt(14) + 1;

    // 生成随机回复
    let responseNumber = getRandomInt(shyResponses.length);
    let response = shyResponses[responseNumber];

    // 回复随机文本
    await e.reply(response);

    // 构建图片路径
    let imagePath = `${imgPath}${randomGifNumber}.gif`;

    // 回复图片
    await e.reply(segment.image(imagePath));
    await e.reply(segment.record("data/ngm.mp3"));

    return;
  }
}
