import fetch from "node-fetch";

class Api {
  async Capoo(e) {
    const url = "https://git.acwing.com/XT/capoo/-/raw/main/gif/";
    const max_images = 267;
    const random_image_number = Math.floor(Math.random() * max_images) + 1;
    const image_url = `${url}${random_image_number}.gif`;
    await e.reply(segment.image(image_url), false);
    return true;
  }
  async cat(e) {
    const url = "https://backend.433200.xyz/catdog?type=cat";
    const response = await fetch(url);
    const cat = await response.json();
    const image_url = cat[0].url;
    await e.reply(segment.image(image_url), false);
    return true;
  }
  async dog(e) {
    const url = "https://backend.433200.xyz/catdog?type=dog";
    const response = await fetch(url);
    const dog = await response.json();
    const image_url = dog[0].url;
    await e.reply(segment.image(image_url), false);
    return true;
  }
  async crazythursday(e) {
    const url = "https://backend.433200.xyz/crazythursday?type=txt";
    const response = await fetch(url);
    const text = await response.text();
    e.reply(text);
    return true;
  }
  async hgt(e) {
    const url = "https://backend.433200.xyz/hgt?type=txt";
    const response = await fetch(url);
    const text = await response.text();
    e.reply(text);
    return true;
  }
  async fafeng() {
    const url = "https://backend.433200.xyz/fafeng?type=txt";
    const response = await fetch(url);
    const text = await response.text();
    return text;
  }
  async answerbook() {
    const url = "https://backend.433200.xyz/answerbook?type=txt";
    const response = await fetch(url);
    const text = await response.text();
    return text;
  }
  async jrys() {
    const url = "https://backend.433200.xyz/jrys";
    const response = await fetch(url);
    const fortuneData = await response.json();
    const buildFortuneMessage = (fortuneData) => {
      return (
        `\n运势: ${fortuneData.fortuneSummary}` +
        `\n星级: ${fortuneData.luckyStar}` +
        `\n签文: ${fortuneData.signText}` +
        `\n解读: ${fortuneData.unsignText}`
      );
    };
    return {
      fortuneData,
      message: buildFortuneMessage(fortuneData),
    };
  }
  async longtu(e) {
    const base_url = "https://git.acwing.com/XT/long/-/raw/main/";
    const batches = {
      1: [1, 190, ".gif"],
      2: [191, 522, ".jpg"],
      3: [523, 854, ".jpg"],
      4: [855, 1185, ".jpg"],
      5: [1186, 1516, ".jpg"],
    };

    const batch_choice =
      Object.keys(batches)[
        Math.floor(Math.random() * Object.keys(batches).length)
      ];
    const [start, end, extension] = batches[batch_choice];
    const image_number = Math.floor(Math.random() * (end - start + 1)) + start;
    const image_url = `${base_url}${batch_choice}/${image_number}${extension}`;

    try {
      await e.reply(segment.image(image_url), false);
      return true;
    } catch (error) {
      console.error("Error sending image:", error);
      await e.reply("出错啦~稍后再试噢");
      return false;
    }
  }
  async kuntu(e) {
    const base_url = "https://git.acwing.com/XT/ikun/-/raw/main/";
    const batches = {
      1: [1, 100, ".jpg"],
      2: [101, 199, ".jpg"],
      3: [200, 298, ".jpg"],
      4: [299, 397, ".jpg"],
      5: [398, 496, ".jpg"],
    };
    const batch_choice =
      Object.keys(batches)[
        Math.floor(Math.random() * Object.keys(batches).length)
      ];
    const [start, end, extension] = batches[batch_choice];
    const image_number = Math.floor(Math.random() * (end - start + 1)) + start;
    const image_url = `${base_url}${batch_choice}/${image_number}${extension}`;
    try {
      await e.reply(segment.image(image_url), false);
      return true;
    } catch (error) {
      console.error("Error sending image:", error);
      await e.reply("出错啦~稍后再试噢");
      return false;
    }
  }
}
export default new Api();
