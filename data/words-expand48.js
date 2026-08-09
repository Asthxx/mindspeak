(function(){
  if(typeof WORD_LIBRARY==="undefined") return;
  var words=[
"airplane|ˈerpleɪn|n.|飞机|The airplane flies high.|飞机飞得很高。",
"alarm|əˈlɑːrm|n.|闹钟|Set the alarm for six.|把闹钟设到六点。",
"alligator|ˈælɪɡeɪtər|n.|鳄鱼|The alligator swims.|鳄鱼在游泳。",
"anchor|ˈæŋkər|n.|锚|The ship dropped anchor.|船抛了锚。",
"apron|ˈeɪprən|n.|围裙|She wears an apron.|她穿着围裙。",
"arrow|ˈæroʊ|n.|箭|He shot an arrow.|他射了一支箭。",
"attic|ˈætɪk|n.|阁楼|The attic is dusty.|阁楼积满了灰尘。",
"backpack|ˈbækpæk|n.|背包|He carries a backpack.|他背着背包。",
"badge|bædʒ|n.|徽章|He earned a badge.|他 earned 了一个徽章。",
"barn|bɑːrn|n.|谷仓|The barn is old.|谷仓很旧。",
"basement|ˈbeɪsmənt|n.|地下室|The basement is dark.|地下室很暗。",
"beast|biːst|n.|野兽|The beast is wild.|野兽很凶猛。",
"blouse|blaʊz|n.|衬衫|She wears a blouse.|她穿着衬衫。",
"booth|buːθ|n.|摊位|The booth is small.|摊位很小。",
"bow|baʊ|n.|弓|He drew the bow.|他拉开了弓。",
"bracelet|ˈbreɪslət|n.|手镯|She wears a bracelet.|她戴着手镯。",
"brake|breɪk|n.|刹车|Press the brake.|踩刹车。",
"branch|brɑːntʃ|n.|树枝|The branch is long.|树枝很长。",
"brick|brɪk|n.|砖头|The wall is made of brick.|墙是砖砌的。",
"bullet|ˈbʊlɪt|n.|子弹|The bullet flew past.|子弹飞过。",
"cabin|ˈkæbɪn|n.|小屋|The cabin is cozy.|小屋很舒适。",
"cactus|ˈkæktəs|n.|仙人掌|The cactus has spines.|仙人掌有刺。",
"cannon|ˈkænən|n.|大炮|The cannon fired.|大炮开火了。",
"cape|keɪp|n.|披风|He wears a cape.|他穿着披风。",
"carpet|ˈkɑːrpɪt|n.|地毯|The carpet is soft.|地毯很软。",
"cellar|ˈselər|n.|地窖|The wine is in the cellar.|酒在地窖里。",
"chimney|ˈtʃɪmni|n.|烟囱|Smoke rises from the chimney.|烟从烟囱升起。",
"claw|klɔː|n.|爪子|The cat has sharp claws.|猫有锋利的爪子。",
"cliff|klɪf|n.|悬崖|The cliff is steep.|悬崖很陡。",
"coal|koʊl|n.|煤炭|Coal burns hot.|煤炭烧得很热。",
"cobweb|ˈkɒbweb|n.|蜘蛛网|The cobweb is in the corner.|蜘蛛网在角落里。",
"compass|ˈkʌmpəs|n.|指南针|Use the compass.|用指南针。",
"cork|kɔːrk|n.|软木塞|Pull the cork.|拔出软木塞。",
"corn|kɔːrn|n.|玉米|Corn is yellow.|玉米是黄色的。",
"cowboy|ˈkaʊbɔɪ|n.|牛仔|The cowboy rides a horse.|牛仔骑马。",
"cradle|ˈkreɪdl|n.|摇篮|The baby sleeps in the cradle.|婴儿睡在摇篮里。",
"crane|kreɪn|n.|起重机|The crane lifts heavy things.|起重机吊起重物。",
"crew|kruː|n.|船员|The crew works hard.|船员工作很努力。",
"cushion|ˈkʊʃn|n.|垫子|Sit on the cushion.|坐在垫子上。",
"dagger|ˈdæɡər|n.|匕首|He carries a dagger.|他带着一把匕首。",
"dawn|dɔːn|n.|黎明|Dawn is beautiful.|黎明很美。",
"dragon|ˈdræɡən|n.|龙|The dragon breathes fire.|龙喷火。",
"dusk|dʌsk|n.|黄昏|Dusk is peaceful.|黄昏很宁静。",
"eel|iːl|n.|鳗鱼|The eel is slippery.|鳗鱼很滑。",
"fence|fens|n.|围栏|The fence is tall.|围栏很高。",
"fever|ˈfiːvər|n.|发烧|He has a fever.|他在发烧。",
"flea|fliː|n.|跳蚤|The dog has fleas.|狗有跳蚤。",
"fountain|ˈfaʊntən|n.|喷泉|The fountain is beautiful.|喷泉很美。",
"garage|ɡəˈrɑːʒ|n.|车库|Park in the garage.|停在车库里。",
"garbage|ˈɡɑːrbɪdʒ|n.|垃圾|Take out the garbage.|把垃圾拿出去。",
"glacier|ˈɡlæʃər|n.|冰川|The glacier is melting.|冰川在融化。",
"glove|ɡlʌv|n.|手套|Wear your gloves.|戴上手套。",
"gravel|ˈɡrævl|n.|碎石|The path is gravel.|小路是碎石铺的。",
"hammer|ˈhæmər|n.|锤子|Hit it with a hammer.|用锤子敲。",
"harbor|ˈhɑːrbər|n.|港口|The ship is in the harbor.|船在港口里。",
"harp|hɑːrp|n.|竖琴|She plays the harp.|她弹竖琴。",
"hawk|hɔːk|n.|鹰|The hawk hunts mice.|鹰捕食老鼠。",
"hay|heɪ|n.|干草|The horse eats hay.|马吃干草。",
"hood|hʊd|n.|兜帽|Put up your hood.|戴上兜帽。",
"hook|hʊk|n.|钩子|Hang it on the hook.|把它挂在钩子上。",
"horn|hɔːrn|n.|角|The bull has horns.|公牛有角。",
"hose|hoʊz|n.|水管|Water the garden with a hose.|用水管浇花园。",
"igloo|ˈɪɡluː|n.|冰屋|The igloo is made of ice.|冰屋是用冰做的。",
"ivy|ˈaɪvi|n.|常春藤|Ivy grows on the wall.|常春藤长在墙上。",
"jail|dʒeɪl|n.|监狱|He went to jail.|他进了监狱。",
"kettle|ˈketl|n.|水壶|Boil the kettle.|烧水壶。",
"keyhole|ˈkiːhoʊl|n.|钥匙孔|Look through the keyhole.|透过钥匙孔看。",
"lantern|ˈlæntərn|n.|灯笼|Light the lantern.|点亮灯笼。",
"leather|ˈleðər|n.|皮革|The jacket is leather.|夹克是皮的。",
"lid|lɪd|n.|盖子|Put the lid on.|盖上盖子。",
"loaf|loʊf|n.|一条面包|A loaf of bread.|一条面包。",
"log|lɒɡ|n.|原木|The log is heavy.|原木很重。",
"magnet|ˈmæɡnət|n.|磁铁|The magnet attracts metal.|磁铁吸引金属。",
"maple|ˈmeɪpl|n.|枫树|The maple tree is tall.|枫树很高。",
"marsh|mɑːrʃ|n.|沼泽|The marsh is wet.|沼泽很湿。",
"mask|mæsk|n.|面具|He wears a mask.|他戴着面具。",
"meadow|ˈmedoʊ|n.|草地|The meadow is green.|草地很绿。",
"moat|moʊt|n.|护城河|The castle has a moat.|城堡有护城河。",
"oak|oʊk|n.|橡树|The oak is old.|橡树很老。",
"pearl|pɜːrl|n.|珍珠|The pearl is round.|珍珠是圆的。",
"pebble|ˈpebl|n.|鹅卵石|The pebble is smooth.|鹅卵石很光滑。",
"pine|paɪn|n.|松树|The pine tree is tall.|松树很高。",
"pipe|paɪp|n.|管子|Water flows through the pipe.|水流过管子。",
"pistol|ˈpɪstl|n.|手枪|He fired the pistol.|他开了枪。",
"pitcher|ˈpɪtʃər|n.|投手|The pitcher threw the ball.|投手投了球。",
"plank|plæŋk|n.|木板|The plank is wide.|木板很宽。",
"plow|plaʊ|n.|犁|The farmer uses a plow.|农民用犁。",
"plug|plʌɡ|n.|插头|Plug it in.|插上插头。",
"pony|ˈpoʊni|n.|小马|The pony is cute.|小马很可爱。",
"pool|puːl|n.|水塘|Swim in the pool.|在水塘里游泳。",
"porch|pɔːrtʃ|n.|门廊|Sit on the porch.|坐在门廊上。",
"puddle|ˈpʌdl|n.|水坑|Jump in the puddle.|跳进水坑里。",
"pumpkin|ˈpʌmpkɪn|n.|南瓜|The pumpkin is orange.|南瓜是橙色的。",
"puzzle|ˈpʌzl|n.|拼图|Solve the puzzle.|解拼图。",
"quilt|kwɪlt|n.|被子|The quilt is warm.|被子很暖和。",
"raft|rɑːft|n.|木筏|They floated on a raft.|他们乘木筏漂流。",
"rake|reɪk|n.|耙子|Rake the leaves.|耙树叶。",
"raven|ˈreɪvn|n.|乌鸦|The raven is black.|乌鸦是黑色的。",
"ribbon|ˈrɪbən|n.|丝带|The ribbon is red.|丝带是红色的。",
"scarecrow|ˈskerkroʊ|n.|稻草人|The scarecrow stands in the field.|稻草人站在田里。",
"shell|ʃel|n.|贝壳|Collect shells on the beach.|在海滩上捡贝壳。",
"shield|ʃiːld|n.|盾牌|He holds a shield.|他拿着盾牌。",
"shore|ʃɔːr|n.|岸边|Walk along the shore.|沿着岸边走。",
"shovel|ˈʃʌvl|n.|铲子|Dig with a shovel.|用铲子挖。",
"silk|sɪlk|n.|丝绸|The scarf is silk.|围巾是丝绸的。",
"skull|skʌl|n.|头骨|The skull is white.|头骨是白色的。",
"sled|sled|n.|雪橇|Ride a sled.|坐雪橇。",
"spear|spɪər|n.|矛|He threw the spear.|他投了矛。",
"sponge|spʌndʒ|n.|海绵|Clean with a sponge.|用海绵擦。",
"statue|ˈstætʃuː|n.|雕像|The statue is tall.|雕像很高。",
"straw|strɔː|n.|稻草|The roof is made of straw.|屋顶是稻草做的。",
"string|strɪŋ|n.|线|Tie it with string.|用线绑。",
"suitcase|ˈsuːtkeɪs|n.|手提箱|Pack the suitcase.|收拾手提箱。",
"sword|sɔːrd|n.|剑|He draws the sword.|他拔出剑。",
"thread|θred|n.|线|Thread the needle.|穿针。",
"throne|θroʊn|n.|王座|The king sits on the throne.|国王坐在王座上。",
"torch|tɔːrtʃ|n.|火炬|Light the torch.|点燃火炬。",
"tribe|traɪb|n.|部落|The tribe is ancient.|部落很古老。",
"trunk|trʌŋk|n.|树干|The trunk is thick.|树干很粗。",
"tunnel|ˈtʌnl|n.|隧道|The tunnel is dark.|隧道很暗。",
"veil|veɪl|n.|面纱|She wears a veil.|她戴着面纱。",
"vine|vaɪn|n.|藤蔓|The vine grows fast.|藤蔓长得很快。",
"volcano|vɒlˈkeɪnoʊ|n.|火山|The volcano erupted.|火山爆发了。",
"wagon|ˈwæɡən|n.|马车|The wagon is full.|马车装满了。",
"wallet|ˈwɒlɪt|n.|钱包|He lost his wallet.|他丢了钱包。",
"wand|wɒnd|n.|魔杖|The wizard waves his wand.|巫师挥动魔杖。",
"web|web|n.|网|The spider spins a web.|蜘蛛织网。",
"well|wel|n.|井|Draw water from the well.|从井里打水。"
  ];
  var cat=WORD_LIBRARY.categories[1];
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
  console.log("S2 added: "+added+", total: "+cat.words.length);
})();

