import fetch, { Blob, FormData } from "node-fetch";
import fs from "fs";
import path from "path";

const url = "https://mobiustaylor-meme.hf.space/memes/";

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
        { reg: "^#?随机(meme(s)?|表情包|mm)", fnc: "randomMemes" },
        { reg: "^#?(meme(s)?|表情包)更新", fnc: "memesUpdate" },
        { reg: "^#?(meme(s)?|表情包)搜索", fnc: "memesSearch" },
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

  async memesUpdate() {
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

  async updateMemesListImage() {
    const listPath = path.join(process.cwd(), "data/memes/memes_list.png");
    const res = await fetch(`${url}render_list`, { method: "POST" });
    const resultBuffer = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(path.dirname(listPath), { recursive: true });
    fs.writeFileSync(listPath, resultBuffer);
  }

  async accept(e) {
    await this.initPromise;
    if (!e.msg) return false;

    const match = e.msg.match?.(this.reg)?.[0];
    if (!match) return;

    const remainingText = e.msg.slice(match.length).trim();
    const params = remainingText ? remainingText.split(/\s+/) : [];
    const item = this.keywordMap[match];
    console.log(`触发meme：${item.keywords.join(", ")} --- ${item.key}`);

    if (remainingText.endsWith("详情") || remainingText.endsWith("帮助")) {
      return this.sendItemDetails(e, match, item);
    }

    return this.generateMeme(e, item, params);
  }

  async memesHelp(e) {
    e.reply(
      "【meme列表】：查看支持的memes列表\n【meme搜索】：搜索表情包关键词\n【meme更新】：远程更新meme列表\n【随机meme】：随机制作一些表情包\n【表情名称】：memes列表中的表情名称，根据提供的文字或图片制作表情包\n【表情名称+详情】：查看该表情所支持的参数"
    );
  }

  async memesSearch(e) {
    let search = e.msg.replace(/^#?(meme(s)?|表情包)搜索/, "").trim();
    if (!search) {
      await e.reply("你要搜什么？");
      return true;
    }

    let hits = Object.keys(this.keywordMap).filter(
      (k) => k.indexOf(search) > -1
    );
    let result = "搜索结果";
    if (hits.length > 0) {
      for (let i = 0; i < hits.length; i++) {
        result += `\n${i + 1}. ${hits[i]}`;
      }
    } else {
      result += "\n无";
    }
    await e.reply(result, e.isGroup);
  }

  async randomMemes(e) {
    await this.initPromise;
    const templates = Object.values(this.bq).filter(
      (template) =>
        template.params_type.min_images <= 1 &&
        template.params_type.min_texts <= 1
    );
    const randomTemplate =
      templates[Math.floor(Math.random() * templates.length)];

    e.reply(`随机到的 meme 是：${randomTemplate.keywords.join(", ")}`);
    return this.generateMeme(e, randomTemplate);
  }

  async sendItemDetails(e, match, item) {
    let result = `表情包：${match}\n最少图片数：${item.params_type.min_images}\n最少文字数：${item.params_type.min_texts}`;
    if (
      item.params_type.args_type &&
      item.params_type.args_type.args_model &&
      item.params_type.args_type.args_model.properties
    ) {
      Object.values(item.params_type.args_type.args_model.properties).forEach(
        (arg) => {
          if (arg.description) {
            result += `\n参数描述：${arg.description}`;
          }
        }
      );
    }
    await e.reply(result, e.isGroup);
    return true;
  }

  async prepareFormData(e, item, params) {
    const formData = new FormData();
    const { min_images, max_images, min_texts, max_texts } = item.params_type;

    // 处理图片参数
    const images = await this.getImagesFromParams(e, min_images, max_images);
    images.forEach((img) => {
      formData.append("images", new Blob([img]));
    });

    // 处理文字参数
    const texts = this.getTextParams(e, params, min_texts, max_texts);
    texts.forEach((text) => {
      formData.append("texts", text);
    });

    return formData;
  }

  async generateMeme(e, item, params = []) {
    try {
      const formData = await this.prepareFormData(e, item, params);

      const res = await fetch(`${url}${item.key}/`, {
        method: "POST",
        body: formData,
      });

      if (res.status > 299) {
        throw new Error(
          `该表情至少需要${item.params_type.min_images}张图片，${item.params_type.min_texts}个文字描述，多个描述记得用空格隔开`
        );
      }

      const resultBuffer = Buffer.from(await res.arrayBuffer());
      return e.reply(segment.image(resultBuffer));
    } catch (error) {
      return e.reply(error.message, true);
    }
  }

  async getImagesFromParams(e, min_images, max_images) {
    let images = [];

    // 优先从消息中提取图片或文件链接
    for (const i of e.message) {
      if (i.type === "image" || i.type === "file") {
        const imgRes = await fetch(i.url);
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        images.push(buffer);
      }
      if (images.length >= max_images) break;
    }

    // 获取艾特用户的头像
    if (images.length === 0 && e.message.some((m) => m.type === "at")) {
      const ats = e.message.filter((m) => m.type === "at");
      images = ats
        .map((at) => at.qq)
        .map(async (qq) => {
          const imgRes = await fetch(
            `https://q1.qlogo.cn/g?b=qq&s=160&nk=${qq}`
          );
          return Buffer.from(await imgRes.arrayBuffer());
        });
    }

    // 使用发送者的头像填充
    if (images.length < min_images) {
      const imgUrl = await this.getAvatarUrl(e.user_id, e);
      const imgRes = await fetch(imgUrl);
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      images.push(buffer);
    }

    // 如果还不够，使用机器人的头像填充
    if (images.length < min_images) {
      const imgUrl = await this.getAvatarUrl(e.bot.user_id, e);
      const imgRes = await fetch(imgUrl);
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      images.push(buffer);
    }

    return images.slice(0, max_images);
  }

  getTextParams(e, params, min_texts, max_texts) {
    let texts = params.slice(0, max_texts || 1);

    if (texts.length === 0 && min_texts === 1) {
      texts = [String(e.user_id)]; // 使用用户ID作为默认文字
    } else if (texts.length < min_texts) {
      throw new Error(`该表情至少需要${min_texts}个文字描述`);
    }

    return texts;
  }

  async getAvatarUrl(id, e) {
    const member = await e.group?.pickMember?.(id);
    return (
      (await member?.getAvatarUrl?.()) ||
      (await e.friend?.getAvatarUrl?.()) ||
      `http://q2.qlogo.cn/headimg_dl?dst_uin=${id}&spec=5`
    );
  }
}
