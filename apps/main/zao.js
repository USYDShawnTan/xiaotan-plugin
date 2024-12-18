// 1. 首先定义所有常量和工具函数
const TimeRanges = {
  EARLY_MORNING: { start: 5, end: 8 },
  MORNING: { start: 8, end: 12 },
  NOON: { start: 11, end: 13 },
  AFTERNOON: { start: 13, end: 17 },
  EVENING: { start: 17, end: 21 },
  NIGHT: { start: 21, end: 23 },
  LATE_NIGHT: { start: 23, end: 5 },
};

// 工具函数
const Utils = {
  getCurrentHour: () => new Date().getHours(),

  getTimeRange(hour) {
    for (const [range, { start, end }] of Object.entries(TimeRanges)) {
      if (end > start) {
        if (hour >= start && hour < end) return range;
      } else {
        if (hour >= start || hour < end) return range;
      }
    }
    return "default";
  },

  getRandomResponse: (responses) => {
    return responses[Math.floor(Math.random() * responses.length)];
  },
};

// 响应文本配置
const ResponseConfig = {
  goodMorning: {
    EARLY_MORNING: [
      "嗨，新的一天开始啦！愿你充满活力，迎接新的冒险！",
      "清晨的鸟鸣和微风都在向你打招呼，早安！",
      "崭新的一天，充满希望和机会。祝你早安，愿你笑逐颜开！",
      "早安！让我们以饱满的热情开启今天的征程！",
      "一日之计在于晨，愿你的一天从美好的早晨开始！",
      "早安！太阳已经为你打点好了一切，准备好开始了吗？",
      "芝兰生于幽谷，不以无人而不芳。早安，愿你如兰般芬芳！",
    ],
    MORNING: [
      "早上好！虽然有点晚，但愿你的笑容早早闪亮起来！",
      "都这个点了还说早安，是不是想多享受一会儿被窝的温暖？",
      "阳光已经照进窗子啦，起床太阳晒屁股了哦！",
      "早安！看来你也是个热爱睡觉的小懒虫呢～",
      "懒懒的早晨，也是美好的开始，早安！",
      "睡到自然醒的感觉真好，不是吗？早安！",
      "享受美好的早晨时光，即使来得稍晚一些～",
    ],
    default: [
      "这个点说早安，你的生物钟是不是需要调整一下呢？",
      "太阳都晒屁股了，你才起床吗？",
      "emmm...现在说早安是不是有点不合时宜？",
      "你是不是把闹钟给吃了？这个点才说早安！",
      "让我猜猜，你是不是又熬夜了？这个时候才说早安！",
      "你的早安来得太晚了，太阳都想和月亮约会了！",
      "时差党？还是熬夜冠军？这个点的早安真特别！",
    ],
  },

  goodNoon: {
    NOON: [
      "午安！是时候享用美味的午餐了！",
      "阳光正好，微风不燥，午安安！",
      "中午好！记得午休哦，补充能量才能继续奋斗！",
      "劳逸结合，午休时光到啦！",
      "午安！来点小憩，让下午的精力更充沛！",
      "阳光正当头，别忘了午休哦！",
      "忙碌的上午过去了，来享受午后时光吧！",
    ],
    AFTERNOON: [
      "这个点说午安，是不是刚睡醒呀？",
      "下午好！你的午安来得有点晚啦！",
      "午安？太阳都偏西了呢～",
      "你的午安像夕阳一样来得晚却温暖～",
      "这个点的午安，是不是把时钟调慢了？",
      "午安？让我看看现在是几点...哦，原来已经过午了！",
      "你的午安像是一封迟到的信，但依然温暖人心～",
    ],
    default: [
      "现在说午安，你的时间概念真是与众不同呢！",
      "你是在哪个时区啊？这会儿才说午安！",
      "我觉得你可能需要一个新闹钟，这个点说午安真是特别！",
      "打破常规的午安，你总是这么与众不同～",
      "不按套路出牌的午安，你真是生活的艺术家！",
      "这个点说午安，是想把一天掰成两天过吗？",
      "时间魔法师，你的午安总是来得特别！",
    ],
  },

  goodEvening: {
    EVENING: [
      "晚上好！夜色温柔，愿你心情愉快！",
      "忙碌了一天，是时候放松一下啦！",
      "晚上好！愿你的夜晚充满温馨！",
      "华灯初上，愿你的夜晚美好如诗！",
      "晚上好！让温柔的月色安抚疲惫的心灵～",
      "星星已经迫不及待想见你，晚上好！",
      "夜晚的美好才刚刚开始，晚上好！",
    ],
    NIGHT: [
      "夜深了，记得早点休息哦！",
      "晚上好！不过已经该准备睡觉啦！",
      "夜已深，愿你梦里有温暖的月光！",
      "晚安比晚好更适合现在呢！",
      "繁星已布满夜空，该休息啦！",
      "夜深人静，是时候和周公约会了！",
      "月亮都打哈欠了，该睡觉啦！",
    ],
    default: [
      "你的晚上好来得特别，就像你一样与众不同！",
      "打破常规的晚上好，你总是这么特别！",
      "这个点说晚上好，是想把一天过成两天吗？",
      "你的作息和太阳肯定有点小误会！",
      "时间魔术师，你的晚上好总是来得奇妙！",
      "跨时空的晚上好，你的生活真的很精彩！",
      "不走寻常路的晚上好，你的生活节奏真独特！",
    ],
  },

  goodNight: {
    NIGHT: [
      "晚安！愿你有个甜美的梦！",
      "夜深了，愿你睡个好觉！",
      "晚安！明天见，好梦！",
      "累了一天，是时候好好休息了！",
      "晚安！愿月光守护你的梦乡～",
      "让温柔的夜色陪你入眠，晚安！",
      "星星会守护你的梦，晚安！",
    ],
    LATE_NIGHT: [
      "这么晚还不睡觉，是有心事吗？",
      "熬夜可不好哦，快去休息吧！",
      "月亮都累了，你也该睡了！",
      "深夜的晚安，记得照顾好自己！",
      "已经这么晚了，要好好休息哦！",
      "让温暖的被窝治愈疲惫的你，晚安！",
      "夜深人静，是最好的休息时间，晚安！",
    ],
    default: [
      "现在说晚安，你的生物钟可能需要调整一下！",
      "这个点说晚安，是不是把钟表拨错了？",
      "你的晚安来得真是独特，就像你一样！",
      "打破常规的晚安，你的作息真特别！",
      "该不会是昨天的晚安忘记说了吧？",
      "这个点说晚安，是准备睡到太阳打西边出来吗？",
      "时间魔法师，你的晚安总是这么与众不同！",
    ],
  },
};

