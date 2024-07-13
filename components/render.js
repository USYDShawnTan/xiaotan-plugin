import { Data, Version, Plugin_Name } from './index.js'

export default async function (path, params, cfg) {
  let [app, tpl] = path.split('/')
  let { e } = cfg
  let layoutPath = process.cwd() + `/plugins/${Plugin_Name}/resources/common/layout/`
  let resPath = `../../../../../plugins/${Plugin_Name}/resources/`
  Data.createDir(`data/html/${Plugin_Name}/${app}/${tpl}`, 'root')
  let data = {
    ...params,
    _plugin: Plugin_Name,
    saveId: params.saveId || params.save_id || tpl,
    tplFile: `./plugins/${Plugin_Name}/resources/${app}/${tpl}.html`,
    pluResPath: resPath,
    _res_path: resPath,
    _layout_path: layoutPath,
    _tpl_path: process.cwd() + `/plugins/${Plugin_Name}/resources/common/tpl/`,
    defaultLayout: layoutPath + 'default.html',
    pageGotoParams: {
      waitUntil: 'networkidle0'
    },
    sys: {
      scale: 1,
      copyright: `Created By Yunzai-Bot<span class="version">${Version.yunzai}</span> & xiaotan-Plugin<span class="version">${Version.ver}</span>`
    },
    quality: 100
  }
  let img = await xiaotan_plugin.puppeteer.screenshot(`${Plugin_Name}/${app}/${tpl}`, data)
  let ret = true
  if (img) {
    if (img?.type != 'image') img = segment.image(img)
    ret = await e.reply(img)
  }
  return cfg.retMsgId ? ret : true
}