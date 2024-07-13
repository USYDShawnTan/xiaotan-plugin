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
  async getComplaint() {
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
}

export default new Api();
