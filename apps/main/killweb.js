import { exec } from "child_process";

// 定义获取并杀死Chromium进程的函数
function killChromiumProcesses() {
  // 获取Chromium进程数量
  exec("pgrep -c chromium", (err, stdout, ) => {
    if (err) {
      console.error(`获取进程数量时出错: 浏览器可能未启动`);
      return;
    }
    const chromiumProcesses = parseInt(stdout.trim());
    console.log(`系统中的Chromium进程数量为: ${chromiumProcesses}`);
    if (chromiumProcesses > 0) {
      exec("pkill chromium", (err, ) => {
        if (err) {
          console.error(`杀死进程时出错: ${err}`);
          return;
        }
        console.log(`成功杀死所有Chromium进程`);
      });
    } else {
      console.log(`系统中没有Chromium进程`);
    }
  });
}

// 定义获取系统信息的函数
function getSystemInfo() {
  exec(
    "curl -L https://gitee.com/TimeRainStarSky/neofetch/raw/master/neofetch | bash -s -- --stdout",
    (err, stdout, ) => {
      if (err) {
        console.error("获取系统信息时出错", err);
        return;
      }
      // 解析输出
      const lines = stdout.trim().split("\n");
      const info = {};
      lines.forEach((line) => {
        const [key, value] = line.split(":").map((str) => str.trim());
        info[key] = value;
      });
      // 提取所需的信息
      const { OS, Uptime, Memory } = info;
      console.log("操作系统", OS);
      console.log("运行时间", Uptime);
      console.log("内存状态", Memory);
      // 获取浏览器数量
      exec("pgrep -c chromium", (err, stdout, ) => {
        if (err) {
          console.error("获取浏览器数量时出错：浏览器可能未启动");
          return;
        }
        const browserProcesses = parseInt(stdout.trim());
        console.log("浏览器数量", browserProcesses);
        // 获取 CPU 使用率
        exec(
          'top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk \'{print 100 - $1}\'',
          (err, stdout, ) => {
            if (err) {
              console.error("获取 CPU 使用率时出错", err);
              return;
            }
            const cpuUsage = parseFloat(stdout.trim());
            console.log("CPU 使用率", cpuUsage);
            // 构建消息内容
            const messageContent = `${new Date().toLocaleString()}  \n${Uptime}   \n${OS}  \nCPU ${cpuUsage}%  \nRAM ${Memory}  \nChromium ${browserProcesses}`;
            // 发送消息
            // Bot.pickGroup(" ").sendMsg(messageContent);
          }
        );
      });
    }
  );
}

// 获取系统信息
getSystemInfo();

// 每一小时调用一次getSystemInfo函数
setInterval(getSystemInfo, 3600000);


// 每隔5分钟执行一次获取并杀死Chromium进程的操作
setInterval(killChromiumProcesses, 300000);