// ============================================================
// 阶段12 · 旅游英语 — 全新词汇（第二批）
// ============================================================
(function() {
  if (typeof WORD_LIBRARY === 'undefined') return;

  var s12new2 = [
    { word:"abroad", phonetic:"/əˈbrɔːd/", pos:"adv.", chinese:"在国外", example:"Travel abroad.", example_cn:"出国旅行。" },
    { word:"accent", phonetic:"/ˈæksent/", pos:"n.", chinese:"口音", example:"Foreign accent.", example_cn:"外国口音。" },
    { word:"admission", phonetic:"/ədˈmɪʃn/", pos:"n.", chinese:"入场", example:"Admission fee.", example_cn:"入场费。" },
    { word:"aisle", phonetic:"/aɪl/", pos:"n.", chinese:"过道", example:"Window aisle seat.", example_cn:"靠窗过道座位。" },
    { word:"amusement", phonetic:"/əˈmjuːzmənt/", pos:"n.", chinese:"娱乐", example:"Amusement park.", example_cn:"游乐园。" },
    { word:"ankle", phonetic:"/ˈæŋkl/", pos:"n.", chinese:"脚踝", example:"Twist my ankle.", example_cn:"扭伤脚踝。" },
    { word:"apology", phonetic:"/əˈpɒlədʒi/", pos:"n.", chinese:"道歉", example:"Make an apology.", example_cn:"道歉。" },
    { word:"archaeology", phonetic:"/ˌɑːrkiˈɒlədʒi/", pos:"n.", chinese:"考古学", example:"Study archaeology.", example_cn:"学习考古学。" },
    { word:"architecture", phonetic:"/ˈɑːrkɪtektʃər/", pos:"n.", chinese:"建筑", example:"Famous architecture.", example_cn:"著名的建筑。" },
    { word:"artifact", phonetic:"/ˈɑːrtɪfækt/", pos:"n.", chinese:"文物", example:"Ancient artifact.", example_cn:"古代文物。" },
    { word:"attraction", phonetic:"/əˈtrækʃn/", pos:"n.", chinese:"景点", example:"Tourist attraction.", example_cn:"旅游景点。" },
    { word:"auditory", phonetic:"/ˈɔːdɪtɔːri/", pos:"adj.", chinese:"听觉的", example:"Auditory experience.", example_cn:"听觉体验。" },
    { word:"backpacker", phonetic:"/ˈbækpækər/", pos:"n.", chinese:"背包客", example:"Young backpacker.", example_cn:"年轻的背包客。" },
    { word:"bazaar", phonetic:"/bəˈzɑːr/", pos:"n.", chinese:"集市", example:"Local bazaar.", example_cn:"当地集市。" },
    { word:"bliss", phonetic:"/blɪs/", pos:"n.", chinese:"幸福", example:"Pure bliss.", example_cn:"纯粹的幸福。" },
    { word:"breeze", phonetic:"/briːz/", pos:"n.", chinese:"微风", example:"Cool breeze.", example_cn:"凉爽的微风。" },
    { word:"calibrate", phonetic:"/ˈkælɪbreɪt/", pos:"v.", chinese:"校准", example:"Calibrate the instrument.", example_cn:"校准仪器。" },
    { word:"campfire", phonetic:"/ˈkæmpfaɪər/", pos:"n.", chinese:"篝火", example:"Sit around campfire.", example_cn:"围坐在篝火旁。" },
    { word:"canoe", phonetic:"/kəˈnuː/", pos:"n.", chinese:"独木舟", example:"Paddle a canoe.", example_cn:"划独木舟。" },
    { word:"caravan", phonetic:"/ˈkærəvæn/", pos:"n.", chinese:"大篷车", example:"Travel by caravan.", example_cn:"乘大篷车旅行。" },
    { word:"cascade", phonetic:"/kæˈskeɪd/", pos:"n.", chinese:"瀑布", example:"Mountain cascade.", example_cn:"山间瀑布。" },
    { word:"cave", phonetic:"/keɪv/", pos:"n.", chinese:"洞穴", example:"Explore the cave.", example_cn:"探索洞穴。" },
    { word:"cliff", phonetic:"/klɪf/", pos:"n.", chinese:"悬崖", example:"Steep cliff.", example_cn:"陡峭的悬崖。" },
    { word:"coastline", phonetic:"/ˈkoʊstlaɪn/", pos:"n.", chinese:"海岸线", example:"Scenic coastline.", example_cn:"风景优美的海岸线。" },
    { word:"compass", phonetic:"/ˈkʌmpəs/", pos:"n.", chinese:"指南针", example:"Use a compass.", example_cn:"使用指南针。" },
    { word:"contemplate", phonetic:"/ˈkɒntəmpleɪt/", pos:"v.", chinese:"沉思", example:"Contemplate the view.", example_cn:"沉思风景。" },
    { word:"cuisine", phonetic:"/kwɪˈziːn/", pos:"n.", chinese:"烹饪", example:"Authentic cuisine.", example_cn:"正宗的烹饪。" },
    { word:"curio", phonetic:"/ˈkjʊərioʊ/", pos:"n.", chinese:"古董", example:"Buy a curio.", example_cn:"买一个古董。" },
    { word:"delight", phonetic:"/dɪˈlaɪt/", pos:"n.", chinese:"快乐", example:"Children's delight.", example_cn:"孩子们的快乐。" },
    { word:"deposit", phonetic:"/dɪˈpɒzɪt/", pos:"n./v.", chinese:"押金", example:"Pay the deposit.", example_cn:"支付押金。" },
    { word:"desert", phonetic:"/ˈdezərt/", pos:"n.", chinese:"沙漠", example:"Sahara desert.", example_cn:"撒哈拉沙漠。" },
    { word:"dialect", phonetic:"/ˈdaɪəlekt/", pos:"n.", chinese:"方言", example:"Local dialect.", example_cn:"当地方言。" },
    { word:"diplomat", phonetic:"/ˈdɪpləmæt/", pos:"n.", chinese:"外交官", example:"Meet the diplomat.", example_cn:"会见外交官。" },
    { word:"dormitory", phonetic:"/ˈdɔːrmɪtɔːri/", pos:"n.", chinese:"宿舍", example:"University dormitory.", example_cn:"大学宿舍。" },
    { word:"drift", phonetic:"/drɪft/", pos:"v./n.", chinese:"漂流", example:"River drift.", example_cn:"河流漂流。" },
    { word:"duration", phonetic:"/djuˈreɪʃn/", pos:"n.", chinese:"持续时间", example:"Duration of trip.", example_cn:"旅行持续时间。" },
    { word:"embark", phonetic:"/ɪmˈbɑːrk/", pos:"v.", chinese:"登船", example:"Embark on journey.", example_cn:"开始旅程。" },
    { word:"embassy", phonetic:"/ˈembəsi/", pos:"n.", chinese:"大使馆", example:"Chinese embassy.", example_cn:"中国大使馆。" },
    { word:"emigrate", phonetic:"/ˈemɪɡreɪt/", pos:"v.", chinese:"移民", example:"Emigrate abroad.", example_cn:"移民国外。" },
    { word:"excursion", phonetic:"/ɪkˈskɜːrʃn/", pos:"n.", chinese:"远足", example:"Day excursion.", example_cn:"一日远足。" },
    { word:"expedition", phonetic:"/ˌekspɪˈdɪʃn/", pos:"n.", chinese:"探险", example:"Space expedition.", example_cn:"太空探险。" },
    { word:"explore", phonetic:"/ɪkˈsplɔːr/", pos:"v.", chinese:"探索", example:"Explore new places.", example_cn:"探索新地方。" },
    { word:"ferry", phonetic:"/ˈferi/", pos:"n.", chinese:"渡轮", example:"Take the ferry.", example_cn:"乘坐渡轮。" },
    { word:"festival", phonetic:"/ˈfestɪvl/", pos:"n.", chinese:"节日", example:"Music festival.", example_cn:"音乐节。" },
    { word:"flora", phonetic:"/ˈflɔːrə/", pos:"n.", chinese:"植物群", example:"Tropical flora.", example_cn:"热带植物。" },
    { word:"folklore", phonetic:"/ˈfoʊklɔːr/", pos:"n.", chinese:"民间传说", example:"Local folklore.", example_cn:"当地民间传说。" },
    { word:"gondola", phonetic:"/ˈɡɒndələ/", pos:"n.", chinese:"贡多拉", example:"Venice gondola.", example_cn:"威尼斯贡多拉。" },
    { word:"gratitude", phonetic:"/ˈɡrætɪtjuːd/", pos:"n.", chinese:"感激", example:"Show gratitude.", example_cn:"表达感激。" },
    { word:"habitat", phonetic:"/ˈhæbɪtæt/", pos:"n.", chinese:"栖息地", example:"Natural habitat.", example_cn:"自然栖息地。" },
    { word:"heritage", phonetic:"/ˈherɪtɪdʒ/", pos:"n.", chinese:"遗产", example:"Cultural heritage.", example_cn:"文化遗产。" },
    { word:"hospitality", phonetic:"/ˌhɒspɪˈtæləti/", pos:"n.", chinese:"好客", example:"Show hospitality.", example_cn:"表现出好客。" },
    { word:"humid", phonetic:"/ˈhjuːmɪd/", pos:"adj.", chinese:"潮湿的", example:"Humid weather.", example_cn:"潮湿的天气。" },
    { word:"itinerary", phonetic:"/aɪˈtɪnəreri/", pos:"n.", chinese:"行程", example:"Plan itinerary.", example_cn:"计划行程。" },
    { word:"jetlag", phonetic:"/ˈdʒetlæɡ/", pos:"n.", chinese:"时差反应", example:"Suffer jetlag.", example_cn:"遭受时差反应。" },
    { word:"keepsake", phonetic:"/ˈkiːpseɪk/", pos:"n.", chinese:"纪念品", example:"Buy keepsake.", example_cn:"买纪念品。" },
    { word:"landscape", phonetic:"/ˈlændskeɪp/", pos:"n.", chinese:"风景", example:"Natural landscape.", example_cn:"自然风景。" },
    { word:"latitude", phonetic:"/ˈlætɪtjuːd/", pos:"n.", chinese:"纬度", example:"North latitude.", example_cn:"北纬。" },
    { word:"lodge", phonetic:"/lɒdʒ/", pos:"n.", chinese:"小屋", example:"Mountain lodge.", example_cn:"山间小屋。" },
    { word:"longitude", phonetic:"/ˈlɒŋɡɪtjuːd/", pos:"n.", chinese:"经度", example:"East longitude.", example_cn:"东经。" },
    { word:"luggage", phonetic:"/ˈlʌɡɪdʒ/", pos:"n.", chinese:"行李", example:"Check luggage.", example_cn:"托运行李。" },
    { word:"monument", phonetic:"/ˈmɒnjumənt/", pos:"n.", chinese:"纪念碑", example:"Historical monument.", example_cn:"历史纪念碑。" },
    { word:"nomad", phonetic:"/ˈnoʊmæd/", pos:"n.", chinese:"游牧民", example:"Live as nomad.", example_cn:"像游牧民一样生活。" },
    { word:"nomadic", phonetic:"/noʊˈmædɪk/", pos:"adj.", chinese:"游牧的", example:"Nomadic lifestyle.", example_cn:"游牧生活方式。" },
    { word:"oasis", phonetic:"/oʊˈeɪsɪs/", pos:"n.", chinese:"绿洲", example:"Desert oasis.", example_cn:"沙漠绿洲。" },
    { word:"ocean", phonetic:"/ˈoʊʃn/", pos:"n.", chinese:"海洋", example:"Deep ocean.", example_cn:"深海。" },
    { word:"overseas", phonetic:"/ˌoʊvərˈsiːz/", pos:"adv./adj.", chinese:"海外", example:"Overseas travel.", example_cn:"海外旅行。" },
    { word:"passport", phonetic:"/ˈpɑːspɔːrt/", pos:"n.", chinese:"护照", example:"Valid passport.", example_cn:"有效护照。" },
    { word:"pedestrian", phonetic:"/pəˈdestriən/", pos:"n.", chinese:"行人", example:"Pedestrian zone.", example_cn:"步行区。" },
    { word:"pilgrim", phonetic:"/ˈpɪlɡrɪm/", pos:"n.", chinese:"朝圣者", example:"Holy pilgrim.", example_cn:"神圣的朝圣者。" },
    { word:"plateau", phonetic:"/ˈplætoʊ/", pos:"n.", chinese:"高原", example:"Tibetan plateau.", example_cn:"青藏高原。" },
    { word:"polar", phonetic:"/ˈpoʊlər/", pos:"adj.", chinese:"极地的", example:"Polar expedition.", example_cn:"极地探险。" },
    { word:"port", phonetic:"/pɔːrt/", pos:"n.", chinese:"港口", example:"Fishing port.", example_cn:"渔港。" },
    { word:"promenade", phonetic:"/ˌprɒməˈnɑːd/", pos:"n.", chinese:"散步道", example:"Beach promenade.", example_cn:"海滩散步道。" },
    { word:"relic", phonetic:"/ˈrelɪk/", pos:"n.", chinese:"遗迹", example:"Ancient relic.", example_cn:"古代遗迹。" },
    { word:"renaissance", phonetic:"/ˌrenəˈsɑːns/", pos:"n.", chinese:"文艺复兴", example:"Renaissance period.", example_cn:"文艺复兴时期。" },
    { word:"resort", phonetic:"/rɪˈzɔːrt/", pos:"n.", chinese:"度假胜地", example:"Ski resort.", example_cn:"滑雪度假胜地。" },
    { word:"retreat", phonetic:"/rɪˈtriːt/", pos:"n./v.", chinese:"后退；撤退；隐居处", example:"Beach retreat.", example_cn:"海滩隐居处。" },
    { word:"safari", phonetic:"/səˈfɑːri/", pos:"n.", chinese:"狩猎旅行", example:"Safari adventure.", example_cn:"狩猎冒险。" },
    { word:"scenery", phonetic:"/ˈsiːnəri/", pos:"n.", chinese:"风景", example:"Breathtaking scenery.", example_cn:"令人惊叹的风景。" },
    { word:"seaside", phonetic:"/ˈsiːsaɪd/", pos:"n.", chinese:"海边", example:"Seaside resort.", example_cn:"海边度假胜地。" },
    { word:"sightseeing", phonetic:"/ˈsaɪtsiːɪŋ/", pos:"n.", chinese:"观光", example:"Go sightseeing.", example_cn:"去观光。" },
    { word:"souvenir", phonetic:"/ˌsuːvəˈnɪr/", pos:"n.", chinese:"纪念品", example:"Buy souvenir.", example_cn:"买纪念品。" },
    { word:"spear", phonetic:"/spɪr/", pos:"n.", chinese:"矛", example:"Hunting spear.", example_cn:"狩猎矛。" },
    { word:"summit", phonetic:"/ˈsʌmɪt/", pos:"n.", chinese:"顶峰", example:"Mountain summit.", example_cn:"山峰。" },
    { word:"temple", phonetic:"/ˈtempl/", pos:"n.", chinese:"寺庙", example:"Ancient temple.", example_cn:"古老寺庙。" },
    { word:"terrain", phonetic:"/təˈreɪn/", pos:"n.", chinese:"地形", example:"Rough terrain.", example_cn:"崎岖地形。" },
    { word:"throne", phonetic:"/θroʊn/", pos:"n.", chinese:"王座", example:"Royal throne.", example_cn:"皇家王座。" },
    { word:"timber", phonetic:"/ˈtɪmbər/", pos:"n.", chinese:"木材", example:"Timber house.", example_cn:"木屋。" },
    { word:"topography", phonetic:"/təˈpɒɡrəfi/", pos:"n.", chinese:"地形学", example:"Study topography.", example_cn:"研究地形学。" },
    { word:"tourism", phonetic:"/ˈtʊrɪzəm/", pos:"n.", chinese:"旅游业", example:"Sustainable tourism.", example_cn:"可持续旅游业。" },
    { word:"tourist", phonetic:"/ˈtʊrɪst/", pos:"n.", chinese:"游客", example:"Foreign tourist.", example_cn:"外国游客。" },
    { word:"transportation", phonetic:"/ˌtrænspərˈteɪʃn/", pos:"n.", chinese:"交通", example:"Public transportation.", example_cn:"公共交通。" },
    { word:"tropical", phonetic:"/ˈtrɒpɪkl/", pos:"adj.", chinese:"热带的", example:"Tropical island.", example_cn:"热带岛屿。" },
    { word:"vacation", phonetic:"/veɪˈkeɪʃn/", pos:"n.", chinese:"假期", example:"Summer vacation.", example_cn:"暑假。" },
    { word:"vessel", phonetic:"/ˈvesl/", pos:"n.", chinese:"船", example:"Sailing vessel.", example_cn:"帆船。" },
    { word:"vicinity", phonetic:"/vɪˈsɪnəti/", pos:"n.", chinese:"附近", example:"In the vicinity.", example_cn:"在附近。" },
    { word:"visa", phonetic:"/ˈviːzə/", pos:"n.", chinese:"签证", example:"Tourist visa.", example_cn:"旅游签证。" },
    { word:"vista", phonetic:"/ˈvɪstə/", pos:"n.", chinese:"景色", example:"Mountain vista.", example_cn:"山景。" },
    { word:"volcano", phonetic:"/vɒlˈkeɪnoʊ/", pos:"n.", chinese:"火山", example:"Active volcano.", example_cn:"活火山。" },
    { word:"vow", phonetic:"/vaʊ/", pos:"v./n.", chinese:"发誓", example:"Make a vow.", example_cn:"发誓。" },
    { word:"wander", phonetic:"/ˈwɒndər/", pos:"v.", chinese:"漫步", example:"Wander around.", example_cn:"四处漫步。" },
    { word:"waterfall", phonetic:"/ˈwɔːtərfɔːl/", pos:"n.", chinese:"瀑布", example:"Beautiful waterfall.", example_cn:"美丽的瀑布。" },
    { word:"wilderness", phonetic:"/ˈwɪldərnəs/", pos:"n.", chinese:"荒野", example:"Explore wilderness.", example_cn:"探索荒野。" },
    { word:"witness", phonetic:"/ˈwɪtnəs/", pos:"v./n.", chinese:"目击", example:"Witness the event.", example_cn:"目击事件。" },
    { word:"yacht", phonetic:"/jɒt/", pos:"n.", chinese:"游艇", example:"Luxury yacht.", example_cn:"豪华游艇。" },
    { word:"youth", phonetic:"/juːθ/", pos:"n.", chinese:"青年", example:"Youth hostel.", example_cn:"青年旅社。" }
  ];

  // 合并到阶段12
  if (WORD_LIBRARY.categories[11]) {
    var cat = WORD_LIBRARY.categories[11];
    var existingWords = {};
    cat.words.forEach(function(w) { existingWords[w.word.toLowerCase()] = true; });
    var added = 0;
    s12new2.forEach(function(w) {
      if (w.word && !existingWords[w.word.toLowerCase()]) {
        cat.words.push(w);
        existingWords[w.word.toLowerCase()] = true;
        added++;
      }
    });
    console.log('阶段12: 新增 ' + added + ' 词');
    console.log('阶段12 现有: ' + cat.words.length + ' 词');
  }

})();
