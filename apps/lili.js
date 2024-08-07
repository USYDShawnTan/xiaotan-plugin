let botname = "茉莉";

// 生成图片链接数组的函数
function generateImageLinks() {
  const baseUrl = "http://i.imgtg.com/2023/01/";
  const imagePaths = [
    "14/Q1EBP.gif",
    "13/QhT6Y.jpg",
    "14/Q1GZb.gif",
    "14/Q1Q0l.jpg",
    "14/Q10Mg.gif",
    "14/Q1dHs.gif",
    "14/Q1sXK.gif",
    "14/QrJd6.jpg",
    "14/QrRaP.gif",
    "14/Qrteb.png",
    "14/Qr4El.jpg",
    "14/QrDIg.jpg",
    "14/QrLhB.png",
    "14/QrERs.png",
    "14/QrGjK.jpg",
    "14/QrSWa.jpg",
    "14/Qr0yS.gif",
  ];
  return imagePaths.map((path) => baseUrl + path);
}

let images = generateImageLinks();

let responses = [
  `来了来了，${botname}一直在呢~`,
  `你喊${botname}做什么，${botname}也是很忙的好吧！`,
  `喊${botname}有什么事吗？`,
  `好啦好啦，${botname}就在这呢。`,
  `${botname}一直在等着你呢`,
  `${botname}在哦，有什么吩咐吗?`,
  `你干嘛~哈哈哎呦~`,
  `你好烦丫，${botname}不就在这吗?`,
  `我——！在——！呢——！`,
  `不用一直喊${botname}啦，${botname}一直在的。`,
  `想${botname}了吗？真是拿你没办法呢`,
  `baga，喊${botname}干嘛`,
  `哎呀，${botname}在呢，别喊啦~`,
  `${botname}也很想你呢~`,
];

export class example extends plugin {
  constructor() {
    super({
      name: "名称回复",
      dsc: "回复图文及纠正名称",
      event: "message",
      priority: 1000,
      rule: [
        {
          //无需修改此处reg.
          reg: `^#?(在)?(吗|干吗|干嘛|哪|那|哪里|那里|么)?(丫|鸭|呀|呐|呢|喵)?[~～.。,，!！、？]?(茉莉|莉莉)(在)?(吗|干吗|干嘛|哪|那|哪里|那里|么)?(丫|鸭|呀|呐|呢|喵)?[~～.。,，!！、？]?$`,
          fnc: "huifu",
        },
        {
          // 修正正则表达式，确保只有误拼音的名字触发
          reg: `^(?!(茉莉|莉莉)$)(磨|魔|茉|莉|丽|力|立|默|莉力|磨力|丽丽|默力|墨莉|莫力|莫丽|莫莉|莫利|沫莉|沫丽).*(磨|魔|茉|莉|丽|力|立|默|莉力|磨力|丽丽|默力|墨莉|莫力|莫丽|莫莉|莫利|沫莉|沫丽)$`,
          fnc: "jiuzheng",
        },
      ],
    });
  }

  async huifu() {
    let number = Math.floor(Math.random() * responses.length);
    let msg = [responses[number], segment.image(images[number])];

    await this.reply(msg);
    return true;
  }

  async jiuzheng(e) {
    let char = e.msg;
    let charArr = char.split("").join("——");
    let botArr = botname.split("").join("——");

    let correctResponses = [
      `是${botname}啦！气气，哼>_<`,
      `${charArr}——是——谁——啦~`,
      `是${botname}好叭！！！`,
      `哎呀~才不是什么${char}！！！`,
      `${char}是什么？可以吃吗？`,
      `不许叫我${char}啦！！！`,
      `笨比，人家明明叫${botname}！！！`,
      `小黑子什么意思，连“${botname}”俩字都能打错?`,
      `人家叫${botname}，才不是什么${char}！！！`,
      `笨蛋，再喊错${botname}的名字，我就再也不理你了！！！`,
      `你叫${char}，你全家都叫${char}！！！`,
      `${char}是你新认识的狐狸精吗?`,
      `你个大笨蛋，${botname}的名字有那么难记吗！！！`,
      `哼，${botname}不理你了！！！`,
      `故意喊错名字，${botname}也是会伤心的。`,
      `哎呀你烦不烦，故意的是吧，我叫${botname}！！！`,
      `重要的事情说三遍，我是${botname}！！`,
    ];

    let number = Math.floor(Math.random() * correctResponses.length);
    let msg = [
      correctResponses[number]
        .replace(/\${char}/g, char)
        .replace(/\${botname}/g, botname)
        .replace(/\${charArr}/g, charArr)
        .replace(/\${botArr}/g, botArr),
      segment.image(images[number]),
    ];

    await this.reply(msg);
    return true;
  }
}
