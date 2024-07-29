import fetch, { File, FormData } from "node-fetch";
import fs from "fs";
import path from "node:path";
import _ from "lodash";
import { segment } from "oicq"; // 导入segment对象

const baseUrl = "https://mobiustaylor-meme-generator.hf.space";
/**
 * 机器人发表情是否引用回复用户
 * @type {boolean}
 */
const reply = false;

/**
 * 是否强制使用#触发命令
 * @type {boolean}
 */
const forceSharp = false;

/**
 * 主人保护，撅主人时会被反撅 (暂时只支持QQ)
 * @type {boolean}
 */
const masterProtectDo = true;

/**
 * 用户输入的图片，最大支持的文件大小，单位为MB
 * @type {number}
 */
const maxFileSize = 10;

let keyMap = {}; // 关键字映射
let infos = {}; // 表情包信息

export class memes extends plugin {
  constructor() {
    let option = {
      name: "表情包", // 功能名称
      dsc: "表情包制作", // 功能描述
      event: "message", // 监听的事件类型
      priority: 5000, // 优先级
      rule: [
        { reg: "^(#)?(meme(s)?|表情包)列表$", fnc: "memesList" },
        { reg: "^#?随机(meme(s)?|表情包)", fnc: "randomMemes" },
        { reg: "^#?(meme(s)?|表情包)帮助", fnc: "memesHelp" },
        { reg: "^#?(meme(s)?|表情包)搜索", fnc: "memesSearch" },
        { reg: "^#?(meme(s)?|表情包)更新", fnc: "memesUpdate" },
      ],
    };

    Object.keys(keyMap).forEach((key) => {
      let reg = forceSharp ? `^#${key}` : `^#?${key}`;
      option.rule.push({ reg, fnc: "memes" });
    });

    super(option);

    // 初始化定时任务
    function generateCronExpression() {
      const hour = Math.floor(Math.random() * 3) + 2; // 生成每天的半夜2-4点之间的小时值（随机选择）
      const minute = Math.floor(Math.random() * 60); // 生成每小时的随机分钟值（0到59之间的随机数）
      return `${minute} ${hour} * * *`; // 构建 cron 表达式
    }

    this.task = {
      cron: generateCronExpression(),
      name: "memes自动更新任务",
      fnc: this.init.bind(this),
    };
  }

  async init() {
    mkdirs("data/memes");
    keyMap = {};
    infos = {};

    if (fs.existsSync("data/memes/infos.json")) {
      infos = fs.readFileSync("data/memes/infos.json");
      infos = JSON.parse(infos);
    }
    if (fs.existsSync("data/memes/keyMap.json")) {
      keyMap = fs.readFileSync("data/memes/keyMap.json");
      keyMap = JSON.parse(keyMap);
    }

    if (Object.keys(infos).length === 0 || Object.keys(keyMap).length === 0) {
      let keysRes = await fetch(`${baseUrl}/memes/keys`);
      let keys = await keysRes.json();

      let keyMapTmp = {};
      let infosTmp = {};
      for (const key of keys) {
        let keyInfoRes = await fetch(`${baseUrl}/memes/${key}/info`);
        let info = await keyInfoRes.json();
        info.keywords.forEach((keyword) => {
          keyMapTmp[keyword] = key;
        });
        infosTmp[key] = info;
      }
      infos = infosTmp;
      keyMap = keyMapTmp;
      fs.writeFileSync("data/memes/keyMap.json", JSON.stringify(keyMap));
      fs.writeFileSync("data/memes/infos.json", JSON.stringify(infos));
    }

    let rules = [];
    Object.keys(keyMap).forEach((key) => {
      let reg = forceSharp ? `^#${key}` : `^#?${key}`;
      rules.push({ reg, fnc: "memes" });
    });
    this.rule = rules;
  }

  async memesUpdate(e) {
    await e.reply("yunzai-memes更新中");
    if (fs.existsSync("data/memes/infos.json")) {
      fs.unlinkSync("data/memes/infos.json");
    }
    if (fs.existsSync("data/memes/keyMap.json")) {
      fs.unlinkSync("data/memes/keyMap.json");
    }
    try {
      await this.init();
    } catch (err) {
      await e.reply("更新失败：" + err.message);
    }
    await e.reply("更新完成");
  }

