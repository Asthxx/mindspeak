// ============================================================
// 语法练习扩充 — 补充至200+题
// ============================================================
(function() {
  var extraGrammar = [
    // 基础语法
    { id:201, type:"choice", difficulty:"basic", question:"I _____ breakfast every morning.", options:["eat","eats","eating","ate"], answer:0, explanation:"一般现在时，主语I用原形。", topic:"一般现在时" },
    { id:202, type:"choice", difficulty:"basic", question:"She _____ to school by bus.", options:["go","goes","going","went"], answer:1, explanation:"第三人称单数，一般现在时动词加s。", topic:"一般现在时" },
    { id:203, type:"choice", difficulty:"basic", question:"They _____ football yesterday.", options:["play","plays","played","playing"], answer:2, explanation:"yesterday表示过去时，play的过去式是played。", topic:"一般过去时" },
    { id:204, type:"choice", difficulty:"basic", question:"We _____ dinner at 6 o'clock.", options:["have","has","having","had"], answer:0, explanation:"一般现在时，主语we用原形。", topic:"一般现在时" },
    { id:205, type:"choice", difficulty:"basic", question:"He _____ TV every evening.", options:["watch","watches","watching","watched"], answer:1, explanation:"第三人称单数，一般现在时动词加es。", topic:"一般现在时" },
    { id:206, type:"fill_blank", difficulty:"basic", question:"She _____ (go) to school every day.", correct_answer:"goes", explanation:"第三人称单数，go变goes。", topic:"一般现在时" },
    { id:207, type:"fill_blank", difficulty:"basic", question:"I _____ (not like) rainy days.", correct_answer:"do not like", explanation:"否定句用do not + 动词原形。", topic:"一般现在时" },
    { id:208, type:"fill_blank", difficulty:"basic", question:"The cat _____ (sleep) on the sofa.", correct_answer:"sleeps", explanation:"第三人称单数，sleep加s。", topic:"一般现在时" },

    // 过去时态
    { id:209, type:"choice", difficulty:"basic", question:"I _____ to the park last Sunday.", options:["go","goes","went","going"], answer:2, explanation:"last Sunday表示过去时，go的过去式是went。", topic:"一般过去时" },
    { id:210, type:"choice", difficulty:"basic", question:"She _____ a new dress yesterday.", options:["buy","buys","bought","buying"], answer:2, explanation:"yesterday表示过去时，buy的过去式是bought。", topic:"一般过去时" },
    { id:211, type:"fill_blank", difficulty:"basic", question:"He _____ (see) a movie last night.", correct_answer:"saw", explanation:"last night表示过去时，see的过去式是saw。", topic:"一般过去时" },
    { id:212, type:"fill_blank", difficulty:"basic", question:"We _____ (eat) lunch at noon.", correct_answer:"ate", explanation:"一般过去时，eat的过去式是ate。", topic:"一般过去时" },

    // 现在进行时
    { id:213, type:"choice", difficulty:"basic", question:"She _____ her homework now.", options:["do","does","is doing","did"], answer:2, explanation:"now表示现在进行时，she用is。", topic:"现在进行时" },
    { id:214, type:"choice", difficulty:"basic", question:"They _____ in the park.", options:["play","plays","are playing","is playing"], answer:2, explanation:"现在进行时，主语they用are。", topic:"现在进行时" },
    { id:215, type:"fill_blank", difficulty:"basic", question:"I _____ (read) a book now.", correct_answer:"am reading", explanation:"now表示现在进行时，主语I用am。", topic:"现在进行时" },
    { id:216, type:"fill_blank", difficulty:"basic", question:"The children _____ (play) outside.", correct_answer:"are playing", explanation:"现在进行时，children用are。", topic:"现在进行时" },

    // 一般将来时
    { id:217, type:"choice", difficulty:"basic", question:"I _____ visit my friend tomorrow.", options:["will","am going","go","went"], answer:0, explanation:"tomorrow表示将来时，用will + 动词原形。", topic:"一般将来时" },
    { id:218, type:"choice", difficulty:"basic", question:"She _____ a new book next week.", options:["buy","buys","will buy","bought"], answer:2, explanation:"next week表示将来时，用will + 动词原形。", topic:"一般将来时" },
    { id:219, type:"fill_blank", difficulty:"basic", question:"We _____ (go) to the cinema tonight.", correct_answer:"will go", explanation:"tonight表示将来时，用will + 动词原形。", topic:"一般将来时" },
    { id:220, type:"fill_blank", difficulty:"basic", question:"He _____ (arrive) at 3 o'clock.", correct_answer:"will arrive", explanation:"at 3 o'clock表示将来时间，用will + 动词原形。", topic:"一般将来时" },

    // 情态动词
    { id:221, type:"choice", difficulty:"basic", question:"You _____ finish your homework.", options:["must","can","may","might"], answer:0, explanation:"must表示必须，是义务。", topic:"情态动词" },
    { id:222, type:"choice", difficulty:"basic", question:"I _____ speak English.", options:["can","must","should","may"], answer:0, explanation:"can表示能力，能够。", topic:"情态动词" },
    { id:223, type:"choice", difficulty:"basic", question:"You _____ not smoke here.", options:["can","must","may","might"], answer:1, explanation:"must not表示禁止。", topic:"情态动词" },
    { id:224, type:"fill_blank", difficulty:"basic", question:"She _____ (can) swim very well.", correct_answer:"can", explanation:"can后面接动词原形。", topic:"情态动词" },

    // 比较级
    { id:225, type:"choice", difficulty:"basic", question:"This book is _____ than that one.", options:["good","better","best","well"], answer:1, explanation:"两者比较用比较级better。", topic:"比较级" },
    { id:226, type:"choice", difficulty:"basic", question:"She is the _____ girl in our class.", options:["tall","taller","tallest","most tall"], answer:2, explanation:"三者以上比较用最高级tallest。", topic:"最高级" },
    { id:227, type:"fill_blank", difficulty:"basic", question:"This is _____ (good) movie I have ever seen.", correct_answer:"the best", explanation:"最高级前面加the。", topic:"最高级" },
    { id:228, type:"fill_blank", difficulty:"basic", question:"He runs _____ (fast) than his brother.", correct_answer:"faster", explanation:"两者比较用比较级。", topic:"比较级" },

    // CET-4 难度
    { id:229, type:"choice", difficulty:"CET-4", question:"The book _____ by the author last year.", options:["was written","is written","has written","writes"], answer:0, explanation:"last year表示过去时，book是被写的，用被动语态。", topic:"被动语态" },
    { id:230, type:"choice", difficulty:"CET-4", question:"I wish I _____ a bird.", options:["am","was","were","be"], answer:2, explanation:"wish后面用虚拟语气，be动词统一用were。", topic:"虚拟语气" },
    { id:231, type:"choice", difficulty:"CET-4", question:"The man _____ car was stolen called the police.", options:["who","whose","which","whom"], answer:1, explanation:"whose在定语从句中表示所属关系，修饰car。", topic:"定语从句" },
    { id:232, type:"choice", difficulty:"CET-4", question:"She is interested _____ learning English.", options:["on","in","at","for"], answer:1, explanation:"be interested in是固定搭配，表示对...感兴趣。", topic:"介词搭配" },
    { id:233, type:"fill_blank", difficulty:"CET-4", question:"The student _____ (study) hard for the exam.", correct_answer:"is studying", explanation:"现在进行时，表示正在进行的动作。", topic:"现在进行时" },
    { id:234, type:"fill_blank", difficulty:"CET-4", question:"I have _____ (live) here for ten years.", correct_answer:"lived", explanation:"现在完成时，have + 过去分词。", topic:"现在完成时" },

    // CET-6 难度
    { id:235, type:"choice", difficulty:"CET-6", question:"Had I arrived earlier, I _____ the train.", options:["would catch","would have caught","could catch","may catch"], answer:1, explanation:"虚拟语气：与过去事实相反，if从句用had done，主句用would have done。", topic:"虚拟语气" },
    { id:236, type:"choice", difficulty:"CET-6", question:"It was in the museum _____ she saw the painting.", options:["which","where","that","when"], answer:2, explanation:"这是强调句型：It was + 被强调部分 + that...", topic:"强调句型" },
    { id:237, type:"choice", difficulty:"CET-6", question:"The book _____ by millions of people so far.", options:["has read","has been read","had read","was reading"], answer:1, explanation:"so far提示现在完成时，book是被读，用被动语态。", topic:"现在完成时被动语态" },
    { id:238, type:"fill_blank", difficulty:"CET-6", question:"Not only _____ he finish the work, but also he helped others.", correct_answer:"did", explanation:"not only放在句首，其所在分句要部分倒装。", topic:"倒装句" },
    { id:239, type:"fill_blank", difficulty:"CET-6", question:"If I _____ (know) the answer, I would tell you.", correct_answer:"knew", explanation:"虚拟语气：与现在事实相反，if从句用一般过去时。", topic:"虚拟语气" },
    { id:240, type:"choice", difficulty:"CET-6", question:"So absorbed _____ in her work that she didn't hear me.", options:["she was","was she","she is","is she"], answer:1, explanation:"So + 形容词/副词开头的句子要部分倒装。", topic:"倒装句" },

    // 高考难度
    { id:241, type:"choice", difficulty:"gaokao", question:"I _____ along the street when I saw an old friend.", options:["am walking","was walking","walked","have walked"], answer:1, explanation:"when引导的时间状语从句，主句用过去进行时。", topic:"过去进行时" },
    { id:242, type:"choice", difficulty:"gaokao", question:"The teacher told us that the earth _____ around the sun.", options:["moved","moves","has moved","is moving"], answer:1, explanation:"宾语从句中，客观真理用一般现在时。", topic:"宾语从句" },
    { id:243, type:"choice", difficulty:"gaokao", question:"He has never been to Beijing, _____?", options:["hasn't he","has he","isn't he","is he"], answer:1, explanation:"反意疑问句：前否后肯，has never是否定形式。", topic:"反意疑问句" },
    { id:244, type:"fill_blank", difficulty:"gaokao", question:"The city _____ I was born has changed a lot.", correct_answer:"where", explanation:"where引导定语从句，在从句中作地点状语。", topic:"定语从句" },
    { id:245, type:"fill_blank", difficulty:"gaokao", question:"He suggested that we _____ (go) to the park.", correct_answer:"go", explanation:"suggest后面的宾语从句用虚拟语气：(should) + 动词原形。", topic:"虚拟语气" },

    // 进阶语法
    { id:246, type:"choice", difficulty:"advanced", question:"_____ it not been for your help, I would have failed.", options:["Had","Has","Have","If"], answer:0, explanation:"虚拟语气省略if的倒装形式：Had + 主语 + been...。", topic:"虚拟语气" },
    { id:247, type:"choice", difficulty:"advanced", question:"No sooner _____ home than it began to rain.", options:["I had got","had I got","I got","did I got"], answer:1, explanation:"No sooner...than...放在句首，主句用部分倒装。", topic:"倒装句" },
    { id:248, type:"fill_blank", difficulty:"advanced", question:"Never before _____ such a beautiful sunset.", correct_answer:"have I seen", explanation:"Never before放在句首，主句要部分倒装。", topic:"倒装句" },
    { id:249, type:"fill_blank", difficulty:"advanced", question:"The professor recommended that the student _____ (read) more books.", correct_answer:"read", explanation:"recommend后面的宾语从句用虚拟语气：(should) + 动词原形。", topic:"虚拟语气" },
    { id:250, type:"choice", difficulty:"advanced", question:"Only when the war was over _____ to go home.", options:["the soldiers were able","the soldiers had been able","were the soldiers able","had the soldiers been"], answer:2, explanation:"Only + 状语放在句首，主句要部分倒装。", topic:"倒装句" },

    // 时态语态
    { id:251, type:"choice", difficulty:"CET-4", question:"She _____ in this company since 2015.", options:["works","worked","has worked","is working"], answer:2, explanation:"since 2015表示从过去到现在，用现在完成时。", topic:"现在完成时" },
    { id:252, type:"choice", difficulty:"CET-4", question:"The bridge _____ next year.", options:["will build","will be built","is built","was built"], answer:1, explanation:"next year表示将来时，bridge是被建造，用被动语态。", topic:"将来时被动" },
    { id:253, type:"fill_blank", difficulty:"CET-4", question:"I _____ (wait) for you since 9 o'clock.", correct_answer:"have been waiting", explanation:"since + 时间点，主句用现在完成进行时。", topic:"现在完成进行时" },
    { id:254, type:"fill_blank", difficulty:"CET-4", question:"The letter _____ (write) in English.", correct_answer:"is written", explanation:"信是被写的，用一般现在时的被动语态。", topic:"被动语态" },

    // 从句专题
    { id:255, type:"choice", difficulty:"CET-4", question:"This is the house _____ Lu Xun once lived.", options:["which","that","where","when"], answer:2, explanation:"where在定语从句中作地点状语。", topic:"定语从句" },
    { id:256, type:"choice", difficulty:"CET-4", question:"I don't know _____ he will come or not.", options:["if","whether","that","what"], answer:1, explanation:"whether...or not是固定搭配，表示是否。", topic:"名词性从句" },
    { id:257, type:"fill_blank", difficulty:"CET-4", question:"The boy _____ father is a doctor is very clever.", correct_answer:"whose", explanation:"whose在定语从句中表示所属关系。", topic:"定语从句" },
    { id:258, type:"fill_blank", difficulty:"CET-6", question:"_____ (be) the case, we had better change our plan.", correct_answer:"If", explanation:"If being the case = If that is the case。", topic:"条件从句" },

    // 非谓语动词
    { id:259, type:"choice", difficulty:"CET-4", question:"_____ from space, the earth looks like a blue ball.", options:["Seeing","Seen","To see","Having seen"], answer:1, explanation:"the earth是被看，用过去分词表被动。", topic:"分词作状语" },
    { id:260, type:"choice", difficulty:"CET-4", question:"The teacher entered the classroom, _____ by two students.", options:["follow","following","followed","to follow"], answer:2, explanation:"过去分词followed作伴随状语，表示被跟随。", topic:"分词作状语" },
    { id:261, type:"fill_blank", difficulty:"CET-4", question:"I remember _____ (see) him somewhere before.", correct_answer:"seeing", explanation:"remember doing表示记得做过某事。", topic:"动名词" },
    { id:262, type:"fill_blank", difficulty:"CET-6", question:"He is said _____ (write) three books.", correct_answer:"to have written", explanation:"be said to have done表示据说已经完成了某事。", topic:"不定式" },

    // 特殊句型
    { id:263, type:"choice", difficulty:"CET-4", question:"Little _____ about his own safety.", options:["does he care","did he care","he cares","he cared"], answer:1, explanation:"Little放在句首，主句要部分倒装。", topic:"倒装句" },
    { id:264, type:"choice", difficulty:"CET-4", question:"Not only _____ hard, but also he helps others.", options:["he works","does he work","he does work","working he"], answer:1, explanation:"not only放在句首，其所在分句要部分倒装。", topic:"倒装句" },
    { id:265, type:"fill_blank", difficulty:"CET-4", question:"Seldom _____ (go) he to the cinema.", correct_answer:"does he go", explanation:"seldom放在句首，主句要用部分倒装。", topic:"倒装句" },
    { id:266, type:"fill_blank", difficulty:"CET-6", question:"Not until midnight _____ (finish) the work.", correct_answer:"did he finish", explanation:"Not until放在句首，主句要用部分倒装。", topic:"倒装句" },

    // 固定搭配
    { id:267, type:"choice", difficulty:"basic", question:"I am looking forward _____ hearing from you.", options:["at","to","in","for"], answer:1, explanation:"look forward to是固定搭配，to是介词。", topic:"介词搭配" },
    { id:268, type:"choice", difficulty:"basic", question:"She is interested _____ learning English.", options:["on","in","at","for"], answer:1, explanation:"be interested in是固定搭配。", topic:"介词搭配" },
    { id:269, type:"choice", difficulty:"CET-4", question:"He insisted _____ going there alone.", options:["on","in","at","for"], answer:0, explanation:"insist on doing是固定搭配。", topic:"动词搭配" },
    { id:270, type:"choice", difficulty:"CET-4", question:"She is good _____ cooking.", options:["in","at","on","for"], answer:1, explanation:"be good at是固定搭配。", topic:"形容词搭配" },
    { id:271, type:"fill_blank", difficulty:"basic", question:"He is afraid _____ flying.", correct_answer:"of", explanation:"be afraid of是固定搭配。", topic:"介词搭配" },
    { id:272, type:"fill_blank", difficulty:"CET-4", question:"The teacher is satisfied _____ your work.", correct_answer:"with", explanation:"be satisfied with是固定搭配。", topic:"介词搭配" },

    // 冠词与代词
    { id:273, type:"choice", difficulty:"basic", question:"There is _____ apple on the table.", options:["a","an","the","/"], answer:1, explanation:"apple以元音开头，用an。", topic:"冠词" },
    { id:274, type:"choice", difficulty:"basic", question:"_____ sun rises in the east.", options:["A","An","The","/"], answer:2, explanation:"世界上独一无二的事物前用the。", topic:"冠词" },
    { id:275, type:"choice", difficulty:"CET-4", question:"He has two sisters. One is a teacher, _____ is a nurse.", options:["other","the other","another","others"], answer:1, explanation:"两者中的另一个用the other。", topic:"代词" },
    { id:276, type:"fill_blank", difficulty:"basic", question:"This is _____ (I) book.", correct_answer:"my", explanation:"I的形容词性物主代词是my。", topic:"物主代词" },
    { id:277, type:"fill_blank", difficulty:"CET-4", question:"_____ (they) classroom is very clean.", correct_answer:"Their", explanation:"they的形容词性物主代词是Their。", topic:"物主代词" },

    // 介词与连词
    { id:278, type:"choice", difficulty:"basic", question:"I usually get up _____ 7 o'clock.", options:["in","on","at","for"], answer:2, explanation:"at + 具体时间点。", topic:"介词" },
    { id:279, type:"choice", difficulty:"basic", question:"We have no classes _____ Sundays.", options:["in","on","at","for"], answer:1, explanation:"on + 星期几。", topic:"介词" },
    { id:280, type:"choice", difficulty:"CET-4", question:"_____ it rains tomorrow, we will cancel the meeting.", options:["If","Because","Although","Since"], answer:0, explanation:"if引导条件状语从句。", topic:"连词" },
    { id:281, type:"fill_blank", difficulty:"basic", question:"The book is _____ the desk.", correct_answer:"on", explanation:"on表示在...上面。", topic:"介词" },
    { id:282, type:"fill_blank", difficulty:"CET-4", question:"I will come back _____ three days.", correct_answer:"in", explanation:"in + 一段时间表示在...之后。", topic:"介词" },

    // 更多CET-4练习
    { id:283, type:"choice", difficulty:"CET-4", question:"By the time you arrive, I _____ for two hours.", options:["will have waited","will wait","have waited","am waiting"], answer:0, explanation:"by the time + 一般现在时，主句用将来完成时。", topic:"将来完成时" },
    { id:284, type:"choice", difficulty:"CET-4", question:"The number of students _____ increasing.", options:["is","are","has","have"], answer:0, explanation:"the number of...作主语时，谓语动词用单数。", topic:"主谓一致" },
    { id:285, type:"choice", difficulty:"CET-4", question:"He made a suggestion that we _____ by bus.", options:["go","went","going","goes"], answer:0, explanation:"suggestion后面的同位语从句用虚拟语气。", topic:"虚拟语气" },
    { id:286, type:"fill_blank", difficulty:"CET-4", question:"This is the best movie _____ I have ever seen.", correct_answer:"that", explanation:"先行词有最高级修饰时，关系代词只能用that。", topic:"定语从句" },
    { id:287, type:"fill_blank", difficulty:"CET-4", question:"The man _____ is standing there is my father.", correct_answer:"who", explanation:"who在定语从句中作主语，修饰人。", topic:"定语从句" },

    // 更多CET-6练习
    { id:288, type:"choice", difficulty:"CET-6", question:"_____ is known to all, the earth is round.", options:["As","It","What","That"], answer:0, explanation:"As is known to all是固定搭配。", topic:"定语从句" },
    { id:289, type:"choice", difficulty:"CET-6", question:"The reason _____ he was late was that he missed the bus.", options:["why","which","for","how"], answer:0, explanation:"reason后面用why引导定语从句。", topic:"定语从句" },
    { id:290, type:"fill_blank", difficulty:"CET-6", question:"Such _____ the results that everyone was satisfied.", correct_answer:"were", explanation:"Such放在句首，主句倒装，results是复数用were。", topic:"倒装句" },
    { id:291, type:"fill_blank", difficulty:"CET-6", question:"_____ (compare) with last year, our production has increased by 30%.", correct_answer:"Compared", explanation:"过去分词作状语，compared with是固定搭配。", topic:"分词作状语" },

    // 更多高考练习
    { id:292, type:"choice", difficulty:"gaokao", question:"Not until yesterday _____ the truth.", options:["I knew","did I know","I have known","have I known"], answer:1, explanation:"not until放在句首，主句要用部分倒装。", topic:"倒装句" },
    { id:293, type:"choice", difficulty:"gaokao", question:"He is the only one of the students who _____ passed the exam.", options:["have","has","are","is"], answer:1, explanation:"the only one of...后用单数谓语。", topic:"主谓一致" },
    { id:294, type:"fill_blank", difficulty:"gaokao", question:"If I _____ (be) you, I would study harder.", correct_answer:"were", explanation:"虚拟语气：与现在事实相反，if从句用were。", topic:"虚拟语气" },
    { id:295, type:"fill_blank", difficulty:"gaokao", question:"He insisted that he _____ (not be) guilty.", correct_answer:"was not", explanation:"insist表示'坚持说'时，从句用陈述语气。", topic:"虚拟语气" },

    // 更多进阶练习
    { id:296, type:"choice", difficulty:"advanced", question:"The children _____ outside should not make so much noise.", options:["play","playing","played","to play"], answer:1, explanation:"现在分词playing作后置定语。", topic:"分词作定语" },
    { id:297, type:"choice", difficulty:"advanced", question:"_____ in the queue for half an hour, the old man realized he had left the wallet.", options:["Waiting","To wait","Having waited","To have waited"], answer:2, explanation:"分词作状语，等待在先，用完成式having waited。", topic:"分词作状语" },
    { id:298, type:"fill_blank", difficulty:"advanced", question:"If it _____ (not rain) tomorrow, we would go for a picnic.", correct_answer:"did not rain", explanation:"虚拟语气：与现在事实相反，if从句用一般过去时。", topic:"虚拟语气" },
    { id:299, type:"fill_blank", difficulty:"advanced", question:"_____ (be) the case, we would change our plan.", correct_answer:"Were", explanation:"虚拟语气省略if的倒装形式：Were + 主语...。", topic:"虚拟语气" },
    { id:300, type:"choice", difficulty:"advanced", question:"_____ it not been for your help, I would have failed.", options:["Had","Has","Have","If"], answer:0, explanation:"虚拟语气省略if的倒装形式：Had + 主语 + been...。", topic:"虚拟语气" }
  ];

  // 存储到全局变量
  if (typeof window !== 'undefined') {
    window.EXTRA_GRAMMAR2 = extraGrammar;
  }

  // 如果getDefaultGrammar存在，更新它
  if (typeof DataStore !== 'undefined' && DataStore.getDefaultGrammar) {
    var original = DataStore.getDefaultGrammar;
    DataStore.getDefaultGrammar = function() {
      var result = original();
      if (!result) result = [];
      if (!Array.isArray(result) && !result.grammar_exercises) result.grammar_exercises = [];
      var base = Array.isArray(result) ? result : result.grammar_exercises;
      if (typeof EXTRA_GRAMMAR !== 'undefined' && Array.isArray(EXTRA_GRAMMAR)) {
        var seen = {};
        base.forEach(function(ex) { seen[ex.id] = true; });
        EXTRA_GRAMMAR.forEach(function(ex) {
          if (!seen[ex.id]) {
            base.push(ex);
            seen[ex.id] = true;
          }
        });
      }
      if (typeof window.EXTRA_GRAMMAR2 !== 'undefined' && Array.isArray(window.EXTRA_GRAMMAR2)) {
        var seen2 = {};
        base.forEach(function(ex) { seen2[ex.id] = true; });
        window.EXTRA_GRAMMAR2.forEach(function(ex) {
          if (!seen2[ex.id]) {
            base.push(ex);
            seen2[ex.id] = true;
          }
        });
      }
      return result;
    };
  }

  console.log('语法练习扩充完成，新增 ' + extraGrammar.length + ' 题');
})();
