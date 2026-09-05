// Piper 二进制冒烟自检（供应链加固）。
// 背景：/api/piper-tts 首次使用时从 GitHub release 下载解压二进制（固定版本 URL，
// 但无签名/校验和）。下载物若被上游替换（仓库被攻破/中间人），会以本机用户身份执行。
// 此护栏：解压后必须通过冒烟自检（可执行且输出含 "piper" 特征）才保留，失败即丢弃。
// 这是人工替换者难以伪装的快速拦截；强校验（发布方 SHA256/签名）需上游提供后再加。

const { spawn } = require('node:child_process');

// 返回 Promise<boolean>：binPath 存在、可执行、8s 内退出码 0 且输出含 piper 特征。
function checkPiperBinary(binPath) {
  return new Promise((resolve) => {
    let out = '';
    let child = null;
    let done = false;
    const finish = (ok) => { if (done) return; done = true; clearTimeout(timer); try { if (child) child.kill(); } catch (e) {} resolve(ok); };
    const timer = setTimeout(() => finish(false), 8000);
    try {
      child = spawn(binPath, ['--help'], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    } catch (e) { return finish(false); }
    child.stdout.on('data', (d) => { out += String(d); });
    child.stderr.on('data', (d) => { out += String(d); });
    child.on('error', () => finish(false));
    child.on('close', (code) => finish(code === 0 && /piper/i.test(out)));
  });
}

module.exports = { checkPiperBinary };