import fetch, { Blob, FormData } from "node-fetch";
import fs from "fs";
import _ from "lodash";
import path from "path";
const url = "https://mobiustaylor-meme-generator.hf.space/memes/";

export class memes extends plugin {
  constructor() {
    super({
      name: "表情包",
      dsc: "表情包制作",
      event: "message",
      priority: 100,
      rule: [
        { reg: "^(#)?(meme(s)?|表情包)列表$", fnc: "memesList" },
        { reg: "^#?(meme(s)?|表情包)帮助", fnc: "memesHelp" },
        { reg: "^#?随机(meme(s)?|表情包)", fnc: "randomMemes" },
        { reg: "^#?(meme(s)?|表情包)更新", fnc: "memesUpdate" },
      ],
    });
    this.bq = {};
    this.keywordMap = {};
    this.initPromise = this.init();
  }

  async init() {
    const infoPath = path.join(process.cwd(), "data/memes/infos.json");
    const listPath = path.join(process.cwd(), "data/memes/memes_list.png");

    try {
      if (fs.existsSync(infoPath)) {
        const data = fs.readFileSync(infoPath, "utf8");
        const infos = JSON.parse(data);
        for (const v of Object.values(infos)) {
          for (const keyword of v.keywords) {
            this.bq[keyword] = v;
            this.keywordMap[keyword] = v;
          }
        }
      } else {
        await this.memesUpdate();
      }
    } catch (error) {
      console.error("meme初始化失败", error);
      await this.memesUpdate();
    }

    if (!fs.existsSync(listPath)) {
      await this.updateMemesListImage();
    }

    this.reg = new RegExp(`^(${Object.keys(this.keywordMap).join("|")})`);
  }

  async updateMemesListImage() {
    const listPath = path.join(process.cwd(), "data/memes/memes_list.png");
    const res = await fetch(`${url}render_list`, { method: "POST" });
    const resultBuffer = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(path.dirname(listPath), { recursive: true });
    fs.writeFileSync(listPath, resultBuffer);
  }

  async memesUpdate(e) {
    e.reply("开始更新meme...");
    console.log("开始更新meme...");
    const response = await fetch(`${url}keys`);
    const keys = await response.json();

    const infos = {};
    for (const key of keys) {
      const infoResponse = await fetch(`${url}${key}/info`);
      const info = await infoResponse.json();
      infos[key] = info;
      for (const keyword of info.keywords) {
        this.bq[keyword] = info;
        this.keywordMap[keyword] = info;
      }
    }

    const infoPath = path.join(process.cwd(), "data/memes/infos.json");
    fs.mkdirSync(path.dirname(infoPath), { recursive: true });
    fs.writeFileSync(infoPath, JSON.stringify(infos, null, 2));

    await this.updateMemesListImage();

    console.log("meme更新成功");
    e.reply("meme更新成功");
  }

  async memesList(e) {
    const listPath = path.join(process.cwd(), "data/memes/memes_list.png");
    if (fs.existsSync(listPath)) {
      const resultBuffer = fs.readFileSync(listPath);
      return e.reply(segment.image(resultBuffer));
    } else {
      return e.reply("memes列表图片未找到，请更新后再试。");
    }
  }

  async memesHelp(e) {
    e.reply(
      "【meme列表】：查看支持的memes列表\n【meme搜索】：搜索表情包关键词\n【meme更新】：远程更新meme列表\n【随机meme】：随机制作一些表情包\n【表情名称】：memes列表中的表情名称，根据提供的文字或图片制作表情包\n【表情名称+详情】：查看该表情所支持的参数"
    );
  }

  async randomMemes(e) {
    await this.initPromise;
    // 获取所有需要图片和文本数量小于等于1的表情包模板
    const templates = Object.values(this.bq).filter(
      (template) =>
        template.params.min_images <= 1 && template.params.min_texts <= 1
    );

    // 随机选择一个模板
    const randomTemplate =
      templates[Math.floor(Math.random() * templates.length)];

    // 获取发送者的信息
    const id = e.user_id;
    const pick =
      (await e.group?.pickMember?.(id)) || (await e.bot?.pickFriend?.(id));
    const info = (await pick?.getInfo?.()) || pick?.info || pick;
    const name = info?.card || info?.nickname;

    // 准备 FormData
    const formData = new FormData();

    // 如果需要图片，添加默认头像
    if (randomTemplate.params.min_images > 0) {
      const avatarUrl =
        (await e.member?.getAvatarUrl?.()) ||
        (await e.friend?.getAvatarUrl?.()) ||
        `http://q2.qlogo.cn/headimg_dl?dst_uin=${e.user_id}&spec=5`;
      const imgRes = await fetch(avatarUrl);
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      formData.append("images", new Blob([buffer]));
    }

    // 如果需要文字，添加发送者的名字
    if (randomTemplate.params.min_texts > 0) {
      formData.append("texts", name);
    }

    // 返回随机到的 meme 信息
    e.reply(`随机到的 meme 是：${randomTemplate.keywords.join(", ")}`);

    // 发送请求生成表情包
    const res = await fetch(`${url}${randomTemplate.key}/`, {
      method: "POST",
      body: formData,
    });

    if (res.status > 299) {
      const errorText = await res.text();
      console.error("生成随机表情包失败:", errorText);
      return e.reply(
        `生成随机表情包失败，请稍后再试。错误信息：${errorText}`,
        true
      );
    }

    // 返回生成的表情包
    const resultBuffer = Buffer.from(await res.arrayBuffer());
    return e.reply(segment.image(resultBuffer));
  }

