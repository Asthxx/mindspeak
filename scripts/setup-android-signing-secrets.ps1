# setup-android-signing-secrets.ps1
# 把本地 Android 签名 keystore 安全上传为 GitHub Actions repository secrets，
# 使 build-apk.yml 能打出正式签名的 Release APK。
#
# 安全设计（重要）：
#   * 本文件不含任何密码/密钥，全部经由 gh 的隐藏交互提示输入
#   * 绝不使用 --body（会把值暴露在进程 argv / 进程列表里）
#   * keystore 仅在本机读字节 -> base64 -> 管道送入 gh，不落盘、不进 git 历史
#   * 本仓库是公开仓库（isPrivate: false），密钥一旦泄漏后果不可逆
#
# 用法： pwsh -File scripts/setup-android-signing-secrets.ps1
# 幂等：重复执行会覆盖同名 secret，不会产生多余条目。

[CmdletBinding()]
param(
    # keystore 路径，默认仓库根目录下的 mindspeak-keystore.p12
    [string]$KeystorePath = (Join-Path (Split-Path -Parent $PSScriptRoot) 'mindspeak-keystore.p12'),
    # 目标仓库；留空则用当前目录推导
    [string]$Repo
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Write-Step  { param($m) Write-Host "`n=== $m ===" -ForegroundColor Cyan }
function Write-Ok    { param($m) Write-Host "  [OK] $m" -ForegroundColor Green }
function Die         { param($m) Write-Host "`n[x] $m" -ForegroundColor Red; exit 1 }

# ---------------------------------------------------------------- 前置检查
Write-Step '前置检查'

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { Die '未找到 gh CLI，请先安装 GitHub CLI 并执行 gh auth login' }
if (-not (Get-Command keytool -ErrorAction SilentlyContinue)) { Die '未找到 keytool（需 JDK 17+ 且在 PATH 中）' }

if (-not (Test-Path -LiteralPath $KeystorePath)) {
    Die "找不到 keystore：$KeystorePath`n请用 -KeystorePath 指定，或先用 keytool -genkeypair 生成。"
}

$ks = (Resolve-Path -LiteralPath $KeystorePath).Path
$ksSize = (Get-Item -LiteralPath $ks).Length
Write-Ok "keystore：$ks ($ksSize bytes)"

# 安全闸门：keystore 绝不能被 git 跟踪
$tracked = git -C (Split-Path -Parent $PSScriptRoot) ls-files | Select-String -Pattern '\.p12$|\.jks$|\.keystore$'
if ($tracked) {
    Die "检测到 keystore 已被 git 跟踪！先执行 git rm --cached 并确认 .gitignore 覆盖，再继续。`n匹配：$($tracked -join ', ')"
}
Write-Ok '安全闸门通过：keystore 未被 git 跟踪'

# 目标仓库：显式解析成 owner/repo 并始终以 -R 传入。
# 背景：本脚本曾在 $Repo 为空时让 gh 自行推导，而 gh 依赖「当前工作目录」
# 是否为 git 仓库——从任意目录执行（如 C:\Users\Administrator）会直接失败：
#   failed to run git: fatal: not a git repository
# keystore 已用 $PSScriptRoot 定位，仓库推导却没对齐，属逻辑漏洞。
# 修复：同样以 $PSScriptRoot 为准解析 origin，并恒定传 -R，不再依赖 cwd。
$repoRoot = Split-Path -Parent $PSScriptRoot
if ($Repo) {
    $repoSlug = $Repo
} else {
    $origin = (& git -C $repoRoot remote get-url origin 2>$null)
    if (-not $origin) { Die "在 $repoRoot 找不到 git remote 'origin'；请用 -Repo owner/name 显式指定。" }
    $origin = $origin.Trim()
    if ($origin -notmatch 'github\.com[:/](?<slug>[^/]+/[^/]+?)(?:\.git)?/?$') {
        Die "无法从 origin 解析 owner/repo：$origin`n请用 -Repo owner/name 显式指定。"
    }
    $repoSlug = $Matches['slug']
}
$repoArg = @('-R', $repoSlug)
Write-Ok "目标仓库：$repoSlug"

# ---------------------------------------------------------------- 读取 alias
Write-Step '读取 keystore 的 alias（build-apk.yml 需要 ANDROID_KEY_ALIAS）'
Write-Host '  alias 即 keytool -list -v 输出中的 "别名(Alias)" 字段。'
Write-Host '  可先另开一个终端执行 keytool -list -v -keystore mindspeak-keystore.p12 -storetype PKCS12 查看。'
Write-Host ''

$alias = Read-Host '请输入 keystore alias'
if ([string]::IsNullOrWhiteSpace($alias)) { Die 'alias 不能为空' }
$alias = $alias.Trim()

# 校验 alias 形态：合法值形如 myapp / mindspeak / app-key-01。
# 曾出现过用户把整条 keytool 命令粘进提示框的情况——那会把
# `keytool -list -v -keystore ...` 当成 alias 写进 secret，CI 签名时才发现，
# 代价是重新配一遍全部 4 个 secret。这里提前拦住明显不是 alias 的输入。
if ($alias -match '\s|-(list|v|keystore|storetype)\b|^(keytool|java|echo|cat|type)\b|["'']') {
    Die "输入的 alias 看起来是一条命令而非 alias：$alias`n请只填 keytool -list -v 输出中「别名(Alias)」后面的值，例如：mindspeak"
}
if ($alias -notmatch '^[A-Za-z0-9._-]+$') {
    Die "alias 含非法字符（仅允许字母/数字/._-）：$alias"
}
Write-Ok "alias = $alias"

# ---------------------------------------------------------------- 上传 4 个 secret
Write-Step '上传 repository secrets（密码均为隐藏输入，不回显、不进历史）'

# 1) keystore 本体：base64 走管道（argv 里不出现内容）
#    与 build-apk.yml:175 的 `base64 -d` 配对
Write-Host '  [1/4] ANDROID_KEYSTORE_B64（由本地 keystore 计算，值不打印）'
try {
    $b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($ks))
} catch {
    Die "读取 keystore 失败：$($_.Exception.Message)"
}
if ([string]::IsNullOrWhiteSpace($b64)) { Die 'base64 结果为空，keystore 可能已损坏' }
# 只把长度和指纹打出来，绝不打印内容
$sha = (Get-FileHash -LiteralPath $ks -Algorithm SHA256).Hash
Write-Ok "base64 长度 = $($b64.Length) 字符"
Write-Ok "keystore SHA256 = $sha  ← 记下它，配置后可复核上传的是同一个文件"
$b64 | gh secret set ANDROID_KEYSTORE_B64 @repoArg
if ($LASTEXITCODE -ne 0) { Die 'ANDROID_KEYSTORE_B64 设置失败' }
$b64 = $null  # 尽早清理内存引用
Write-Ok 'ANDROID_KEYSTORE_B64 已设置'

