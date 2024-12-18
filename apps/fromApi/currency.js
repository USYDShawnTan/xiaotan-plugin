import schedule from "node-schedule";
import fetch from "node-fetch";
import { currencyMap } from "../../resources/data/currency_map.js";

const api_base_url = "https://backend.433200.xyz/exchange_rate";

// 生成反向映射表
const reverseCurrencyMap = {};
Object.entries(currencyMap).forEach(([code, names]) => {
  names.forEach((name) => {
    reverseCurrencyMap[name] = code;
  });
});

export class ExchangeRatePlugin extends plugin {
  constructor() {
    super({
      name: "汇率查询插件",
      dsc: "查询汇率以及转化",
      event: "message",
      priority: 1000,
      rule: [],
    });

    this.generateRules();
  }

  generateRules() {
    const currencyKeys = Object.keys(reverseCurrencyMap).join("|");
    this.rule.push({
      reg: new RegExp(`.*?(${currencyKeys})汇率.*`),
      fnc: "getExchangeRate",
    });
    this.rule.push({
      reg: new RegExp(
        `.*?(\\d*\\.?\\d*)?\\s*(${currencyKeys})转(${currencyKeys}).*`
      ),
      fnc: "convertCurrency",
    });
  }

  async getExchangeRate(e) {
    const match = e.msg.match(
      new RegExp("(" + Object.keys(reverseCurrencyMap).join("|") + ")汇率")
    );
    if (match) {
      const currency1 = reverseCurrencyMap[match[1]];
      const url = `${api_base_url}?currency1=${currency1}`;

      try {
        const response = await fetch(url);
        const data = await response.json();

        if (data && data.conversion_rates) {
          let replyMessage = `汇率信息如下：\n`;
          for (const [key, value] of Object.entries(data.conversion_rates)) {
            replyMessage += `${value.name} (${key}): ${value.rate}\n`;
          }
          e.reply(replyMessage.trim());
        } else {
          e.reply("未能获取汇率，请稍后再试。");
        }
      } catch (error) {
        console.error("Error fetching exchange rate:", error);
        e.reply("获取汇率时出错，请稍后再试。");
      }
    }
  }

  async convertCurrency(e) {
    const match = e.msg.match(
      new RegExp(
        "(\\d*\\.?\\d*)?\\s*(" +
          Object.keys(reverseCurrencyMap).join("|") +
          ")转(" +
          Object.keys(reverseCurrencyMap).join("|") +
          ")"
      )
    );
    if (match) {
      const amount = match[1] ? parseFloat(match[1]) : 1;
      const currency1 = reverseCurrencyMap[match[2]];
      const currency2 = reverseCurrencyMap[match[3]];
      const url = `${api_base_url}?currency1=${currency1}&currency2=${currency2}`;

      try {
        const response = await fetch(url);
        const data = await response.json();

        if (data && data.exchange_rate) {
          const convertedAmount = amount * data.exchange_rate;
          e.reply(
            `${amount} ${data.currency1_name} (${data.currency1}) = ${convertedAmount} ${data.currency2_name} (${data.currency2})`
          );
        } else {
          e.reply("未能获取汇率，请稍后再试。");
        }
      } catch (error) {
        console.error("Error fetching exchange rate:", error);
        e.reply("获取汇率时出错，请稍后再试。");
      }
    }
  }
}

let groupnumber_list = ["103382278"];
let url_aud = "https://api.433200.xyz/api/exchange_rate?currency1=AUD";
schedule.scheduleJob("0 0 9 * * ?", async () => {
  console.log("澳币汇率");
  for (var i = 0; i < groupnumber_list.length; i++) {
    let group = Bot.pickGroup(groupnumber_list[i]);

    const response = await fetch(url_aud);
    const data = await response.json();

    if (data && data.conversion_rates) {
      const cnyRate = data.conversion_rates.CNY;
      if (cnyRate) {
        const replyMessage = `澳币汇率: ${cnyRate.rate}`;
        group.sendMsg(replyMessage);
      } else {
        group.sendMsg("未找到人民币 (CNY) 的汇率信息");
      }
    }
  }
});

export default new ExchangeRatePlugin();
