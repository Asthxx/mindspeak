// ============================================================
// 词库扩充第十六轮 — 阶段12 最终补充
// ============================================================
(function() {
  if (typeof WORD_LIBRARY === 'undefined') return;

  // 阶段12 · 旅游英语 补充
  var s12 = [
    { word:"accommodation", phonetic:"/əˌkɒməˈdeɪʃn/", pos:"n.", chinese:"住宿", example:"Book accommodation.", example_cn:"预订住宿。" },
    { word:"adventure", phonetic:"/ədˈventʃər/", pos:"n.", chinese:"冒险", example:"Go on adventure.", example_cn:"去冒险。" },
    { word:"airport", phonetic:"/ˈerpɔːrt/", pos:"n.", chinese:"机场", example:"Go to airport.", example_cn:"去机场。" },
    { word:"attraction", phonetic:"/əˈtrækʃn/", pos:"n.", chinese:"景点", example:"Tourist attraction.", example_cn:"旅游景点。" },
    { word:"available", phonetic:"/əˈveɪləbl/", pos:"adj.", chinese:"可用的", example:"Room available.", example_cn:"有空房。" },
    { word:"baggage", phonetic:"/ˈbæɡɪdʒ/", pos:"n.", chinese:"行李", example:"Check baggage.", example_cn:"托运行李。" },
    { word:"boarding", phonetic:"/ˈbɔːrdɪŋ/", pos:"n.", chinese:"登机", example:"Boarding pass.", example_cn:"登机牌。" },
    { word:"booking", phonetic:"/ˈbʊkɪŋ/", pos:"n.", chinese:"预订", example:"Make a booking.", example_cn:"做预订。" },
    { word:"cabin", phonetic:"/ˈkæbɪn/", pos:"n.", chinese:"小屋", example:"Beach cabin.", example_cn:"海滩小屋。" },
    { word:"cancel", phonetic:"/ˈkænsl/", pos:"v.", chinese:"取消", example:"Cancel reservation.", example_cn:"取消预订。" },
    { word:"carry-on", phonetic:"/ˈkæri ɒn/", pos:"n.", chinese:"随身行李", example:"One carry-on.", example_cn:"一件随身行李。" },
    { word:"checkpoint", phonetic:"/ˈtʃekpɔɪnt/", pos:"n.", chinese:"检查站", example:"Security checkpoint.", example_cn:"安检站。" },
    { word:"connection", phonetic:"/kəˈnekʃn/", pos:"n.", chinese:"转机", example:"Miss connection.", example_cn:"错过转机。" },
    { word:"customs", phonetic:"/ˈkʌstəmz/", pos:"n.", chinese:"海关", example:"Go through customs.", example_cn:"过海关。" },
    { word:"delay", phonetic:"/dɪˈleɪ/", pos:"n./v.", chinese:"延误", example:"Flight delay.", example_cn:"航班延误。" },
    { word:"departure", phonetic:"/dɪˈpɑːrtʃər/", pos:"n.", chinese:"出发", example:"Departure time.", example_cn:"出发时间。" },
    { word:"destination", phonetic:"/ˌdestɪˈneɪʃn/", pos:"n.", chinese:"目的地", example:"Final destination.", example_cn:"最终目的地。" },
    { word:"embassy", phonetic:"/ˈembəsi/", pos:"n.", chinese:"大使馆", example:"Go to embassy.", example_cn:"去大使馆。" },
    { word:"exchange", phonetic:"/ɪksˈtʃeɪndʒ/", pos:"v.", chinese:"兑换", example:"Exchange currency.", example_cn:"兑换货币。" },
    { word:"excursion", phonetic:"/ɪkˈskɜːrʃn/", pos:"n.", chinese:"短途旅行", example:"Go on excursion.", example_cn:"去短途旅行。" },
    { word:"explore", phonetic:"/ɪkˈsplɔːr/", pos:"v.", chinese:"探索", example:"Explore the city.", example_cn:"探索城市。" },
    { word:"fare", phonetic:"/fer/", pos:"n.", chinese:"票价", example:"Bus fare.", example_cn:"公交车费。" },
    { word:"ferry", phonetic:"/ˈferi/", pos:"n.", chinese:"渡轮", example:"Take ferry.", example_cn:"乘渡轮。" },
    { word:"flight", phonetic:"/flaɪt/", pos:"n.", chinese:"航班", example:"Book flight.", example_cn:"预订航班。" },
    { word:"guidebook", phonetic:"/ˈɡaɪdbʊk/", pos:"n.", chinese:"指南手册", example:"Read guidebook.", example_cn:"阅读指南。" },
    { word:"hike", phonetic:"/haɪk/", pos:"v./n.", chinese:"远足", example:"Go hiking.", example_cn:"去远足。" },
    { word:"hostel", phonetic:"/ˈhɒstl/", pos:"n.", chinese:"青年旅社", example:"Stay at hostel.", example_cn:"住青年旅社。" },
    { word:"itinerary", phonetic:"/aɪˈtɪnəreri/", pos:"n.", chinese:"行程安排", example:"Plan itinerary.", example_cn:"计划行程。" },
    { word:"jetlag", phonetic:"/ˈdʒetlæɡ/", pos:"n.", chinese:"时差反应", example:"Suffer from jetlag.", example_cn:"受时差困扰。" },
    { word:"luggage", phonetic:"/ˈlʌɡɪdʒ/", pos:"n.", chinese:"行李", example:"Heavy luggage.", example_cn:"沉重的行李。" },
    { word:"map", phonetic:"/mæp/", pos:"n.", chinese:"地图", example:"Look at map.", example_cn:"看地图。" },
    { word:"monument", phonetic:"/ˈmɒnjumənt/", pos:"n.", chinese:"纪念碑", example:"Visit monument.", example_cn:"参观纪念碑。" },
    { word:"museum", phonetic:"/mjuˈziːəm/", pos:"n.", chinese:"博物馆", example:"Visit museum.", example_cn:"参观博物馆。" },
    { word:"passport", phonetic:"/ˈpɑːspɔːrt/", pos:"n.", chinese:"护照", example:"Show passport.", example_cn:"出示护照。" },
    { word:"pedestrian", phonetic:"/pəˈdestriən/", pos:"n.", chinese:"行人", example:"Watch pedestrians.", example_cn:"注意行人。" },
    { word:"platform", phonetic:"/ˈplætfɔːrm/", pos:"n.", chinese:"站台", example:"Train platform.", example_cn:"火车站台。" },
    { word:"reservation", phonetic:"/ˌrezərˈveɪʃn/", pos:"n.", chinese:"预订", example:"Make reservation.", example_cn:"做预订。" },
    { word:"resort", phonetic:"/rɪˈzɔːrt/", pos:"n.", chinese:"度假村", example:"Beach resort.", example_cn:"海滩度假村。" },
    { word:"scenic", phonetic:"/ˈsiːnɪk/", pos:"adj.", chinese:"风景优美的", example:"Scenic route.", example_cn:"风景优美的路线。" },
    { word:"sightseeing", phonetic:"/ˈsaɪtsiːɪŋ/", pos:"n.", chinese:"观光", example:"Go sightseeing.", example_cn:"去观光。" },
    { word:"souvenir", phonetic:"/ˌsuːvəˈnɪr/", pos:"n.", chinese:"纪念品", example:"Buy souvenir.", example_cn:"买纪念品。" },
    { word:"terminal", phonetic:"/ˈtɜːrmɪnl/", pos:"n.", chinese:"航站楼", example:"Terminal 2.", example_cn:"2号航站楼。" },
    { word:"ticket", phonetic:"/ˈtɪkɪt/", pos:"n.", chinese:"票", example:"Buy ticket.", example_cn:"买票。" },
    { word:"tour", phonetic:"/tʊr/", pos:"n.", chinese:"旅行", example:"City tour.", example_cn:"城市旅行。" },
    { word:"tourism", phonetic:"/ˈtʊrɪzəm/", pos:"n.", chinese:"旅游业", example:"Boost tourism.", example_cn:"促进旅游业。" },
    { word:"tourist", phonetic:"/ˈtʊrɪst/", pos:"n.", chinese:"游客", example:"Many tourists.", example_cn:"很多游客。" },
    { word:"transportation", phonetic:"/ˌtrænspərˈteɪʃn/", pos:"n.", chinese:"交通", example:"Public transportation.", example_cn:"公共交通。" },
    { word:"vacation", phonetic:"/veɪˈkeɪʃn/", pos:"n.", chinese:"假期", example:"Go on vacation.", example_cn:"去度假。" },
    { word:"visa", phonetic:"/ˈviːzə/", pos:"n.", chinese:"签证", example:"Apply for visa.", example_cn:"申请签证。" },
    { word:"voyage", phonetic:"/ˈvɔɪɪdʒ/", pos:"n.", chinese:"航行", example:"Ocean voyage.", example_cn:"海上航行。" },
    { word:"wander", phonetic:"/ˈwɒndər/", pos:"v.", chinese:"漫步", example:"Wander around.", example_cn:"四处漫步。" },
    { word:"weather", phonetic:"/ˈweðər/", pos:"n.", chinese:"天气", example:"Check weather.", example_cn:"查看天气。" },
    { word:"budget", phonetic:"/ˈbʌdʒɪt/", pos:"n.", chinese:"预算", example:"Travel budget.", example_cn:"旅行预算。" },
    { word:"campsite", phonetic:"/ˈkæmpsaɪt/", pos:"n.", chinese:"露营地", example:"Set up campsite.", example_cn:"搭建露营地。" },
    { word:"coupon", phonetic:"/ˈkuːpɒn/", pos:"n.", chinese:"优惠券", example:"Use coupon.", example_cn:"使用优惠券。" },
    { word:"currency", phonetic:"/ˈkʌrənsi/", pos:"n.", chinese:"货币", example:"Local currency.", example_cn:"当地货币。" },
    { word:"excursion", phonetic:"/ɪkˈskɜːrʃn/", pos:"n.", chinese:"短途旅行", example:"Day excursion.", example_cn:"一日游。" },
    { word:"guesthouse", phonetic:"/ˈɡesthaʊs/", pos:"n.", chinese:"民宿", example:"Stay at guesthouse.", example_cn:"住民宿。" },
    { word:"itinerary", phonetic:"/aɪˈtɪnəreri/", pos:"n.", chinese:"行程", example:"Plan itinerary.", example_cn:"计划行程。" },
    { word:"lodge", phonetic:"/lɒdʒ/", pos:"n.", chinese:"小屋", example:"Mountain lodge.", example_cn:"山间小屋。" },
    { word:"overseas", phonetic:"/ˌoʊvərˈsiːz/", pos:"adv./adj.", chinese:"海外的", example:"Overseas travel.", example_cn:"海外旅行。" },
    { word:"package", phonetic:"/ˈpækɪdʒ/", pos:"n.", chinese:"套餐", example:"Tour package.", example_cn:"旅游套餐。" },
    { word:"passport", phonetic:"/ˈpɑːspɔːrt/", pos:"n.", chinese:"护照", example:"Valid passport.", example_cn:"有效护照。" },
    { word:"resort", phonetic:"/rɪˈzɔːrt/", pos:"n.", chinese:"度假胜地", example:"Ski resort.", example_cn:"滑雪度假胜地。" },
    { word:"sightseeing", phonetic:"/ˈsaɪtsiːɪŋ/", pos:"n.", chinese:"观光", example:"Sightseeing tour.", example_cn:"观光旅行。" },
    { word:"souvenir", phonetic:"/ˌsuːvəˈnɪr/", pos:"n.", chinese:"纪念品", example:"Souvenir shop.", example_cn:"纪念品店。" },
    { word:"tourist", phonetic:"/ˈtʊrɪst/", pos:"n.", chinese:"游客", example:"Tourist information.", example_cn:"游客信息。" },
    { word:"visa", phonetic:"/ˈviːzə/", pos:"n.", chinese:"签证", example:"Tourist visa.", example_cn:"旅游签证。" },
    { word:"waterfront", phonetic:"/ˈwɔːtərfʌnt/", pos:"n.", chinese:"海滨", example:"Waterfront area.", example_cn:"海滨区域。" }
  ];

  // 合并到阶段12
  if (WORD_LIBRARY.categories[11]) {
    var cat = WORD_LIBRARY.categories[11];
    var existingWords = {};
    cat.words.forEach(function(w) { existingWords[w.word.toLowerCase()] = true; });
    var added = 0;
    s12.forEach(function(w) {
      if (w.word && !existingWords[w.word.toLowerCase()]) {
        cat.words.push(w);
        existingWords[w.word.toLowerCase()] = true;
        added++;
      }
    });
    console.log('阶段12: 新增 ' + added + ' 词');
  }

})();