(function(){
  if(typeof WORD_LIBRARY==="undefined") return;
  var words=[
"absorb|əbˈzɔːrb|v.|吸收|The sponge absorbs water.|海绵吸收水分。",
"abundant|əˈbʌndənt|adj.|丰富的|There are abundant resources.|资源丰富。",
"accomplish|əˈkɒmplɪʃ|v.|完成|He accomplished his goal.|他完成了目标。",
"adolescent|ˌædəˈlesnt|n.|青少年|The adolescent is growing.|青少年在成长。",
"affection|əˈfekʃn|n.|感情|She has deep affection for him.|她对他有深厚的感情。",
"attractive|əˈtræktɪv|adj.|有吸引力的|She is attractive.|她很有魅力。",
"awkward|ˈɔːkwərd|adj.|尴尬的|The silence was awkward.|沉默很尴尬。",
"bachelor|ˈbætʃələr|n.|学士|He has a bachelor's degree.|他有学士学位。",
"bargain|ˈbɑːrɡən|n.|便宜货|It was a bargain.|这是便宜货。",
"beloved|bɪˈlʌvɪd|adj.|心爱的|She is his beloved wife.|她是他心爱的妻子。",
"betray|bɪˈtreɪ|v.|背叛|He betrayed his friend.|他背叛了朋友。",
"blast|blɑːst|n.|爆炸|The blast was loud.|爆炸声很大。",
"blend|blend|v.|混合|Blend the ingredients.|混合原料。",
"bold|boʊld|adj.|大胆的|He is a bold leader.|他是一个大胆的领导者。",
"border|ˈbɔːrdər|n.|边界|Cross the border.|穿越边界。",
"bounce|baʊns|v.|弹跳|The ball bounced.|球弹了起来。",
"breed|briːd|v.|繁殖|They breed horses.|他们养马。",
"candidate|ˈkændɪdət|n.|候选人|He is a candidate.|他是候选人。",
"casual|ˈkæʒuəl|adj.|随意的|He wore casual clothes.|他穿着休闲装。",
"cemetery|ˈseməteri|n.|墓地|The cemetery is quiet.|墓地很安静。",
"ceremony|ˈserəmoʊni|n.|仪式|The ceremony was beautiful.|仪式很美。",
"chaos|ˈkeɪɒs|n.|混乱|The room was in chaos.|房间一片混乱。",
"charming|ˈtʃɑːrmɪŋ|adj.|迷人的|She is charming.|她很迷人。",
"cheat|tʃiːt|v.|作弊|Don't cheat.|不要作弊。",
"cheerful|ˈtʃɪrfl|adj.|快乐的|She is cheerful.|她很快乐。",
"cherish|ˈtʃerɪʃ|v.|珍惜|Cherish your friends.|珍惜你的朋友。",
"clever|ˈklevər|adj.|聪明的|She is clever.|她很聪明。",
"colony|ˈkɒləni|n.|殖民地|The colony declared independence.|殖民地宣布独立。",
"combat|ˈkɒmbæt|n.|战斗|He was in combat.|他参加了战斗。",
"companion|kəmˈpæniən|n.|同伴|She is my companion.|她是我的同伴。",
"comparison|kəmˈpærɪsn|n.|比较|Make a comparison.|做一个比较。",
"complaint|kəmˈpleɪnt|n.|抱怨|He filed a complaint.|他提出了投诉。",
"conscience|ˈkɒnʃəns|n.|良心|His conscience is clear.|他的良心是清白的。",
"considerate|kənˈsɪdərət|adj.|体贴的|She is considerate.|她很体贴。",
"contemporary|kənˈtempərəri|adj.|当代的|This is contemporary art.|这是当代艺术。",
"contrast|ˈkɒntrɑːst|n.|对比|There is a sharp contrast.|有鲜明的对比。",
"cultivate|ˈkʌltɪveɪt|v.|培养|We should cultivate good habits.|我们应该培养好习惯。",
"deceive|dɪˈsiːv|v.|欺骗|He deceived everyone.|他欺骗了所有人。",
"decent|ˈdiːsnt|adj.|体面的|He is a decent person.|他是一个体面的人。",
"decorate|ˈdekəreɪt|v.|装饰|They decorated the room.|他们装饰了房间。",
"depart|dɪˈpɑːrt|v.|出发|The train departs at noon.|火车中午出发。",
"depression|dɪˈpreʃn|n.|抑郁症|He has depression.|他有抑郁症。",
"desperate|ˈdespərət|adj.|绝望的|The situation is desperate.|情况很绝望。",
"dignity|ˈdɪɡnəti|n.|尊严|He has dignity.|他有尊严。",
"dilemma|dɪˈlemə|n.|困境|He faces a dilemma.|他面临困境。",
"disaster|dɪˈzɑːstər|n.|灾难|The earthquake was a disaster.|地震是一场灾难。",
"disguise|dɪsˈɡaɪz|v.|伪装|He disguised himself.|他伪装了自己。",
"dispute|dɪˈspjuːt|n.|争端|There is a dispute.|有争端。",
"distant|ˈdɪstənt|adj.|遥远的|The star is distant.|星星很遥远。",
"diverse|daɪˈvɜːrs|adj.|多样的|The population is diverse.|人口很多样化。",
"dominate|ˈdɒmɪneɪt|v.|支配|He dominates the conversation.|他 dominates 对话。",
"dread|dred|v.|害怕|I dread the exam.|我害怕考试。",
"durable|ˈdjʊrəbl|adj.|耐用的|The material is durable.|材料很耐用。",
"dynamic|daɪˈnæmɪk|adj.|有活力的|He is dynamic.|他充满活力。"
  ];
  var cat=WORD_LIBRARY.categories[2];
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
  console.log("S3 added: "+added+", total: "+cat.words.length);
})();

