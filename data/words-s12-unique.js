// ============================================================
// 阶段12 · 旅游英语 — 全新词汇
// ============================================================
(function() {
  if (typeof WORD_LIBRARY === 'undefined') return;

  var s12new = [
    { word:"accommodation", phonetic:"/əˌkɒməˈdeɪʃn/", pos:"n.", chinese:"住宿", example:"The accommodation was comfortable.", example_cn:"住宿很舒适。" },
    { word:"adventurous", phonetic:"/ədˈventʃərəs/", pos:"adj.", chinese:"爱冒险的", example:"An adventurous traveler.", example_cn:"一个爱冒险的旅行者。" },
    { word:"aisle", phonetic:"/aɪl/", pos:"n.", chinese:"过道", example:"Walk down the aisle.", example_cn:"走过过道。" },
    { word:"backpack", phonetic:"/ˈbækpæk/", pos:"n.", chinese:"背包", example:"Carry a backpack.", example_cn:"背一个背包。" },
    { word:"brochure", phonetic:"/broʊˈʃʊr/", pos:"n.", chinese:"宣传册", example:"Read the travel brochure.", example_cn:"阅读旅行宣传册。" },
    { word:"cabin", phonetic:"/ˈkæbɪn/", pos:"n.", chinese:"小木屋", example:"Stay in a cabin.", example_cn:"住在小木屋里。" },
    { word:"caravan", phonetic:"/ˈkærəvæn/", pos:"n.", chinese:"大篷车", example:"Travel by caravan.", example_cn:"乘大篷车旅行。" },
    { word:"cave", phonetic:"/keɪv/", pos:"n.", chinese:"洞穴", example:"Explore the cave.", example_cn:"探索洞穴。" },
    { word:"coastline", phonetic:"/ˈkoʊstlaɪn/", pos:"n.", chinese:"海岸线", example:"Beautiful coastline.", example_cn:"美丽的海岸线。" },
    { word:"compass", phonetic:"/ˈkʌmpəs/", pos:"n.", chinese:"指南针", example:"Use a compass.", example_cn:"使用指南针。" },
    { word:"cuisine", phonetic:"/kwɪˈziːn/", pos:"n.", chinese:"烹饪", example:"Local cuisine.", example_cn:"当地烹饪。" },
    { word:"deposit", phonetic:"/dɪˈpɒzɪt/", pos:"n./v.", chinese:"押金", example:"Pay the deposit.", example_cn:"支付押金。" },
    { word:"desert", phonetic:"/ˈdezərt/", pos:"n.", chinese:"沙漠", example:"Cross the desert.", example_cn:"穿越沙漠。" },
    { word:"dialect", phonetic:"/ˈdaɪəlekt/", pos:"n.", chinese:"方言", example:"Local dialect.", example_cn:"当地方言。" },
    { word:"diplomat", phonetic:"/ˈdɪpləmæt/", pos:"n.", chinese:"外交官", example:"Meet the diplomat.", example_cn:"会见外交官。" },
    { word:"dormitory", phonetic:"/ˈdɔːrmɪtɔːri/", pos:"n.", chinese:"宿舍", example:"Stay in a dormitory.", example_cn:"住在宿舍里。" },
    { word:"drift", phonetic:"/drɪft/", pos:"v./n.", chinese:"漂流", example:"Drift downstream.", example_cn:"顺流漂下。" },
    { word:"duration", phonetic:"/djuˈreɪʃn/", pos:"n.", chinese:"持续时间", example:"Duration of stay.", example_cn:"停留时间。" },
    { word:"embark", phonetic:"/ɪmˈbɑːrk/", pos:"v.", chinese:"登船", example:"Embark on the ship.", example_cn:"登上船。" },
    { word:"embassy", phonetic:"/ˈembəsi/", pos:"n.", chinese:"大使馆", example:"Visit the embassy.", example_cn:"参观大使馆。" },
    { word:"emigrate", phonetic:"/ˈemɪɡreɪt/", pos:"v.", chinese:"移民", example:"Emigrate to another country.", example_cn:"移民到另一个国家。" },
    { word:"excursion", phonetic:"/ɪkˈskɜːrʃn/", pos:"n.", chinese:"远足", example:"Go on an excursion.", example_cn:"去远足。" },
    { word:"expedition", phonetic:"/ˌekspɪˈdɪʃn/", pos:"n.", chinese:"探险", example:"Mountain expedition.", example_cn:"登山探险。" },
    { word:"explore", phonetic:"/ɪkˈsplɔːr/", pos:"v.", chinese:"探索", example:"Explore the wilderness.", example_cn:"探索荒野。" },
    { word:"ferry", phonetic:"/ˈferi/", pos:"n.", chinese:"渡轮", example:"Take the ferry.", example_cn:"乘渡轮。" },
    { word:"festival", phonetic:"/ˈfestɪvl/", pos:"n.", chinese:"节日", example:"Local festival.", example_cn:"当地节日。" },
    { word:"flora", phonetic:"/ˈflɔːrə/", pos:"n.", chinese:"植物群", example:"Tropical flora.", example_cn:"热带植物。" },
    { word:"folklore", phonetic:"/ˈfoʊklɔːr/", pos:"n.", chinese:"民间传说", example:"Local folklore.", example_cn:"当地民间传说。" },
    { word:"gondola", phonetic:"/ˈɡɒndələ/", pos:"n.", chinese:"贡多拉", example:"Ride a gondola.", example_cn:"乘坐贡多拉。" },
    { word:"gratitude", phonetic:"/ˈɡrætɪtjuːd/", pos:"n.", chinese:"感激", example:"Express gratitude.", example_cn:"表达感激。" },
    { word:"habitat", phonetic:"/ˈhæbɪtæt/", pos:"n.", chinese:"栖息地", example:"Natural habitat.", example_cn:"自然栖息地。" },
    { word:"heritage", phonetic:"/ˈherɪtɪdʒ/", pos:"n.", chinese:"遗产", example:"Cultural heritage.", example_cn:"文化遗产。" },
    { word:"hospitality", phonetic:"/ˌhɒspɪˈtæləti/", pos:"n.", chinese:"好客", example:"Show hospitality.", example_cn:"表现出好客。" },
    { word:"humid", phonetic:"/ˈhjuːmɪd/", pos:"adj.", chinese:"潮湿的", example:"Humid climate.", example_cn:"潮湿的气候。" },
    { word:"itinerary", phonetic:"/aɪˈtɪnəreri/", pos:"n.", chinese:"行程", example:"Plan your itinerary.", example_cn:"计划你的行程。" },
    { word:"jetlag", phonetic:"/ˈdʒetlæɡ/", pos:"n.", chinese:"时差反应", example:"Suffer from jetlag.", example_cn:"遭受时差反应。" },
    { word:"keepsake", phonetic:"/ˈkiːpseɪk/", pos:"n.", chinese:"纪念品", example:"Buy a keepsake.", example_cn:"买一个纪念品。" },
    { word:"landscape", phonetic:"/ˈlændskeɪp/", pos:"n.", chinese:"风景", example:"Beautiful landscape.", example_cn:"美丽的风景。" },
    { word:"latitude", phonetic:"/ˈlætɪtjuːd/", pos:"n.", chinese:"纬度", example:"Northern latitude.", example_cn:"北纬。" },
    { word:"lodge", phonetic:"/lɒdʒ/", pos:"n.", chinese:"小屋", example:"Mountain lodge.", example_cn:"山间小屋。" },
    { word:"longitude", phonetic:"/ˈlɒŋɡɪtjuːd/", pos:"n.", chinese:"经度", example:"Eastern longitude.", example_cn:"东经。" },
    { word:"luggage", phonetic:"/ˈlʌɡɪdʒ/", pos:"n.", chinese:"行李", example:"Check your luggage.", example_cn:"检查你的行李。" },
    { word:"monument", phonetic:"/ˈmɒnjumənt/", pos:"n.", chinese:"纪念碑", example:"Visit the monument.", example_cn:"参观纪念碑。" },
    { word:"nomad", phonetic:"/ˈnoʊmæd/", pos:"n.", chinese:"游牧民", example:"Live like a nomad.", example_cn:"像游牧民一样生活。" },
    { word:"nomadic", phonetic:"/noʊˈmædɪk/", pos:"adj.", chinese:"游牧的", example:"Nomadic lifestyle.", example_cn:"游牧生活方式。" },
    { word:"oasis", phonetic:"/oʊˈeɪsɪs/", pos:"n.", chinese:"绿洲", example:"Desert oasis.", example_cn:"沙漠绿洲。" },
    { word:"ocean", phonetic:"/ˈoʊʃn/", pos:"n.", chinese:"海洋", example:"Cross the ocean.", example_cn:"穿越海洋。" },
    { word:"overseas", phonetic:"/ˌoʊvərˈsiːz/", pos:"adv./adj.", chinese:"海外", example:"Travel overseas.", example_cn:"海外旅行。" },
    { word:"passport", phonetic:"/ˈpɑːspɔːrt/", pos:"n.", chinese:"护照", example:"Bring your passport.", example_cn:"带上护照。" },
    { word:"pedestrian", phonetic:"/pəˈdestriən/", pos:"n.", chinese:"行人", example:"Watch for pedestrians.", example_cn:"注意行人。" },
    { word:"pilgrim", phonetic:"/ˈpɪlɡrɪm/", pos:"n.", chinese:"朝圣者", example:"Pilgrim journey.", example_cn:"朝圣之旅。" },
    { word:"plateau", phonetic:"/ˈplætoʊ/", pos:"n.", chinese:"高原", example:"Tibetan plateau.", example_cn:"青藏高原。" },
    { word:"polar", phonetic:"/ˈpoʊlər/", pos:"adj.", chinese:"极地的", example:"Polar region.", example_cn:"极地区域。" },
    { word:"pilgrimage", phonetic:"/ˈpɪlɡrɪmɪdʒ/", pos:"n.", chinese:"朝圣", example:"Go on pilgrimage.", example_cn:"去朝圣。" },
    { word:"port", phonetic:"/pɔːrt/", pos:"n.", chinese:"港口", example:"Fishing port.", example_cn:"渔港。" },
    { word:"promenade", phonetic:"/ˌprɒməˈnɑːd/", pos:"n.", chinese:"散步道", example:"Coastal promenade.", example_cn:"海滨散步道。" },
    { word:"prospect", phonetic:"/ˈprɒspekt/", pos:"n.", chinese:"前景", example:"Bright prospect.", example_cn:"光明的前景。" },
    { word:"relic", phonetic:"/ˈrelɪk/", pos:"n.", chinese:"遗迹", example:"Historical relic.", example_cn:"历史遗迹。" },
    { word:"renaissance", phonetic:"/ˌrenəˈsɑːns/", pos:"n.", chinese:"文艺复兴", example:"Renaissance art.", example_cn:"文艺复兴艺术。" },
    { word:"resort", phonetic:"/rɪˈzɔːrt/", pos:"n.", chinese:"度假胜地", example:"Beach resort.", example_cn:"海滩度假胜地。" },
    { word:"retreat", phonetic:"/rɪˈtriːt/", pos:"n./v.", chinese:"后退；撤退；隐居处", example:"Mountain retreat.", example_cn:"山间隐居处。" },
    { word:"safari", phonetic:"/səˈfɑːri/", pos:"n.", chinese:"狩猎旅行", example:"African safari.", example_cn:"非洲狩猎旅行。" },
    { word:"scenery", phonetic:"/ˈsiːnəri/", pos:"n.", chinese:"风景", example:"Beautiful scenery.", example_cn:"美丽的风景。" },
    { word:"seaside", phonetic:"/ˈsiːsaɪd/", pos:"n.", chinese:"海边", example:"Seaside town.", example_cn:"海边小镇。" },
    { word:"sightseeing", phonetic:"/ˈsaɪtsiːɪŋ/", pos:"n.", chinese:"观光", example:"Go sightseeing.", example_cn:"去观光。" },
    { word:"souvenir", phonetic:"/ˌsuːvəˈnɪr/", pos:"n.", chinese:"纪念品", example:"Buy souvenirs.", example_cn:"买纪念品。" },
    { word:"spear", phonetic:"/spɪr/", pos:"n.", chinese:"矛", example:"Hunting spear.", example_cn:"狩猎矛。" },
    { word:"summit", phonetic:"/ˈsʌmɪt/", pos:"n.", chinese:"顶峰", example:"Mountain summit.", example_cn:"山峰。" },
    { word:"temple", phonetic:"/ˈtempl/", pos:"n.", chinese:"寺庙", example:"Visit the temple.", example_cn:"参观寺庙。" },
    { word:"terrain", phonetic:"/təˈreɪn/", pos:"n.", chinese:"地形", example:"Rough terrain.", example_cn:"崎岖的地形。" },
    { word:"throne", phonetic:"/θroʊn/", pos:"n.", chinese:"王座", example:"Royal throne.", example_cn:"皇家王座。" },
    { word:"timber", phonetic:"/ˈtɪmbər/", pos:"n.", chinese:"木材", example:"Timber frame.", example_cn:"木框架。" },
    { word:"topography", phonetic:"/təˈpɒɡrəfi/", pos:"n.", chinese:"地形学", example:"Study topography.", example_cn:"研究地形学。" },
    { word:"tourism", phonetic:"/ˈtʊrɪzəm/", pos:"n.", chinese:"旅游业", example:"Boost tourism.", example_cn:"促进旅游业。" },
    { word:"tourist", phonetic:"/ˈtʊrɪst/", pos:"n.", chinese:"游客", example:"Many tourists.", example_cn:"很多游客。" },
    { word:"transportation", phonetic:"/ˌtrænspərˈteɪʃn/", pos:"n.", chinese:"交通", example:"Public transportation.", example_cn:"公共交通。" },
    { word:"tropical", phonetic:"/ˈtrɒpɪkl/", pos:"adj.", chinese:"热带的", example:"Tropical climate.", example_cn:"热带气候。" },
    { word:"vacation", phonetic:"/veɪˈkeɪʃn/", pos:"n.", chinese:"假期", example:"Summer vacation.", example_cn:"暑假。" },
    { word:"vessel", phonetic:"/ˈvesl/", pos:"n.", chinese:"船", example:"Sailing vessel.", example_cn:"帆船。" },
    { word:"vicinity", phonetic:"/vɪˈsɪnəti/", pos:"n.", chinese:"附近", example:"In the vicinity.", example_cn:"在附近。" },
    { word:"visa", phonetic:"/ˈviːzə/", pos:"n.", chinese:"签证", example:"Apply for visa.", example_cn:"申请签证。" },
    { word:"vista", phonetic:"/ˈvɪstə/", pos:"n.", chinese:"景色", example:"Mountain vista.", example_cn:"山景。" },
    { word:"volcano", phonetic:"/vɒlˈkeɪnoʊ/", pos:"n.", chinese:"火山", example:"Active volcano.", example_cn:"活火山。" },
    { word:"vow", phonetic:"/vaʊ/", pos:"v./n.", chinese:"发誓", example:"Make a vow.", example_cn:"发誓。" },
    { word:"wander", phonetic:"/ˈwɒndər/", pos:"v.", chinese:"漫步", example:"Wander through the city.", example_cn:"在城市里漫步。" },
    { word:"waterfall", phonetic:"/ˈwɔːtərfɔːl/", pos:"n.", chinese:"瀑布", example:"Beautiful waterfall.", example_cn:"美丽的瀑布。" },
    { word:"wilderness", phonetic:"/ˈwɪldərnəs/", pos:"n.", chinese:"荒野", example:"Explore the wilderness.", example_cn:"探索荒野。" },
    { word:"witness", phonetic:"/ˈwɪtnəs/", pos:"v./n.", chinese:"目击", example:"Witness the sunset.", example_cn:"目睹日落。" },
    { word:"yacht", phonetic:"/jɒt/", pos:"n.", chinese:"游艇", example:"Sail on a yacht.", example_cn:"乘游艇航行。" },
    { word:"youth", phonetic:"/juːθ/", pos:"n.", chinese:"青年", example:"In my youth.", example_cn:"在我年轻时。" }
  ];

  // 合并到阶段12
  if (WORD_LIBRARY.categories[11]) {
    var cat = WORD_LIBRARY.categories[11];
    var existingWords = {};
    cat.words.forEach(function(w) { existingWords[w.word.toLowerCase()] = true; });
    var added = 0;
    s12new.forEach(function(w) {
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
