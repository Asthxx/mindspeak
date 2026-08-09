// ============================================================
// 词库扩充第二十一轮 — 阶段12 最终补充
// ============================================================
(function() {
  if (typeof WORD_LIBRARY === 'undefined') return;

  // 阶段12 · 旅游英语 补充（新词）
  var s12 = [
    { word:"accommodate", phonetic:"/əˈkɒmədeɪt/", pos:"v.", chinese:"提供住宿", example:"Hotel accommodates guests.", example_cn:"酒店提供住宿。" },
    { word:"adventure", phonetic:"/ədˈventʃər/", pos:"n.", chinese:"冒险经历", example:"Travel adventure.", example_cn:"旅行冒险。" },
    { word:"affordable", phonetic:"/əˈfɔːrdəbl/", pos:"adj.", chinese:"负担得起的", example:"Affordable hotel.", example_cn:"负担得起的酒店。" },
    { word:"airport", phonetic:"/ˈerpɔːrt/", pos:"n.", chinese:"机场", example:"International airport.", example_cn:"国际机场。" },
    { word:"allocate", phonetic:"/ˈæləkeɪt/", pos:"v.", chinese:"分配", example:"Allocate seats.", example_cn:"分配座位。" },
    { word:"amazing", phonetic:"/əˈmeɪzɪŋ/", pos:"adj.", chinese:"令人惊叹的", example:"Amazing scenery.", example_cn:"令人惊叹的风景。" },
    { word:"ancient", phonetic:"/ˈeɪnʃənt/", pos:"adj.", chinese:"古老的", example:"Ancient temple.", example_cn:"古老的寺庙。" },
    { word:"appreciate", phonetic:"/əˈpriːʃieɪt/", pos:"v.", chinese:"欣赏", example:"Appreciate art.", example_cn:"欣赏艺术。" },
    { word:"arrange", phonetic:"/əˈreɪndʒ/", pos:"v.", chinese:"安排", example:"Arrange tour.", example_cn:"安排旅行。" },
    { word:"atmosphere", phonetic:"/ˈætməsfɪr/", pos:"n.", chinese:"气氛", example:"Local atmosphere.", example_cn:"当地气氛。" },
    { word:"authentic", phonetic:"/ɔːˈθentɪk/", pos:"adj.", chinese:"正宗的", example:"Authentic food.", example_cn:"正宗的食物。" },
    { word:"beautiful", phonetic:"/ˈbjuːtɪfl/", pos:"adj.", chinese:"美丽的", example:"Beautiful landscape.", example_cn:"美丽的风景。" },
    { word:"breathtaking", phonetic:"/ˈbreθteɪkɪŋ/", pos:"adj.", chinese:"壮观的", example:"Breathtaking view.", example_cn:"壮观的景色。" },
    { word:"bustling", phonetic:"/ˈbʌslɪŋ/", pos:"adj.", chinese:"繁忙的", example:"Bustling market.", example_cn:"繁忙的市场。" },
    { word:"catastrophe", phonetic:"/kəˈtæstrəfi/", pos:"n.", chinese:"灾难", example:"Natural catastrophe.", example_cn:"自然灾害。" },
    { word:"charming", phonetic:"/ˈtʃɑːrmɪŋ/", pos:"adj.", chinese:"迷人的", example:"Charming village.", example_cn:"迷人的村庄。" },
    { word:"claustrophobia", phonetic:"/ˌklɔːstrəˈfoʊbiə/", pos:"n.", chinese:"幽闭恐惧症", example:"Suffer from claustrophobia.", example_cn:"患有幽闭恐惧症。" },
    { word:"cultural", phonetic:"/ˈkʌltʃərəl/", pos:"adj.", chinese:"文化的", example:"Cultural heritage.", example_cn:"文化遗产。" },
    { word:"curiosity", phonetic:"/ˌkjʊriˈɒsəti/", pos:"n.", chinese:"好奇心", example:"Satisfy curiosity.", example_cn:"满足好奇心。" },
    { word:"delicious", phonetic:"/dɪˈlɪʃəs/", pos:"adj.", chinese:"美味的", example:"Delicious cuisine.", example_cn:"美味的美食。" },
    { word:"delightful", phonetic:"/dɪˈlaɪtfl/", pos:"adj.", chinese:"令人愉快的", example:"Delightful experience.", example_cn:"令人愉快的经历。" },
    { word:"destiny", phonetic:"/ˈdestɪni/", pos:"n.", chinese:"命运", example:"Travel destiny.", example_cn:"旅行命运。" },
    { word:"discover", phonetic:"/dɪˈskʌvər/", pos:"v.", chinese:"发现", example:"Discover new places.", example_cn:"发现新地方。" },
    { word:"economy", phonetic:"/ɪˈkɒnəmi/", pos:"n.", chinese:"经济", example:"Economy class.", example_cn:"经济舱。" },
    { word:"efficient", phonetic:"/ɪˈfɪʃnt/", pos:"adj.", chinese:"高效的", example:"Efficient service.", example_cn:"高效的服务。" },
    { word:"elegant", phonetic:"/ˈelɪɡənt/", pos:"adj.", chinese:"优雅的", example:"Elegant design.", example_cn:"优雅的设计。" },
    { word:"enchanting", phonetic:"/ɪnˈtʃæntɪŋ/", pos:"adj.", chinese:"迷人的", example:"Enchanting scenery.", example_cn:"迷人的风景。" },
    { word:"endeavor", phonetic:"/ɪnˈdevər/", pos:"n.", chinese:"努力", example:"Travel endeavor.", example_cn:"旅行努力。" },
    { word:"enthusiasm", phonetic:"/ɪnˈθjuːziæzəm/", pos:"n.", chinese:"热情", example:"Show enthusiasm.", example_cn:"表现出热情。" },
    { word:"enthusiastic", phonetic:"/ɪnˌθjuːziˈæstɪk/", pos:"adj.", chinese:"热情的", example:"Enthusiastic guide.", example_cn:"热情的导游。" },
    { word:"exceptional", phonetic:"/ɪkˈsepʃənl/", pos:"adj.", chinese:"杰出的", example:"Exceptional service.", example_cn:"杰出的服务。" },
    { word:"exciting", phonetic:"/ɪkˈsaɪtɪŋ/", pos:"adj.", chinese:"令人兴奋的", example:"Exciting adventure.", example_cn:"令人兴奋的冒险。" },
    { word:"exotic", phonetic:"/ɪɡˈzɒtɪk/", pos:"adj.", chinese:"异国的", example:"Exotic destination.", example_cn:"异国目的地。" },
    { word:"extraordinary", phonetic:"/ɪkˈstrɔːrdneri/", pos:"adj.", chinese:"非凡的", example:"Extraordinary journey.", example_cn:"非凡的旅程。" },
    { word:"fabulous", phonetic:"/ˈfæbjələs/", pos:"adj.", chinese:"极好的", example:"Fabulous view.", example_cn:"极好的景色。" },
    { word:"fascinating", phonetic:"/ˈfæsɪneɪtɪŋ/", pos:"adj.", chinese:"迷人的", example:"Fascinating culture.", example_cn:"迷人的文化。" },
    { word:"festive", phonetic:"/ˈfestɪv/", pos:"adj.", chinese:"节日的", example:"Festive atmosphere.", example_cn:"节日气氛。" },
    { word:"flawless", phonetic:"/ˈflɔːləs/", pos:"adj.", chinese:"完美的", example:"Flawless service.", example_cn:"完美的服务。" },
    { word:"fortunate", phonetic:"/ˈfɔːrtʃənət/", pos:"adj.", chinese:"幸运的", example:"Fortunate experience.", example_cn:"幸运的经历。" },
    { word:"frequent", phonetic:"/ˈfriːkwənt/", pos:"adj.", chinese:"频繁的", example:"Frequent flights.", example_cn:"频繁的航班。" },
    { word:"friendly", phonetic:"/ˈfrendli/", pos:"adj.", chinese:"友好的", example:"Friendly locals.", example_cn:"友好的当地人。" },
    { word:"frustrating", phonetic:"/ˈfrʌstreɪtɪŋ/", pos:"adj.", chinese:"令人沮丧的", example:"Frustrating delay.", example_cn:"令人沮丧的延误。" },
    { word:"generous", phonetic:"/ˈdʒenərəs/", pos:"adj.", chinese:"慷慨的", example:"Generous tips.", example_cn:"慷慨的小费。" },
    { word:"genuine", phonetic:"/ˈdʒenjuɪn/", pos:"adj.", chinese:"真正的", example:"Genuine hospitality.", example_cn:"真正的热情好客。" },
    { word:"gorgeous", phonetic:"/ˈɡɔːrdʒəs/", pos:"adj.", chinese:"华丽的", example:"Gorgeous sunset.", example_cn:"华丽的日落。" },
    { word:"graceful", phonetic:"/ˈɡreɪsfl/", pos:"adj.", chinese:"优雅的", example:"Graceful dance.", example_cn:"优雅的舞蹈。" },
    { word:"historic", phonetic:"/hɪˈstɒrɪk/", pos:"adj.", chinese:"历史性的", example:"Historic monument.", example_cn:"历史性的纪念碑。" },
    { word:"hospitable", phonetic:"/hɒˈspɪtəbl/", pos:"adj.", chinese:"好客的", example:"Hospitable people.", example_cn:"好客的人们。" },
    { word:"impressive", phonetic:"/ɪmˈpresɪv/", pos:"adj.", chinese:"令人印象深刻的", example:"Impressive architecture.", example_cn:"令人印象深刻的建筑。" },
    { word:"incredible", phonetic:"/ɪnˈkredəbl/", pos:"adj.", chinese:"难以置信的", example:"Incredible journey.", example_cn:"难以置信的旅程。" },
    { word:"independent", phonetic:"/ˌɪndɪˈpendənt/", pos:"adj.", chinese:"独立的", example:"Independent travel.", example_cn:"独立旅行。" },
    { word:"influential", phonetic:"/ˌɪnfluˈenʃl/", pos:"adj.", chinese:"有影响力的", example:"Influential guide.", example_cn:"有影响力的导游。" },
    { word:"intimidating", phonetic:"/ɪnˈtɪmɪdeɪtɪŋ/", pos:"adj.", chinese:"令人生畏的", example:"Intimidating crowd.", example_cn:"令人生畏的人群。" },
    { word:"inviting", phonetic:"/ɪnˈvaɪtɪŋ/", pos:"adj.", chinese:"诱人的", example:"Inviting destination.", example_cn:"诱人的目的地。" },
    { word:"luxurious", phonetic:"/lʌɡˈʒʊəriəs/", pos:"adj.", chinese:"豪华的", example:"Luxurious hotel.", example_cn:"豪华的酒店。" },
    { word:"majestic", phonetic:"/məˈdʒestɪk/", pos:"adj.", chinese:"壮丽的", example:"Majestic mountains.", example_cn:"壮丽的山脉。" },
    { word:"memorable", phonetic:"/ˈmemərəbl/", pos:"adj.", chinese:"难忘的", example:"Memorable trip.", example_cn:"难忘的旅行。" },
    { word:"miserable", phonetic:"/ˈmɪzərəbl/", pos:"adj.", chinese:"悲惨的", example:"Miserable weather.", example_cn:"糟糕的天气。" },
    { word:"monumental", phonetic:"/ˌmɒnjuˈmentl/", pos:"adj.", chinese:"巨大的", example:"Monumental achievement.", example_cn:"巨大的成就。" },
    { word:"mysterious", phonetic:"/mɪˈstɪəriəs/", pos:"adj.", chinese:"神秘的", example:"Mysterious place.", example_cn:"神秘的地方。" },
    { word:"narrow", phonetic:"/ˈnæroʊ/", pos:"adj.", chinese:"狭窄的", example:"Narrow streets.", example_cn:"狭窄的街道。" },
    { word:"negligible", phonetic:"/ˈneɡlɪdʒəbl/", pos:"adj.", chinese:"可忽略的", example:"Negligible cost.", example_cn:"可忽略的成本。" },
    { word:"numerous", phonetic:"/ˈnjuːmərəs/", pos:"adj.", chinese:"众多的", example:"Numerous attractions.", example_cn:"众多的景点。" },
    { word:"outstanding", phonetic:"/aʊtˈstændɪŋ/", pos:"adj.", chinese:"杰出的", example:"Outstanding service.", example_cn:"杰出的服务。" },
    { word:"overwhelming", phonetic:"/ˌoʊvərˈwelmɪŋ/", pos:"adj.", chinese:"压倒性的", example:"Overwhelming beauty.", example_cn:"压倒性的美丽。" },
    { word:"peaceful", phonetic:"/ˈpiːsfl/", pos:"adj.", chinese:"和平的", example:"Peaceful retreat.", example_cn:"和平的度假地。" },
    { word:"picturesque", phonetic:"/ˌpɪktʃəˈresk/", pos:"adj.", chinese:"如画的", example:"Picturesque village.", example_cn:"如画的村庄。" },
    { word:"pleasant", phonetic:"/ˈpleznt/", pos:"adj.", chinese:"愉快的", example:"Pleasant stay.", example_cn:"愉快的住宿。" },
    { word:"popular", phonetic:"/ˈpɒpjələr/", pos:"adj.", chinese:"受欢迎的", example:"Popular destination.", example_cn:"受欢迎的目的地。" },
    { word:"prestigious", phonetic:"/preˈstɪdʒəs/", pos:"adj.", chinese:"有声望的", example:"Prestigious hotel.", example_cn:"有声望的酒店。" },
    { word:"professional", phonetic:"/prəˈfeʃənl/", pos:"adj.", chinese:"专业的", example:"Professional guide.", example_cn:"专业的导游。" },
    { word:"refreshing", phonetic:"/rɪˈfreʃɪŋ/", pos:"adj.", chinese:"令人耳目一新的", example:"Refreshing change.", example_cn:"令人耳目一新的变化。" },
    { word:"relaxing", phonetic:"/rɪˈlæksɪŋ/", pos:"adj.", chinese:"令人放松的", example:"Relaxing vacation.", example_cn:"令人放松的假期。" },
    { word:"remarkable", phonetic:"/rɪˈmɑːrkəbl/", pos:"adj.", chinese:"非凡的", example:"Remarkable journey.", example_cn:"非凡的旅程。" },
    { word:"responsible", phonetic:"/rɪˈspɒnsəbl/", pos:"adj.", chinese:"负责的", example:"Responsible tourism.", example_cn:"负责任的旅游。" },
    { word:"romantic", phonetic:"/roʊˈmæntɪk/", pos:"adj.", chinese:"浪漫的", example:"Romantic getaway.", example_cn:"浪漫的旅行。" },
    { word:"scenic", phonetic:"/ˈsiːnɪk/", pos:"adj.", chinese:"风景优美的", example:"Scenic drive.", example_cn:"风景优美的驾车路线。" },
    { word:"serene", phonetic:"/səˈriːn/", pos:"adj.", chinese:"宁静的", example:"Serene environment.", example_cn:"宁静的环境。" },
    { word:"spectacular", phonetic:"/spekˈtækjələr/", pos:"adj.", chinese:"壮观的", example:"Spectacular waterfall.", example_cn:"壮观的瀑布。" },
    { word:"stunning", phonetic:"/ˈstʌnɪŋ/", pos:"adj.", chinese:"极好的", example:"Stunning views.", example_cn:"极好的景色。" },
    { word:"successful", phonetic:"/səkˈsesfl/", pos:"adj.", chinese:"成功的", example:"Successful trip.", example_cn:"成功的旅行。" },
    { word:"sufficient", phonetic:"/səˈfɪʃnt/", pos:"adj.", chinese:"足够的", example:"Sufficient time.", example_cn:"足够的时间。" },
    { word:"surprising", phonetic:"/sərˈpraɪzɪŋ/", pos:"adj.", chinese:"令人惊讶的", example:"Surprising discovery.", example_cn:"令人惊讶的发现。" },
    { word:"tantalizing", phonetic:"/ˈtæntəlaɪzɪŋ/", pos:"adj.", chinese:"诱人的", example:"Tantalizing food.", example_cn:"诱人的食物。" },
    { word:"terrific", phonetic:"/təˈrɪfɪk/", pos:"adj.", chinese:"极好的", example:"Terrific experience.", example_cn:"极好的经历。" },
    { word:"thrilling", phonetic:"/ˈθrɪlɪŋ/", pos:"adj.", chinese:"令人激动的", example:"Thrilling adventure.", example_cn:"令人激动的冒险。" },
    { word:"tranquil", phonetic:"/ˈtræŋkwɪl/", pos:"adj.", chinese:"宁静的", example:"Tranquil setting.", example_cn:"宁静的环境。" },
    { word:"unforgettable", phonetic:"/ˌʌnfərˈɡetəbl/", pos:"adj.", chinese:"难忘的", example:"Unforgettable moment.", example_cn:"难忘的时刻。" },
    { word:"vibrant", phonetic:"/ˈvaɪbrənt/", pos:"adj.", chinese:"充满活力的", example:"Vibrant city.", example_cn:"充满活力的城市。" },
    { word:"wonderful", phonetic:"/ˈwʌndərfl/", pos:"adj.", chinese:"精彩的", example:"Wonderful time.", example_cn:"精彩的时光。" },
    { word:"bizarre", phonetic:"/bɪˈzɑːr/", pos:"adj.", chinese:"奇异的", example:"Bizarre experience.", example_cn:"奇异的经历。" },
    { word:"charismatic", phonetic:"/ˌkærɪzˈmætɪk/", pos:"adj.", chinese:"有魅力的", example:"Charismatic leader.", example_cn:"有魅力的领导者。" },
    { word:"cosmopolitan", phonetic:"/ˌkɒzməˈpɒlɪtən/", pos:"adj.", chinese:"国际化的", example:"Cosmopolitan city.", example_cn:"国际化的城市。" },
    { word:"culinary", phonetic:"/ˈkʌlɪneri/", pos:"adj.", chinese:"烹饪的", example:"Culinary experience.", example_cn:"烹饪体验。" },
    { word:"diverse", phonetic:"/daɪˈvɜːrs/", pos:"adj.", chinese:"多样的", example:"Diverse culture.", example_cn:"多样的文化。" },
    { word:"eclectic", phonetic:"/ɪˈklektɪk/", pos:"adj.", chinese:"折中的", example:"Eclectic mix.", example_cn:"折中的混合。" },
    { word:"enlightening", phonetic:"/ɪnˈlaɪtnɪŋ/", pos:"adj.", chinese:"有启发性的", example:"Enlightening tour.", example_cn:"有启发性的旅行。" },
    { word:"enticing", phonetic:"/ɪnˈtaɪsɪŋ/", pos:"adj.", chinese:"诱人的", example:"Enticing menu.", example_cn:"诱人的菜单。" },
    { word:"epic", phonetic:"/ˈepɪk/", pos:"adj.", chinese:"史诗般的", example:"Epic journey.", example_cn:"史诗般的旅程。" },
    { word:"exquisite", phonetic:"/ɪkˈskwɪzɪt/", pos:"adj.", chinese:"精美的", example:"Exquisite art.", example_cn:"精美的艺术。" },
    { word:"formidable", phonetic:"/ˈfɔːrmɪdəbl/", pos:"adj.", chinese:"令人敬畏的", example:"Formidable challenge.", example_cn:"令人敬畏的挑战。" },
    { word:"humble", phonetic:"/ˈhʌmbl/", pos:"adj.", chinese:"谦逊的", example:"Humble beginnings.", example_cn:"谦逊的开始。" },
    { word:"idyllic", phonetic:"/aɪˈdɪlɪk/", pos:"adj.", chinese:"田园诗般的", example:"Idyllic setting.", example_cn:"田园诗般的环境。" },
    { word:"impeccable", phonetic:"/ɪmˈpekəbl/", pos:"adj.", chinese:"完美的", example:"Impeccable service.", example_cn:"完美的服务。" },
    { word:"incandescent", phonetic:"/ˌɪnkænˈdesnt/", pos:"adj.", chinese:"明亮的", example:"Incandescent light.", example_cn:"明亮的灯光。" },
    { word:"magnificent", phonetic:"/mæɡˈnɪfɪsnt/", pos:"adj.", chinese:"壮丽的", example:"Magnificent palace.", example_cn:"壮丽的宫殿。" },
    { word:"meticulous", phonetic:"/məˈtɪkjələs/", pos:"adj.", chinese:"细致的", example:"Meticulous planning.", example_cn:"细致的计划。" },
    { word:"phenomenal", phonetic:"/fəˈnɒmɪnl/", pos:"adj.", chinese:"非凡的", example:"Phenomenal growth.", example_cn:"非凡的增长。" },
    { word:"pristine", phonetic:"/ˈprɪstiːn/", pos:"adj.", chinese:"原始的", example:"Pristine beaches.", example_cn:"原始的海滩。" },
    { word:"sublime", phonetic:"/səˈblaɪm/", pos:"adj.", chinese:"崇高的", example:"Sublime beauty.", example_cn:"崇高的美。" },
    { word:"surreal", phonetic:"/səˈriːəl/", pos:"adj.", chinese:"超现实的", example:"Surreal experience.", example_cn:"超现实的经历。" },
    { word:"timeless", phonetic:"/ˈtaɪmləs/", pos:"adj.", chinese:"永恒的", example:"Timeless beauty.", example_cn:"永恒的美。" },
    { word:"utmost", phonetic:"/ˈʌtmoʊst/", pos:"adj.", chinese:"极度的", example:"Utmost care.", example_cn:"极度的小心。" },
    { word:"whimsical", phonetic:"/ˈwɪmzɪkl/", pos:"adj.", chinese:"异想天开的", example:"Whimsical design.", example_cn:"异想天开的设计。" },
    { word:"wondrous", phonetic:"/ˈwʌndərəs/", pos:"adj.", chinese:"奇妙的", example:"Wondrous experience.", example_cn:"奇妙的经历。" }
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
