class Api {
  constructor() {
    this.Capoo_url = "https://git.acwing.com/XT/capoo/-/raw/main/gif/";
  }

  async Capoo(e) {
      const max_images = 267;
      const random_image_number = Math.floor(Math.random() * max_images) + 1;
      const image_url = `${this.Capoo_url}${random_image_number}.gif`;
      await e.reply(segment.image(image_url), false);
      return true;
  }
}

export default new Api();