# 2) store 密码：交互式隐藏输入，不带 --body
Write-Host '  [2/4] ANDROID_KEYSTORE_PASS（输入不回显）'
gh secret set ANDROID_KEYSTORE_PASS @repoArg
if ($LASTEXITCODE -ne 0) { Die 'ANDROID_KEYSTORE_PASS 设置失败' }
Write-Ok 'ANDROID_KEYSTORE_PASS 已设置'

# 3) alias：非机密，直接管道写入，不重复提示
#    早前版本会再问一次「alias」，既冗余又可能与第 1 步填的值不一致，
#    导致 ANDROID_KEY_ALIAS 与用户以为的不符，签名到 CI 才暴露。
Write-Host "  [3/4] ANDROID_KEY_ALIAS（沿用上面已填的：$alias）"
$alias | gh secret set ANDROID_KEY_ALIAS @repoArg
if ($LASTEXITCODE -ne 0) { Die 'ANDROID_KEY_ALIAS 设置失败' }
Write-Ok "ANDROID_KEY_ALIAS 已设置（= $alias）"

# 4) key 密码：交互式隐藏输入
Write-Host '  [4/4] ANDROID_KEY_PASS（输入不回显）'
gh secret set ANDROID_KEY_PASS @repoArg
if ($LASTEXITCODE -ne 0) { Die 'ANDROID_KEY_PASS 设置失败' }
Write-Ok 'ANDROID_KEY_PASS 已设置'

# ---------------------------------------------------------------- 校验
Write-Step '校验（gh 只显示名字与时间，永不回显值）'
gh secret list @repoArg

Write-Step '完成'
Write-Host @'
下一步：
  1) 确认上面列出了 4 个 secret（ANDROID_KEYSTORE_B64 / _PASS / KEY_ALIAS / KEY_PASS）
  2) 打 tag 触发打包：
       git tag v1.1.1
       git push origin v1.1.1
     tag 会同时触发 build-apk.yml 与 build-desktop.yml
  3) 桌面版签名是另一套证书（Authenticode / Apple Developer），
     与本 Android keystore 不通用，未配置时会自动跳过签名，不影响 APK。
'@ -ForegroundColor Green