  async memesHelp(e) {
    e.reply(
      "【memes列表】：查看支持的memes列表\n【{表情名称}】：memes列表中的表情名称，根据提供的文字或图片制作表情包\n【随机meme】：随机制作一些表情包\n【meme搜索+关键词】：搜索表情包关键词\n【{表情名称}+详情】：查看该表情所支持的参数"
    );
  }

  async memesSearch(e) {
    let search = e.msg.replace(/^#?(meme(s)?|表情包)搜索/, "").trim();
    if (!search) {
      await e.reply("你要搜什么？");
      return true;
    }
    let hits = Object.keys(keyMap).filter((k) => k.indexOf(search) > -1);
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

  async memesList(e) {
    let resultFileLoc = "data/memes/render_list1.jpg";
    if (fs.existsSync(resultFileLoc)) {
      await e.reply(segment.image(`file://${resultFileLoc}`));
      return true;
    }
    let response = await fetch(baseUrl + "/memes/render_list", {
      method: "POST",
    });
    const resultBlob = await response.blob();
    const resultArrayBuffer = await resultBlob.arrayBuffer();
    const resultBuffer = Buffer.from(resultArrayBuffer);
    await fs.writeFileSync(resultFileLoc, resultBuffer);
    await e.reply(segment.image(`file://${resultFileLoc}`));
    setTimeout(async () => {
      await fs.unlinkSync(resultFileLoc);
    }, 3600);
    return true;
  }

  async randomMemes(e) {
    let keys = Object.keys(infos).filter(
      (key) =>
        infos[key].params.min_images === 1 && infos[key].params.min_texts === 0
    );
    let index = _.random(0, keys.length - 1, false);
    let chosenKey = keys[index]; // 保存选择的关键字
    let chosenKeyword = infos[chosenKey].keywords[0]; // 获取关键字对应的值
    e.msg = chosenKeyword;
    await e.reply(`随机选择的 meme 是: ${chosenKeyword}`); // 发送关键字
    return await this.memes(e);
  }

  async memes(e) {
    let msg = e.msg.replace("#", "");
    let keys = Object.keys(keyMap).filter((k) => msg.startsWith(k));
    let target = keys[0];
    let targetCode = keyMap[target];
    let text1 = _.trimStart(e.msg, "#").replace(target, "");
    if (text1.trim() === "详情" || text1.trim() === "帮助") {
      await e.reply(detail(targetCode));
      return false;
    }
    let [text, args = ""] = text1.split("#");
    let userInfos;
    let formData = new FormData();
    let info = infos[targetCode];
    let fileLoc;
    //判断图片
    if (info.params.max_images > 0) {
      let imgUrls = [];
      // 查找回复段
      const replySegment = e.message.find((msg) => msg.type === 'reply');
      if (replySegment) {
        const replyMsgId = replySegment.id;
        // 使用 message_id 获取消息
        const replyMsg = await e.group.getMsg(replyMsgId); 
        const reply = replyMsg.message;

        if (reply) {
          for (let val of reply) {
            if (val.type === "image") {
              imgUrls.push(val.url);// 提取图片URL并添加到imgUrls数组
            }
          }
        }
      } else if (e.img) {
        imgUrls.push(...e.img);// 如果消息中包含图片，直接添加到imgUrls数组
      } else if (e.message.filter((m) => m.type === "at").length > 0) {
        let ats = e.message.filter((m) => m.type === "at");
        imgUrls = ats
          .map((at) => at.qq)
          .map((qq) => `https://q1.qlogo.cn/g?b=qq&s=160&nk=${qq}`);
      }
      // 如果没有找到图片，使用发送者的头像
      if (!imgUrls || imgUrls.length === 0) {
        imgUrls = [await getAvatar(e)];
      }

      if (
        imgUrls.length < info.params.min_images &&
        imgUrls.indexOf(await getAvatar(e)) === -1
      ) {
        let me = [await getAvatar(e)];
        let done = false;
        //判断jue的at
        if (targetCode === "do" && masterProtectDo) {
          let masters = await getMasterQQ();
          if (imgUrls[0].startsWith("https://q1.qlogo.cn")) {
            let split = imgUrls[0].split("=");
            let targetQQ = split[split.length - 1];
            if (masters.map((q) => q + "").indexOf(targetQQ) > -1) {
              imgUrls = imgUrls.concat(me);
              done = true;
            }
          }
        }
        if (!done) {
          imgUrls = me.concat(imgUrls);
        }
      }
      // 确保图片数量不超过最大限制
      imgUrls = imgUrls.slice(
        0,
        Math.min(info.params.max_images, imgUrls.length)
      );
      // 将图片添加到formData中
      for (let i = 0; i < imgUrls.length; i++) {
        let imgUrl = imgUrls[i];
        const imageResponse = await fetch(imgUrl);
        const fileType = imageResponse.headers.get("Content-Type").split("/")[1];
        fileLoc = `data/memes/original/${Date.now()}.${fileType}`;
        mkdirs("data/memes/original");
        const blob = await imageResponse.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await fs.writeFileSync(fileLoc, buffer);
        formData.append(
          "images",
          new File([buffer], `avatar_${i}.jpg`, { type: "image/jpeg" })
        );
      }
    }

    //判断文字 
    if (text && info.params.max_texts === 0) {
      return false;
    }
    if (!text && info.params.min_texts > 0) {
      if (e.message.filter((m) => m.type === "at").length > 0) {
        text = _.trim(e.message.filter((m) => m.type === "at")[0].text, "@");
      } else {
        text = e.sender.card || e.sender.nickname;
      }
    }
    let texts = text.split("/", info.params.max_texts);
    if (texts.length < info.params.min_texts) {
      await e.reply(`字不够！要至少${info.params.min_texts}个用/隔开！`, true);
      return true;
    }
    texts.forEach((t) => {
      formData.append("texts", t);
    });
    if (info.params.max_texts > 0 && formData.getAll("texts").length === 0) {
      if (formData.getAll("texts").length < info.params.max_texts) {
        if (e.message.filter((m) => m.type === "at").length > 0) {
          formData.append(
            "texts",
            _.trim(e.message.filter((m) => m.type === "at")[0].text, "@")
          );
        } else {
          formData.append("texts", e.sender.card || e.sender.nickname);
        }
      }
    }
    if (e.message.filter((m) => m.type === "at").length > 0) {
      userInfos = e.message.filter((m) => m.type === "at");
      let mm = await e.group.getMemberMap();
      userInfos.forEach((ui) => {
        let user = mm.get(ui.qq);
        if (user) {
          ui.gender = user.sex;
          ui.text = user.card || user.nickname;
        }
      });
    }
    if (!userInfos) {
      userInfos = [
        { text: e.sender.card || e.sender.nickname, gender: e.sender.sex },
      ];
    }
    args = handleArgs(targetCode, args, userInfos);
    if (args) {
      formData.set("args", args);
    }
    const images = formData.getAll("images");
    if (checkFileSize(images)) {
      return this.e.reply(`文件大小超出限制，最多支持${maxFileSize}MB`);
    }
    let response = await fetch(baseUrl + "/memes/" + targetCode + "/", {
      method: "POST",
      body: formData,
    });
    if (response.status > 299) {
      let error = await response.text();
      console.error(error);
      await e.reply(error, true);
      return true;
    }
    mkdirs("data/memes/result");
    let resultFileLoc = `data/memes/result/${Date.now()}.gif`;
    const resultBlob = await response.blob();
    const resultArrayBuffer = await resultBlob.arrayBuffer();
    const resultBuffer = Buffer.from(resultArrayBuffer);
    await fs.writeFileSync(resultFileLoc, resultBuffer);
    await e.reply(segment.image(`file://${resultFileLoc}`), reply);
    fileLoc && (await fs.unlinkSync(fileLoc));
    await fs.unlinkSync(resultFileLoc);
  }
}

function handleArgs(key, args, userInfos) {
  if (!args) {
    args = "";
  }
  let argsObj = {};
  switch (key) {
    case "look_flat": {
      argsObj = { ratio: parseInt(args || "2") };
      break;
    }
    case "crawl": {
      argsObj = {
        number: parseInt(args) ? parseInt(args) : _.random(1, 92, false),
      };
      break;
    }
    case "symmetric": {
      let directionMap = {
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
    case "kirby_hammer": {
      argsObj = { circle: args.startsWith("圆") };
      break;
    }
    case "my_friend": {
      if (!args) {
        args = _.trim(userInfos[0].text, "@");
      }
      argsObj = { name: args };
      break;
    }
    case "looklook": {
      argsObj = { mirror: args === "翻转" };
      break;
    }
    case "always": {
      let modeMap = {
        "": "normal",
        循环: "loop",
        套娃: "circle",
      };
      argsObj = { mode: modeMap[args] || "normal" };
      break;
    }
    case "gun":
    case "bubble_tea": {
      let directionMap = {
        左: "left",
        右: "right",
        两边: "both",
      };
      argsObj = { position: directionMap[args.trim()] || "right" };
      break;
    }
    case "dog_dislike": {
      argsObj = { circle: args.startsWith("圆") };
      break;
    }
    case "clown": {
      argsObj = { person: args.startsWith("爷") };
      break;
    }
    case "note_for_leave": {
      if (args) {
        argsObj = { time: args };
      }
      break;
    }
    case "mourning": {
      argsObj = { black: args.startsWith("黑白") || args.startsWith("灰") };
      break;
    }
  }
  argsObj.user_infos = userInfos.map((u) => {
    return {
      name: _.trim(u.text, "@"),
      gender: u.gender || "unknown",
    };
  });
  return JSON.stringify(argsObj);
}

const detail = (code) => {
  let d = infos[code];
  let keywords = d.keywords.join("、");
  let ins = `【代码】${d.key}\n【名称】${keywords}\n【最大图片数量】${
    d.params.max_images
  }\n【最小图片数量】${d.params.min_images}\n【最大文本数量】${
    d.params.max_texts
  }\n【最小文本数量】${
    d.params.min_texts
  }\n【默认文本】${d.params.default_texts.join("/")}\n`;
  if (d.params.args.length > 0) {
    let supportArgs = "";
    switch (code) {
      case "look_flat": {
        supportArgs = "看扁率，数字.如#3";
        break;
      }
      case "crawl": {
        supportArgs = "爬的图片编号，1-92。如#33";
        break;
      }
      case "symmetric": {
        supportArgs = "方向，上下左右。如#下";
        break;
      }
      case "dog_dislike":
      case "petpet":
      case "jiji_king":
      case "kirby_hammer": {
        supportArgs = "是否圆形头像，输入圆即可。如#圆";
        break;
      }
      case "always": {
        supportArgs =
          "一直图像的渲染模式，循环、套娃、默认。不填参数即默认。如一直#循环";
        break;
      }
      case "gun":
      case "bubble_tea": {
        supportArgs = "方向，左、右、两边。如#两边";
        break;
      }
      case "clown": {
        supportArgs = "是否使用爷爷头轮廓。如#爷";
        break;
      }
      case "note_for_leave": {
        supportArgs = "请假时间。如#2023年11月11日";
        break;
      }
      case "mourning": {
        supportArgs = "是否黑白。如#黑白 或 #灰";
        break;
      }
    }
    ins += `【支持参数】${supportArgs}`;
  }
  return ins;
};

// 最大支持的文件大小（字节）
const maxFileSizeByte = maxFileSize * 1024 * 1024;

// 如果有任意一个文件大于 maxSize，则返回true
function checkFileSize(files) {
  let fileList = Array.isArray(files) ? files : [files];
  fileList = fileList.filter((file) => !!file?.size);
  if (fileList.length === 0) {
    return false;
  }
  return fileList.some((file) => file.size >= maxFileSizeByte);
}

function mkdirs(dirname) {
  if (fs.existsSync(dirname)) {
    return true;
  } else {
    if (mkdirs(path.dirname(dirname))) {
      fs.mkdirSync(dirname);
      return true;
    }
  }
}

async function getMasterQQ() {
  return (await import("../../../lib/config/config.js")).default.masterQQ;
}

async function getAvatar(e, userId = e.sender.user_id) {
  if (typeof e.getAvatarUrl === "function") {
    return await e.getAvatarUrl(0);
  }
  return `https://q1.qlogo.cn/g?b=qq&s=0&nk=${userId}`;
}