(function(){
  if(typeof WORD_LIBRARY==="undefined") return;
  var words=[
"accessible|əkˈsesəbl|adj.|可进入的|The building is accessible.|建筑可以进入。",
"accommodate|əˈkɒmədeɪt|v.|容纳|The hotel accommodates guests.|酒店接待客人。",
"affect|əˈfekt|v.|影响|The policy affects everyone.|政策影响了每个人。",
"afford|əˈfɔːrd|v.|买得起|I cannot afford it.|我买不起。",
"amid|əˈmɪd|prep.|在...之中|Amid the chaos, he stayed calm.|在混乱中他保持冷静。",
"available|əˈveɪləbl|adj.|可用的|The service is available.|服务可用。",
"bond|bɒnd|n.|纽带|They have a strong bond.|他们有牢固的纽带。",
"broad|brɔːd|adj.|广泛的|He has broad interests.|他有广泛的兴趣。",
"budget|ˈbʌdʒɪt|n.|预算|We need to cut the budget.|我们需要削减预算。",
"burden|ˈbɜːrdn|n.|负担|The tax is a burden.|税收是一种负担。",
"challenge|ˈtʃælɪndʒ|n.|挑战|This is a big challenge.|这是一个大挑战。",
"command|kəˈmænd|v.|命令|The officer commanded the soldiers.|军官命令士兵。",
"comment|ˈkɒment|n.|评论|He made a comment.|他发表了评论。",
"community|kəˈmjuːnəti|n.|社区|The community is close-knit.|社区关系紧密。",
"compare|kəmˈper|v.|比较|Compare the two options.|比较两个选项。",
"compete|kəmˈpiːt|v.|竞争|They compete for the prize.|他们竞争奖品。",
"comprehend|ˌkɒmprɪˈhend|v.|理解|I cannot comprehend this.|我无法理解这个。",
"comprise|kəmˈpraɪz|v.|包含|The team comprises ten members.|团队由十名成员组成。",
"conclude|kənˈkluːd|v.|得出结论|We concluded the meeting.|我们结束了会议。",
"consist|kənˈsɪst|v.|由...组成|The team consists of experts.|团队由专家组成。",
"contain|kənˈteɪn|v.|包含|The box contains books.|盒子里有书。",
"convenient|kənˈviːniənt|adj.|方便的|The location is convenient.|位置很方便。",
"curiosity|ˌkjʊriˈɒsəti|n.|好奇心|Children have curiosity.|孩子们有好奇心。",
"deadline|ˈdedlaɪn|n.|截止日期|The deadline is tomorrow.|截止日期是明天。",
"defend|dɪˈfend|v.|保卫|They defended their country.|他们保卫了国家。",
"delay|dɪˈleɪ|v.|延迟|The flight was delayed.|航班延误了。",
"depend|dɪˈpend|v.|取决于|It depends on the weather.|这取决于天气。",
"describe|dɪˈskraɪb|v.|描述|Describe what you saw.|描述你看到的。",
"desert|ˈdezərt|n.|沙漠|The desert is hot.|沙漠很热。",
"design|dɪˈzaɪn|v.|设计|She designed a beautiful dress.|她设计了一件漂亮的裙子。",
"desire|dɪˈzaɪər|n.|欲望|He has a strong desire to learn.|他有强烈的学习欲望。",
"destroy|dɪˈstrɔɪ|v.|摧毁|The fire destroyed the building.|大火摧毁了建筑。",
"determine|dɪˈtɜːrmɪn|v.|确定|We need to determine the cause.|我们需要确定原因。",
"develop|dɪˈveləp|v.|发展|The city is developing rapidly.|城市发展迅速。",
"differ|ˈdɪfər|v.|不同|Opinions differ.|意见不同。",
"discard|dɪˈskɑːrd|v.|丢弃|He discarded the old clothes.|他丢弃了旧衣服。",
"discover|dɪˈskʌvər|v.|发现|She discovered a new species.|她发现了一个新物种。",
"disorder|dɪˈsɔːrdər|n.|疾病|He has a disorder.|他有疾病。",
"display|dɪˈspleɪ|v.|展示|The museum displays art.|博物馆展示艺术。",
"disturb|dɪˈstɜːrb|v.|打扰|Please do not disturb.|请勿打扰。",
"divine|dɪˈvaɪn|adj.|神圣的；神的；非凡的|The music is divine.|音乐很美妙。",
"doubt|daʊt|n.|怀疑|There is no doubt.|毫无疑问。",
"drought|draʊt|n.|干旱|The drought lasted months.|干旱持续了数月。"
  ];
  var cat=WORD_LIBRARY.categories[4];
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
  console.log("S5 added: "+added+", total: "+cat.words.length);
})();

