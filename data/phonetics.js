// 48个国际音标数据
var PHONETIC_DATA = {
  vowels: [
    // 单元音 (12个)
    { symbol:"iː", category:"前元音", name:"长元音", example:"see /siː/", meaning:"看", tip:"舌尖抵下齿，舌前部抬高，嘴唇向两侧展开呈扁平状，如微笑，声音拉长。" },
    { symbol:"ɪ", category:"前元音", name:"短元音", example:"sit /sɪt/", meaning:"坐", tip:"比 iː 更短更松，舌位略低，嘴唇放松不展开。" },
    { symbol:"e", category:"前元音", name:"短元音", example:"bed /bed/", meaning:"床", tip:"舌尖抵下齿，舌前部抬起，嘴张开约一指宽。" },
    { symbol:"æ", category:"前元音", name:"短元音", example:"cat /kæt/", meaning:"猫", tip:"嘴张大，舌前部抬起较低，舌尖抵下齿，嘴角向两侧展开。" },
    { symbol:"ɑː", category:"后元音", name:"长元音", example:"car /kɑːr/", meaning:"汽车", tip:"嘴张大，舌身平放且后缩，嘴唇自然展开，长而深。" },
    { symbol:"ɒ", category:"后元音", name:"短元音", example:"hot /hɒt/", meaning:"热", tip:"舌后缩，嘴大开，圆唇，短促。" },
    { symbol:"ɔː", category:"后元音", name:"长元音", example:"door /dɔːr/", meaning:"门", tip:"舌后部抬起，嘴唇收圆并突出，口腔打开较大。" },
    { symbol:"ʊ", category:"后元音", name:"短元音", example:"book /bʊk/", meaning:"书", tip:"舌后部微抬，嘴唇收圆并稍向前凸，声音短促。" },
    { symbol:"uː", category:"后元音", name:"长元音", example:"food /fuːd/", meaning:"食物", tip:"舌后部尽量抬高靠近软腭，嘴唇收圆并向前突出。" },
    { symbol:"ʌ", category:"中元音", name:"短元音", example:"cup /kʌp/", meaning:"杯子", tip:"舌中部抬起，嘴张开约两指宽，唇形自然不圆。" },
    { symbol:"ɜː", category:"中元音", name:"长元音", example:"bird /bɜːd/", meaning:"鸟", tip:"舌平放中间位置，嘴唇自然展开，长而中性的元音。" },
    { symbol:"ə", category:"中元音", name:"短元音", example:"about /əˈbaʊt/", meaning:"关于", tip:"最轻最短的元音，舌身平放自然，嘴唇放松，口腔开口度最小。" },
    // 双元音 (8个)
    { symbol:"eɪ", category:"双元音", name:"双元音", example:"day /deɪ/", meaning:"天", tip:"由 e 滑向 ɪ，口型由半开到合，重音在开头。" },
    { symbol:"aɪ", category:"双元音", name:"双元音", example:"my /maɪ/", meaning:"我的", tip:"由 a 滑向 ɪ，起始口腔打开大，结尾舌尖抵下齿。" },
    { symbol:"ɔɪ", category:"双元音", name:"双元音", example:"boy /bɔɪ/", meaning:"男孩", tip:"由 ɔ 滑向 ɪ，嘴唇由圆到扁，口腔逐渐关闭。" },
    { symbol:"aʊ", category:"双元音", name:"双元音", example:"cow /kaʊ/", meaning:"牛", tip:"由 a 滑向 ʊ，口型由大到小，嘴唇逐渐收圆。" },
    { symbol:"əʊ", category:"双元音", name:"双元音", example:"go /ɡəʊ/", meaning:"去", tip:"由 ə 滑向 ʊ，嘴唇由自然到收圆，尾音轻短。" },
    { symbol:"ɪə", category:"双元音", name:"双元音", example:"here /hɪə/", meaning:"这里", tip:"由 ɪ 滑向 ə，嘴唇从扁到自然放松。" },
    { symbol:"eə", category:"双元音", name:"双元音", example:"air /eər/", meaning:"空气", tip:"由 e 滑向 ə，嘴从半开到自然放松。" },
    { symbol:"ʊə", category:"双元音", name:"双元音", example:"tour /tʊər/", meaning:"旅行", tip:"由 ʊ 滑向 ə，嘴唇从圆到自然放松。" }
  ],
  consonants: [
    // 爆破音 (6个)
    { symbol:"p", category:"爆破音", name:"清辅音", example:"pen /pen/", meaning:"钢笔", tip:"双唇紧闭然后突然放开，送出一股气流，声带不振动。" },
    { symbol:"b", category:"爆破音", name:"浊辅音", example:"bag /bæɡ/", meaning:"包", tip:"与 p 相同口型，但发声时声带振动。" },
    { symbol:"t", category:"爆破音", name:"清辅音", example:"ten /ten/", meaning:"十", tip:"舌尖抵住上齿龈后突然放开，送气，声带不振动。" },
    { symbol:"d", category:"爆破音", name:"浊辅音", example:"dog /dɒɡ/", meaning:"狗", tip:"与 t 相同口型，但声带振动。" },
    { symbol:"k", category:"爆破音", name:"清辅音", example:"key /kiː/", meaning:"钥匙", tip:"舌后部抵住软腭然后突然放开送气，声带不振动。" },
    { symbol:"g", category:"爆破音", name:"浊辅音", example:"go /ɡəʊ/", meaning:"去", tip:"与 k 相同口型，但声带振动。" },
    // 摩擦音 (10个)
    { symbol:"f", category:"摩擦音", name:"清辅音", example:"fish /fɪʃ/", meaning:"鱼", tip:"上齿轻触下唇，吹气摩擦发音，声带不振动。" },
    { symbol:"v", category:"摩擦音", name:"浊辅音", example:"van /væn/", meaning:"货车", tip:"与 f 相同口型，但声带振动。" },
    { symbol:"θ", category:"摩擦音", name:"清辅音", example:"think /θɪŋk/", meaning:"想", tip:"舌尖轻咬在上齿之间，吹气发音，声带不振动。" },
    { symbol:"ð", category:"摩擦音", name:"浊辅音", example:"this /ðɪs/", meaning:"这", tip:"与 θ 相同口型，但声带振动。" },
    { symbol:"s", category:"摩擦音", name:"清辅音", example:"sun /sʌn/", meaning:"太阳", tip:"舌尖接近上齿龈，气流从窄缝中挤出，声带不振动。" },
    { symbol:"z", category:"摩擦音", name:"浊辅音", example:"zuː", meaning:"动物园", tip:"与 s 相同口型，但声带振动。" },
    { symbol:"ʃ", category:"摩擦音", name:"清辅音", example:"she /ʃiː/", meaning:"她", tip:"舌前部向硬腭抬起，唇呈圆形，气流通过时产生摩擦声，声带不振动。" },
    { symbol:"ʒ", category:"摩擦音", name:"浊辅音", example:"measure /ˈmeʒər/", meaning:"测量", tip:"与 ʃ 相同口型，但声带振动。" },
    { symbol:"h", category:"摩擦音", name:"清辅音", example:"hat /hæt/", meaning:"帽子", tip:"声门张开，气流自由通过，仅呼气不震动声带。" },
    { symbol:"r", category:"摩擦音", name:"浊辅音", example:"red /red/", meaning:"红色", tip:"舌尖卷起但不接触上颚，嘴唇微圆。" },
    // 破擦音 (4个)
    { symbol:"tʃ", category:"破擦音", name:"清辅音", example:"chair /tʃeər/", meaning:"椅子", tip:"舌叶抵住上齿龈，积蓄气流后突然释放，类似汉语「吃」的发音。" },
    { symbol:"dʒ", category:"破擦音", name:"浊辅音", example:"job /dʒɒb/", meaning:"工作", tip:"与 tʃ 相同口型，但声带振动，类似汉语「知」的发音。" },
    { symbol:"tr", category:"破擦音", name:"清辅音", example:"tree /triː/", meaning:"树", tip:"舌尖卷起抵住上齿龈后部，突然放开并送气。" },
    { symbol:"dr", category:"破擦音", name:"浊辅音", example:"drink /drɪŋk/", meaning:"喝", tip:"与 tr 相同口型，但声带振动。" },
    // 鼻音 (3个)
    { symbol:"m", category:"鼻音", name:"浊辅音", example:"man /mæn/", meaning:"男人", tip:"双唇紧闭，软腭降下，气流从鼻腔流出，声带振动。" },
    { symbol:"n", category:"鼻音", name:"浊辅音", example:"nəʊz", meaning:"鼻子", tip:"舌尖抵住上齿龈，软腭降下，气流从鼻腔流出。" },
    { symbol:"ŋ", category:"鼻音", name:"浊辅音", example:"sɪŋ", meaning:"唱", tip:"舌后部抬起靠近软腭，气流从鼻腔流出，类似 ng 的音。" },
    // 舌侧音 (1个)
    { symbol:"l", category:"舌侧音", name:"浊辅音", example:"leg /leɡ/", meaning:"腿", tip:"舌尖抵住上齿龈，气流从舌两侧流出。" },
    // 半元音 (2个)
    { symbol:"j", category:"半元音", name:"浊辅音", example:"yes /jes/", meaning:"是", tip:"舌前部向硬腭抬起，类似汉语「耶」的起始位置。" },
    { symbol:"w", category:"半元音", name:"浊辅音", example:"water /ˈwɔːtər/", meaning:"水", tip:"双唇收圆突出，舌后部向软腭抬起。" },
    // 破擦辅音 (2个)
    { symbol:"ts", category:"破擦音", name:"清辅音", example:"cats /kæts/", meaning:"猫(复数)", tip:"舌位同 t，然后迅速过渡到 s，类似汉语「刺」的韵尾。" },
    { symbol:"dz", category:"破擦音", name:"浊辅音", example:"cards /kɑːrdz/", meaning:"卡片(复数)", tip:"与 ts 相同口型，但声带振动。" }
  ]
};