  async accept(e) {
    await this.initPromise;
    if (!e.msg) {
      return false;
    }
    const match = e.msg.match?.(this.reg)?.[0];
    if (!match) return;
    const remainingText = e.msg.slice(match.length).trim();
    const params = remainingText ? remainingText.split(/\s+/) : [];
    const id = e.at || e.user_id;
    const item = this.keywordMap[match];
    console.log(`🐱触发meme：${item.keywords.join(", ")} --- ${item.key}`);

    const pick =
      (await e.group?.pickMember?.(id)) || (await e.bot?.pickFriend?.(id));
    const info = (await pick?.getInfo?.()) || pick?.info || pick;
    const name = info?.card || info?.nickname;

    const formData = new FormData();
    if (item.params.min_images == 2) {
      const imgUrl =
        (await e.member?.getAvatarUrl?.()) ||
        (await e.friend?.getAvatarUrl?.()) ||
        `http://q2.qlogo.cn/headimg_dl?dst_uin=${e.user_id}&spec=5`;
      const imgRes = await fetch(imgUrl);
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      formData.append("images", new Blob([buffer]));
    }

    if (item.params.min_images != 0) {
      let reply;
      if (e.getReply) {
        reply = await e.getReply();
      } else if (e.source) {
        if (e.group?.getChatHistory)
          reply = (await e.group.getChatHistory(e.source.seq, 1)).pop();
        else if (e.friend?.getChatHistory)
          reply = (await e.friend.getChatHistory(e.source.time, 1)).pop();
      }
      if (reply?.message)
        for (const i of reply.message)
          if (i.type == "image" || i.type == "file") {
            e.img = [i.url];
            break;
          }

      const imgUrl =
        e.img?.[0] ||
        (await pick?.getAvatarUrl?.()) ||
        `http://q2.qlogo.cn/headimg_dl?dst_uin=${id}&spec=5`;
      const imgRes = await fetch(imgUrl);
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      formData.append("images", new Blob([buffer]));
    }

    if (item.params.min_texts != 0) {
      for (const param of params) {
        formData.append("texts", param);
      }
    }

    let args;
    if (item.params.min_texts == 0 && params[0] != undefined) {
      args = handleArgs(item.key, params.join(" "), [
        { text: name, gender: "unknown" },
      ]);
    } else {
      args = handleArgs(item.key, "", [{ text: name, gender: "unknown" }]);
    }
    if (args) formData.set("args", args);

    const res = await fetch(`${url}${item.key}/`, {
      method: "POST",
      body: formData,
    });
    if (res.status > 299)
      return e.reply(
        `该表情至少需要${item.params.min_images}张图片，${item.params.min_texts}个文字描述`,
        true
      );

    const resultBuffer = Buffer.from(await res.arrayBuffer());
    return e.reply(segment.image(resultBuffer));
  }
}

function handleArgs(key, args, userInfos) {
  let argsObj = {};
  switch (key) {
    case "look_flat":
      argsObj = { ratio: parseInt(args) || 2 };
      break;
    case "crawl":
      argsObj = { number: parseInt(args) || _.random(1, 92, false) };
      break;
    case "symmetric": {
      const directionMap = {
        左: "left",
        右: "right",
        上: "top",
        下: "bottom",
      };
      argsObj = { direction: directionMap[args.trim()] || "left" };
      break;
    }
    case "petpet":
    case "jiji_king":
    case "kirby_hammer":
      argsObj = { circle: args.startsWith("圆") };
      break;
    case "my_friend":
      if (!args) args = _.trim(userInfos[0].text, "@");
      argsObj = { name: args };
      break;
    case "looklook":
      argsObj = { mirror: args === "翻转" };
      break;
    case "always": {
      const modeMap = {
        "": "normal",
        循环: "loop",
        套娃: "circle",
      };
      argsObj = { mode: modeMap[args] || "normal" };
      break;
    }
    case "gun":
    case "bubble_tea": {
      const directionMap = {
        左: "left",
        右: "right",
        两边: "both",
      };
      argsObj = { position: directionMap[args.trim()] || "right" };
      break;
    }
  }
  argsObj.user_infos = userInfos.map((u) => {
    return {
      name: _.trim(u.text, "@"),
      gender: u.gender,
    };
  });
  return JSON.stringify(argsObj);
}
