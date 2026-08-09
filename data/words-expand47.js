// words-expand47.js — S1 初学英语扩充
(function(){
  if(typeof WORD_LIBRARY==="undefined") return;
  var words=[
"airplane|/ˈerpleɪn/|n.|飞机|The airplane is fast.|飞机很快。",
"alligator|/ˈælɪɡeɪtər/|n.|鳄鱼|The alligator swims.|鳄鱼在游泳。",
"apartment|/əˈpɑːrtmənt/|n.|公寓|She lives in an apartment.|她住在公寓里。",
"backpack|/ˈbækpæk/|n.|背包|He carries a backpack.|他背着背包。",
"bathroom|/ˈbæθruːm/|n.|浴室|The bathroom is clean.|浴室很干净。",
"beautiful|/ˈbjuːtɪfl/|adj.|美丽的|The flower is beautiful.|花很美丽。",
"blanket|/ˈblæŋkɪt/|n.|毯子|The blanket is warm.|毯子很暖和。",
"breakfast|/ˈbrekfəst/|n.|早餐|I eat breakfast at seven.|我七点吃早餐。",
"butterfly|/ˈbʌtərflaɪ/|n.|蝴蝶|The butterfly is colorful.|蝴蝶很 colorful。",
"carrot|/ˈkærət/|n.|胡萝卜|I like carrots.|我喜欢胡萝卜。",
"chicken|/ˈtʃɪkɪn/|n.|鸡肉|We had chicken for dinner.|我们晚餐吃了鸡肉。",
"daughter|/ˈdɔːtər/|n.|女儿|She is my daughter.|她是我的女儿。",
"dinosaur|/ˈdaɪnəsɔːr/|n.|恐龙|The dinosaur is big.|恐龙很大。",
"elephant|/ˈelɪfənt/|n.|大象|The elephant is huge.|大象很大。",
"evening|/ˈiːvnɪŋ/|n.|晚上|Good evening!|晚上好！",
"family|/ˈfæməli/|n.|家庭|I love my family.|我爱我的家人。",
"flower|/ˈflaʊər/|n.|花|The flower blooms.|花开了。",
"forest|/ˈfɒrɪst/|n.|森林|The forest is dark.|森林很暗。",
"garden|/ˈɡɑːrdn/|n.|花园|She has a beautiful garden.|她有一个美丽的花园。",
"giraffe|/dʒɪˈræf/|n.|长颈鹿|The giraffe is tall.|长颈鹿很高。",
"grandmother|/ˈɡrænmʌðər/|n.|祖母|My grandmother is kind.|我的祖母很善良。",
"guitar|/ɡɪˈtɑːr/|n.|吉他|He plays the guitar.|他弹吉他。",
"hamster|/ˈhæmstər/|n.|仓鼠|The hamster is cute.|仓鼠很可爱。",
"homework|/ˈhoʊmwɜːrk/|n.|家庭作业|I finished my homework.|我完成了作业。",
"honey|/ˈhʌni/|n.|蜂蜜|I like honey.|我喜欢蜂蜜。",
"island|/ˈaɪlənd/|n.|岛屿|The island is beautiful.|岛屿很美。",
"kangaroo|/ˌkæŋɡəˈruː/|n.|袋鼠|The kangaroo jumps.|袋鼠在跳跃。",
"kitchen|/ˈkɪtʃɪn/|n.|厨房|Mom is in the kitchen.|妈妈在厨房里。",
"lemon|/ˈlemən/|n.|柠檬|The lemon is sour.|柠檬很酸。",
"mango|/ˈmæŋɡoʊ/|n.|芒果|I love mangoes.|我喜欢芒果。",
"monkey|/ˈmʌŋki/|n.|猴子|The monkey climbs the tree.|猴子爬树。",
"mountain|/ˈmaʊntən/|n.|山|The mountain is high.|山很高。",
"mushroom|/ˈmʌʃruːm/|n.|蘑菇|The mushroom is edible.|蘑菇可以吃。",
"notebook|/ˈnoʊtbʊk/|n.|笔记本|Write in your notebook.|写在笔记本上。",
"orange|/ˈɒrɪndʒ/|n.|橙子|I want an orange.|我想要一个橙子。",
"penguin|/ˈpeŋɡwɪn/|n.|企鹅|The penguin is cute.|企鹅很可爱。",
"pillow|/ˈpɪloʊ/|n.|枕头|The pillow is soft.|枕头很软。",
"pineapple|/ˈpaɪnæpl/|n.|菠萝|I like pineapple juice.|我喜欢菠萝汁。",
"rabbit|/ˈræbɪt/|n.|兔子|The rabbit hops.|兔子在跳。",
"rainbow|/ˈreɪnboʊ/|n.|彩虹|The rainbow is beautiful.|彩虹很美。",
"sandwich|/ˈsænwɪtʃ/|n.|三明治|I made a sandwich.|我做了一个三明治。",
"strawberry|/ˈstrɔːberi/|n.|草莓|Strawberries are red.|草莓是红色的。",
"telephone|/ˈteləfoʊn/|n.|电话|The telephone is ringing.|电话在响。",
"tomato|/təˈmeɪtoʊ/|n.|番茄|I need tomatoes.|我需要番茄。",
"umbrella|/ʌmˈbrelə/|n.|雨伞|Take your umbrella.|带上你的雨伞。",
"vegetable|/ˈvedʒtəbl/|n.|蔬菜|Eat your vegetables.|吃你的蔬菜。",
"violin|/ˌvaɪəˈlɪn/|n.|小提琴|She plays the violin.|她拉小提琴。",
"watermelon|/ˈwɔːtərmelən/|n.|西瓜|Watermelon is sweet.|西瓜很甜。",
"whale|/weɪl/|n.|鲸鱼|The whale is huge.|鲸鱼很大。",
"window|/ˈwɪndoʊ/|n.|窗户|Open the window.|打开窗户。",
"zebra|/ˈziːbrə/|n.|斑马|The zebra has stripes.|斑马有条纹。"
  ];
  var cat=WORD_LIBRARY.categories[0]; // S1
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
  console.log("S1 added: "+added+", total: "+cat.words.length);
})();
