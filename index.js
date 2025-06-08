import YAML from "yaml";
import fs from "node:fs";
import path from "node:path";
const apps = {};
global.xiaotan_plugin = {
  apps: apps,
  puppeteer: null,
};

let is_icqq = false;
let is_oicq = false;

try {
  let icqq = await import("icqq");
  if (icqq) is_icqq = true;
} catch (err) {
  try {
    let oicq = await import("oicq");
    if (oicq) is_oicq = true;
  } catch (err) {}
}

if (fs.existsSync("./renderers/puppeteer/lib/puppeteer.js")) {
  try {
    let configFile = `./renderers/puppeteer/config.yaml`;
    let rendererCfg = {};
    if (!fs.existsSync(configFile)) {
      configFile = `./renderers/puppeteer/config_default.yaml`;
    }

    try {
      rendererCfg = YAML.parse(fs.readFileSync(configFile, "utf8"));
    } catch (e) {
      rendererCfg = {};
    }

    let puppeteer = new (
      await import("../../renderers/puppeteer/lib/puppeteer.js")
    ).default(rendererCfg);
    xiaotan_plugin.puppeteer = puppeteer;
  } catch (e) {}
}

if (!xiaotan_plugin.puppeteer) {
  try {
    let puppeteer = (await import("../../lib/puppeteer/puppeteer.js")).default;
    xiaotan_plugin.puppeteer = puppeteer;
  } catch (err) {
    xiaotan_plugin.puppeteer = {};
  }
}

import { Version, Plugin_Path } from "./components/index.js";

function getAllJsFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
      arrayOfFiles = getAllJsFiles(path.join(dirPath, file), arrayOfFiles);
    } else if (file.endsWith(".js")) {
      arrayOfFiles.push(path.join(dirPath, file));
    }
  });

  return arrayOfFiles;
}

// 读取 apps 目录及其子目录中的所有 JavaScript 文件
const files = getAllJsFiles(`${Plugin_Path}/apps`);

let ret = [];
let successCount = 0;
let failureCount = 0;
let failures = [];

// 异步引入所有的 app 文件
files.forEach((file) => {
  ret.push(import(file));
});

ret = await Promise.allSettled(ret);
let ver = Version.ver;

logger.info('------------------------^_^------------------------');
logger.info(`小谈插件${ver}加载中……`);
logger.info('██╗  ██╗████████╗██╗   ██╗██╗   ██╗██████╗ ███████╗');
logger.info('╚██╗██╔╝╚══██╔══╝╚██╗ ██╔╝╚██╗ ██╔╝██╔══██╗██╔════╝');
logger.info(' ╚███╔╝    ██║    ╚████╔╝  ╚████╔╝ ██║  ██║███████╗');
logger.info(' ██╔██╗    ██║     ╚██╔╝    ╚██╔╝  ██║  ██║╚════██║');
logger.info('██╔╝ ██╗   ██║      ██║      ██║   ██████╔╝███████║');
logger.info('╚═╝  ╚═╝   ╚═╝      ╚═╝      ╚═╝   ╚═════╝ ╚══════╝');


if (Version.yunzai[0] != "3") {
  logger.error(`小谈插件${ver}：初始化失败，本插件仅支持Yunzai-Bot v3！`);
} else {
  for (let i in files) {
    let name = path.basename(files[i], ".js");
    if (ret[i].status != "fulfilled") {
      failures.push({ name, reason: ret[i].reason });
      failureCount++;
    } else {
      apps[name] = ret[i].value[Object.keys(ret[i].value)[0]];
      successCount++;
    }
  }
  logger.info(`小谈插件${ver}：加载完成！成功加载了 ${successCount} 个插件`);
  if (failureCount > 0) {
    logger.error(`加载失败的插件有 ${failureCount} 个:`);
    failures.forEach(failure => {
      logger.error(`插件 ${failure.name} 载入失败，原因: ${failure.reason}`);
    });
  }
}

logger.info(`---------------------------------------------------`);
export { apps };
