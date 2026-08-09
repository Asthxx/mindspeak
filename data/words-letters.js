// ==================== 阶段0 · 26个字母 ====================
// 为完全不懂 ABC 的初学者准备：26 个字母(音标/元音辅音标注/代表词)
// 追加到 categories 末尾(index 12)，不破坏 expand42~52 等文件的固定索引 0~11
(function(){
  if(typeof WORD_LIBRARY==="undefined") return;
  // 防重复追加（重复加载/热更新时）
  for(var ci=0;ci<WORD_LIBRARY.categories.length;ci++){
    if(WORD_LIBRARY.categories[ci].name==="阶段0 · 26个字母") return;
  }
  // [字母, 音标, 类型, 代表词, 代表词中文]
  var letters=[
    ["A","/eɪ/","元音字母","Apple","苹果"],
    ["B","/biː/","辅音字母","Banana","香蕉"],
    ["C","/siː/","辅音字母","Cat","猫"],
    ["D","/diː/","辅音字母","Dog","狗"],
    ["E","/iː/","元音字母","Egg","鸡蛋"],
    ["F","/ef/","辅音字母","Fish","鱼"],
    ["G","/dʒiː/","辅音字母","Girl","女孩"],
    ["H","/eɪtʃ/","辅音字母","Hat","帽子"],
    ["I","/aɪ/","元音字母","Ice","冰"],
    ["J","/dʒeɪ/","辅音字母","Juice","果汁"],
    ["K","/keɪ/","辅音字母","Key","钥匙"],
    ["L","/el/","辅音字母","Lion","狮子"],
    ["M","/em/","辅音字母","Moon","月亮"],
    ["N","/en/","辅音字母","Nose","鼻子"],
    ["O","/oʊ/","元音字母","Orange","橙子"],
    ["P","/piː/","辅音字母","Pen","钢笔"],
    ["Q","/kjuː/","辅音字母","Queen","女王"],
    ["R","/ɑːr/","辅音字母","Rabbit","兔子"],
    ["S","/es/","辅音字母","Sun","太阳"],
    ["T","/tiː/","辅音字母","Tiger","老虎"],
    ["U","/juː/","元音字母","Umbrella","雨伞"],
    ["V","/viː/","辅音字母","Violin","小提琴"],
    ["W","/ˈdʌbəljuː/","辅音字母","Water","水"],
    ["X","/eks/","辅音字母","X-ray","X光"],
    ["Y","/waɪ/","辅音字母(半元音)","Yellow","黄色"],
    ["Z","/ziː/","辅音字母","Zebra","斑马"]
  ];
  var words=[];
  letters.forEach(function(p){
    words.push({
      word:p[0],
      phonetic:p[1],
      pos:p[2],
      chinese:"字母"+p[0]+" · 代表词 "+p[3]+"("+p[4]+")",
      example:p[0]+" is for "+p[3]+".",
      example_cn:p[0]+" 代表 "+p[3]+"("+p[4]+")。"
    });
  });
  WORD_LIBRARY.categories.push({ name:"阶段0 · 26个字母", stage:0, words:words });
  console.log("阶段0 letters added: "+words.length);
})();
