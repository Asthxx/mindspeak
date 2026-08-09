// ============================================================
// 语法练习扩充 — 覆盖各难度等级
// ============================================================
(function() {
  var extraExercises = [
    // ==================== 高考难度 ====================
    { id:101, type:"choice", difficulty:"gaokao", question:"I _____ along the street when I saw an old friend of mine.", options:["am walking","was walking","walked","have walked"], answer:1, explanation:"when引导的时间状语从句，主句用过去进行时，表示过去某时刻正在进行的动作。", topic:"过去进行时" },
    { id:102, type:"choice", difficulty:"gaokao", question:"The teacher told us that the earth _____ around the sun.", options:["moved","moves","has moved","is moving"], answer:1, explanation:"宾语从句中，如果主句是过去时，从句要用相应的过去时态，但客观真理用一般现在时。", topic:"宾语从句" },
    { id:103, type:"choice", difficulty:"gaokao", question:"He has never been to Beijing, _____?", options:["hasn't he","has he","isn't he","is he"], answer:1, explanation:"反意疑问句：前否后肯，has never是否定形式，所以用has he。", topic:"反意疑问句" },
    { id:104, type:"choice", difficulty:"gaokao", question:"The building _____ now is our new library.", options:["being built","built","building","to build"], answer:0, explanation:"现在分词被动式being built作后置定语，表示正在被建造的建筑。", topic:"分词作定语" },
    { id:105, type:"choice", difficulty:"gaokao", question:"_____ he said at the meeting surprised everyone.", options:["That","What","Which","How"], answer:1, explanation:"What引导主语从句，在从句中作said的宾语。", topic:"主语从句" },
    { id:106, type:"fill_blank", difficulty:"gaokao", question:"If I _____ (be) you, I would study harder.", correct_answer:"were", explanation:"虚拟语气：与现在事实相反，if从句用were（be动词统一用were）。", topic:"虚拟语气" },
    { id:107, type:"fill_blank", difficulty:"gaokao", question:"The city _____ I was born has changed a lot.", correct_answer:"where", explanation:"where引导定语从句，在从句中作地点状语，修饰the city。", topic:"定语从句" },
    { id:108, type:"fill_blank", difficulty:"gaokao", question:"He suggested that we _____ (go) to the park.", correct_answer:"go", explanation:"suggest后面的宾语从句用虚拟语气：(should) + 动词原形。", topic:"虚拟语气" },
    { id:109, type:"choice", difficulty:"gaokao", question:"It is the first time _____ I _____ to Shanghai.", options:["that; have been","that; had been","which; have been","which; had been"], answer:0, explanation:"It is the first time后面用that引导的定语从句，从句用现在完成时。", topic:"定语从句" },
    { id:110, type:"choice", difficulty:"gaokao", question:"_____ is known to all, the earth is round.", options:["As","It","What","That"], answer:0, explanation:"As is known to all是固定搭配，as引导非限制性定语从句，指代后面整句话。", topic:"定语从句" },

    // ==================== CET-4 难度 ====================
    { id:201, type:"choice", difficulty:"CET-4", question:"By the time you arrive, I _____ for two hours.", options:["will have waited","will wait","have waited","am waiting"], answer:0, explanation:"by the time + 一般现在时，主句用将来完成时will have done。", topic:"将来完成时" },
    { id:202, type:"choice", difficulty:"CET-4", question:"The number of students in our school _____ increasing.", options:["is","are","has","have"], answer:0, explanation:"the number of...作主语时，谓语动词用单数。", topic:"主谓一致" },
    { id:203, type:"choice", difficulty:"CET-4", question:"I wish I _____ a bird.", options:["am","was","were","be"], answer:2, explanation:"wish后面用虚拟语气，be动词统一用were。", topic:"虚拟语气" },
    { id:204, type:"choice", difficulty:"CET-4", question:"He made a suggestion that we _____ by bus.", options:["go","went","going","goes"], answer:0, explanation:"suggestion后面的同位语从句用虚拟语气：(should) + 动词原形。", topic:"虚拟语气" },
    { id:205, type:"choice", difficulty:"CET-4", question:"_____ hard you may work, you can't change the past.", options:["Whatever","However","Whoever","Wherever"], answer:1, explanation:"However + 形容词/副词 + 主语 + 谓语，表示无论多么...。", topic:"让步状语从句" },
    { id:206, type:"fill_blank", difficulty:"CET-4", question:"This is the best movie _____ I have ever seen.", correct_answer:"that", explanation:"先行词有最高级修饰时，关系代词只能用that。", topic:"定语从句" },
    { id:207, type:"fill_blank", difficulty:"CET-4", question:"The man _____ is standing there is my father.", correct_answer:"who", explanation:"who在定语从句中作主语，修饰人。", topic:"定语从句" },
    { id:208, type:"fill_blank", difficulty:"CET-4", question:"She is looking forward _____ hearing from you.", correct_answer:"to", explanation:"look forward to中的to是介词，后面接动名词。", topic:"介词搭配" },
    { id:209, type:"choice", difficulty:"CET-4", question:"Not until yesterday _____ the truth.", options:["I knew","did I know","I have known","have I known"], answer:1, explanation:"not until放在句首，主句要用部分倒装。", topic:"倒装句" },
    { id:210, type:"choice", difficulty:"CET-4", question:"He is the only one of the students who _____ passed the exam.", options:["have","has","are","is"], answer:1, explanation:"the only one of...后用单数谓语；如果是one of the students who则用复数。", topic:"主谓一致" },

    // ==================== CET-6 难度 ====================
    { id:301, type:"choice", difficulty:"CET-6", question:"Had I arrived earlier, I _____ the train.", options:["would catch","would have caught","could catch","may catch"], answer:1, explanation:"虚拟语气：与过去事实相反，if从句用had done，主句用would have done。倒装形式省略if。", topic:"虚拟语气" },
    { id:302, type:"choice", difficulty:"CET-6", question:"So absorbed _____ in her work that she didn't hear me come in.", options:["she was","was she","she is","is she"], answer:1, explanation:"So + 形容词/副词开头的句子要部分倒装。", topic:"倒装句" },
    { id:303, type:"choice", difficulty:"CET-6", question:"The professor, together with his students, _____ to the laboratory.", options:["is going","are going","go","goes"], answer:0, explanation:"together with不影响主语的单复数，主语是professor，用单数。", topic:"主谓一致" },
    { id:304, type:"choice", difficulty:"CET-6", question:"It is high time that we _____ action.", options:["take","took","taken","taking"], answer:1, explanation:"It is high time that...后面的从句用过去时表虚拟。", topic:"虚拟语气" },
    { id:305, type:"choice", difficulty:"CET-6", question:"_____ it rain tomorrow, we would cancel the picnic.", options:["If","Should","Would","Could"], answer:1, explanation:"虚拟条件句省略if的倒装形式：should/were/had + 主语 + 谓语。", topic:"虚拟语气" },
    { id:306, type:"fill_blank", difficulty:"CET-6", question:"The reason _____ he was late was that he missed the bus.", correct_answer:"why", explanation:"reason后面用why引导定语从句。", topic:"定语从句" },
    { id:307, type:"fill_blank", difficulty:"CET-6", question:"He insisted that he _____ (not be) guilty.", correct_answer:"was not", explanation:"insist表示'坚持说/坚持认为'时，从句用陈述语气，不用虚拟。", topic:"虚拟语气" },
    { id:308, type:"fill_blank", difficulty:"CET-6", question:"_____ (compare) with last year, our production has increased by 30%.", correct_answer:"Compared", explanation:"过去分词作状语，表示被动/完成。compared with是固定搭配。", topic:"分词作状语" },
    { id:309, type:"choice", difficulty:"CET-6", question:"Only when the war was over _____ to go home.", options:["the soldiers were able","the soldiers had been able","were the soldiers able","had the soldiers been"], answer:2, explanation:"Only + 状语放在句首，主句要部分倒装。", topic:"倒装句" },
    { id:310, type:"choice", difficulty:"CET-6", question:"Such _____ the results that everyone was satisfied.", options:["were","was","is","are"], answer:0, explanation:"Such放在句首，主句倒装，results是复数用were。", topic:"倒装句" },

    // ==================== 基础语法 ====================
    { id:401, type:"choice", difficulty:"basic", question:"She _____ to school every day.", options:["go","goes","going","went"], answer:1, explanation:"第三人称单数，一般现在时动词加s。", topic:"一般现在时" },
    { id:402, type:"choice", difficulty:"basic", question:"They _____ football now.", options:["play","plays","are playing","is playing"], answer:2, explanation:"now表示现在进行时，主语they用are。", topic:"现在进行时" },
    { id:403, type:"choice", difficulty:"basic", question:"I _____ already _____ my homework.", options:["have; finish","has; finished","have; finished","had; finish"], answer:2, explanation:"already提示现在完成时，主语I用have。", topic:"现在完成时" },
    { id:404, type:"choice", difficulty:"basic", question:"There _____ a book on the desk.", options:["is","are","has","have"], answer:0, explanation:"There be句型，a book是单数用is。", topic:"There be句型" },
    { id:405, type:"choice", difficulty:"basic", question:"She is _____ than her sister.", options:["tall","taller","tallest","more tall"], answer:1, explanation:"两者比较用比较级taller。", topic:"比较级" },
    { id:406, type:"fill_blank", difficulty:"basic", question:"He _____ (go) to school yesterday.", correct_answer:"went", explanation:"yesterday表示过去时，go的过去式是went。", topic:"一般过去时" },
    { id:407, type:"fill_blank", difficulty:"basic", question:"The cat is _____ the table.", correct_answer:"under", explanation:"under表示在...下面。", topic:"介词" },
    { id:408, type:"fill_blank", difficulty:"basic", question:"She can _____ (swim) very well.", correct_answer:"swim", explanation:"can后面接动词原形。", topic:"情态动词" },

    // ==================== 进阶语法 ====================
    { id:501, type:"choice", difficulty:"advanced", question:"_____ he come tomorrow, I shall give him the message.", options:["If","Had","Were","Should"], answer:3, explanation:"虚拟条件句省略if，should放在句首表示万一。", topic:"虚拟语气" },
    { id:502, type:"choice", difficulty:"advanced", question:"The project _____ by the time we arrive.", options:["will finish","will have been finished","is finished","has finished"], answer:1, explanation:"by the time + 一般现在时，主句用将来完成时的被动语态。", topic:"将来完成时被动" },
    { id:503, type:"choice", difficulty:"advanced", question:"No sooner _____ home than it began to rain.", options:["I had got","had I got","I got","did I get"], answer:1, explanation:"No sooner...than...放在句首，主句用部分倒装，时态用过去完成时。", topic:"倒装句" },
    { id:504, type:"choice", difficulty:"advanced", question:"The children _____ outside should not make so much noise.", options:["play","playing","played","to play"], answer:1, explanation:"现在分词playing作后置定语，表示正在玩耍的孩子。", topic:"分词作定语" },
    { id:505, type:"choice", difficulty:"advanced", question:"_____ in the queue for half an hour, the old man suddenly realized he had left the wallet in the car.", options:["Waiting","To wait","Having waited","To have waited"], answer:2, explanation:"分词作状语，等待在先，意识到在后，用完成式having waited。", topic:"分词作状语" },
    { id:506, type:"fill_blank", difficulty:"advanced", question:"If it _____ (not rain) tomorrow, we would go for a picnic.", correct_answer:"did not rain", explanation:"虚拟语气：与现在事实相反，if从句用一般过去时。", topic:"虚拟语气" },
    { id:507, type:"fill_blank", difficulty:"advanced", question:"The professor recommended that the student _____ (read) more books.", correct_answer:"read", explanation:"recommend后面的宾语从句用虚拟语气：(should) + 动词原形。", topic:"虚拟语气" },
    { id:508, type:"fill_blank", difficulty:"advanced", question:"Never before _____ such a beautiful sunset.", correct_answer:"have I seen", explanation:"Never before放在句首，主句要部分倒装。", topic:"倒装句" },
    { id:509, type:"choice", difficulty:"advanced", question:"_____ it not been for your help, I would have failed.", options:["Had","Has","Have","If"], answer:0, explanation:"虚拟语气省略if的倒装形式：Had + 主语 + been...。", topic:"虚拟语气" },
    { id:510, type:"choice", difficulty:"advanced", question:"The man _____ book you borrowed is my teacher.", options:["who","whose","whom","which"], answer:1, explanation:"whose在定语从句中表示所属关系，修饰book。", topic:"定语从句" },

    // ==================== 时态语态 ====================
    { id:601, type:"choice", difficulty:"CET-4", question:"She _____ in this company since 2015.", options:["works","worked","has worked","is working"], answer:2, explanation:"since 2015表示从过去到现在，用现在完成时。", topic:"现在完成时" },
    { id:602, type:"choice", difficulty:"CET-4", question:"When I _____ home, my mother was cooking.", options:["arrive","arrived","have arrived","was arriving"], answer:1, explanation:"when引导的时间状语从句，从句用一般过去时。", topic:"一般过去时" },
    { id:603, type:"choice", difficulty:"CET-4", question:"The bridge _____ next year.", options:["will build","will be built","is built","was built"], answer:1, explanation:"next year表示将来时，bridge是被建造，用被动语态。", topic:"将来时被动" },
    { id:604, type:"choice", difficulty:"CET-6", question:"While he _____ TV, the telephone rang.", options:["watches","watched","was watching","is watching"], answer:2, explanation:"while引导的时间状语从句，表示过去某时刻正在进行的动作。", topic:"过去进行时" },
    { id:605, type:"fill_blank", difficulty:"CET-4", question:"I _____ (wait) for you since 9 o'clock.", correct_answer:"have been waiting", explanation:"since + 时间点，主句用现在完成进行时，表示从过去一直持续到现在。", topic:"现在完成进行时" },
    { id:606, type:"fill_blank", difficulty:"CET-4", question:"The letter _____ (write) in English.", correct_answer:"is written", explanation:"信是被写的，用一般现在时的被动语态。", topic:"被动语态" },

    // ==================== 从句专题 ====================
    { id:701, type:"choice", difficulty:"CET-4", question:"This is the house _____ Lu Xun once lived.", options:["which","that","where","when"], answer:2, explanation:"where在定语从句中作地点状语，表示在那里住过。", topic:"定语从句" },
    { id:702, type:"choice", difficulty:"CET-4", question:"I don't know _____ he will come or not.", options:["if","whether","that","what"], answer:1, explanation:"whether...or not是固定搭配，表示是否。", topic:"名词性从句" },
    { id:703, type:"choice", difficulty:"CET-6", question:"_____ is reported in the newspaper, the earthquake has caused many deaths.", options:["That","As","It","What"], answer:1, explanation:"As is reported in the newspaper是固定搭配，as引导非限制性定语从句。", topic:"定语从句" },
    { id:704, type:"choice", difficulty:"CET-6", question:"The reason _____ he was absent was that he was ill.", options:["why","which","for","how"], answer:0, explanation:"reason后面用why引导定语从句。", topic:"定语从句" },
    { id:705, type:"fill_blank", difficulty:"CET-4", question:"The boy _____ father is a doctor is very clever.", correct_answer:"whose", explanation:"whose在定语从句中表示所属关系，修饰father。", topic:"定语从句" },
    { id:706, type:"fill_blank", difficulty:"CET-6", question:"_____ (be) the case, we had better change our plan.", correct_answer:"If", explanation:"If being the case = If that is the case，是虚拟条件句的省略形式。", topic:"条件从句" },

    // ==================== 非谓语动词 ====================
    { id:801, type:"choice", difficulty:"CET-4", question:"_____ from space, the earth looks like a blue ball.", options:["Seeing","Seen","To see","Having seen"], answer:1, explanation:"the earth是被看，用过去分词表被动。", topic:"分词作状语" },
    { id:802, type:"choice", difficulty:"CET-4", question:"The teacher entered the classroom, _____ by two students.", options:["follow","following","followed","to follow"], answer:2, explanation:"过去分词followed作伴随状语，表示被跟随。", topic:"分词作状语" },
    { id:803, type:"choice", difficulty:"CET-6", question:"_____ enough time, we could have done it better.", options:["Giving","Given","To give","Being given"], answer:1, explanation:"given表示如果被给予，是过去分词作条件状语。", topic:"分词作状语" },
    { id:804, type:"choice", difficulty:"CET-6", question:"The first thing _____ is to prepare the materials.", options:["do","to do","doing","done"], answer:1, explanation:"the first/second/last thing后面用不定式作定语。", topic:"不定式作定语" },
    { id:805, type:"fill_blank", difficulty:"CET-4", question:"I remember _____ (see) him somewhere before.", correct_answer:"seeing", explanation:"remember doing表示记得做过某事（已经做了）。", topic:"动名词" },
    { id:806, type:"fill_blank", difficulty:"CET-6", question:"He is said _____ (write) three books.", correct_answer:"to have written", explanation:"be said to have done表示据说已经完成了某事。", topic:"不定式" },

    // ==================== 特殊句型 ====================
    { id:901, type:"choice", difficulty:"CET-4", question:"Little _____ about his own safety, though he was in great danger.", options:["does he care","did he care","he cares","he cared"], answer:1, explanation:"Little放在句首，主句要部分倒装。", topic:"倒装句" },
    { id:902, type:"choice", difficulty:"CET-4", question:"Not only _____ hard, but also he helps others.", options:["he works","does he work","he does work","working he"], answer:1, explanation:"not only放在句首，其所在分句要部分倒装。", topic:"倒装句" },
    { id:903, type:"choice", difficulty:"CET-6", question:"So fast _____ that we couldn't catch up with him.", options:["he ran","did he run","ran he","he runs"], answer:1, explanation:"so...that句型中so提到句首，主句要部分倒装。", topic:"倒装句" },
    { id:904, type:"choice", difficulty:"CET-6", question:"Hardly _____ when the rain stopped.", options:["it had begun","had it begun","it began","did it begin"], answer:1, explanation:"Hardly...when...放在句首，主句用过去完成时并倒装。", topic:"倒装句" },
    { id:905, type:"fill_blank", difficulty:"CET-4", question:"Seldom _____ (go) he to the cinema.", correct_answer:"does he go", explanation:"seldom放在句首，主句要用部分倒装。", topic:"倒装句" },
    { id:906, type:"fill_blank", difficulty:"CET-6", question:"Not until midnight _____ (finish) the work.", correct_answer:"did he finish", explanation:"Not until放在句首，主句要用部分倒装。", topic:"倒装句" },

    // ==================== 固定搭配 ====================
    { id:1001, type:"choice", difficulty:"basic", question:"I am looking forward _____ hearing from you.", options:["at","to","in","for"], answer:1, explanation:"look forward to是固定搭配，to是介词，后面接动名词。", topic:"介词搭配" },
    { id:1002, type:"choice", difficulty:"basic", question:"She is interested _____ learning English.", options:["on","in","at","for"], answer:1, explanation:"be interested in是固定搭配，表示对...感兴趣。", topic:"介词搭配" },
    { id:1003, type:"choice", difficulty:"CET-4", question:"He insisted _____ going there alone.", options:["on","in","at","for"], answer:0, explanation:"insist on doing是固定搭配，表示坚持做某事。", topic:"动词搭配" },
    { id:1004, type:"choice", difficulty:"CET-4", question:"She is good _____ cooking.", options:["in","at","on","for"], answer:1, explanation:"be good at是固定搭配，表示擅长。", topic:"形容词搭配" },
    { id:1005, type:"fill_blank", difficulty:"basic", question:"He is afraid _____ flying.", correct_answer:"of", explanation:"be afraid of是固定搭配，表示害怕。", topic:"介词搭配" },
    { id:1006, type:"fill_blank", difficulty:"CET-4", question:"The teacher is satisfied _____ your work.", correct_answer:"with", explanation:"be satisfied with是固定搭配，表示对...满意。", topic:"介词搭配" },

    // ==================== 冠词与代词 ====================
    { id:1101, type:"choice", difficulty:"basic", question:"There is _____ apple on the table.", options:["a","an","the","/"], answer:1, explanation:"apple以元音开头，用an。", topic:"冠词" },
    { id:1102, type:"choice", difficulty:"basic", question:"_____ sun rises in the east.", options:["A","An","The","/"], answer:2, explanation:"世界上独一无二的事物前用the。", topic:"冠词" },
    { id:1103, type:"choice", difficulty:"CET-4", question:"He has two sisters. One is a teacher, _____ is a nurse.", options:["other","the other","another","others"], answer:1, explanation:"两者中的另一个用the other。", topic:"代词" },
    { id:1104, type:"choice", difficulty:"CET-4", question:"_____ of the students has finished the homework.", options:["Every","Each","All","Both"], answer:1, explanation:"each of + 复数名词，谓语动词用单数。", topic:"代词" },
    { id:1105, type:"fill_blank", difficulty:"basic", question:"This is _____ (I) book.", correct_answer:"my", explanation:"I的形容词性物主代词是my。", topic:"物主代词" },
    { id:1106, type:"fill_blank", difficulty:"CET-4", question:"_____ (they) classroom is very clean.", correct_answer:"Their", explanation:"they的形容词性物主代词是Their。", topic:"物主代词" },

    // ==================== 介词与连词 ====================
    { id:1201, type:"choice", difficulty:"basic", question:"I usually get up _____ 7 o'clock.", options:["in","on","at","for"], answer:2, explanation:"at + 具体时间点。", topic:"介词" },
    { id:1202, type:"choice", difficulty:"basic", question:"We have no classes _____ Sundays.", options:["in","on","at","for"], answer:1, explanation:"on + 星期几。", topic:"介词" },
    { id:1203, type:"choice", difficulty:"CET-4", question:"_____ it rains tomorrow, we will cancel the meeting.", options:["If","Because","Although","Since"], answer:0, explanation:"if引导条件状语从句。", topic:"连词" },
    { id:1204, type:"choice", difficulty:"CET-4", question:"_____ he is young, he knows a lot.", options:["Although","Because","If","So"], answer:0, explanation:"although引导让步状语从句，表示虽然。", topic:"连词" },
    { id:1205, type:"fill_blank", difficulty:"basic", question:"The book is _____ the desk.", correct_answer:"on", explanation:"on表示在...上面。", topic:"介词" },
    { id:1206, type:"fill_blank", difficulty:"CET-4", question:"I will come back _____ three days.", correct_answer:"in", explanation:"in + 一段时间表示在...之后。", topic:"介词" }
  ];

  // 存储到全局变量
  if (typeof window !== 'undefined') {
    window.EXTRA_GRAMMAR = extraExercises;
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
      return result;
    };
  }

})();
