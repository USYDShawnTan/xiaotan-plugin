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
    const url = "https://backend.433200.xyz/jrys?lucky=bad";
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
      message: buildFortuneMessage(fortuneData)
    };
  }
}

export default new Api();
