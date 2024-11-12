import fetch, { Blob, FormData } from "node-fetch";
import fs from "fs";
import path from "path";

// 如果全局没有定义 segment，则从 oicq 导入
if (!global.segment) {
  global.segment = (await import("oicq")).segment;
}

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
        { reg: "^#?(meme(s)?|表情包)更新", fnc: "handleMemesUpdate" },
        { reg: "^#?(meme(s)?|表情包)搜索", fnc: "memesSearch" },
      ],
    });

    this.keywordMap = {};
    this.avatarCache = {};
    this.initialized = false;
    this.initPromise = this.init();

    // 添加存储触发次数的文件路径和内存中的计数对象
    this.triggerCountPath = path.join(
      process.cwd(),
      "data/memes/triggers.json"
    );
    this.triggerCounts = this.loadTriggerCounts();
  }

  // 加载触发次数数据
  loadTriggerCounts() {
    if (fs.existsSync(this.triggerCountPath)) {
      const data = fs.readFileSync(this.triggerCountPath, "utf8");
      return JSON.parse(data);
    }
    return {}; // 如果文件不存在，返回空对象
  }

  // 保存触发次数数据
  saveTriggerCounts() {
    fs.mkdirSync(path.dirname(this.triggerCountPath), { recursive: true });
    fs.writeFileSync(
      this.triggerCountPath,
      JSON.stringify(this.triggerCounts, null, 2)
    );
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
            this.keywordMap[keyword] = v;
          }
        }
      } else {
        await this.memesUpdate();
      }
    } catch (error) {
      console.error("meme 初始化失败", error);
      await this.memesUpdate();
    }

    if (!fs.existsSync(listPath)) {
      await this.updateMemesListImage();
    }

    const escapedKeywords = Object.keys(this.keywordMap)
      .sort((a, b) => b.length - a.length) // 根据长度从长到短排序
      .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

    this.reg = new RegExp(`^(${escapedKeywords.join("|")})`);
    this.initialized = true;
  }

  async memesUpdate() {
    try {
      console.log("开始更新 meme...");
      const response = await fetch(`${url}keys`);
      const keys = await response.json();

      const infoPromises = keys.map(async (key) => {
        const infoResponse = await fetch(`${url}${key}/info`);
        const info = await infoResponse.json();
        return { key, info };
      });

      const infosArray = await Promise.all(infoPromises);
      const infos = {};
      for (const { key, info } of infosArray) {
        infos[key] = info;
        for (const keyword of info.keywords) {
          this.keywordMap[keyword] = info;
        }
      }
      const infoPath = path.join(process.cwd(), "data/memes/infos.json");
      fs.mkdirSync(path.dirname(infoPath), { recursive: true });
      fs.writeFileSync(infoPath, JSON.stringify(infos, null, 2));
      await this.updateMemesListImage();
      console.log("meme 更新成功");
    } catch (error) {
      console.error("meme 更新失败", error);
      throw error;
    }
  }

  async handleMemesUpdate(e) {
    try {
      e.reply("开始更新 meme...");
      await this.memesUpdate();
      e.reply("meme 更新成功");
    } catch (error) {
      console.error("meme 更新失败", error);
      e.reply("meme 更新失败，请稍后再试。");
    }
  }

  async memesList(e) {
    const listPath = path.join(process.cwd(), "data/memes/memes_list.png");
    if (fs.existsSync(listPath)) {
      const resultBuffer = fs.readFileSync(listPath);
      return e.reply(segment.image(resultBuffer));
    } else {
      return e.reply("memes 列表图片未找到，请更新后再试。");
    }
  }

  async updateMemesListImage() {
    const listPath = path.join(process.cwd(), "data/memes/memes_list.png");

    // 固定的截止日期，用于判断是否标记为 "new"
    const cutoffDate = new Date("2024-08-15");

    // 获取表情包信息并构建包含 "new" 标签的 meme_list
    const response = await fetch(`${url}keys`);
    const keys = await response.json();

    const memeList = await Promise.all(
      keys.map(async (key) => {
        const infoResponse = await fetch(`${url}${key}/info`);
        const info = await infoResponse.json();
        // 初始化标签数组
        const labels = [];
        // 检查是否需要添加 "new" 标签
        const dateCreated = new Date(info.date_created);
        if (dateCreated > cutoffDate) {
          labels.push("new");
        }
        // 检查是否需要添加 "hot" 标签
        if (this.triggerCounts[key] && this.triggerCounts[key] >= 5) {
          labels.push("hot");
        }
        return {
          meme_key: key,
          disabled: false,
          labels: labels,
        };
      })
    );

    // 发送带有自定义 meme_list 的请求体
    const res = await fetch(`${url}render_list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meme_list: memeList,
        text_template: "{keywords}",
        add_category_icon: true,
      }),
    });

    const resultBuffer = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(path.dirname(listPath), { recursive: true });
    fs.writeFileSync(listPath, resultBuffer);
  }

  async accept(e) {
    if (!this.initialized) {
      await this.initPromise;
    }
    if (!e.msg) return false;

    const match = e.msg.match?.(this.reg)?.[0];
    if (!match) return;

    const remainingText = e.msg.slice(match.length).trim();
    const params = remainingText ? remainingText.split(/\s+/) : [];
    const item = this.keywordMap[match];

    if (!item) {
      return e.reply("未找到对应的表情包，请检查名称是否正确。");
    }

    console.log(
      `触发 meme：${item.keywords.join(", ")} --- ${item.key}，触发共计${
        this.triggerCounts[item.key] || 0
      }次`
    );

    // 更新触发计数并保存
    this.incrementTriggerCount(item.key);
    this.saveTriggerCounts();

    if (remainingText.endsWith("详情") || remainingText.endsWith("帮助")) {
      return this.sendItemDetails(e, match, item);
    }

    return this.generateMeme(e, item, params);
  }

  // 更新触发计数
  incrementTriggerCount(key) {
    if (!this.triggerCounts[key]) {
      this.triggerCounts[key] = 0;
    }
    this.triggerCounts[key] += 1;
  }

  async memesHelp(e) {
    e.reply(
      "【meme 列表】：查看支持的 memes 列表\n" +
        "【meme 搜索】：搜索表情包关键词\n" +
        "【meme 更新】：远程更新 meme 列表\n" +
        "【随机 meme】：随机制作一些表情包\n" +
        "【表情名称】：memes 列表中的表情名称，根据提供的文字或图片制作表情包\n" +
        "【表情名称+详情】：查看该表情所支持的参数"
    );
  }

  async memesSearch(e) {
    let search = e.msg.replace(/^#?(meme(s)?|表情包)搜索/, "").trim();
    if (!search) {
      await e.reply("你要搜什么？");
      return true;
    }

    let hits = Object.keys(this.keywordMap).filter((k) => k.includes(search));
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
    if (!this.initialized) {
      await this.initPromise;
    }
    const templates = Object.values(this.keywordMap).filter(
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
    let result = `表情包：${match}\n最少图片数：${item.params_type.min_images}\n最大图片数：${item.params_type.max_images}\n最少文字数：${item.params_type.min_texts}\n最大文字数：${item.params_type.max_texts}`;

    if (
      item.params_type.args_type &&
      item.params_type.args_type.parser_options
    ) {
      result += "\n支持的参数：";
      item.params_type.args_type.parser_options.forEach((option) => {
        const names = option.names.join(", ");
        const helpText = option.help_text || "无具体描述";
        result += `\n参数：${names}\n描述：${helpText}`;
      });
    }

    await e.reply(result, e.isGroup);
    return true;
  }

  async generateMeme(e, item, params = []) {
    try {
      const { formData, name } = await this.prepareFormData(e, item, params);

      let args;
      if (item.params_type.args_type) {
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

      if (!res.ok) {
        const errorText = await res.text();
        return e.reply(
          `生成表情包失败：${res.status} ${res.statusText}\n错误信息：${errorText}`,
          true
        );
      }

      const resultBuffer = Buffer.from(await res.arrayBuffer());
      return e.reply(segment.image(resultBuffer));
    } catch (error) {
      console.error("生成表情包出错", error);
      return e.reply("抱歉，生成表情包时出错了。请稍后再试。");
    }
  }

  async prepareFormData(e, item, params) {
    const formData = new FormData();
    const id = e.user_id;
    // 获取被 @ 的用户 ID
    const atId =
      e.at || (e.message && e.message.find((m) => m.type === "at")?.qq);
    const reply = e.getReply ? await e.getReply() : null;

    // 收集图片
    const images = await this.collectImages(e, item, reply, atId);
    for (const buffer of images) {
      formData.append("images", new Blob([buffer]));
    }

    // 处理文字（使用您提供的逻辑）
    if (item.params_type.min_texts === 1 || item.params_type.max_texts === 1) {
      if (params.length === 0) {
        // 如果没有提供文本，获取默认文本并添加到 formData
        const defaultText = await this.getDefaultText(atId, e);
        formData.append("texts", defaultText);
      } else if (params.length === 1) {
        // 如果用户提供了1个文本，直接添加到 formData
        formData.append("texts", params[0]);
      }
    } else if (
      item.params_type.min_texts > 1 ||
      item.params_type.max_texts > 1
    ) {
      params.forEach((param) => formData.append("texts", param));
    }

    // 获取用户信息
    const { name } = await this.getUserInfo(atId, id, e);
    return { formData, name };
  }

  async collectImages(e, item, reply, atId) {
    const minImages = item.params_type.min_images;
    const maxImages = item.params_type.max_images;
    let images = [];

    // 根据需要的图片数量，调整逻辑
    if (minImages === 1) {
      images = this.extractImageUrlsFromMessage(e.message);
      // 当需要一张图片时
      if (images.length === 0) {
        // 如果消息中没有图片，从回复消息中提取图片
        if (reply) {
          images = this.extractImageUrlsFromMessage(reply.message);
        }
        // 如果仍然没有图片，使用头像
        if (images.length === 0) {
          if (atId) {
            images.push(await this.getAvatarUrl(atId, e));
          } else {
            images.push(await this.getAvatarUrl(e.user_id, e));
          }
        }
      }
    } else if (minImages >= 2) {
      // 当需要两张及以上图片时，优先获取发送者和被@用户的头像
      images.push(await this.getAvatarUrl(e.user_id, e)); // 添加发送者的头像
      if (atId && images.length < maxImages) {
        images.push(await this.getAvatarUrl(atId, e)); // 添加被@用户的头像
      }
      // 从回复和消息中提取图片
      if (reply && images.length < maxImages) {
        images.push(...this.extractImageUrlsFromMessage(reply.message));
      }
      if (images.length < maxImages) {
        images.push(...this.extractImageUrlsFromMessage(e.message));
      }
      // 如果图片数量不足，用默认头像补足
      while (images.length < minImages) {
        images.push(await this.getAvatarUrl("default", e));
      }
    }

    // 确保图片数量不超过最大值
    images = images.slice(0, maxImages);

    // 获取图片数据
    const buffers = [];
    for (const imgUrl of images) {
      const buffer = await this.fetchImageBuffer(imgUrl, e);
      buffers.push(buffer);
    }

    return buffers;
  }

  extractImageUrlsFromMessage(message) {
    const urls = [];
    for (const i of message) {
      if (i.type === "image" || i.type === "file") {
        urls.push(i.url);
      }
    }
    return urls;
  }

  async getAvatarUrl(id, e) {
    if (this.avatarCache[id]) {
      return this.avatarCache[id];
    }
    const member = await e.group?.pickMember?.(id);
    const url =
      (await member?.getAvatarUrl?.()) ||
      (await e.friend?.getAvatarUrl?.()) ||
      `http://q2.qlogo.cn/headimg_dl?dst_uin=${id}&spec=5`;
    this.avatarCache[id] = url;
    return url;
  }

  async fetchImageBuffer(url, e) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`获取图片失败：${response.statusText}`);
      }
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      console.error("图片获取失败", error);
      throw error;
    }
  }

  async getUserInfo(atId, id, e) {
    const pick = atId
      ? await e.group?.pickMember?.(atId)
      : (await e.group?.pickMember?.(id)) || (await e.bot?.pickFriend?.(id));
    const info = (await pick?.getInfo?.()) || pick?.info || pick;
    const name = info?.card || info?.nickname || "未知用户";
    return { name };
  }

  async getDefaultText(atId, e) {
    const { name } = await this.getUserInfo(atId, e.user_id, e);
    return name;
  }
}

