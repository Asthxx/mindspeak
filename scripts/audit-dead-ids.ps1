# 相对本脚本定位仓库根，避免硬编码本机绝对路径导致换机即废
$root = Split-Path -Parent $PSScriptRoot
# index.html / js/app.js 实测为无 BOM 的 UTF-8（首字节 3C-21 / 2F-2F，非 GB 系）。
# 早前按 GB18030 解码会把中文标签解成乱码（"按回车发送" -> "按回车发?"），污染输出。
$utf8 = [Text.UTF8Encoding]::new($false, $true)   # 抛异常而非静默替换，便于发现编码不符
$html = $utf8.GetString([IO.File]::ReadAllBytes("$root\index.html"))
$app  = $utf8.GetString([IO.File]::ReadAllBytes("$root\js\app.js"))

# 1) 收集 HTML 中"交互控件"id：button / input(type!=hidden|submit) / select / a / textarea
$ids = [System.Collections.Generic.HashSet[string]]::new()
foreach ($m in [regex]::Matches($html, '<(?:button|select|textarea|a|input)\b[^>]*\bid\s*=\s*["'']([^"'']+)["'']')) {
    $id = $m.Groups[1].Value
    # input 仅保留需要交互的类型（checkbox/radio 之外：text/number/range/color/file 也算用户控件）
    $tagRe = '<(button|select|textarea|a|input)\b[^>]*\bid\s*=\s*["'']' + [regex]::Escape($id) + '["'']'
    $tag = [regex]::Match($html, $tagRe).Groups[1].Value
    if ($tag -eq 'input') {
        $typeM = [regex]::Match(('<input' + $html.Substring($m.Index + 19)), 'type\s*=\s*["'']([^"'']+)["'']')
        $type = if ($typeM.Success) { $typeM.Groups[1].Value } else { 'text' }
        if ($type -in @('hidden', 'submit', 'image', 'reset', 'button')) { continue }
    }
    [void]$ids.Add($id)
}

# 2) 判断每个 id 在 app.js 是否被引用（safeBind / getElementById / querySelector[#或data-id] / setAttribute id 绑定）
$referenced = [System.Collections.Generic.HashSet[string]]::new()
foreach ($pat in @("safeBind\('([^']+)'", 'safeBind\("([^"]+)"', "getElementById\('([^']+)'", 'getElementById\("([^"]+)"', "querySelector\(['""]#([\w-]+)")) {
    foreach ($m in [regex]::Matches($app, $pat)) { [void]$referenced.Add($m.Groups[1].Value) }
}
# data-id 方式（事件委托常用）
foreach ($m in [regex]::Matches($app, "data-id\s*=\s*['""]([\w-]+)")) { [void]$referenced.Add($m.Groups[1].Value) }
# 变量命名法：var xxx = getElementById(...) 后的变量名再被 safeBind 或 addEventListener 使用 —— 略，仅直接 id 引用
# 但还要：HTML 里该 id 元素也可能是由 JS 动态创建后再 getElementById，若 app 里有字符串常量等于该 id 就算接
foreach ($m in [regex]::Matches($app, "'([\w-]+)'")) { if ($ids.Contains($m.Groups[1].Value)) { [void]$referenced.Add($m.Groups[1].Value) } }

# 3) 零引用 = 候选死 id
$dead = @($ids | Where-Object { -not $referenced.Contains($_) } | Sort-Object)

"=== 交互控件 id 总数: $($ids.Count) | 零引用候选: $($dead.Count) ==="
foreach ($d in $dead) {
    # 在 HTML 里取该 id 所在行的标签样本
    $lineHit = [regex]::Match($html, "(?m)^.*\bid\s*=\s*['""]$([regex]::Escape($d))['""].*$")
    $sample = if ($lineHit.Success) { $lineHit.Value.Trim() } else { '(?)' }
    if ($sample.Length -gt 90) { $sample = $sample.Substring(0, 90) }
    "  - $d   <=  $sample"
}
