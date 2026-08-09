(function(){
  if(typeof WORD_LIBRARY==="undefined") return;
  var words=[
"accommodation|əˌkɒməˈdeɪʃn|n.|住宿|The accommodation is comfortable.|住宿很舒适。",
"adventure|ədˈventʃər|n.|冒险|The adventure was exciting.|冒险很刺激。",
"airfare|ˈerfer|n.|机票价格|The airfare is expensive.|机票价格很贵。",
"aisle|aɪl|n.|过道|I prefer the aisle seat.|我 prefer 靠过道的座位。",
"all-inclusive|ˌɔːl ɪnˈkluːsɪv|adj.|全包的|The resort is all-inclusive.|度假村是全包的。",
"boarding|ˈbɔːrdɪŋ|n.|登机|Boarding begins at 8 AM.|早上8点开始登机。",
"boarding pass|ˈbɔːrdɪŋ pæs|n.|登机牌|Please show your boarding pass.|请出示您的登机牌。",
"boutique|buːˈtiːk|n.|精品店|She bought a dress at the boutique.|她在精品店买了一条裙子。",
"brochure|ˈbroʊʃər|n.|宣传册|Read the brochure.|阅读宣传册。",
"cancellation|ˌkænsəˈleɪʃn|n.|取消|The cancellation was unexpected.|取消是 unexpected。",
"car rental|kɑːr ˈrentl|n.|租车|I need a car rental.|我需要租车。",
"check-in|tʃek ɪn|n.|入住|Check-in is at 3 PM.|下午3点入住。",
"checkout|ˈtʃekaʊt|n.|退房|Checkout is at 11 AM.|上午11点退房。",
"concierge|ˌkɒnsiˈerʒ|n.|礼宾部|Ask the concierge for help.|向礼宾部寻求帮助。",
"connecting flight|kəˈnektɪŋ flaɪt|n.|转机|I have a connecting flight.|我要转机。",
"currency exchange|ˈkʌrənsɪ ɪksˈtʃeɪndʒ|n.|货币兑换|Where is the currency exchange?|货币兑换在哪里？",
"customs|ˈkʌstəmz|n.|海关|We went through customs.|我们通过了海关。",
"delay|dɪˈleɪ|n.|延误|The flight has a delay.|航班延误了。",
"departure|dɪˈpɑːrtʃər|n.|出发|The departure is at noon.|中午出发。",
"destination|ˌdestɪˈneɪʃn|n.|目的地|What is your destination?|你的目的地是哪里？",
"dining|ˈdaɪnɪŋ|n.|用餐|The dining options are varied.|用餐选择很多。",
"domestic flight|dəˈmestɪk flaɪt|n.|国内航班|This is a domestic flight.|这是国内航班。",
"duty-free|ˌdjuːti ˈfriː|adj.|免税的|The shop is duty-free.|商店是免税的。",
"embassy|ˈembəsi|n.|大使馆|Go to the embassy.|去大使馆。",
"excursion|ɪkˈskɜːrʒn|n.|短途旅行|We went on an excursion.|我们去了一次短途旅行。",
"expedition|ˌekspɪˈdɪʃn|n.|探险|The expedition was thrilling.|探险很刺激。",
"ferry|ˈferi|n.|渡轮|We took the ferry.|我们坐了渡轮。",
"flight attendant|flaɪt əˈtendənt|n.|空乘人员|The flight attendant was kind.|空乘人员很友好。",
"front desk|frʌnt desk|n.|前台|Ask at the front desk.|去前台问。",
"guided tour|ˈɡaɪdɪd tʊr|n.|导游团|We joined a guided tour.|我们参加了一个导游团。",
"hostel|ˈhɒstl|n.|青年旅舍|We stayed at a hostel.|我们住在青年旅舍。",
"immigration|ˌɪmɪˈɡreɪʃn|n.|入境处|We passed through immigration.|我们通过了入境处。",
"itinerary|aɪˈtɪnərəri|n.|行程|The itinerary is packed.|行程很满。",
"jet lag|dʒet læɡ|n.|时差反应|I have jet lag.|我有时差反应。",
"landmark|ˈlændmɑːrk|n.|地标|The landmark is famous.|地标很著名。",
"layover|ˈleɪoʊvər|n.|中途停留|We had a layover in Dubai.|我们在迪拜中途停留。",
"luggage|ˈlʌɡɪdʒ|n.|行李|My luggage is heavy.|我的行李很重。",
"motel|moʊˈtel|n.|汽车旅馆|We stayed at a motel.|我们住在汽车旅馆。",
"passport|ˈpɑːspɔːrt|n.|护照|Show your passport.|出示您的护照。",
"reservation|ˌrezərˈveɪʃn|n.|预订|I have a reservation.|我有预订。",
"resort|rɪˈzɔːrt|n.|度假村|The resort is luxurious.|度假村很豪华。",
"room service|ruːm ˈsɜːrvɪs|n.|客房服务|Call room service.|呼叫客房服务。",
"scenic|ˈsiːnɪk|adj.|风景优美的|The route is scenic.|路线风景优美。",
"selfie|ˈselfi|n.|自拍|She took a selfie.|她拍了一张自拍。",
"souvenir|ˌsuːvəˈnɪər|n.|纪念品|I bought a souvenir.|我买了一个纪念品。",
"suite|swiːt|n.|套房|The suite is spacious.|套房很宽敞。",
"terminal|ˈtɜːrmɪnl|n.|航站楼|The terminal is new.|航站楼是新的。",
"tourism|ˈtʊrɪzəm|n.|旅游业|Tourism is growing.|旅游业在增长。",
"tourist|ˈtʊrɪst|n.|游客|The tourist took photos.|游客拍了照片。",
"transfer|ˈtrænsfɜːr|n.|转机|I need a transfer.|我需要转机。",
"travel insurance|ˈtrævl ɪnˈʃʊrəns|n.|旅行保险|Buy travel insurance.|买旅行保险。",
"vacancy|ˈveɪkənsi|n.|空房|Is there a vacancy?|有空房吗？",
"visa|ˈviːzə|n.|签证|I need a visa.|我需要签证。",
"voucher|ˈvaʊtʃər|n.|代金券|Use this voucher.|使用这张代金券。"
  ];
  var cat=WORD_LIBRARY.categories[11];
  var existing=new Set();
  cat.words.forEach(function(w){existing.add(w.word.toLowerCase())});
  var added=0;
  words.forEach(function(line){
    var p=line.split("|");
    if(!existing.has(p[0].toLowerCase())){
      cat.words.push({word:p[0],phonetic:p[1],pos:p[2],chinese:p[3],example:p[4],example_cn:p[5]});
      existing.add(p[0].toLowerCase());
      added++;
    }
  });
  console.log("S12 added: "+added+", total: "+cat.words.length);
})();