// 参数处理函数
function handleArgs(key, args, userInfos) {
  let argsObj = {};
  args = args.trim();
  switch (key) {
    case "look_flat":
      argsObj = { ratio: parseInt(args) || 2 };
      break;
    case "crawl":
      argsObj = {
        number: parseInt(args) || Math.floor(Math.random() * 92) + 1,
      };
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
      if (!args) args = userInfos[0].text.trim().replace("@", "");
      argsObj = { name: args };
      break;
    case "looklook":
      argsObj = { mirror: args === "翻转" };
      break;
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
    case "dog_dislike":
      argsObj = { circle: args.startsWith("圆") };
      break;
    case "clown":
      argsObj = { person: args.startsWith("爷") };
      break;
    case "note_for_leave":
      if (args) {
        argsObj = { time: args };
      }
      break;
    case "mourning":
      argsObj = { black: args.startsWith("黑白") || args.startsWith("灰") };
      break;
    case "genshin_eat": {
      const roleMap = {
        八重: 1,
        胡桃: 2,
        妮露: 3,
        可莉: 4,
        刻晴: 5,
        钟离: 6,
      };
      argsObj = { character: roleMap[args.trim()] || 0 };
      break;
    }
  }
  argsObj.user_infos = userInfos.map((u) => {
    return {
      name: u.text.trim().replace("@", ""),
      gender: u.gender || "unknown",
    };
  });
  return JSON.stringify(argsObj);
}