export class Greetings extends plugin {
  constructor() {
    super({
      name: "每日问候",
      event: "message",
      priority: 100,
      rule: [
        {
          reg: /^([#/])?(早安|早上好|早安丫|早|早早|早早早)$/,
          fnc: "handleGreetingMorning",
        },
        {
          reg: /^([#/])?(午安|午好|中午好|午安丫)$/,
          fnc: "handleGreetingNoon",
        },
        {
          reg: /^([#/])?(下午好|晚上好)$/i,
          fnc: "handleGreetingEvening",
        },
        {
          reg: /^([#/])?(晚安|晚安丫|晚安安|晚安晚安|安|安安)$/,
          fnc: "handleGreetingNight",
        },
      ],
    });
  }

  // 处理早安问候
  async handleGreetingMorning(e) {
    return await this.handleGreeting(e, "goodMorning");
  }

  // 处理午安问候
  async handleGreetingNoon(e) {
    return await this.handleGreeting(e, "goodNoon");
  }

  // 处理晚上好问候
  async handleGreetingEvening(e) {
    return await this.handleGreeting(e, "goodEvening");
  }

  // 处理晚安问候
  async handleGreetingNight(e) {
    return await this.handleGreeting(e, "goodNight");
  }

  // 通用的问候处理方法
  async handleGreeting(e, greetingType) {
    try {
      console.log("[每日问候] 开始处理消息");
      console.log("[每日问候] 问候类型:", greetingType);

      if (!greetingType) {
        console.error("[每日问候] 没有传递有效的问候类型！");
        return false;
      }

      const currentHour = Utils.getCurrentHour();
      console.log("[每日问候] 当前时间:", currentHour);

      const timeRange = Utils.getTimeRange(currentHour);
      console.log("[每日问候] 时间范围:", timeRange);

      const responses =
        ResponseConfig[greetingType][timeRange] ||
        ResponseConfig[greetingType].default;

      if (!responses) {
        console.error(
          `[每日问候] 未找到对应回复配置: ${greetingType}, ${timeRange}`
        );
        return false;
      }

      const response = Utils.getRandomResponse(responses);
      console.log("[每日问候] 选择的回复:", response);

      await e.reply(response, true);
      return true;
    } catch (error) {
      console.error("[每日问候] 处理出错:", error);
      console.error("[每日问候] 错误详情:", error.stack);
      return false;
    }
  }
}
