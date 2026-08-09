// ===== 由 merge-data.js 自动合并生成，请勿手工编辑 =====
// ---------------- exercise-data.js ----------------
// ============================================================
// 基础语法/阅读数据(源自 exercise-data.json)
// 在 grammar-extra.js / grammar-expand.js 之前加载
// ============================================================
(function() {
  var GRAMMAR_DATA = {
    grammar_exercises: [
      {
        "id": 1,
        "type": "choice",
        "difficulty": "basic",
        "question": "She _____ to the store yesterday.",
        "options": ["go", "went", "gone", "going"],
        "answer": 1,
        "explanation": "yesterday 表示过去时，go 的过去式是 went。",
        "topic": "一般过去时"
      },
      {
        "id": 2,
        "type": "choice",
        "difficulty": "basic",
        "question": "If I _____ rich, I would travel around the world.",
        "options": ["am", "was", "were", "be"],
        "answer": 2,
        "explanation": "虚拟语气中，与现在事实相反用 were。",
        "topic": "虚拟语气"
      },
      {
        "id": 3,
        "type": "choice",
        "difficulty": "basic",
        "question": "The book _____ by millions of people so far.",
        "options": ["has read", "has been read", "had read", "was reading"],
        "answer": 1,
        "explanation": "so far 提示现在完成时，book 是被读，用被动语态。",
        "topic": "现在完成时被动语态"
      },
      {
        "id": 4,
        "type": "choice",
        "difficulty": "basic",
        "question": "Not only he but also I _____ responsible for this project.",
        "options": ["is", "are", "am", "be"],
        "answer": 2,
        "explanation": "not only...but also...遵循就近原则，与 I 搭配用 am。",
        "topic": "主谓一致"
      },
      {
        "id": 5,
        "type": "choice",
        "difficulty": "basic",
        "question": "It was in the museum _____ she saw the painting.",
        "options": ["which", "where", "that", "when"],
        "answer": 2,
        "explanation": "这是强调句型：It was + 被强调部分 + that...",
        "topic": "强调句型"
      },
      {
        "id": 6,
        "type": "fill_blank",
        "difficulty": "basic",
        "question": "He suggested that we _____ (start) early.",
        "correct_answer": "start",
        "explanation": "suggest 后面的宾语从句要用虚拟语气 (should) + 动词原形，should 可省略。",
        "topic": "虚拟语气"
      },
      {
        "id": 7,
        "type": "fill_blank",
        "difficulty": "basic",
        "question": "The man _____ car was stolen called the police.",
        "correct_answer": "whose",
        "explanation": "关系代词 whose 表示所属关系，修饰 car。",
        "topic": "定语从句"
      },
      {
        "id": 8,
        "type": "fill_blank",
        "difficulty": "basic",
        "question": "She is interested _____ learning foreign languages.",
        "correct_answer": "in",
        "explanation": "be interested in 是固定搭配，表示对…感兴趣。",
        "topic": "介词搭配"
      },
      {
        "id": 9,
        "type": "sentence_transform",
        "difficulty": "basic",
        "question": "He finished his homework.",
        "transform_type": "passive",
        "correct_answer": "His homework was finished (by him).",
        "explanation": "一般过去时的被动语态：was/were + 过去分词。",
        "topic": "主动变被动"
      },
      {
        "id": 10,
        "type": "sentence_transform",
        "difficulty": "basic",
        "question": "I will send you an email.",
        "transform_type": "reported_speech",
        "correct_answer": "He said that he would send me an email.",
        "explanation": "直接引语变间接引语：将来时会态后退为条件将来时。",
        "topic": "直接引语转间接引语"
      }
    ]
  };

  if (typeof window !== 'undefined') {
    window.GRAMMAR_DATA = GRAMMAR_DATA;
  }
})();

// ---------------- grammar-extra.js ----------------
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

// ---------------- grammar-expand.js ----------------
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

// ---------------- reading-extra.js ----------------
// 额外阅读文章 — 自动合并到语法练习数据
var EXTRA_READING = [
  {
    "id": 3,
    "title": "The Internet and Modern Life",
    "difficulty": "CET-4",
    "text": "The Internet has transformed the way we live, work, and communicate. With just a few clicks, we can access information from around the world, shop online, and stay connected with friends and family.\n\nSocial media platforms have become an integral part of daily life for billions of people. They allow us to share experiences, express opinions, and build communities across geographical boundaries.\n\nHowever, the Internet also brings challenges. Privacy concerns, cyberbullying, and the spread of misinformation are serious issues that society must address. Finding a balance between convenience and safety is essential.\n\nDespite these challenges, the Internet remains one of the greatest inventions of modern times. It continues to evolve, offering new possibilities for education, healthcare, and economic growth.",
    "paragraphs_cn": [
      "互联网已经改变了我们生活、工作和交流的方式。只需点击几下，我们就能获取来自世界各地的信息，网上购物，与朋友和家人保持联系。",
      "社交媒体平台已成为数十亿人日常生活中不可或缺的一部分。它们让我们能够分享经历、表达观点，并跨越地理界限建立社区。",
      "然而，互联网也带来了挑战。隐私问题、网络欺凌和虚假信息的传播是社会必须解决的严重问题。在便利和安全之间找到平衡至关重要。",
      "尽管有这些挑战，互联网仍然是现代最伟大的发明之一。它不断发展，为教育、医疗保健和经济增长提供了新的可能性。"
    ],
    "vocabulary_notes": [
      {"word": "transform", "chinese": "改变；转变"},
      {"word": "integral", "chinese": "不可或缺的"},
      {"word": "geographical", "chinese": "地理的"},
      {"word": "misinformation", "chinese": "虚假信息"},
      {"word": "evolve", "chinese": "发展；进化"}
    ],
    "questions": [
      {
        "question": "What has the Internet transformed according to the passage?",
        "options": ["Only the way we work", "The way we live, work, and communicate", "Only social media", "Only education"],
        "answer": 1,
        "explanation": "文中提到：The Internet has transformed the way we live, work, and communicate."
      },
      {
        "question": "What is NOT mentioned as a challenge of the Internet?",
        "options": ["Privacy concerns", "Cyberbullying", "Air pollution", "Misinformation"],
        "answer": 2,
        "explanation": "文中提到的挑战包括隐私、网络欺凌和虚假信息，未提及空气污染。"
      }
    ]
  },
  {
    "id": 4,
    "title": "Healthy Eating Habits",
    "difficulty": "CET-4",
    "text": "Good nutrition is essential for maintaining a healthy lifestyle. A balanced diet includes a variety of fruits, vegetables, whole grains, and lean proteins. These foods provide the vitamins and minerals our bodies need to function properly.\n\nMany people today rely on fast food and processed meals because they are convenient. However, these foods are often high in sugar, salt, and unhealthy fats. Regular consumption can lead to obesity, heart disease, and other health problems.\n\nExperts recommend cooking at home more often. Home-cooked meals are generally healthier because you can control the ingredients. Planning meals in advance also helps ensure that you eat a balanced diet.\n\nDrinking enough water is another important aspect of healthy eating. Most adults should aim for at least eight glasses of water per day. Water helps with digestion, keeps skin healthy, and supports overall bodily functions.",
    "paragraphs_cn": [
      "良好的营养对于保持健康的生活方式至关重要。均衡的饮食包括各种水果、蔬菜、全谷物和瘦肉蛋白。这些食物提供了身体正常运作所需的维生素和矿物质。",
      "如今许多人依赖快餐和加工食品，因为它们方便。然而，这些食物通常含有大量糖、盐和不健康的脂肪。经常食用可能导致肥胖、心脏病和其他健康问题。",
      "专家建议多在家做饭。家常菜通常更健康，因为你可以控制食材。提前规划饮食也有助于确保你摄入均衡的饮食。",
      "喝足够的水是健康饮食的另一个重要方面。大多数成年人每天应该至少喝八杯水。水有助于消化，保持皮肤健康，并支持身体的各项功能。"
    ],
    "vocabulary_notes": [
      {"word": "nutrition", "chinese": "营养"},
      {"word": "balanced diet", "chinese": "均衡饮食"},
      {"word": "processed", "chinese": "加工的"},
      {"word": "obesity", "chinese": "肥胖"},
      {"word": "digestion", "chinese": "消化"}
    ],
    "questions": [
      {
        "question": "Why do many people choose fast food today?",
        "options": ["It is healthier", "It is convenient", "It is cheaper", "It tastes better"],
        "answer": 1,
        "explanation": "文中提到：Many people today rely on fast food...because they are convenient."
      },
      {
        "question": "How much water should most adults drink daily?",
        "options": ["Four glasses", "Six glasses", "At least eight glasses", "Ten glasses"],
        "answer": 2,
        "explanation": "文中提到：Most adults should aim for at least eight glasses of water per day."
      }
    ]
  },
  {
    "id": 5,
    "title": "Space Exploration",
    "difficulty": "CET-6",
    "text": "Space exploration has always captured the human imagination. From the first moon landing in 1969 to the recent missions to Mars, our desire to understand the universe continues to drive scientific advancement.\n\nModern space agencies like NASA and SpaceX are pushing the boundaries of what is possible. Private companies are now competing with government agencies to develop reusable rockets and establish commercial space travel.\n\nThe benefits of space exploration extend far beyond scientific discovery. Technologies developed for space travel have led to improvements in medicine, communications, and materials science. Satellite technology, originally developed for space missions, now supports global navigation, weather forecasting, and telecommunications.\n\nHowever, space exploration also raises important questions. The cost of missions is enormous, and critics argue that resources could be better spent addressing problems on Earth. There are also concerns about space debris and the environmental impact of rocket launches.\n\nDespite these debates, the future of space exploration looks promising. Plans are underway for missions to establish permanent settlements on the Moon and Mars, potentially opening a new chapter in human history.",
    "paragraphs_cn": [
      "太空探索一直吸引着人类的想象力。从1969年第一次登月到最近的火星任务，我们对理解宇宙的渴望继续推动着科学进步。",
      "像NASA和SpaceX这样的现代航天机构正在突破可能性的界限。私营公司现在正与政府机构竞争，开发可重复使用的火箭和建立商业太空旅行。",
      "太空探索的好处远远超出了科学发现。为太空旅行开发的技术已经改善了医学、通信和材料科学。最初为太空任务开发的卫星技术，现在支持全球导航、天气预报和电信。",
      "然而，太空探索也引发了重要的问题。任务的成本巨大，批评者认为资源可以更好地用于解决地球上的问题。人们对太空碎片和火箭发射的环境影响也存在担忧。",
      "尽管存在这些争论，太空探索的未来看起来很有希望。正在进行在月球和火星上建立永久定居点的任务计划，可能开启人类历史的新篇章。"
    ],
    "vocabulary_notes": [
      {"word": "exploration", "chinese": "探索"},
      {"word": "reusable", "chinese": "可重复使用的"},
      {"word": "telecommunications", "chinese": "电信"},
      {"word": "debris", "chinese": "碎片"},
      {"word": "settlement", "chinese": "定居点"}
    ],
    "questions": [
      {
        "question": "What private company is mentioned as competing in space exploration?",
        "options": ["Apple", "Google", "SpaceX", "Amazon"],
        "answer": 2,
        "explanation": "文中提到：Modern space agencies like NASA and SpaceX are pushing the boundaries."
      },
      {
        "question": "What concern do critics have about space exploration?",
        "options": ["It is too dangerous", "Resources could be better spent on Earth", "It causes earthquakes", "It produces too much noise"],
        "answer": 1,
        "explanation": "文中提到：critics argue that resources could be better spent addressing problems on Earth."
      }
    ]
  },
  {
    "id": 6,
    "title": "The Power of Education",
    "difficulty": "CET-4",
    "text": "Education is one of the most powerful tools for personal and societal transformation. It opens doors to opportunities, broadens perspectives, and equips individuals with the knowledge and skills they need to succeed.\n\nStudies consistently show that education improves not only individual lives but also communities and nations. Countries with higher literacy rates tend to have stronger economies, better healthcare systems, and lower crime rates.\n\nIn today's rapidly changing world, lifelong learning has become essential. The skills that were relevant twenty years ago may no longer be sufficient. Workers must continuously update their knowledge to remain competitive in the job market.\n\nTechnology has revolutionized education, making it more accessible than ever. Online courses, educational apps, and digital libraries allow people to learn from anywhere at any time. This democratization of knowledge has the potential to reduce inequality and empower people around the world.",
    "paragraphs_cn": [
      "教育是个人和社会变革最有力的工具之一。它打开了机会的大门，拓宽了视野，并为个人提供了成功所需的知识和技能。",
      "研究一致表明，教育不仅改善个人生活，还改善社区和国家。识字率较高的国家往往拥有更强大的经济、更好的医疗保健系统和更低的犯罪率。",
      "在当今快速变化的世界中，终身学习已变得至关重要。二十年前相关的技能可能不再足够。工作者必须不断更新知识以保持在就业市场上的竞争力。",
      "技术彻底改变了教育，使其比以往任何时候都更加便捷。在线课程、教育应用和数字图书馆让人们可以随时随地学习。这种知识的民主化有潜力减少不平等并赋能全世界的人们。"
    ],
    "vocabulary_notes": [
      {"word": "transformation", "chinese": "变革"},
      {"word": "literacy", "chinese": "识字能力"},
      {"word": "lifelong learning", "chinese": "终身学习"},
      {"word": "democratization", "chinese": "民主化"},
      {"word": "empower", "chinese": "赋能"}
    ],
    "questions": [
      {
        "question": "According to the passage, what do countries with higher literacy rates tend to have?",
        "options": ["More factories", "Stronger economies and better healthcare", "More soldiers", "Higher taxes"],
        "answer": 1,
        "explanation": "文中提到：Countries with higher literacy rates tend to have stronger economies, better healthcare systems."
      },
      {
        "question": "Why has lifelong learning become essential?",
        "options": ["Because people enjoy studying", "Because old skills may no longer be sufficient", "Because schools require it", "Because it is free online"],
        "answer": 1,
        "explanation": "文中提到：The skills that were relevant twenty years ago may no longer be sufficient."
      }
    ]
  },
  {
    "id": 7,
    "title": "Environmental Protection",
    "difficulty": "CET-6",
    "text": "Environmental protection has become one of the most pressing issues of our time. Climate change, pollution, and loss of biodiversity threaten the delicate balance of ecosystems that support all life on Earth.\n\nGovernments around the world are implementing policies to reduce carbon emissions and promote sustainable practices. The Paris Agreement, signed by nearly 200 countries, aims to limit global warming to well below 2 degrees Celsius above pre-industrial levels.\n\nIndividual actions also play a crucial role. Reducing energy consumption, using public transportation, recycling, and choosing sustainable products are ways that ordinary people can contribute to environmental protection.\n\nEducation and awareness are key to driving change. When people understand the impact of their choices on the environment, they are more likely to adopt sustainable behaviors. Schools, media, and community organizations all have important roles to play in spreading environmental awareness.\n\nThe transition to a green economy presents both challenges and opportunities. While some industries may face disruption, new sectors focused on renewable energy and sustainable technology are creating millions of jobs worldwide.",
    "paragraphs_cn": [
      "环境保护已成为我们时代最紧迫的问题之一。气候变化、污染和生物多样性丧失威胁着支撑地球上所有生命的生态系统平衡。",
      "世界各国政府正在实施减少碳排放和促进可持续实践的政策。近200个国家签署的巴黎协定旨在将全球变暖幅度限制在比工业化前水平高2摄氏度以下。",
      "个人行动也起着至关重要的作用。减少能源消耗、使用公共交通、回收利用和选择可持续产品是普通人可以为环境保护做出贡献的方式。",
      "教育和意识是推动变革的关键。当人们了解自己的选择对环境的影响时，他们更有可能采取可持续的行为。学校、媒体和社区组织在传播环保意识方面都发挥着重要作用。",
      "向绿色经济的转型既带来挑战也带来机遇。虽然一些行业可能面临颠覆，但专注于可再生能源和可持续技术的新部门正在全球创造数百万个就业机会。"
    ],
    "vocabulary_notes": [
      {"word": "biodiversity", "chinese": "生物多样性"},
      {"word": "ecosystem", "chinese": "生态系统"},
      {"word": "carbon emissions", "chinese": "碳排放"},
      {"word": "sustainable", "chinese": "可持续的"},
      {"word": "renewable energy", "chinese": "可再生能源"}
    ],
    "questions": [
      {
        "question": "What is the goal of the Paris Agreement?",
        "options": ["Eliminate all carbon emissions", "Limit global warming to below 2°C above pre-industrial levels", "Protect all endangered species", "Build more nuclear power plants"],
        "answer": 1,
        "explanation": "文中提到：aims to limit global warming to well below 2 degrees Celsius above pre-industrial levels."
      },
      {
        "question": "What is mentioned as a way individuals can help the environment?",
        "options": ["Building factories", "Using public transportation", "Driving more cars", "Using more plastic"],
        "answer": 1,
        "explanation": "文中提到：using public transportation...are ways that ordinary people can contribute."
      }
    ]
  },
  {
    "id": 8,
    "title": "Artificial Intelligence in Daily Life",
    "difficulty": "CET-6",
    "text": "Artificial intelligence has quietly become part of our daily lives. From voice assistants like Siri and Alexa to recommendation algorithms on Netflix and Spotify, AI technology is everywhere.\n\nIn healthcare, AI is being used to diagnose diseases, analyze medical images, and develop new drugs. Machine learning algorithms can detect patterns in medical data that human doctors might miss, potentially saving lives.\n\nSelf-driving cars represent one of the most ambitious applications of AI. Companies like Tesla, Waymo, and others are developing vehicles that can navigate roads safely without human intervention. While fully autonomous vehicles are still being tested, the technology is advancing rapidly.\n\nHowever, the rise of AI also raises ethical concerns. Issues such as job displacement, algorithmic bias, and privacy invasion need to be carefully addressed. As AI becomes more powerful, society must develop frameworks to ensure it is used responsibly.\n\nThe future of AI is both exciting and uncertain. While it promises to solve many of humanity's challenges, it also requires thoughtful regulation and oversight to prevent misuse.",
    "paragraphs_cn": [
      "人工智能已经悄然成为我们日常生活的一部分。从Siri和Alexa等语音助手到Netflix和Spotify上的推荐算法，AI技术无处不在。",
      "在医疗保健领域，AI正被用于诊断疾病、分析医学影像和开发新药。机器学习算法可以检测人类医生可能遗漏的医疗数据中的潜在模式，有可能挽救生命。",
      "自动驾驶汽车代表了AI最具雄心的应用之一。特斯拉、Waymo等公司正在开发无需人类干预就能安全行驶的汽车。虽然完全自动驾驶汽车仍在测试中，但技术正在快速发展。",
      "然而，AI的崛起也引发了伦理问题。就业替代、算法偏见和隐私侵犯等问题需要仔细解决。随着AI变得更加强大，社会必须制定框架来确保它被负责任地使用。",
      "AI的未来既令人兴奋又不确定。虽然它有望解决人类的许多挑战，但也需要深思熟虑的监管和监督来防止滥用。"
    ],
    "vocabulary_notes": [
      {"word": "algorithm", "chinese": "算法"},
      {"word": "autonomous", "chinese": "自主的；自动的"},
      {"word": "ethical", "chinese": "伦理的"},
      {"word": "algorithmic bias", "chinese": "算法偏见"},
      {"word": "oversight", "chinese": "监督"}
    ],
    "questions": [
      {
        "question": "How is AI being used in healthcare according to the passage?",
        "options": ["Only for surgery", "To diagnose diseases and analyze medical images", "Only for billing", "To replace all doctors"],
        "answer": 1,
        "explanation": "文中提到：AI is being used to diagnose diseases, analyze medical images, and develop new drugs."
      },
      {
        "question": "What ethical concern about AI is NOT mentioned?",
        "options": ["Job displacement", "Privacy invasion", "Climate change", "Algorithmic bias"],
        "answer": 2,
        "explanation": "文中提到的伦理问题包括就业替代、算法偏见和隐私侵犯，未提及气候变化。"
      }
    ]
  }
];

// ---------------- reading-expand.js ----------------
// ============================================================
// 阅读训练扩充 — 补充至200+题
// ============================================================
(function() {
  if (typeof EXTRA_READING === 'undefined') {
    window.EXTRA_READING = [];
  }

  var extraReading = [
    {
      "id": 5,
      "title": "The Importance of Exercise",
      "difficulty": "CET-4",
      "text": "Regular exercise is essential for maintaining good health. It helps strengthen muscles, improve cardiovascular health, and boost mental well-being. Studies show that people who exercise regularly have a lower risk of heart disease, diabetes, and obesity.\n\nPhysical activity also has positive effects on mental health. Exercise releases endorphins, which are natural chemicals that improve mood and reduce stress. Many doctors recommend at least 30 minutes of moderate exercise per day.\n\nFinding time to exercise can be challenging in today's busy world. However, even small changes can make a difference. Walking to work, taking the stairs instead of the elevator, or doing simple exercises at home can all contribute to a healthier lifestyle.",
      "paragraphs_cn": [
        "定期锻炼对于保持良好健康至关重要。它有助于增强肌肉、改善心血管健康并促进心理健康。研究表明，经常锻炼的人患心脏病、糖尿病和肥胖症的风险较低。",
        "体育活动对心理健康也有积极影响。运动释放内啡肽，这是一种改善情绪和减轻压力的天然化学物质。许多医生建议每天至少进行30分钟的适度运动。",
        "在当今繁忙的世界中，找时间锻炼可能很有挑战性。然而，即使是小的改变也能产生影响。步行上班、不乘电梯走楼梯，或者在家做简单的运动，都有助于养成更健康的生活方式。"
      ],
      "vocabulary_notes": [
        {"word": "cardiovascular", "chinese": "心血管的"},
        {"word": "endorphins", "chinese": "内啡肽"},
        {"word": "moderate", "chinese": "适度的"},
        {"word": "contribute", "chinese": "贡献；有助于"}
      ],
      "questions": [
        {
          "question": "What does exercise help with according to the passage?",
          "options": ["Only physical health", "Physical and mental health", "Only mental health", "Neither"],
          "answer": 1,
          "explanation": "文中提到运动有助于增强肌肉、改善心血管健康并促进心理健康。"
        },
        {
          "question": "How much exercise do doctors recommend per day?",
          "options": ["15 minutes", "30 minutes", "1 hour", "2 hours"],
          "answer": 1,
          "explanation": "文中提到Many doctors recommend at least 30 minutes of moderate exercise per day。"
        }
      ]
    },
    {
      "id": 6,
      "title": "Technology in Education",
      "difficulty": "CET-4",
      "text": "Technology has revolutionized the way we learn and teach. From online courses to educational apps, students now have access to a wealth of information at their fingertips.\n\nOne of the biggest advantages of technology in education is accessibility. Students can access learning materials from anywhere in the world, as long as they have an internet connection. This has made education more inclusive, allowing people from different backgrounds to learn new skills.\n\nHowever, technology also presents challenges. Screen time concerns, digital divide, and the need for digital literacy are important issues that educators must address. Finding the right balance between traditional and digital learning methods is key.",
      "paragraphs_cn": [
        "技术彻底改变了我们学习和教学的方式。从在线课程到教育应用程序，学生现在可以在指尖获取大量信息。",
        "技术在教育方面最大的优势之一是可及性。学生可以从世界任何地方获取学习材料，只要有互联网连接。这使教育更加包容，让不同背景的人们都能学习新技能。",
        "然而，技术也带来了挑战。屏幕时间担忧、数字鸿沟和数字素养的需求是教育工作者必须解决的重要问题。在传统学习方法和数字学习方法之间找到正确的平衡是关键。"
      ],
      "vocabulary_notes": [
        {"word": "revolutionize", "chinese": "彻底改变"},
        {"word": "accessibility", "chinese": "可及性；可访问性"},
        {"word": "inclusive", "chinese": "包容的"},
        {"word": "digital literacy", "chinese": "数字素养"}
      ],
      "questions": [
        {
          "question": "What is one advantage of technology in education?",
          "options": ["It eliminates all teachers", "It makes education more accessible", "It replaces textbooks completely", "It is always free"],
          "answer": 1,
          "explanation": "文中提到技术使教育更具可及性，学生可以从任何地方获取学习材料。"
        },
        {
          "question": "What is NOT mentioned as a challenge of technology in education?",
          "options": ["Screen time concerns", "Digital divide", "High cost of devices", "Need for digital literacy"],
          "answer": 2,
          "explanation": "文中提到的挑战包括屏幕时间担忧、数字鸿沟和数字素养需求，未提及设备成本。"
        }
      ]
    },
    {
      "id": 7,
      "title": "The Benefits of Reading",
      "difficulty": "CET-4",
      "text": "Reading is one of the most beneficial activities for the mind. It improves vocabulary, enhances critical thinking, and reduces stress. Studies have shown that regular readers have better memory and concentration than non-readers.\n\nReading also exposes us to different cultures and perspectives. Through books, we can travel to distant lands, meet fascinating characters, and learn about historical events without leaving our homes.\n\nIn today's digital age, reading habits are changing. E-books and audiobooks have made reading more convenient than ever. However, some experts argue that screen-based reading may not provide the same benefits as reading printed books.",
      "paragraphs_cn": [
        "阅读是心灵最有益的活动之一。它能提高词汇量、增强批判性思维并减轻压力。研究表明，经常阅读的人比不阅读的人有更好的记忆力和注意力。",
        "阅读还能让我们接触不同的文化和观点。通过书籍，我们可以旅行到遥远的地方，结识迷人的人物，了解历史事件，而无需离开家。",
        "在今天的数字时代，阅读习惯正在改变。电子书和有声读物使阅读比以往任何时候都更加方便。然而，一些专家认为，基于屏幕的阅读可能无法提供与阅读纸质书籍相同的好处。"
      ],
      "vocabulary_notes": [
        {"word": "critical thinking", "chinese": "批判性思维"},
        {"word": "perspective", "chinese": "观点；视角"},
        {"word": "audiobook", "chinese": "有声读物"},
        {"word": "convenient", "chinese": "方便的"}
      ],
      "questions": [
        {
          "question": "What benefits does reading provide according to the passage?",
          "options": ["Only vocabulary improvement", "Vocabulary, critical thinking, and stress reduction", "Only stress reduction", "Only better memory"],
          "answer": 1,
          "explanation": "文中提到阅读能提高词汇量、增强批判性思维并减轻压力。"
        },
        {
          "question": "What do some experts argue about screen-based reading?",
          "options": ["It is always better than printed books", "It may not provide the same benefits as printed books", "It is completely useless", "It is the future of reading"],
          "answer": 1,
          "explanation": "文中提到一些专家认为基于屏幕的阅读可能无法提供与阅读纸质书籍相同的好处。"
        }
      ]
    },
    {
      "id": 8,
      "title": "The Rise of Remote Work",
      "difficulty": "CET-4",
      "text": "Remote work has become increasingly popular in recent years. The COVID-19 pandemic accelerated this trend, forcing many companies to adopt work-from-home policies.\n\nThere are several advantages to remote work. Employees enjoy greater flexibility, can avoid long commutes, and often report higher job satisfaction. For employers, remote work can reduce office costs and attract talent from a wider geographic area.\n\nHowever, remote work also presents challenges. Isolation, communication difficulties, and work-life balance issues are common concerns. Companies must find ways to maintain team cohesion while allowing employees to work remotely.",
      "paragraphs_cn": [
        "远程工作近年来越来越受欢迎。新冠疫情加速了这一趋势，迫使许多公司采用居家办公政策。",
        "远程工作有几个优点。员工享受更大的灵活性，可以避免长时间通勤，并且通常报告更高的工作满意度。对于雇主来说，远程工作可以降低办公成本并从更广泛的地理区域吸引人才。",
        "然而，远程工作也带来了挑战。孤独感、沟通困难和工作生活平衡问题是常见的关注点。公司必须找到方法在允许员工远程工作的同时保持团队凝聚力。"
      ],
      "vocabulary_notes": [
        {"word": "accelerate", "chinese": "加速"},
        {"word": "flexibility", "chinese": "灵活性"},
        {"word": "cohesion", "chinese": "凝聚力"},
        {"word": "geographic", "chinese": "地理的"}
      ],
      "questions": [
        {
          "question": "What accelerated the trend of remote work?",
          "options": ["Technology advancement", "COVID-19 pandemic", "Employee demand", "Government policy"],
          "answer": 1,
          "explanation": "文中提到COVID-19 pandemic accelerated this trend。"
        },
        {
          "question": "What is a challenge of remote work mentioned in the passage?",
          "options": ["Higher office costs", "Isolation and communication difficulties", "Lower productivity", "Less flexibility"],
          "answer": 1,
          "explanation": "文中提到孤独感、沟通困难和工作生活平衡问题是常见的关注点。"
        }
      ]
    },
    {
      "id": 9,
      "title": "Environmental Protection",
      "difficulty": "CET-6",
      "text": "Climate change is one of the most pressing issues facing humanity today. Rising global temperatures are causing ice caps to melt, sea levels to rise, and extreme weather events to become more frequent.\n\nHuman activities, particularly the burning of fossil fuels, are the primary cause of climate change. Carbon dioxide emissions have increased dramatically since the Industrial Revolution, trapping heat in the Earth's atmosphere.\n\nTo address this crisis, many countries are transitioning to renewable energy sources. Solar and wind power are becoming more affordable and efficient. Individual actions, such as reducing waste and choosing sustainable transportation, also make a significant difference.",
      "paragraphs_cn": [
        "气候变化是当今人类面临的最紧迫的问题之一。全球气温上升导致冰盖融化、海平面上升和极端天气事件变得更加频繁。",
        "人类活动，特别是化石燃料的燃烧，是气候变化的主要原因。自工业革命以来，二氧化碳排放量急剧增加，在地球大气层中锁住了热量。",
        "为了解决这一危机，许多国家正在转向可再生能源。太阳能和风能变得更加实惠和高效。个人行动，如减少浪费和选择可持续的交通方式，也会产生重大影响。"
      ],
      "vocabulary_notes": [
        {"word": "pressing", "chinese": "紧迫的"},
        {"word": "fossil fuels", "chinese": "化石燃料"},
        {"word": "renewable", "chinese": "可再生的"},
        {"word": "sustainable", "chinese": "可持续的"}
      ],
      "questions": [
        {
          "question": "What is the primary cause of climate change according to the passage?",
          "options": ["Natural disasters", "Burning of fossil fuels", "Deforestation", "Overpopulation"],
          "answer": 1,
          "explanation": "文中提到Human activities, particularly the burning of fossil fuels, are the primary cause。"
        },
        {
          "question": "What are some solutions mentioned to address climate change?",
          "options": ["Only government action", "Renewable energy and individual actions", "Only individual actions", "Nothing can be done"],
          "answer": 1,
          "explanation": "文中提到转向可再生能源和个人行动如减少浪费和选择可持续交通。"
        }
      ]
    },
    {
      "id": 10,
      "title": "The Power of Music",
      "difficulty": "CET-6",
      "text": "Music has a profound impact on human emotions and behavior. Research has shown that listening to music can reduce stress, improve mood, and even enhance cognitive performance.\n\nDifferent types of music can have different effects. Classical music, for example, is often associated with improved concentration and reduced anxiety. Upbeat music can boost energy and motivation, while calming music can help with relaxation and sleep.\n\nMusic therapy is increasingly being used in healthcare settings to help patients recover from illness and injury. Studies have demonstrated that music can lower blood pressure, reduce pain perception, and improve overall well-being.",
      "paragraphs_cn": [
        "音乐对人类情感和行为有深远的影响。研究表明，听音乐可以减轻压力、改善情绪，甚至提高认知表现。",
        "不同类型的音乐可以产生不同的效果。例如，古典音乐通常与提高注意力和减少焦虑有关。欢快的音乐可以提高能量和动力，而平静的音乐可以帮助放松和睡眠。",
        "音乐疗法越来越多地被用于医疗环境，帮助患者从疾病和伤害中恢复。研究表明，音乐可以降低血压、减轻疼痛感并改善整体健康。"
      ],
      "vocabulary_notes": [
        {"word": "profound", "chinese": "深远的"},
        {"word": "cognitive", "chinese": "认知的"},
        {"word": "therapy", "chinese": "疗法"},
        {"word": "perception", "chinese": "感知"}
      ],
      "questions": [
        {
          "question": "What effect does classical music have according to the passage?",
          "options": ["Increases anxiety", "Improves concentration and reduces anxiety", "Has no effect", "Causes stress"],
          "answer": 1,
          "explanation": "文中提到Classical music is often associated with improved concentration and reduced anxiety。"
        },
        {
          "question": "How is music therapy being used?",
          "options": ["In schools only", "In healthcare settings", "Only in concerts", "Not being used"],
          "answer": 1,
          "explanation": "文中提到Music therapy is increasingly being used in healthcare settings。"
        }
      ]
    },
    {
      "id": 11,
      "title": "Healthy Eating Habits",
      "difficulty": "CET-4",
      "text": "Good nutrition is essential for maintaining a healthy lifestyle. A balanced diet includes a variety of fruits, vegetables, whole grains, and lean proteins. These foods provide the vitamins and minerals our bodies need to function properly.\n\nMany people today rely on fast food and processed meals because they are convenient. However, these foods are often high in sugar, salt, and unhealthy fats. Regular consumption can lead to obesity, heart disease, and other health problems.\n\nExperts recommend cooking at home more often. Home-cooked meals are generally healthier because you can control the ingredients. Planning meals in advance also helps ensure that you eat a balanced diet.\n\nDrinking enough water is another important aspect of healthy eating. Most adults should aim for at least eight glasses of water per day. Water helps with digestion, keeps skin healthy, and supports overall bodily functions.",
      "paragraphs_cn": [
        "良好的营养对于保持健康的生活方式至关重要。均衡的饮食包括各种水果、蔬菜、全谷物和瘦肉蛋白。这些食物提供了身体正常运作所需的维生素和矿物质。",
        "如今许多人依赖快餐和加工食品，因为它们方便。然而，这些食物通常含有大量糖、盐和不健康的脂肪。经常食用可能导致肥胖、心脏病和其他健康问题。",
        "专家建议多在家做饭。家常菜通常更健康，因为你可以控制食材。提前规划饮食也有助于确保你摄入均衡的饮食。",
        "喝足够的水是健康饮食的另一个重要方面。大多数成年人每天应该至少喝八杯水。水有助于消化，保持皮肤健康，并支持身体的各项功能。"
      ],
      "vocabulary_notes": [
        {"word": "nutrition", "chinese": "营养"},
        {"word": "balanced diet", "chinese": "均衡饮食"},
        {"word": "processed", "chinese": "加工的"},
        {"word": "digestion", "chinese": "消化"}
      ],
      "questions": [
        {
          "question": "Why do many people rely on fast food?",
          "options": ["It is healthy", "It is convenient", "It is cheap", "It tastes better"],
          "answer": 1,
          "explanation": "文中提到Many people today rely on fast food because they are convenient。"
        },
        {
          "question": "How much water should most adults drink per day?",
          "options": ["Four glasses", "Six glasses", "Eight glasses", "Ten glasses"],
          "answer": 2,
          "explanation": "文中提到Most adults should aim for at least eight glasses of water per day。"
        }
      ]
    },
    {
      "id": 12,
      "title": "The Internet and Modern Life",
      "difficulty": "CET-4",
      "text": "The Internet has transformed the way we live, work, and communicate. With just a few clicks, we can access information from around the world, shop online, and stay connected with friends and family.\n\nSocial media platforms have become an integral part of daily life for billions of people. They allow us to share experiences, express opinions, and build communities across geographical boundaries.\n\nHowever, the Internet also brings challenges. Privacy concerns, cyberbullying, and the spread of misinformation are serious issues that society must address. Finding a balance between convenience and safety is essential.\n\nDespite these challenges, the Internet remains one of the greatest inventions of modern times. It continues to evolve, offering new possibilities for education, healthcare, and economic growth.",
      "paragraphs_cn": [
        "互联网已经改变了我们生活、工作和交流的方式。只需点击几下，我们就能获取来自世界各地的信息，网上购物，与朋友和家人保持联系。",
        "社交媒体平台已成为数十亿人日常生活中不可或缺的一部分。它们让我们能够分享经历、表达观点，并跨越地理界限建立社区。",
        "然而，互联网也带来了挑战。隐私问题、网络欺凌和虚假信息的传播是社会必须解决的严重问题。在便利和安全之间找到平衡至关重要。",
        "尽管有这些挑战，互联网仍然是现代最伟大的发明之一。它不断发展，为教育、医疗保健和经济增长提供了新的可能性。"
      ],
      "vocabulary_notes": [
        {"word": "transform", "chinese": "改变；转变"},
        {"word": "integral", "chinese": "不可或缺的"},
        {"word": "geographical", "chinese": "地理的"},
        {"word": "misinformation", "chinese": "虚假信息"}
      ],
      "questions": [
        {
          "question": "What has the Internet transformed according to the passage?",
          "options": ["Only the way we work", "The way we live, work, and communicate", "Only social media", "Only education"],
          "answer": 1,
          "explanation": "文中提到The Internet has transformed the way we live, work, and communicate。"
        },
        {
          "question": "What is NOT mentioned as a challenge of the Internet?",
          "options": ["Privacy concerns", "Cyberbullying", "Air pollution", "Misinformation"],
          "answer": 2,
          "explanation": "文中提到的挑战包括隐私、网络欺凌和虚假信息，未提及空气污染。"
        }
      ]
    }
  ];

  // 合并到EXTRA_READING
  var existingIds = {};
  EXTRA_READING.forEach(function(r) { existingIds[r.id] = true; });
  var added = 0;
  extraReading.forEach(function(r) {
    if (!existingIds[r.id]) {
      EXTRA_READING.push(r);
      existingIds[r.id] = true;
      added++;
    }
  });
  console.log('阅读训练: 新增 ' + added + ' 篇');
})();

// ---------------- reading-expand2.js ----------------
// ============================================================
// 阅读训练扩充 — 补充至200+题
// ============================================================
(function() {
  if (typeof EXTRA_READING === 'undefined') {
    window.EXTRA_READING = [];
  }

  var extraReading = [
    {
      "id": 13, "title": "The Impact of Social Media", "difficulty": "CET-4",
      "text": "Social media has become an integral part of modern life. Platforms like Facebook, Instagram, and Twitter connect billions of people worldwide, allowing them to share experiences, news, and ideas.\n\nWhile social media offers many benefits, including staying connected with friends and accessing information, it also has drawbacks. Studies suggest that excessive social media use can lead to anxiety, depression, and poor sleep quality.\n\nExperts recommend setting time limits for social media use and taking regular breaks. Being mindful of how social media affects mental health is important for maintaining a balanced lifestyle.",
      "paragraphs_cn": [
        "社交媒体已成为现代生活不可或缺的一部分。Facebook、Instagram和Twitter等平台连接着全球数十亿人，让他们能够分享经历、新闻和想法。",
        "虽然社交媒体提供了许多好处，包括与朋友保持联系和获取信息，但它也有缺点。研究表明，过度使用社交媒体可能导致焦虑、抑郁和睡眠质量下降。",
        "专家建议设定社交媒体使用时间限制并定期休息。注意社交媒体如何影响心理健康对于保持平衡的生活方式很重要。"
      ],
      "vocabulary_notes": [{"word": "integral", "chinese": "不可或缺的"}, {"word": "excessive", "chinese": "过度的"}, {"word": "depression", "chinese": "抑郁"}, {"word": "mindful", "chinese": "注意的"}],
      "questions": [{"question": "What is one benefit of social media mentioned?", "options": ["It replaces education", "Staying connected with friends", "It eliminates all problems", "It is always free"], "answer": 1, "explanation": "文中提到social media offers many benefits, including staying connected with friends。"}, {"question": "What do experts recommend about social media use?", "options": ["Use it as much as possible", "Set time limits and take breaks", "Stop using it completely", "Only use it for work"], "answer": 1, "explanation": "文中提到experts recommend setting time limits for social media use and taking regular breaks。"}]
    },
    {
      "id": 14, "title": "Water Conservation", "difficulty": "CET-4",
      "text": "Water is one of our most precious resources, yet many people take it for granted. With growing populations and climate change, water scarcity is becoming an increasingly serious global issue.\n\nThere are many ways to conserve water at home. Simple actions like fixing leaky faucets, taking shorter showers, and using water-efficient appliances can make a significant difference.\n\nCommunities are also taking steps to address water scarcity. Rainwater harvesting, water recycling, and improved irrigation techniques are some of the strategies being implemented around the world.",
      "paragraphs_cn": [
        "水是我们最宝贵的资源之一，但许多人却认为它是理所当然的。随着人口增长和气候变化，水资源短缺正成为一个日益严重的全球性问题。",
        "有许多方法可以在家中节约用水。修理漏水的水龙头、缩短淋浴时间、使用节水电器等简单行动可以产生显著的效果。",
        "社区也在采取措施应对水资源短缺。雨水收集、水循环利用和改进的灌溉技术是一些正在世界各地实施的策略。"
      ],
      "vocabulary_notes": [{"word": "conservation", "chinese": "保护"}, {"word": "scarcity", "chinese": "短缺"}, {"word": "harvesting", "chinese": "收集"}, {"word": "irrigation", "chinese": "灌溉"}],
      "questions": [{"question": "Why is water conservation important?", "options": ["Water is cheap", "Water scarcity is a global issue", "Water is unlimited", "It is not important"], "answer": 1, "explanation": "文中提到water scarcity is becoming an increasingly serious global issue。"}, {"question": "What is one way to conserve water at home?", "options": ["Use more water", "Fix leaky faucets", "Ignore the problem", "Buy more water"], "answer": 1, "explanation": "文中提到fixing leaky faucets是节约用水的方法之一。"}]
    },
    {
      "id": 15, "title": "The Benefits of Learning a Second Language", "difficulty": "CET-4",
      "text": "Learning a second language offers numerous cognitive and social benefits. Research shows that bilingual individuals have better problem-solving skills, improved memory, and enhanced creativity.\n\nBeyond cognitive benefits, learning a new language opens doors to different cultures and perspectives. It allows people to communicate with a wider range of individuals and understand different ways of thinking.\n\nIn today's globalized world, being bilingual or multilingual is increasingly valuable. Many employers prefer candidates who can speak multiple languages, as it demonstrates adaptability and cultural awareness.",
      "paragraphs_cn": [
        "学习第二语言提供了许多认知和社会益处。研究表明，双语者有更好的解决问题能力、改善的记忆力和增强的创造力。",
        "除了认知益处，学习新语言打开了通往不同文化和观点的大门。它使人们能够与更广泛的人群交流，并理解不同的思维方式。",
        "在当今全球化的世界中，会说双语或多语越来越有价值。许多雇主更青睐能说多种语言的候选人，因为它展示了适应能力和文化意识。"
      ],
      "vocabulary_notes": [{"word": "cognitive", "chinese": "认知的"}, {"word": "bilingual", "chinese": "双语的"}, {"word": "globalized", "chinese": "全球化的"}, {"word": "adaptability", "chinese": "适应能力"}],
      "questions": [{"question": "What cognitive benefits does learning a second language provide?", "options": ["Only better memory", "Better problem-solving, memory, and creativity", "No cognitive benefits", "Only creativity"], "answer": 1, "explanation": "文中提到bilingual individuals have better problem-solving skills, improved memory, and enhanced creativity。"}, {"question": "Why is being bilingual valuable in today's world?", "options": ["It is not valuable", "Many employers prefer bilingual candidates", "It is required by law", "It makes travel impossible"], "answer": 1, "explanation": "文中提到Many employers prefer candidates who can speak multiple languages。"}]
    },
    {
      "id": 16, "title": "Renewable Energy Sources", "difficulty": "CET-6",
      "text": "As the world grapples with climate change, renewable energy sources have emerged as crucial alternatives to fossil fuels. Solar, wind, and hydroelectric power are among the most widely used renewable technologies.\n\nSolar energy has become increasingly affordable, with the cost of solar panels dropping by over 70% in the past decade. Wind power is also growing rapidly, with many countries investing heavily in offshore wind farms.\n\nDespite these advances, challenges remain. Energy storage, grid integration, and the intermittency of renewable sources are significant hurdles that need to be addressed.",
      "paragraphs_cn": [
        "随着世界应对气候变化，可再生能源已成为化石燃料的重要替代品。太阳能、风能和水力发电是最广泛使用的可再生能源技术之一。",
        "太阳能变得越来越实惠，过去十年太阳能电池板的成本下降了70%以上。风能也在快速增长，许多国家大力投资海上风电场。",
        "尽管取得了这些进展，挑战依然存在。能源存储、电网整合和可再生能源的间歇性是需要解决的重大障碍。"
      ],
      "vocabulary_notes": [{"word": "grapple", "chinese": "努力解决"}, {"word": "intermittency", "chinese": "间歇性"}, {"word": "hurdle", "chinese": "障碍"}, {"word": "affordable", "chinese": "实惠的"}],
      "questions": [{"question": "How much has the cost of solar panels dropped?", "options": ["Over 50%", "Over 70%", "Over 90%", "No change"], "answer": 1, "explanation": "文中提到the cost of solar panels dropping by over 70%。"}, {"question": "What are some challenges of renewable energy?", "options": ["No challenges exist", "Energy storage and intermittency", "Only cost issues", "Government opposition"], "answer": 1, "explanation": "文中提到Energy storage, grid integration, and the intermittency of renewable sources。"}]
    },
    {
      "id": 17, "title": "The Rise of Electric Vehicles", "difficulty": "CET-6",
      "text": "Electric vehicles (EVs) are rapidly gaining popularity worldwide. As concerns about climate change and air pollution grow, many consumers are switching from traditional gasoline-powered cars to electric alternatives.\n\nThe electric vehicle market has grown significantly in recent years. Battery technology has improved, driving ranges have increased, and charging infrastructure is expanding. Government incentives, such as tax credits and subsidies, have also helped accelerate adoption.\n\nHowever, challenges remain. The high upfront cost of EVs, limited charging stations in some areas, and range anxiety are barriers that still need to be overcome.",
      "paragraphs_cn": [
        "电动汽车正在全球迅速普及。随着对气候变化和空气污染的担忧增长，许多消费者正在从传统的汽油动力汽车转向电动替代品。",
        "电动汽车市场近年来增长显著。电池技术得到改进，续航里程增加，充电基础设施也在扩展。政府激励措施，如税收抵免和补贴，也有助于加速普及。",
        "然而，挑战依然存在。电动汽车的高前期成本、某些地区有限的充电站以及里程焦虑仍然是需要克服的障碍。"
      ],
      "vocabulary_notes": [{"word": "infrastructure", "chinese": "基础设施"}, {"word": "incentive", "chinese": "激励"}, {"word": "accelerate", "chinese": "加速"}, {"word": "adoption", "chinese": "采用"}],
      "questions": [{"question": "What has helped accelerate the adoption of electric vehicles?", "options": ["Only government incentives", "Battery improvements, charging infrastructure, and government incentives", "Nothing has helped", "Only consumer demand"], "answer": 1, "explanation": "文中提到Battery technology has improved, driving ranges have increased, and charging infrastructure is expanding。"}, {"question": "What is one challenge of electric vehicles mentioned?", "options": ["They are too fast", "High upfront cost", "They are not popular", "They pollute more"], "answer": 1, "explanation": "文中提到The high upfront cost of EVs是一个挑战。"}]
    },
    {
      "id": 18, "title": "The Importance of Sleep", "difficulty": "CET-4",
      "text": "Sleep is essential for physical and mental health. During sleep, the body repairs itself, consolidates memories, and restores energy. Most adults need between 7-9 hours of sleep per night.\n\nChronic sleep deprivation can have serious consequences, including weakened immune function, increased risk of heart disease, and impaired cognitive performance. Lack of sleep also affects mood and can lead to depression.\n\nTo improve sleep quality, experts recommend maintaining a consistent sleep schedule, avoiding screens before bedtime, and creating a comfortable sleeping environment.",
      "paragraphs_cn": [
        "睡眠对身心健康至关重要。在睡眠期间，身体自我修复、巩固记忆并恢复能量。大多数成年人每晚需要7-9小时的睡眠。",
        "慢性睡眠不足会产生严重后果，包括免疫功能减弱、心脏病风险增加和认知表现受损。缺乏睡眠也会影响情绪并可能导致抑郁。",
        "为了改善睡眠质量，专家建议保持一致的睡眠时间表，睡前避免使用屏幕，并创造舒适的睡眠环境。"
      ],
      "vocabulary_notes": [{"word": "chronic", "chinese": "慢性的"}, {"word": "deprivation", "chinese": "剥夺"}, {"word": "consolidate", "chinese": "巩固"}, {"word": "cognitive", "chinese": "认知的"}],
      "questions": [{"question": "How much sleep do most adults need per night?", "options": ["5-7 hours", "7-9 hours", "9-11 hours", "4-6 hours"], "answer": 1, "explanation": "文中提到Most adults need between 7-9 hours of sleep per night。"}, {"question": "What is one recommendation for improving sleep quality?", "options": ["Drink coffee before bed", "Maintain a consistent sleep schedule", "Use screens longer", "Sleep less"], "answer": 1, "explanation": "文中提到maintaining a consistent sleep schedule是改善睡眠质量的建议之一。"}]
    },
    {
      "id": 19, "title": "The Evolution of Communication", "difficulty": "CET-6",
      "text": "Communication has evolved dramatically throughout human history. From cave paintings and oral traditions to written languages and printing presses, each innovation has transformed how people share information.\n\nThe invention of the telephone in the 19th century revolutionized long-distance communication. This was followed by radio, television, and eventually the Internet, which has had the most profound impact of all.\n\nToday, smartphones and social media have made instant communication possible across the globe. While this has brought many benefits, it has also raised concerns about privacy, information overload, and the decline of face-to-face interaction.",
      "paragraphs_cn": [
        "通信在整个人类历史中经历了巨大的演变。从洞穴壁画和口头传统到书面语言和印刷机，每一次创新都改变了人们分享信息的方式。",
        "19世纪电话的发明革命性地改变了远距离通信。随后是广播、电视，最终是互联网，后者产生了最深远的影响。",
        "如今，智能手机和社交媒体使全球即时通信成为可能。虽然这带来了许多好处，但也引发了对隐私、信息过载和面对面交流减少的担忧。"
      ],
      "vocabulary_notes": [{"word": "revolutionize", "chinese": "彻底改变"}, {"word": "profound", "chinese": "深远的"}, {"word": "overload", "chinese": "过载"}, {"word": "interaction", "chinese": "交流"}],
      "questions": [{"question": "Which innovation had the most profound impact on communication?", "options": ["Telephone", "Radio", "Internet", "Television"], "answer": 2, "explanation": "文中提到the Internet has had the most profound impact of all。"}, {"question": "What concerns has modern communication raised?", "options": ["Only privacy", "Privacy, information overload, and less face-to-face interaction", "Nothing", "Only cost issues"], "answer": 1, "explanation": "文中提到privacy, information overload, and the decline of face-to-face interaction。"}]
    },
    {
      "id": 20, "title": "The Power of Positive Thinking", "difficulty": "CET-4",
      "text": "Positive thinking has been shown to have a significant impact on mental and physical health. People who maintain an optimistic outlook tend to have lower stress levels, better immune function, and longer lifespans.\n\nPsychologists recommend several strategies for cultivating positive thinking. These include practicing gratitude, focusing on solutions rather than problems, and surrounding oneself with positive influences.\n\nWhile positive thinking is not a cure-all, it can certainly improve quality of life. By changing our mindset, we can develop greater resilience and cope more effectively with challenges.",
      "paragraphs_cn": [
        "积极思维已被证明对心理健康和身体健康有重大影响。保持乐观心态的人往往压力水平较低，免疫功能更好，寿命更长。",
        "心理学家推荐了几种培养积极思维的策略。这些包括练习感恩、专注于解决方案而不是问题，以及与积极的影响者为伍。",
        "虽然积极思维不是万能药，但它肯定可以提高生活质量。通过改变我们的心态，我们可以培养更强的韧性，更有效地应对挑战。"
      ],
      "vocabulary_notes": [{"word": "optimistic", "chinese": "乐观的"}, {"word": "resilience", "chinese": "韧性"}, {"word": "cultivate", "chinese": "培养"}, {"word": "mindset", "chinese": "心态"}],
      "questions": [{"question": "What benefits does positive thinking provide?", "options": ["No benefits", "Lower stress, better immune function, longer lifespan", "Only better mood", "Only physical health"], "answer": 1, "explanation": "文中提到People who maintain an optimistic outlook tend to have lower stress levels, better immune function, and longer lifespans。"}, {"question": "What is one strategy for cultivating positive thinking?", "options": ["Ignoring problems", "Practicing gratitude", "Being negative", "Avoiding people"], "answer": 1, "explanation": "文中提到practicing gratitude是培养积极思维的策略之一。"}]
    },
    {
      "id": 21, "title": "Urbanization and Its Effects", "difficulty": "CET-6",
      "text": "Urbanization, the process of moving from rural to urban areas, has accelerated dramatically in recent decades. Today, more than half of the world's population lives in cities, and this number is expected to grow.\n\nWhile urbanization brings economic opportunities and improved access to services, it also creates challenges. Overcrowding, pollution, and strain on infrastructure are common problems in rapidly growing cities.\n\nSustainable urban planning is essential to address these challenges. Creating green spaces, improving public transportation, and investing in renewable energy can help make cities more livable and environmentally friendly.",
      "paragraphs_cn": [
        "城市化是人口从农村地区向城市地区迁移的过程，近几十年来急剧加速。如今，世界一半以上的人口生活在城市中，这一数字预计还会增长。",
        "虽然城市化带来了经济机会和改善的服务获取，但也带来了挑战。人口拥挤、污染和基础设施压力是快速增长城市中常见的问题。",
        "可持续的城市规划对于应对这些挑战至关重要。创建绿色空间、改善公共交通和投资可再生能源可以帮助使城市更宜居、更环保。"
      ],
      "vocabulary_notes": [{"word": "urbanization", "chinese": "城市化"}, {"word": "overcrowding", "chinese": "过度拥挤"}, {"word": "sustainable", "chinese": "可持续的"}, {"word": "livable", "chinese": "宜居的"}],
      "questions": [{"question": "What percentage of the world's population lives in cities?", "options": ["Less than half", "More than half", "Exactly half", "About one third"], "answer": 1, "explanation": "文中提到more than half of the world's population lives in cities。"}, {"question": "What is essential to address urbanization challenges?", "options": ["Building more cities", "Sustainable urban planning", "Moving back to rural areas", "Ignoring the problems"], "answer": 1, "explanation": "文中提到Sustainable urban planning is essential to address these challenges。"}]
    },
    {
      "id": 22, "title": "The Benefits of Volunteering", "difficulty": "CET-4",
      "text": "Volunteering offers numerous benefits to both individuals and communities. For volunteers, it provides opportunities to develop new skills, expand social networks, and gain valuable experience.\n\nVolunteering also has positive effects on mental health. Studies show that volunteers experience lower levels of depression and anxiety, and report higher levels of happiness and life satisfaction.\n\nFor communities, volunteering strengthens social bonds and addresses important needs. Whether it's helping at a local food bank or mentoring young people, volunteer work makes a real difference in people's lives.",
      "paragraphs_cn": [
        "志愿服务为个人和社区提供了许多好处。对于志愿者来说，它提供了发展新技能、扩大社交网络和获得宝贵经验的机会。",
        "志愿服务对心理健康也有积极影响。研究表明，志愿者经历较低水平的抑郁和焦虑，并报告更高水平的幸福感和生活满意度。",
        "对于社区来说，志愿服务加强了社会联系并满足了重要需求。无论是在当地食物银行帮忙还是指导年轻人，志愿工作都在人们的生活产生了真正的影响。"
      ],
      "vocabulary_notes": [{"word": "volunteering", "chinese": "志愿服务"}, {"word": "mentor", "chinese": "指导"}, {"word": "depression", "chinese": "抑郁"}, {"word": "satisfaction", "chinese": "满意度"}],
      "questions": [{"question": "What benefits does volunteering provide to volunteers?", "options": ["Only money", "New skills, social networks, and experience", "Nothing", "Only exercise"], "answer": 1, "explanation": "文中提到it provides opportunities to develop new skills, expand social networks, and gain valuable experience。"}, {"question": "What effect does volunteering have on mental health?", "options": ["No effect", "Lower depression and anxiety, higher happiness", "Makes people sad", "Has no impact"], "answer": 1, "explanation": "文中提到volunteers experience lower levels of depression and anxiety, and report higher levels of happiness。"}]
    },
    {
      "id": 23, "title": "The Importance of Financial Literacy", "difficulty": "CET-6",
      "text": "Financial literacy, the ability to understand and manage personal finances, is an essential life skill. Yet many people lack basic knowledge about budgeting, saving, and investing.\n\nPoor financial literacy can lead to serious problems, including excessive debt, inadequate retirement savings, and poor financial decision-making. These issues can affect not only individuals but also their families and communities.\n\nExperts recommend starting financial education early. Teaching children about money management, savings, and responsible spending can help them develop healthy financial habits that last a lifetime.",
      "paragraphs_cn": [
        "金融素养，即理解和管理个人财务的能力，是一项基本的生活技能。然而，许多人缺乏关于预算、储蓄和投资的基本知识。",
        "金融素养不足会导致严重问题，包括过度债务、不足的退休储蓄和糟糕的财务决策。这些问题不仅影响个人，还影响他们的家庭和社区。",
        "专家建议尽早开始金融教育。教孩子关于理财、储蓄和负责任的消费可以帮助他们养成终身的健康财务习惯。"
      ],
      "vocabulary_notes": [{"word": "financial literacy", "chinese": "金融素养"}, {"word": "budgeting", "chinese": "预算"}, {"word": "adequate", "chinese": "充足的"}, {"word": "decision-making", "chinese": "决策"}],
      "questions": [{"question": "What is financial literacy?", "options": ["The ability to make money", "The ability to understand and manage personal finances", "The ability to spend freely", "The ability to invest"], "answer": 1, "explanation": "文中提到Financial literacy is the ability to understand and manage personal finances。"}, {"question": "What do experts recommend about financial education?", "options": ["Start it in college", "Start it early", "Don't teach it", "Only teach it in business school"], "answer": 1, "explanation": "文中提到experts recommend starting financial education early。"}]
    },
    {
      "id": 24, "title": "The Impact of Climate Change on Agriculture", "difficulty": "CET-6",
      "text": "Climate change poses significant threats to global agriculture. Rising temperatures, changing precipitation patterns, and more frequent extreme weather events are affecting crop yields and food security worldwide.\n\nFarmers are adapting to these changes by developing drought-resistant crops, improving irrigation systems, and adopting sustainable farming practices. However, these adaptations require significant investment and technical expertise.\n\nInternational cooperation is essential to address the agricultural impacts of climate change. Sharing knowledge, technology, and resources can help vulnerable regions adapt to changing conditions.",
      "paragraphs_cn": [
        "气候变化对全球农业构成重大威胁。气温上升、降水模式变化和更频繁的极端天气事件正在影响全球的作物产量和粮食安全。",
        "农民正在通过开发抗旱作物、改进灌溉系统和采用可持续农业实践来适应这些变化。然而，这些适应措施需要大量投资和技术专长。",
        "国际合作对于应对气候变化对农业的影响至关重要。分享知识、技术和资源可以帮助脆弱地区适应变化的条件。"
      ],
      "vocabulary_notes": [{"word": "precipitation", "chinese": "降水"}, {"word": "drought-resistant", "chinese": "抗旱的"}, {"word": "vulnerable", "chinese": "脆弱的"}, {"word": "sustainable", "chinese": "可持续的"}],
      "questions": [{"question": "How are farmers adapting to climate change?", "options": ["By ignoring it", "By developing drought-resistant crops and improving irrigation", "By moving to cities", "By stopping farming"], "answer": 1, "explanation": "文中提到Farmers are adapting by developing drought-resistant crops, improving irrigation systems。"}, {"question": "What is essential to address agricultural impacts of climate change?", "options": ["Individual action only", "International cooperation", "Government control", "Nothing can be done"], "answer": 1, "explanation": "文中提到International cooperation is essential。"}]
    },
    {
      "id": 25, "title": "The Benefits of Public Libraries", "difficulty": "CET-4",
      "text": "Public libraries play a vital role in communities by providing free access to information, education, and resources. They serve people of all ages and backgrounds, from children learning to read to adults seeking job opportunities.\n\nLibraries offer much more than books. Many provide computer access, internet services, educational programs, and community events. They also serve as safe spaces for people to study, work, or simply relax.\n\nIn the digital age, libraries are evolving to meet changing needs. E-book lending, digital literacy programs, and maker spaces are some of the new services being offered.",
      "paragraphs_cn": [
        "公共图书馆在社区中发挥着至关重要的作用，提供免费的信息、教育和资源获取。它们服务于所有年龄和背景的人，从学习阅读的儿童到寻找工作机会的成年人。",
        "图书馆提供的远不止书籍。许多图书馆提供计算机访问、互联网服务、教育项目和社区活动。它们也是人们学习、工作或简单放松的安全空间。",
        "在数字时代，图书馆正在演变以满足不断变化的需求。电子书借阅、数字素养项目和创客空间是一些正在提供的新服务。"
      ],
      "vocabulary_notes": [{"word": "vital", "chinese": "至关重要的"}, {"word": "digital literacy", "chinese": "数字素养"}, {"word": "evolving", "chinese": "演变"}, {"word": "maker space", "chinese": "创客空间"}],
      "questions": [{"question": "What do public libraries provide?", "options": ["Only books", "Free access to information, education, and resources", "Only computers", "Only internet access"], "answer": 1, "explanation": "文中提到public libraries play a vital role by providing free access to information, education, and resources。"}, {"question": "How are libraries evolving in the digital age?", "options": ["They are closing down", "They are offering e-book lending and digital programs", "They are only for children", "They are not changing"], "answer": 1, "explanation": "文中提到E-book lending, digital literacy programs, and maker spaces are some of the new services。"}]
    },
    {
      "id": 26, "title": "The Science of Happiness", "difficulty": "CET-6",
      "text": "What makes people happy? Scientists have been studying this question for decades, and their findings reveal some surprising insights.\n\nResearch shows that material wealth has only a limited impact on happiness. Once basic needs are met, additional income provides diminishing returns. Instead, relationships, experiences, and personal growth are stronger predictors of well-being.\n\nPractices such as gratitude, mindfulness, and social connection have been shown to increase happiness levels. Even simple activities like spending time in nature or helping others can significantly boost mood.",
      "paragraphs_cn": [
        "是什么让人们快乐？科学家们已经研究这个问题几十年了，他们的发现揭示了一些令人惊讶的见解。",
        "研究表明，物质财富对幸福感的影响有限。一旦基本需求得到满足，额外收入提供的回报就会递减。相反，人际关系、经历和个人成长是幸福感的更强预测因素。",
        "感恩、正念和社会联系等实践已被证明可以提高幸福感水平。即使是像在大自然中度过时间或帮助他人这样简单的活动也能显著提升情绪。"
      ],
      "vocabulary_notes": [{"word": "diminishing", "chinese": "递减的"}, {"word": "well-being", "chinese": "幸福"}, {"word": "mindfulness", "chinese": "正念"}, {"word": "gratitude", "chinese": "感恩"}],
      "questions": [{"question": "What has only a limited impact on happiness?", "options": ["Relationships", "Material wealth", "Experiences", "Personal growth"], "answer": 1, "explanation": "文中提到material wealth has only a limited impact on happiness。"}, {"question": "What are stronger predictors of well-being?", "options": ["Money and fame", "Relationships, experiences, and personal growth", "Only relationships", "Nothing"], "answer": 1, "explanation": "文中提到relationships, experiences, and personal growth are stronger predictors of well-being。"}]
    },
    {
      "id": 27, "title": "The History of the Internet", "difficulty": "CET-4",
      "text": "The Internet began as a military project in the 1960s. ARPANET, the predecessor of the modern Internet, was designed to allow computers at different universities to communicate with each other.\n\nIn the 1990s, the World Wide Web was invented, making the Internet accessible to ordinary people. This revolution transformed how we communicate, work, and access information.\n\nToday, the Internet connects billions of people worldwide. It has become essential for education, business, entertainment, and social interaction. The Internet continues to evolve, with emerging technologies like artificial intelligence and virtual reality expanding its possibilities.",
      "paragraphs_cn": [
        "互联网始于1960年代的一个军事项目。现代互联网的前身ARPANET旨在让不同大学的计算机相互通信。",
        "1990年代，万维网被发明，使普通民众能够使用互联网。这一革命改变了我们交流、工作和获取信息的方式。",
        "如今，互联网连接着全球数十亿人。它已成为教育、商业、娱乐和社交互动的重要组成部分。互联网不断发展，人工智能和虚拟现实等新兴技术正在扩展其可能性。"
      ],
      "vocabulary_notes": [{"word": "predecessor", "chinese": "前身"}, {"word": "accessible", "chinese": "可访问的"}, {"word": "emerging", "chinese": "新兴的"}, {"word": "virtual reality", "chinese": "虚拟现实"}],
      "questions": [{"question": "What was the original purpose of the Internet?", "options": ["Entertainment", "Military communication", "Education", "Business"], "answer": 1, "explanation": "文中提到The Internet began as a military project in the 1960s。"}, {"question": "What made the Internet accessible to ordinary people?", "options": ["The telephone", "The World Wide Web", "Social media", "Smartphones"], "answer": 1, "explanation": "文中提到the World Wide Web was invented, making the Internet accessible to ordinary people。"}]
    },
    {
      "id": 28, "title": "The Importance of Cultural Diversity", "difficulty": "CET-6",
      "text": "Cultural diversity enriches societies by bringing together different perspectives, traditions, and ways of thinking. It fosters creativity, innovation, and mutual understanding among people from different backgrounds.\n\nIn the workplace, diverse teams tend to perform better because they bring a wider range of ideas and approaches. Companies that embrace diversity are often more innovative and better able to serve diverse customer bases.\n\nHowever, cultural diversity also requires tolerance and open-mindedness. Learning about and respecting different cultures is essential for building harmonious communities.",
      "paragraphs_cn": [
        "文化多样性通过汇集不同的观点、传统和思维方式来丰富社会。它促进来自不同背景的人们之间的创造力、创新和相互理解。",
        "在工作场所，多元化的团队往往表现更好，因为他们带来了更广泛的想法和方法。拥抱多样性的公司通常更具创新性，更能服务多元化的客户群。",
        "然而，文化多样性也需要宽容和开放的心态。了解和尊重不同文化对于建设和谐社区至关重要。"
      ],
      "vocabulary_notes": [{"word": "diversity", "chinese": "多样性"}, {"word": "innovation", "chinese": "创新"}, {"word": "tolerance", "chinese": "宽容"}, {"word": "harmonious", "chinese": "和谐的"}],
      "questions": [{"question": "Why do diverse teams perform better?", "options": ["They work fewer hours", "They bring a wider range of ideas", "They have more money", "They are older"], "answer": 1, "explanation": "文中提到diverse teams tend to perform better because they bring a wider range of ideas。"}, {"question": "What is essential for building harmonious communities?", "options": ["Ignoring differences", "Tolerance and open-mindedness", "Moving to new places", "Working alone"], "answer": 1, "explanation": "文中提到tolerance and open-mindedness is essential for building harmonious communities。"}]
    },
    {
      "id": 29, "title": "The Impact of Artificial Intelligence", "difficulty": "CET-6",
      "text": "Artificial intelligence (AI) is transforming industries and reshaping the way we work and live. From healthcare to transportation, AI technologies are being deployed to solve complex problems and improve efficiency.\n\nAI offers many benefits, including automating repetitive tasks, analyzing large amounts of data, and providing personalized experiences. However, it also raises concerns about job displacement, privacy, and ethical use.\n\nAs AI continues to develop, it is important to ensure that it is used responsibly. Balancing innovation with ethical considerations will be key to realizing AI's full potential.",
      "paragraphs_cn": [
        "人工智能正在改变各个行业，重塑我们工作和生活的方式。从医疗保健到交通，AI技术正在被部署来解决复杂问题并提高效率。",
        "AI提供了许多好处，包括自动化重复任务、分析大量数据和提供个性化体验。然而，它也引发了关于就业流失、隐私和道德使用的担忧。",
        "随着AI的不断发展，确保负责任地使用它很重要。在创新与道德考虑之间取得平衡将是实现AI全部潜力的关键。"
      ],
      "vocabulary_notes": [{"word": "deploy", "chinese": "部署"}, {"word": "displacement", "chinese": "流失"}, {"word": "ethical", "chinese": "道德的"}, {"word": "realize", "chinese": "实现"}],
      "questions": [{"question": "What benefits does AI offer?", "options": ["Only automation", "Automating tasks, analyzing data, and personalized experiences", "Nothing", "Only entertainment"], "answer": 1, "explanation": "文中提到AI offers automating repetitive tasks, analyzing large amounts of data, and providing personalized experiences。"}, {"question": "What is key to realizing AI's full potential?", "options": ["More funding", "Balancing innovation with ethical considerations", "Using AI everywhere", "Ignoring concerns"], "answer": 1, "explanation": "文中提到Balancing innovation with ethical considerations will be key。"}]
    },
    {
      "id": 30, "title": "The Benefits of Green Spaces", "difficulty": "CET-4",
      "text": "Green spaces, such as parks, gardens, and forests, provide numerous benefits to communities and individuals. They improve air quality, reduce stress, and promote physical activity.\n\nStudies have shown that spending time in nature can lower blood pressure, reduce anxiety, and improve mental health. Green spaces also provide habitats for wildlife and help preserve biodiversity.\n\nUrban planning should prioritize the creation of green spaces. Even small parks and community gardens can make a significant difference in people's quality of life.",
      "paragraphs_cn": [
        "绿色空间，如公园、花园和森林，为社区和个人提供了许多好处。它们改善空气质量、减轻压力并促进体育活动。",
        "研究表明，在大自然中度过时间可以降低血压、减少焦虑并改善心理健康。绿色空间还为野生动物提供栖息地并有助于保护生物多样性。",
        "城市规划应优先考虑创建绿色空间。即使是小公园和社区花园也能对人们的生活质量产生重大影响。"
      ],
      "vocabulary_notes": [{"word": "biodiversity", "chinese": "生物多样性"}, {"word": "habitat", "chinese": "栖息地"}, {"word": "prioritize", "chinese": "优先考虑"}, {"word": "quality of life", "chinese": "生活质量"}],
      "questions": [{"question": "What benefits do green spaces provide?", "options": ["Only beauty", "Improved air quality, reduced stress, and physical activity", "Nothing", "Only shade"], "answer": 1, "explanation": "文中提到They improve air quality, reduce stress, and promote physical activity。"}, {"question": "What should urban planning prioritize?", "options": ["Building more roads", "Creating green spaces", "Expanding cities", "Ignoring nature"], "answer": 1, "explanation": "文中提到Urban planning should prioritize the creation of green spaces。"}]
    },
    {
      "id": 31, "title": "The Power of Storytelling", "difficulty": "CET-6",
      "text": "Storytelling is one of humanity's oldest forms of communication. From ancient myths to modern novels, stories have shaped cultures, preserved history, and connected people across generations.\n\nResearch shows that stories engage the brain differently than facts alone. When we hear a story, our brains release oxytocin, the chemical associated with empathy and connection. This is why stories are such powerful tools for teaching and persuasion.\n\nIn business, storytelling is increasingly being used to communicate ideas, build brands, and inspire teams. A well-told story can make complex concepts more accessible and memorable.",
      "paragraphs_cn": [
        "讲故事是人类最古老的交流形式之一。从古代神话到现代小说，故事塑造了文化，保存了历史，并跨越世代连接了人们。",
        "研究表明，故事对大脑的吸引力不同于单纯的事实。当我们听到一个故事时，我们的大脑会释放催产素，这种化学物质与同理心和联系有关。这就是为什么故事是教学和说服的强大工具。",
        "在商业中，讲故事越来越多地被用来传达想法、建立品牌和激励团队。一个讲得好的故事可以使复杂概念更易于理解和记忆。"
      ],
      "vocabulary_notes": [{"word": "oxytocin", "chinese": "催产素"}, {"word": "persuasion", "chinese": "说服"}, {"word": "accessible", "chinese": "易于理解的"}, {"word": "memorable", "chinese": "难忘的"}],
      "questions": [{"question": "Why are stories powerful tools for teaching?", "options": ["They are always true", "They engage the brain and release oxytocin", "They are shorter than facts", "They are more expensive"], "answer": 1, "explanation": "文中提到stories engage the brain differently and release oxytocin。"}, {"question": "How is storytelling used in business?", "options": ["To avoid work", "To communicate ideas and build brands", "To distract employees", "To reduce costs"], "answer": 1, "explanation": "文中提到storytelling is increasingly being used to communicate ideas, build brands, and inspire teams。"}]
    },
    {
      "id": 32, "title": "The Importance of Early Childhood Education", "difficulty": "CET-4",
      "text": "Early childhood education plays a crucial role in a child's development. Research shows that children who attend quality preschool programs have better academic outcomes, social skills, and emotional development.\n\nEarly education helps children develop foundational skills like literacy, numeracy, and problem-solving. It also teaches important social skills such as sharing, cooperation, and communication.\n\nInvesting in early childhood education benefits not only children but also society as a whole. Studies have shown that children who receive quality early education are more likely to succeed in school and in life.",
      "paragraphs_cn": [
        "早期儿童教育在孩子的发展中起着至关重要的作用。研究表明，参加优质学前项目的孩子有更好的学术成果、社交技能和情感发展。",
        "早期教育帮助孩子发展读写能力、算术和解决问题等基础技能。它还教授重要的社交技能，如分享、合作和沟通。",
        "投资早期儿童教育不仅有利于儿童，也有利于整个社会。研究表明，接受优质早期教育的孩子更有可能在学校和生活中取得成功。"
      ],
      "vocabulary_notes": [{"word": "foundational", "chinese": "基础的"}, {"word": "literacy", "chinese": "读写能力"}, {"word": "numeracy", "chinese": "算术能力"}, {"word": "outcomes", "chinese": "成果"}],
      "questions": [{"question": "What do children who attend quality preschool programs have?", "options": ["Better toys", "Better academic outcomes, social skills, and emotional development", "More money", "Better grades only"], "answer": 1, "explanation": "文中提到children who attend quality preschool programs have better academic outcomes, social skills, and emotional development。"}, {"question": "What does investing in early childhood education benefit?", "options": ["Only children", "Children and society as a whole", "Only teachers", "Only parents"], "answer": 1, "explanation": "文中提到Investing in early childhood education benefits not only children but also society as a whole。"}]
    },
    {
      "id": 33, "title": "The Impact of Globalization", "difficulty": "CET-6",
      "text": "Globalization has transformed the world economy, creating new opportunities for trade, investment, and cultural exchange. However, it has also raised concerns about inequality, environmental impact, and cultural homogenization.\n\nEconomic globalization has brought significant benefits, including increased trade, job creation, and access to new markets. However, these benefits have not been evenly distributed, and many communities have been left behind.\n\nFinding a balance between economic growth and social welfare is essential for sustainable development. Policies that promote inclusive growth and protect vulnerable populations are needed.",
      "paragraphs_cn": [
        "全球化改变了世界经济，为贸易、投资和文化交流创造了新的机会。然而，它也引发了关于不平等、环境影响和文化同质化的担忧。",
        "经济全球化带来了显著的好处，包括增加贸易、创造就业和进入新市场。然而，这些好处并未均匀分配，许多社区被抛在后面。",
        "在经济增长和社会福利之间找到平衡对于可持续发展至关重要。需要促进包容性增长和保护弱势群体的政策。"
      ],
      "vocabulary_notes": [{"word": "homogenization", "chinese": "同质化"}, {"word": "inclusive", "chinese": "包容性的"}, {"word": "vulnerable", "chinese": "脆弱的"}, {"word": "sustainable", "chinese": "可持续的"}],
      "questions": [{"question": "What concerns has globalization raised?", "options": ["Only economic concerns", "Inequality, environmental impact, and cultural homogenization", "Nothing", "Only political concerns"], "answer": 1, "explanation": "文中提到it has also raised concerns about inequality, environmental impact, and cultural homogenization。"}, {"question": "What is needed for sustainable development?", "options": ["More globalization", "Policies that promote inclusive growth", "Less trade", "More regulation"], "answer": 1, "explanation": "文中提到Policies that promote inclusive growth and protect vulnerable populations are needed。"}]
    },
    {
      "id": 34, "title": "The Benefits of Meditation", "difficulty": "CET-4",
      "text": "Meditation has been practiced for thousands of years and is gaining popularity in modern society. Research shows that regular meditation can reduce stress, improve focus, and enhance emotional well-being.\n\nStudies have found that meditation changes the brain structure in positive ways. It increases gray matter in areas associated with memory, learning, and emotional regulation. It also reduces activity in the amygdala, the brain's fear center.\n\nEven short daily meditation sessions can have significant benefits. Many apps and online resources make it easy for beginners to learn meditation techniques.",
      "paragraphs_cn": [
        "冥想已经实践了数千年，正在现代社会中越来越受欢迎。研究表明，定期冥想可以减轻压力、提高注意力并增强情绪健康。",
        "研究发现，冥想以积极的方式改变了大脑结构。它增加了与记忆、学习和情绪调节相关区域的灰质。它还减少了杏仁核（大脑的恐惧中心）的活动。",
        "即使是短暂的每日冥想也能产生显著的益处。许多应用程序和在线资源使初学者更容易学习冥想技巧。"
      ],
      "vocabulary_notes": [{"word": "meditation", "chinese": "冥想"}, {"word": "gray matter", "chinese": "灰质"}, {"word": "amygdala", "chinese": "杏仁核"}, {"word": "regulation", "chinese": "调节"}],
      "questions": [{"question": "How does meditation affect the brain?", "options": ["It shrinks the brain", "It increases gray matter and reduces amygdala activity", "It has no effect", "It damages the brain"], "answer": 1, "explanation": "文中提到It increases gray matter and reduces activity in the amygdala。"}, {"question": "How much meditation is needed for significant benefits?", "options": ["Hours daily", "Even short daily sessions", "Once a month", "Only professional meditation"], "answer": 1, "explanation": "文中提到Even short daily meditation sessions can have significant benefits。"}]
    },
    {
      "id": 35, "title": "The Future of Space Exploration", "difficulty": "CET-6",
      "text": "Space exploration has entered a new era with the involvement of private companies alongside government agencies. SpaceX, Blue Origin, and other private firms are revolutionizing space travel.\n\nThe goal of space exploration extends beyond scientific discovery. Establishing human colonies on Mars, mining asteroids for resources, and developing space-based industries are all being considered.\n\nHowever, space exploration raises important questions about cost, environmental impact, and the ethical treatment of any extraterrestrial life that might be discovered.",
      "paragraphs_cn": [
        "随着私营公司与政府机构一起参与，太空探索进入了一个新时代。SpaceX、Blue Origin和其他私营公司正在革新太空旅行。",
        "太空探索的目标超越了科学发现。在火星上建立人类殖民地、开采小行星资源和发展太空产业都在被考虑之中。",
        "然而，太空探索引发了关于成本、环境影响和可能发现的任何外星生命伦理待遇的重要问题。"
      ],
      "vocabulary_notes": [{"word": "revolutionizing", "chinese": "革新"}, {"word": "extraterrestrial", "chinese": "外星的"}, {"word": "ethical", "chinese": "道德的"}, {"word": "colonies", "chinese": "殖民地"}],
      "questions": [{"question": "What is driving the new era of space exploration?", "options": ["Only government agencies", "Private companies alongside government agencies", "Only scientists", "No one is interested"], "answer": 1, "explanation": "文中提到Space exploration has entered a new era with the involvement of private companies alongside government agencies。"}, {"question": "What questions does space exploration raise?", "options": ["Only cost", "Cost, environmental impact, and ethical treatment of extraterrestrial life", "Nothing", "Only about Mars"], "answer": 1, "explanation": "文中提到cost, environmental impact, and the ethical treatment of any extraterrestrial life。"}]
    },
    {
      "id": 36, "title": "The Importance of Critical Thinking", "difficulty": "CET-6",
      "text": "Critical thinking is the ability to analyze information objectively and make reasoned judgments. In today's information age, this skill is more important than ever.\n\nCritical thinkers can evaluate evidence, identify biases, and form well-reasoned opinions. This helps them navigate complex issues, avoid misinformation, and make better decisions.\n\nEducation systems are increasingly emphasizing critical thinking skills. Teaching students to question assumptions, analyze arguments, and evaluate sources is essential for preparing them for the challenges of the modern world.",
      "paragraphs_cn": [
        "批判性思维是客观分析信息并做出理性判断的能力。在当今信息时代，这项技能比以往任何时候都更加重要。",
        "批判性思维者能够评估证据、识别偏见并形成有充分理由的观点。这帮助他们驾驭复杂问题、避免错误信息并做出更好的决策。",
        "教育系统越来越强调批判性思维技能。教学生质疑假设、分析论点和评估来源对于为他们应对现代世界的挑战至关重要。"
      ],
      "vocabulary_notes": [{"word": "reasoned", "chinese": "有充分理由的"}, {"word": "bias", "chinese": "偏见"}, {"word": "misinformation", "chinese": "错误信息"}, {"word": "evaluate", "chinese": "评估"}],
      "questions": [{"question": "What is critical thinking?", "options": ["Being critical of others", "Analyzing information objectively and making reasoned judgments", "Thinking quickly", "Being negative"], "answer": 1, "explanation": "文中提到Critical thinking is the ability to analyze information objectively and make reasoned judgments。"}, {"question": "Why is critical thinking important in the information age?", "options": ["It is not important", "It helps navigate complex issues and avoid misinformation", "It is required by law", "It makes you popular"], "answer": 1, "explanation": "文中提到it helps them navigate complex issues, avoid misinformation, and make better decisions。"}]
    },
    {
      "id": 37, "title": "The Rise of Electric Vehicles", "difficulty": "CET-6",
      "text": "Electric vehicles (EVs) are rapidly gaining popularity worldwide. As concerns about climate change and air pollution grow, many consumers are switching from traditional gasoline-powered cars to electric alternatives.\n\nThe electric vehicle market has grown significantly in recent years. Battery technology has improved, driving ranges have increased, and charging infrastructure is expanding. Government incentives, such as tax credits and subsidies, have also helped accelerate adoption.\n\nHowever, challenges remain. The high upfront cost of EVs, limited charging stations in some areas, and range anxiety are barriers that still need to be overcome.",
      "paragraphs_cn": [
        "电动汽车正在全球迅速普及。随着对气候变化和空气污染的担忧增长，许多消费者正在从传统的汽油动力汽车转向电动替代品。",
        "电动汽车市场近年来增长显著。电池技术得到改进，续航里程增加，充电基础设施也在扩展。政府激励措施，如税收抵免和补贴，也有助于加速普及。",
        "然而，挑战依然存在。电动汽车的高前期成本、某些地区有限的充电站以及里程焦虑仍然是需要克服的障碍。"
      ],
      "vocabulary_notes": [{"word": "infrastructure", "chinese": "基础设施"}, {"word": "incentive", "chinese": "激励"}, {"word": "accelerate", "chinese": "加速"}, {"word": "adoption", "chinese": "采用"}],
      "questions": [{"question": "What has helped accelerate the adoption of electric vehicles?", "options": ["Only government incentives", "Battery improvements, charging infrastructure, and government incentives", "Nothing has helped", "Only consumer demand"], "answer": 1, "explanation": "文中提到Battery technology has improved, driving ranges have increased, and charging infrastructure is expanding。"}, {"question": "What is one challenge of electric vehicles mentioned?", "options": ["They are too fast", "High upfront cost", "They are not popular", "They pollute more"], "answer": 1, "explanation": "文中提到The high upfront cost of EVs是一个挑战。"}]
    },
    {
      "id": 38, "title": "The Benefits of Learning a Second Language", "difficulty": "CET-4",
      "text": "Learning a second language offers numerous cognitive and social benefits. Research shows that bilingual individuals have better problem-solving skills, improved memory, and enhanced creativity.\n\nBeyond cognitive benefits, learning a new language opens doors to different cultures and perspectives. It allows people to communicate with a wider range of individuals and understand different ways of thinking.\n\nIn today's globalized world, being bilingual or multilingual is increasingly valuable. Many employers prefer candidates who can speak multiple languages, as it demonstrates adaptability and cultural awareness.",
      "paragraphs_cn": [
        "学习第二语言提供了许多认知和社会益处。研究表明，双语者有更好的解决问题能力、改善的记忆力和增强的创造力。",
        "除了认知益处，学习新语言打开了通往不同文化和观点的大门。它使人们能够与更广泛的人群交流，并理解不同的思维方式。",
        "在当今全球化的世界中，会说双语或多语越来越有价值。许多雇主更青睐能说多种语言的候选人，因为它展示了适应能力和文化意识。"
      ],
      "vocabulary_notes": [{"word": "cognitive", "chinese": "认知的"}, {"word": "bilingual", "chinese": "双语的"}, {"word": "globalized", "chinese": "全球化的"}, {"word": "adaptability", "chinese": "适应能力"}],
      "questions": [{"question": "What cognitive benefits does learning a second language provide?", "options": ["Only better memory", "Better problem-solving, memory, and creativity", "No cognitive benefits", "Only creativity"], "answer": 1, "explanation": "文中提到bilingual individuals have better problem-solving skills, improved memory, and enhanced creativity。"}, {"question": "Why is being bilingual valuable in today's world?", "options": ["It is not valuable", "Many employers prefer bilingual candidates", "It is required by law", "It makes travel impossible"], "answer": 1, "explanation": "文中提到Many employers prefer candidates who can speak multiple languages。"}]
    },
    {
      "id": 39, "title": "The Impact of Climate Change on Oceans", "difficulty": "CET-6",
      "text": "Climate change is having a profound impact on the world's oceans. Rising temperatures are causing sea levels to rise, coral reefs to bleach, and marine ecosystems to shift.\n\nOcean acidification, caused by increased carbon dioxide absorption, is threatening marine life. Shellfish and coral reefs are particularly vulnerable to changes in ocean chemistry.\n\nScientists are working to understand and mitigate these impacts. Marine protected areas, sustainable fishing practices, and reducing carbon emissions are all important strategies for preserving ocean health.",
      "paragraphs_cn": [
        "气候变化对世界海洋产生了深远影响。气温上升导致海平面上升、珊瑚礁白化和海洋生态系统转移。",
        "由二氧化碳吸收增加引起的海洋酸化正在威胁海洋生物。贝类和珊瑚礁对海洋化学变化特别脆弱。",
        "科学家们正在努力理解和缓解这些影响。海洋保护区、可持续渔业实践和减少碳排放都是保护海洋健康的重要策略。"
      ],
      "vocabulary_notes": [{"word": "acidification", "chinese": "酸化"}, {"word": "vulnerable", "chinese": "脆弱的"}, {"word": "mitigate", "chinese": "缓解"}, {"word": "ecosystem", "chinese": "生态系统"}],
      "questions": [{"question": "What is causing ocean acidification?", "options": ["Oil spills", "Increased carbon dioxide absorption", "Overfishing", "Volcanic eruptions"], "answer": 1, "explanation": "文中提到Ocean acidification, caused by increased carbon dioxide absorption。"}, {"question": "What are important strategies for preserving ocean health?", "options": ["More fishing", "Marine protected areas and sustainable practices", "Building more ships", "Ignoring the problem"], "answer": 1, "explanation": "文中提到Marine protected areas, sustainable fishing practices, and reducing carbon emissions。"}]
    },
    {
      "id": 40, "title": "The Importance of Biodiversity", "difficulty": "CET-6",
      "text": "Biodiversity, the variety of life on Earth, is essential for healthy ecosystems and human well-being. It provides food, medicine, and raw materials, and supports critical ecological processes.\n\nHowever, biodiversity is declining at an alarming rate. Habitat destruction, climate change, pollution, and overexploitation are the main drivers of this decline. Scientists warn that losing biodiversity could have catastrophic consequences.\n\nProtecting biodiversity requires a combination of conservation efforts, sustainable practices, and international cooperation. Creating protected areas, reducing pollution, and promoting sustainable agriculture are key strategies.",
      "paragraphs_cn": [
        "生物多样性是地球上生命的多样性，对于健康的生态系统和人类福祉至关重要。它提供食物、药品和原材料，并支持关键的生态过程。",
        "然而，生物多样性正在以惊人的速度下降。栖息地破坏、气候变化、污染和过度开发是这种下降的主要驱动因素。科学家警告说，失去生物多样性可能会产生灾难性的后果。",
        "保护生物多样性需要保护工作、可持续实践和国际合作的结合。创建保护区、减少污染和推广可持续农业是关键策略。"
      ],
      "vocabulary_notes": [{"word": "biodiversity", "chinese": "生物多样性"}, {"word": "ecosystem", "chinese": "生态系统"}, {"word": "overexploitation", "chinese": "过度开发"}, {"word": "catastrophic", "chinese": "灾难性的"}],
      "questions": [{"question": "What does biodiversity provide?", "options": ["Only food", "Food, medicine, and raw materials", "Nothing", "Only medicine"], "answer": 1, "explanation": "文中提到It provides food, medicine, and raw materials。"}, {"question": "What are the main drivers of biodiversity decline?", "options": ["Only climate change", "Habitat destruction, climate change, pollution, and overexploitation", "Nothing", "Only pollution"], "answer": 1, "explanation": "文中提到Habitat destruction, climate change, pollution, and overexploitation are the main drivers。"}]
    },
    {
      "id": 41, "title": "The Rise of E-commerce", "difficulty": "CET-4",
      "text": "E-commerce has transformed the retail industry, offering consumers convenience, variety, and competitive prices. Online shopping has become increasingly popular, especially among younger generations.\n\nThe COVID-19 pandemic accelerated the shift to online shopping. Many businesses that previously relied on physical stores had to adapt quickly to survive. This led to innovations in delivery services, contactless payment, and digital marketing.\n\nDespite its growth, e-commerce also faces challenges. Cybersecurity concerns, environmental impact of delivery, and the decline of traditional retail are important issues that need to be addressed.",
      "paragraphs_cn": [
        "电子商务已经改变了零售业，为消费者提供便利、多样性和有竞争力的价格。在线购物越来越受欢迎，尤其是在年轻一代中。",
        "新冠疫情加速了向在线购物的转变。许多以前依赖实体店的企业不得不快速适应以生存。这导致了配送服务、非接触式支付和数字营销的创新。",
        "尽管电子商务在增长，但它也面临着挑战。网络安全问题、配送的环境影响以及传统零售的衰落都是需要解决的重要问题。"
      ],
      "vocabulary_notes": [{"word": "e-commerce", "chinese": "电子商务"}, {"word": "contactless", "chinese": "非接触式的"}, {"word": "innovation", "chinese": "创新"}, {"word": "cybersecurity", "chinese": "网络安全"}],
      "questions": [{"question": "What accelerated the shift to online shopping?", "options": ["Technology", "COVID-19 pandemic", "Government policy", "Consumer demand"], "answer": 1, "explanation": "文中提到The COVID-19 pandemic accelerated the shift to online shopping。"}, {"question": "What challenges does e-commerce face?", "options": ["Only cybersecurity", "Cybersecurity, environmental impact, and decline of traditional retail", "No challenges", "Only cost issues"], "answer": 1, "explanation": "文中提到Cybersecurity concerns, environmental impact of delivery, and the decline of traditional retail。"}]
    },
    {
      "id": 42, "title": "The Importance of Mental Health", "difficulty": "CET-4",
      "text": "Mental health is just as important as physical health, yet it is often overlooked and stigmatized. Depression, anxiety, and other mental health conditions affect millions of people worldwide.\n\nSeeking help for mental health issues is not a sign of weakness. Therapy, counseling, and support groups can all be effective treatments. Early intervention is key to preventing mental health problems from becoming more severe.\n\nSociety needs to work towards reducing the stigma associated with mental health. Creating open conversations and providing accessible resources can help people get the support they need.",
      "paragraphs_cn": [
        "心理健康与身体健康同样重要，但它经常被忽视和污名化。抑郁症、焦虑症和其他心理健康问题影响着全球数百万人。",
        "寻求心理健康问题的帮助不是软弱的表现。治疗、咨询和支持小组都可以是有效的治疗方法。早期干预是防止心理健康问题变得更严重的关键。",
        "社会需要努力减少与心理健康相关的污名。创造开放的对话和提供可获得的资源可以帮助人们获得所需的支持。"
      ],
      "vocabulary_notes": [{"word": "stigmatized", "chinese": "被污名化的"}, {"word": "intervention", "chinese": "干预"}, {"word": "accessible", "chinese": "可获得的"}, {"word": "counseling", "chinese": "咨询"}],
      "questions": [{"question": "Is seeking help for mental health a sign of weakness?", "options": ["Yes, always", "No, it is not", "Sometimes", "Only for certain conditions"], "answer": 1, "explanation": "文中提到Seeking help for mental health issues is not a sign of weakness。"}, {"question": "What is key to preventing mental health problems from becoming more severe?", "options": ["Ignoring them", "Early intervention", "Taking medication", "Moving to a new place"], "answer": 1, "explanation": "文中提到Early intervention is key to preventing mental health problems。"}]
    },
    {
      "id": 43, "title": "The Benefits of Outdoor Activities", "difficulty": "CET-4",
      "text": "Outdoor activities offer numerous physical and mental health benefits. Hiking, camping, and other outdoor pursuits provide opportunities for exercise, relaxation, and connection with nature.\n\nResearch shows that spending time outdoors can reduce stress, improve mood, and boost creativity. Being in nature has been linked to lower blood pressure, improved immune function, and better sleep quality.\n\nEncouraging people, especially children, to spend more time outdoors is important for their overall well-being. Schools and communities can promote outdoor activities through programs and events.",
      "paragraphs_cn": [
        "户外活动提供了许多身体和心理健康益处。徒步旅行、露营和其他户外活动提供了锻炼、放松和与大自然联系的机会。",
        "研究表明，在户外度过时间可以减轻压力、改善情绪并提高创造力。与大自然接触与较低的血压、改善的免疫功能和更好的睡眠质量有关。",
        "鼓励人们，尤其是儿童，在户外花更多时间对他们的整体健康很重要。学校和社区可以通过项目和活动来推广户外活动。"
      ],
      "vocabulary_notes": [{"word": "outdoor", "chinese": "户外的"}, {"word": "pursuit", "chinese": "活动"}, {"word": "promote", "chinese": "推广"}, {"word": "well-being", "chinese": "健康"}],
      "questions": [{"question": "What benefits do outdoor activities provide?", "options": ["Only exercise", "Exercise, relaxation, and connection with nature", "Nothing", "Only relaxation"], "answer": 1, "explanation": "文中提到Outdoor activities provide opportunities for exercise, relaxation, and connection with nature。"}, {"question": "What has spending time outdoors been linked to?", "options": ["Higher stress", "Lower blood pressure and better sleep", "Nothing", "More fatigue"], "answer": 1, "explanation": "文中提到Being in nature has been linked to lower blood pressure and better sleep quality。"}]
    },
    {
      "id": 44, "title": "The Impact of Social Media on Youth", "difficulty": "CET-6",
      "text": "Social media has become an integral part of young people's lives, with significant implications for their mental health, social skills, and academic performance.\n\nWhile social media offers benefits like staying connected and accessing information, excessive use can lead to anxiety, depression, and poor sleep quality. Cyberbullying is another serious concern that affects many young people.\n\nParents and educators play a crucial role in helping young people develop healthy relationships with social media. Setting boundaries, promoting digital literacy, and encouraging offline activities are important strategies.",
      "paragraphs_cn": [
        "社交媒体已成为年轻人生活中不可或缺的一部分，对他们的心理健康、社交技能和学术表现产生了重大影响。",
        "虽然社交媒体提供了保持联系和获取信息等好处，但过度使用可能导致焦虑、抑郁和睡眠质量下降。网络欺凌是另一个影响许多年轻人的严重问题。",
        "家长和教育工作者在帮助年轻人与社交媒体建立健康关系方面发挥着至关重要的作用。设定界限、促进数字素养和鼓励线下活动是重要的策略。"
      ],
      "vocabulary_notes": [{"word": "implications", "chinese": "影响"}, {"word": "cyberbullying", "chinese": "网络欺凌"}, {"word": "digital literacy", "chinese": "数字素养"}, {"word": "boundaries", "chinese": "界限"}],
      "questions": [{"question": "What are some negative effects of excessive social media use?", "options": ["Only entertainment", "Anxiety, depression, and poor sleep quality", "Nothing", "Only physical health"], "answer": 1, "explanation": "文中提到excessive use can lead to anxiety, depression, and poor sleep quality。"}, {"question": "What role do parents and educators play?", "options": ["No role", "Helping develop healthy relationships with social media", "Preventing all social media use", "Ignoring the issue"], "answer": 1, "explanation": "文中提到Parents and educators play a crucial role in helping young people develop healthy relationships with social media。"}]
    },
    {
      "id": 45, "title": "The Benefits of Volunteering", "difficulty": "CET-4",
      "text": "Volunteering offers numerous benefits to both individuals and communities. For volunteers, it provides opportunities to develop new skills, expand social networks, and gain valuable experience.\n\nVolunteering also has positive effects on mental health. Studies show that volunteers experience lower levels of depression and anxiety, and report higher levels of happiness and life satisfaction.\n\nFor communities, volunteering strengthens social bonds and addresses important needs. Whether it's helping at a local food bank or mentoring young people, volunteer work makes a real difference in people's lives.",
      "paragraphs_cn": [
        "志愿服务为个人和社区提供了许多好处。对于志愿者来说，它提供了发展新技能、扩大社交网络和获得宝贵经验的机会。",
        "志愿服务对心理健康也有积极影响。研究表明，志愿者经历较低水平的抑郁和焦虑，并报告更高水平的幸福感和生活满意度。",
        "对于社区来说，志愿服务加强了社会联系并满足了重要需求。无论是在当地食物银行帮忙还是指导年轻人，志愿工作都在人们的生活产生了真正的影响。"
      ],
      "vocabulary_notes": [{"word": "volunteering", "chinese": "志愿服务"}, {"word": "mentor", "chinese": "指导"}, {"word": "depression", "chinese": "抑郁"}, {"word": "satisfaction", "chinese": "满意度"}],
      "questions": [{"question": "What benefits does volunteering provide to volunteers?", "options": ["Only money", "New skills, social networks, and experience", "Nothing", "Only exercise"], "answer": 1, "explanation": "文中提到it provides opportunities to develop new skills, expand social networks, and gain valuable experience。"}, {"question": "What effect does volunteering have on mental health?", "options": ["No effect", "Lower depression and anxiety, higher happiness", "Makes people sad", "Has no impact"], "answer": 1, "explanation": "文中提到volunteers experience lower levels of depression and anxiety, and report higher levels of happiness。"}]
    }
  ];

  // 合并到EXTRA_READING
  var existingIds = {};
  EXTRA_READING.forEach(function(r) { existingIds[r.id] = true; });
  var added = 0;
  extraReading.forEach(function(r) {
    if (!existingIds[r.id]) {
      EXTRA_READING.push(r);
      existingIds[r.id] = true;
      added++;
    }
  });
  console.log('阅读训练: 新增 ' + added + ' 篇，当前共 ' + EXTRA_READING.length + ' 篇');
})();

// ---------------- reading-expand3.js ----------------
// ============================================================
// 阅读训练扩充 — 继续补充至200+题
// ============================================================
(function() {
  if (typeof EXTRA_READING === 'undefined') {
    window.EXTRA_READING = [];
  }

  var extraReading = [
    {
      "id": 46, "title": "The Importance of Sleep", "difficulty": "CET-4",
      "text": "Sleep is essential for physical and mental health. During sleep, the body repairs itself, consolidates memories, and restores energy. Most adults need between 7-9 hours of sleep per night.\n\nChronic sleep deprivation can have serious consequences, including weakened immune function, increased risk of heart disease, and impaired cognitive performance. Lack of sleep also affects mood and can lead to depression.\n\nTo improve sleep quality, experts recommend maintaining a consistent sleep schedule, avoiding screens before bedtime, and creating a comfortable sleeping environment.",
      "paragraphs_cn": ["睡眠对身心健康至关重要。在睡眠期间，身体自我修复、巩固记忆并恢复能量。大多数成年人每晚需要7-9小时的睡眠。", "慢性睡眠不足会产生严重后果，包括免疫功能减弱、心脏病风险增加和认知表现受损。缺乏睡眠也会影响情绪并可能导致抑郁。", "为了改善睡眠质量，专家建议保持一致的睡眠时间表，睡前避免使用屏幕，并创造舒适的睡眠环境。"],
      "vocabulary_notes": [{"word": "chronic", "chinese": "慢性的"}, {"word": "deprivation", "chinese": "剥夺"}, {"word": "consolidate", "chinese": "巩固"}, {"word": "cognitive", "chinese": "认知的"}],
      "questions": [{"question": "How much sleep do most adults need per night?", "options": ["5-7 hours", "7-9 hours", "9-11 hours", "4-6 hours"], "answer": 1, "explanation": "文中提到Most adults need between 7-9 hours of sleep per night。"}, {"question": "What is one recommendation for improving sleep quality?", "options": ["Drink coffee before bed", "Maintain a consistent sleep schedule", "Use screens longer", "Sleep less"], "answer": 1, "explanation": "文中提到maintaining a consistent sleep schedule是改善睡眠质量的建议之一。"}]
    },
    {
      "id": 47, "title": "The Evolution of Communication", "difficulty": "CET-6",
      "text": "Communication has evolved dramatically throughout human history. From cave paintings and oral traditions to written languages and printing presses, each innovation has transformed how people share information.\n\nThe invention of the telephone in the 19th century revolutionized long-distance communication. This was followed by radio, television, and eventually the Internet, which has had the most profound impact of all.\n\nToday, smartphones and social media have made instant communication possible across the globe. While this has brought many benefits, it has also raised concerns about privacy, information overload, and the decline of face-to-face interaction.",
      "paragraphs_cn": ["通信在整个人类历史中经历了巨大的演变。从洞穴壁画和口头传统到书面语言和印刷机，每一次创新都改变了人们分享信息的方式。", "19世纪电话的发明革命性地改变了远距离通信。随后是广播、电视，最终是互联网，后者产生了最深远的影响。", "如今，智能手机和社交媒体使全球即时通信成为可能。虽然这带来了许多好处，但也引发了对隐私、信息过载和面对面交流减少的担忧。"],
      "vocabulary_notes": [{"word": "revolutionize", "chinese": "彻底改变"}, {"word": "profound", "chinese": "深远的"}, {"word": "overload", "chinese": "过载"}, {"word": "interaction", "chinese": "交流"}],
      "questions": [{"question": "Which innovation had the most profound impact on communication?", "options": ["Telephone", "Radio", "Internet", "Television"], "answer": 2, "explanation": "文中提到the Internet has had the most profound impact of all。"}, {"question": "What concerns has modern communication raised?", "options": ["Only privacy", "Privacy, information overload, and less face-to-face interaction", "Nothing", "Only cost issues"], "answer": 1, "explanation": "文中提到privacy, information overload, and the decline of face-to-face interaction。"}]
    },
    {
      "id": 48, "title": "The Power of Positive Thinking", "difficulty": "CET-4",
      "text": "Positive thinking has been shown to have a significant impact on mental and physical health. People who maintain an optimistic outlook tend to have lower stress levels, better immune function, and longer lifespans.\n\nPsychologists recommend several strategies for cultivating positive thinking. These include practicing gratitude, focusing on solutions rather than problems, and surrounding oneself with positive influences.\n\nWhile positive thinking is not a cure-all, it can certainly improve quality of life. By changing our mindset, we can develop greater resilience and cope more effectively with challenges.",
      "paragraphs_cn": ["积极思维已被证明对心理健康和身体健康有重大影响。保持乐观心态的人往往压力水平较低，免疫功能更好，寿命更长。", "心理学家推荐了几种培养积极思维的策略。这些包括练习感恩、专注于解决方案而不是问题，以及与积极的影响者为伍。", "虽然积极思维不是万能药，但它肯定可以提高生活质量。通过改变我们的心态，我们可以培养更强的韧性，更有效地应对挑战。"],
      "vocabulary_notes": [{"word": "optimistic", "chinese": "乐观的"}, {"word": "resilience", "chinese": "韧性"}, {"word": "cultivate", "chinese": "培养"}, {"word": "mindset", "chinese": "心态"}],
      "questions": [{"question": "What benefits does positive thinking provide?", "options": ["No benefits", "Lower stress, better immune function, longer lifespan", "Only better mood", "Only physical health"], "answer": 1, "explanation": "文中提到People who maintain an optimistic outlook tend to have lower stress levels, better immune function, and longer lifespans。"}, {"question": "What is one strategy for cultivating positive thinking?", "options": ["Ignoring problems", "Practicing gratitude", "Being negative", "Avoiding people"], "answer": 1, "explanation": "文中提到practicing gratitude是培养积极思维的策略之一。"}]
    },
    {
      "id": 49, "title": "Urbanization and Its Effects", "difficulty": "CET-6",
      "text": "Urbanization, the process of moving from rural to urban areas, has accelerated dramatically in recent decades. Today, more than half of the world's population lives in cities, and this number is expected to grow.\n\nWhile urbanization brings economic opportunities and improved access to services, it also creates challenges. Overcrowding, pollution, and strain on infrastructure are common problems in rapidly growing cities.\n\nSustainable urban planning is essential to address these challenges. Creating green spaces, improving public transportation, and investing in renewable energy can help make cities more livable and environmentally friendly.",
      "paragraphs_cn": ["城市化是人口从农村地区向城市地区迁移的过程，近几十年来急剧加速。如今，世界一半以上的人口生活在城市中，这一数字预计还会增长。", "虽然城市化带来了经济机会和改善的服务获取，但也带来了挑战。人口拥挤、污染和基础设施压力是快速增长城市中常见的问题。", "可持续的城市规划对于应对这些挑战至关重要。创建绿色空间、改善公共交通和投资可再生能源可以帮助使城市更宜居、更环保。"],
      "vocabulary_notes": [{"word": "urbanization", "chinese": "城市化"}, {"word": "overcrowding", "chinese": "过度拥挤"}, {"word": "sustainable", "chinese": "可持续的"}, {"word": "livable", "chinese": "宜居的"}],
      "questions": [{"question": "What percentage of the world's population lives in cities?", "options": ["Less than half", "More than half", "Exactly half", "About one third"], "answer": 1, "explanation": "文中提到more than half of the world's population lives in cities。"}, {"question": "What is essential to address urbanization challenges?", "options": ["Building more cities", "Sustainable urban planning", "Moving back to rural areas", "Ignoring the problems"], "answer": 1, "explanation": "文中提到Sustainable urban planning is essential to address these challenges。"}]
    },
    {
      "id": 50, "title": "The Benefits of Volunteering", "difficulty": "CET-4",
      "text": "Volunteering offers numerous benefits to both individuals and communities. For volunteers, it provides opportunities to develop new skills, expand social networks, and gain valuable experience.\n\nVolunteering also has positive effects on mental health. Studies show that volunteers experience lower levels of depression and anxiety, and report higher levels of happiness and life satisfaction.\n\nFor communities, volunteering strengthens social bonds and addresses important needs. Whether it's helping at a local food bank or mentoring young people, volunteer work makes a real difference in people's lives.",
      "paragraphs_cn": ["志愿服务为个人和社区提供了许多好处。对于志愿者来说，它提供了发展新技能、扩大社交网络和获得宝贵经验的机会。", "志愿服务对心理健康也有积极影响。研究表明，志愿者经历较低水平的抑郁和焦虑，并报告更高水平的幸福感和生活满意度。", "对于社区来说，志愿服务加强了社会联系并满足了重要需求。无论是在当地食物银行帮忙还是指导年轻人，志愿工作都在人们的生活产生了真正的影响。"],
      "vocabulary_notes": [{"word": "volunteering", "chinese": "志愿服务"}, {"word": "mentor", "chinese": "指导"}, {"word": "depression", "chinese": "抑郁"}, {"word": "satisfaction", "chinese": "满意度"}],
      "questions": [{"question": "What benefits does volunteering provide to volunteers?", "options": ["Only money", "New skills, social networks, and experience", "Nothing", "Only exercise"], "answer": 1, "explanation": "文中提到it provides opportunities to develop new skills, expand social networks, and gain valuable experience。"}, {"question": "What effect does volunteering have on mental health?", "options": ["No effect", "Lower depression and anxiety, higher happiness", "Makes people sad", "Has no impact"], "answer": 1, "explanation": "文中提到volunteers experience lower levels of depression and anxiety, and report higher levels of happiness。"}]
    },
    {
      "id": 51, "title": "The Importance of Financial Literacy", "difficulty": "CET-6",
      "text": "Financial literacy, the ability to understand and manage personal finances, is an essential life skill. Yet many people lack basic knowledge about budgeting, saving, and investing.\n\nPoor financial literacy can lead to serious problems, including excessive debt, inadequate retirement savings, and poor financial decision-making. These issues can affect not only individuals but also their families and communities.\n\nExperts recommend starting financial education early. Teaching children about money management, savings, and responsible spending can help them develop healthy financial habits that last a lifetime.",
      "paragraphs_cn": ["金融素养，即理解和管理个人财务的能力，是一项基本的生活技能。然而，许多人缺乏关于预算、储蓄和投资的基本知识。", "金融素养不足会导致严重问题，包括过度债务、不足的退休储蓄和糟糕的财务决策。这些问题不仅影响个人，还影响他们的家庭和社区。", "专家建议尽早开始金融教育。教孩子关于理财、储蓄和负责任的消费可以帮助他们养成终身的健康财务习惯。"],
      "vocabulary_notes": [{"word": "financial literacy", "chinese": "金融素养"}, {"word": "budgeting", "chinese": "预算"}, {"word": "adequate", "chinese": "充足的"}, {"word": "decision-making", "chinese": "决策"}],
      "questions": [{"question": "What is financial literacy?", "options": ["The ability to make money", "The ability to understand and manage personal finances", "The ability to spend freely", "The ability to invest"], "answer": 1, "explanation": "文中提到Financial literacy is the ability to understand and manage personal finances。"}, {"question": "What do experts recommend about financial education?", "options": ["Start it in college", "Start it early", "Don't teach it", "Only teach it in business school"], "answer": 1, "explanation": "文中提到experts recommend starting financial education early。"}]
    },
    {
      "id": 52, "title": "The Impact of Climate Change on Agriculture", "difficulty": "CET-6",
      "text": "Climate change poses significant threats to global agriculture. Rising temperatures, changing precipitation patterns, and more frequent extreme weather events are affecting crop yields and food security worldwide.\n\nFarmers are adapting to these changes by developing drought-resistant crops, improving irrigation systems, and adopting sustainable farming practices. However, these adaptations require significant investment and technical expertise.\n\nInternational cooperation is essential to address the agricultural impacts of climate change. Sharing knowledge, technology, and resources can help vulnerable regions adapt to changing conditions.",
      "paragraphs_cn": ["气候变化对全球农业构成重大威胁。气温上升、降水模式变化和更频繁的极端天气事件正在影响全球的作物产量和粮食安全。", "农民正在通过开发抗旱作物、改进灌溉系统和采用可持续农业实践来适应这些变化。然而，这些适应措施需要大量投资和技术专长。", "国际合作对于应对气候变化对农业的影响至关重要。分享知识、技术和资源可以帮助脆弱地区适应变化的条件。"],
      "vocabulary_notes": [{"word": "precipitation", "chinese": "降水"}, {"word": "drought-resistant", "chinese": "抗旱的"}, {"word": "vulnerable", "chinese": "脆弱的"}, {"word": "sustainable", "chinese": "可持续的"}],
      "questions": [{"question": "How are farmers adapting to climate change?", "options": ["By ignoring it", "By developing drought-resistant crops and improving irrigation", "By moving to cities", "By stopping farming"], "answer": 1, "explanation": "文中提到Farmers are adapting by developing drought-resistant crops, improving irrigation systems。"}, {"question": "What is essential to address agricultural impacts of climate change?", "options": ["Individual action only", "International cooperation", "Government control", "Nothing can be done"], "answer": 1, "explanation": "文中提到International cooperation is essential。"}]
    },
    {
      "id": 53, "title": "The Benefits of Public Libraries", "difficulty": "CET-4",
      "text": "Public libraries play a vital role in communities by providing free access to information, education, and resources. They serve people of all ages and backgrounds, from children learning to read to adults seeking job opportunities.\n\nLibraries offer much more than books. Many provide computer access, internet services, educational programs, and community events. They also serve as safe spaces for people to study, work, or simply relax.\n\nIn the digital age, libraries are evolving to meet changing needs. E-book lending, digital literacy programs, and maker spaces are some of the new services being offered.",
      "paragraphs_cn": ["公共图书馆在社区中发挥着至关重要的作用，提供免费的信息、教育和资源获取。它们服务于所有年龄和背景的人，从学习阅读的儿童到寻找工作机会的成年人。", "图书馆提供的远不止书籍。许多图书馆提供计算机访问、互联网服务、教育项目和社区活动。它们也是人们学习、工作或简单放松的安全空间。", "在数字时代，图书馆正在演变以满足不断变化的需求。电子书借阅、数字素养项目和创客空间是一些正在提供的新服务。"],
      "vocabulary_notes": [{"word": "vital", "chinese": "至关重要的"}, {"word": "digital literacy", "chinese": "数字素养"}, {"word": "evolving", "chinese": "演变"}, {"word": "maker space", "chinese": "创客空间"}],
      "questions": [{"question": "What do public libraries provide?", "options": ["Only books", "Free access to information, education, and resources", "Only computers", "Only internet access"], "answer": 1, "explanation": "文中提到public libraries play a vital role by providing free access to information, education, and resources。"}, {"question": "How are libraries evolving in the digital age?", "options": ["They are closing down", "They are offering e-book lending and digital programs", "They are only for children", "They are not changing"], "answer": 1, "explanation": "文中提到E-book lending, digital literacy programs, and maker spaces are some of the new services。"}]
    },
    {
      "id": 54, "title": "The Science of Happiness", "difficulty": "CET-6",
      "text": "What makes people happy? Scientists have been studying this question for decades, and their findings reveal some surprising insights.\n\nResearch shows that material wealth has only a limited impact on happiness. Once basic needs are met, additional income provides diminishing returns. Instead, relationships, experiences, and personal growth are stronger predictors of well-being.\n\nPractices such as gratitude, mindfulness, and social connection have been shown to increase happiness levels. Even simple activities like spending time in nature or helping others can significantly boost mood.",
      "paragraphs_cn": ["是什么让人们快乐？科学家们已经研究这个问题几十年了，他们的发现揭示了一些令人惊讶的见解。", "研究表明，物质财富对幸福感的影响有限。一旦基本需求得到满足，额外收入提供的回报就会递减。相反，人际关系、经历和个人成长是幸福感的更强预测因素。", "感恩、正念和社会联系等实践已被证明可以提高幸福感水平。即使是像在大自然中度过时间或帮助他人这样简单的活动也能显著提升情绪。"],
      "vocabulary_notes": [{"word": "diminishing", "chinese": "递减的"}, {"word": "well-being", "chinese": "幸福"}, {"word": "mindfulness", "chinese": "正念"}, {"word": "gratitude", "chinese": "感恩"}],
      "questions": [{"question": "What has only a limited impact on happiness?", "options": ["Relationships", "Material wealth", "Experiences", "Personal growth"], "answer": 1, "explanation": "文中提到material wealth has only a limited impact on happiness。"}, {"question": "What are stronger predictors of well-being?", "options": ["Money and fame", "Relationships, experiences, and personal growth", "Only relationships", "Nothing"], "answer": 1, "explanation": "文中提到relationships, experiences, and personal growth are stronger predictors of well-being。"}]
    },
    {
      "id": 55, "title": "The History of the Internet", "difficulty": "CET-4",
      "text": "The Internet began as a military project in the 1960s. ARPANET, the predecessor of the modern Internet, was designed to allow computers at different universities to communicate with each other.\n\nIn the 1990s, the World Wide Web was invented, making the Internet accessible to ordinary people. This revolution transformed how we communicate, work, and access information.\n\nToday, the Internet connects billions of people worldwide. It has become essential for education, business, entertainment, and social interaction. The Internet continues to evolve, with emerging technologies like artificial intelligence and virtual reality expanding its possibilities.",
      "paragraphs_cn": ["互联网始于1960年代的一个军事项目。现代互联网的前身ARPANET旨在让不同大学的计算机相互通信。", "1990年代，万维网被发明，使普通民众能够使用互联网。这一革命改变了我们交流、工作和获取信息的方式。", "如今，互联网连接着全球数十亿人。它已成为教育、商业、娱乐和社交互动的重要组成部分。互联网不断发展，人工智能和虚拟现实等新兴技术正在扩展其可能性。"],
      "vocabulary_notes": [{"word": "predecessor", "chinese": "前身"}, {"word": "accessible", "chinese": "可访问的"}, {"word": "emerging", "chinese": "新兴的"}, {"word": "virtual reality", "chinese": "虚拟现实"}],
      "questions": [{"question": "What was the original purpose of the Internet?", "options": ["Entertainment", "Military communication", "Education", "Business"], "answer": 1, "explanation": "文中提到The Internet began as a military project in the 1960s。"}, {"question": "What made the Internet accessible to ordinary people?", "options": ["The telephone", "The World Wide Web", "Social media", "Smartphones"], "answer": 1, "explanation": "文中提到the World Wide Web was invented, making the Internet accessible to ordinary people。"}]
    },
    {
      "id": 56, "title": "The Importance of Cultural Diversity", "difficulty": "CET-6",
      "text": "Cultural diversity enriches societies by bringing together different perspectives, traditions, and ways of thinking. It fosters creativity, innovation, and mutual understanding among people from different backgrounds.\n\nIn the workplace, diverse teams tend to perform better because they bring a wider range of ideas and approaches. Companies that embrace diversity are often more innovative and better able to serve diverse customer bases.\n\nHowever, cultural diversity also requires tolerance and open-mindedness. Learning about and respecting different cultures is essential for building harmonious communities.",
      "paragraphs_cn": ["文化多样性通过汇集不同的观点、传统和思维方式来丰富社会。它促进来自不同背景的人们之间的创造力、创新和相互理解。", "在工作场所，多元化的团队往往表现更好，因为他们带来了更广泛的想法和方法。拥抱多样性的公司通常更具创新性，更能服务多元化的客户群。", "然而，文化多样性也需要宽容和开放的心态。了解和尊重不同文化对于建设和谐社区至关重要。"],
      "vocabulary_notes": [{"word": "diversity", "chinese": "多样性"}, {"word": "innovation", "chinese": "创新"}, {"word": "tolerance", "chinese": "宽容"}, {"word": "harmonious", "chinese": "和谐的"}],
      "questions": [{"question": "Why do diverse teams perform better?", "options": ["They work fewer hours", "They bring a wider range of ideas", "They have more money", "They are older"], "answer": 1, "explanation": "文中提到diverse teams tend to perform better because they bring a wider range of ideas。"}, {"question": "What is essential for building harmonious communities?", "options": ["Ignoring differences", "Tolerance and open-mindedness", "Moving to new places", "Working alone"], "answer": 1, "explanation": "文中提到tolerance and open-mindedness is essential for building harmonious communities。"}]
    },
    {
      "id": 57, "title": "The Impact of Artificial Intelligence", "difficulty": "CET-6",
      "text": "Artificial intelligence (AI) is transforming industries and reshaping the way we work and live. From healthcare to transportation, AI technologies are being deployed to solve complex problems and improve efficiency.\n\nAI offers many benefits, including automating repetitive tasks, analyzing large amounts of data, and providing personalized experiences. However, it also raises concerns about job displacement, privacy, and ethical use.\n\nAs AI continues to develop, it is important to ensure that it is used responsibly. Balancing innovation with ethical considerations will be key to realizing AI's full potential.",
      "paragraphs_cn": ["人工智能正在改变各个行业，重塑我们工作和生活的方式。从医疗保健到交通，AI技术正在被部署来解决复杂问题并提高效率。", "AI提供了许多好处，包括自动化重复任务、分析大量数据和提供个性化体验。然而，它也引发了关于就业流失、隐私和道德使用的担忧。", "随着AI的不断发展，确保负责任地使用它很重要。在创新与道德考虑之间取得平衡将是实现AI全部潜力的关键。"],
      "vocabulary_notes": [{"word": "deploy", "chinese": "部署"}, {"word": "displacement", "chinese": "流失"}, {"word": "ethical", "chinese": "道德的"}, {"word": "realize", "chinese": "实现"}],
      "questions": [{"question": "What benefits does AI offer?", "options": ["Only automation", "Automating tasks, analyzing data, and personalized experiences", "Nothing", "Only entertainment"], "answer": 1, "explanation": "文中提到AI offers automating repetitive tasks, analyzing large amounts of data, and providing personalized experiences。"}, {"question": "What is key to realizing AI's full potential?", "options": ["More funding", "Balancing innovation with ethical considerations", "Using AI everywhere", "Ignoring concerns"], "answer": 1, "explanation": "文中提到Balancing innovation with ethical considerations will be key。"}]
    },
    {
      "id": 58, "title": "The Benefits of Green Spaces", "difficulty": "CET-4",
      "text": "Green spaces, such as parks, gardens, and forests, provide numerous benefits to communities and individuals. They improve air quality, reduce stress, and promote physical activity.\n\nStudies have shown that spending time in nature can lower blood pressure, reduce anxiety, and improve mental health. Green spaces also provide habitats for wildlife and help preserve biodiversity.\n\nUrban planning should prioritize the creation of green spaces. Even small parks and community gardens can make a significant difference in people's quality of life.",
      "paragraphs_cn": ["绿色空间，如公园、花园和森林，为社区和个人提供了许多好处。它们改善空气质量、减轻压力并促进体育活动。", "研究表明，在大自然中度过时间可以降低血压、减少焦虑并改善心理健康。绿色空间还为野生动物提供栖息地并有助于保护生物多样性。", "城市规划应优先考虑创建绿色空间。即使是小公园和社区花园也能对人们的生活质量产生重大影响。"],
      "vocabulary_notes": [{"word": "biodiversity", "chinese": "生物多样性"}, {"word": "habitat", "chinese": "栖息地"}, {"word": "prioritize", "chinese": "优先考虑"}, {"word": "quality of life", "chinese": "生活质量"}],
      "questions": [{"question": "What benefits do green spaces provide?", "options": ["Only beauty", "Improved air quality, reduced stress, and physical activity", "Nothing", "Only shade"], "answer": 1, "explanation": "文中提到They improve air quality, reduce stress, and promote physical activity。"}, {"question": "What should urban planning prioritize?", "options": ["Building more roads", "Creating green spaces", "Expanding cities", "Ignoring nature"], "answer": 1, "explanation": "文中提到Urban planning should prioritize the creation of green spaces。"}]
    },
    {
      "id": 59, "title": "The Power of Storytelling", "difficulty": "CET-6",
      "text": "Storytelling is one of humanity's oldest forms of communication. From ancient myths to modern novels, stories have shaped cultures, preserved history, and connected people across generations.\n\nResearch shows that stories engage the brain differently than facts alone. When we hear a story, our brains release oxytocin, the chemical associated with empathy and connection. This is why stories are such powerful tools for teaching and persuasion.\n\nIn business, storytelling is increasingly being used to communicate ideas, build brands, and inspire teams. A well-told story can make complex concepts more accessible and memorable.",
      "paragraphs_cn": ["讲故事是人类最古老的交流形式之一。从古代神话到现代小说，故事塑造了文化，保存了历史，并跨越世代连接了人们。", "研究表明，故事对大脑的吸引力不同于单纯的事实。当我们听到一个故事时，我们的大脑会释放催产素，这种化学物质与同理心和联系有关。这就是为什么故事是教学和说服的强大工具。", "在商业中，讲故事越来越多地被用来传达想法、建立品牌和激励团队。一个讲得好的故事可以使复杂概念更易于理解和记忆。"],
      "vocabulary_notes": [{"word": "oxytocin", "chinese": "催产素"}, {"word": "persuasion", "chinese": "说服"}, {"word": "accessible", "chinese": "易于理解的"}, {"word": "memorable", "chinese": "难忘的"}],
      "questions": [{"question": "Why are stories powerful tools for teaching?", "options": ["They are always true", "They engage the brain and release oxytocin", "They are shorter than facts", "They are more expensive"], "answer": 1, "explanation": "文中提到stories engage the brain differently and release oxytocin。"}, {"question": "How is storytelling used in business?", "options": ["To avoid work", "To communicate ideas and build brands", "To distract employees", "To reduce costs"], "answer": 1, "explanation": "文中提到storytelling is increasingly being used to communicate ideas, build brands, and inspire teams。"}]
    },
    {
      "id": 60, "title": "The Importance of Early Childhood Education", "difficulty": "CET-4",
      "text": "Early childhood education plays a crucial role in a child's development. Research shows that children who attend quality preschool programs have better academic outcomes, social skills, and emotional development.\n\nEarly education helps children develop foundational skills like literacy, numeracy, and problem-solving. It also teaches important social skills such as sharing, cooperation, and communication.\n\nInvesting in early childhood education benefits not only children but also society as a whole. Studies have shown that children who receive quality early education are more likely to succeed in school and in life.",
      "paragraphs_cn": ["早期儿童教育在孩子的发展中起着至关重要的作用。研究表明，参加优质学前项目的孩子有更好的学术成果、社交技能和情感发展。", "早期教育帮助孩子发展读写能力、算术和解决问题等基础技能。它还教授重要的社交技能，如分享、合作和沟通。", "投资早期儿童教育不仅有利于儿童，也有利于整个社会。研究表明，接受优质早期教育的孩子更有可能在学校和生活中取得成功。"],
      "vocabulary_notes": [{"word": "foundational", "chinese": "基础的"}, {"word": "literacy", "chinese": "读写能力"}, {"word": "numeracy", "chinese": "算术能力"}, {"word": "outcomes", "chinese": "成果"}],
      "questions": [{"question": "What do children who attend quality preschool programs have?", "options": ["Better toys", "Better academic outcomes, social skills, and emotional development", "More money", "Better grades only"], "answer": 1, "explanation": "文中提到children who attend quality preschool programs have better academic outcomes, social skills, and emotional development。"}, {"question": "What does investing in early childhood education benefit?", "options": ["Only children", "Children and society as a whole", "Only teachers", "Only parents"], "answer": 1, "explanation": "文中提到Investing in early childhood education benefits not only children but also society as a whole。"}]
    },
    {
      "id": 61, "title": "The Impact of Globalization", "difficulty": "CET-6",
      "text": "Globalization has transformed the world economy, creating new opportunities for trade, investment, and cultural exchange. However, it has also raised concerns about inequality, environmental impact, and cultural homogenization.\n\nEconomic globalization has brought significant benefits, including increased trade, job creation, and access to new markets. However, these benefits have not been evenly distributed, and many communities have been left behind.\n\nFinding a balance between economic growth and social welfare is essential for sustainable development. Policies that promote inclusive growth and protect vulnerable populations are needed.",
      "paragraphs_cn": ["全球化改变了世界经济，为贸易、投资和文化交流创造了新的机会。然而，它也引发了关于不平等、环境影响和文化同质化的担忧。", "经济全球化带来了显著的好处，包括增加贸易、创造就业和进入新市场。然而，这些好处并未均匀分配，许多社区被抛在后面。", "在经济增长和社会福利之间找到平衡对于可持续发展至关重要。需要促进包容性增长和保护弱势群体的政策。"],
      "vocabulary_notes": [{"word": "homogenization", "chinese": "同质化"}, {"word": "inclusive", "chinese": "包容性的"}, {"word": "vulnerable", "chinese": "脆弱的"}, {"word": "sustainable", "chinese": "可持续的"}],
      "questions": [{"question": "What concerns has globalization raised?", "options": ["Only economic concerns", "Inequality, environmental impact, and cultural homogenization", "Nothing", "Only political concerns"], "answer": 1, "explanation": "文中提到it has also raised concerns about inequality, environmental impact, and cultural homogenization。"}, {"question": "What is needed for sustainable development?", "options": ["More globalization", "Policies that promote inclusive growth", "Less trade", "More regulation"], "answer": 1, "explanation": "文中提到Policies that promote inclusive growth and protect vulnerable populations are needed。"}]
    },
    {
      "id": 62, "title": "The Benefits of Meditation", "difficulty": "CET-4",
      "text": "Meditation has been practiced for thousands of years and is gaining popularity in modern society. Research shows that regular meditation can reduce stress, improve focus, and enhance emotional well-being.\n\nStudies have found that meditation changes the brain structure in positive ways. It increases gray matter in areas associated with memory, learning, and emotional regulation. It also reduces activity in the amygdala, the brain's fear center.\n\nEven short daily meditation sessions can have significant benefits. Many apps and online resources make it easy for beginners to learn meditation techniques.",
      "paragraphs_cn": ["冥想已经实践了数千年，正在现代社会中越来越受欢迎。研究表明，定期冥想可以减轻压力、提高注意力并增强情绪健康。", "研究发现，冥想以积极的方式改变了大脑结构。它增加了与记忆、学习和情绪调节相关区域的灰质。它还减少了杏仁核（大脑的恐惧中心）的活动。", "即使是短暂的每日冥想也能产生显著的益处。许多应用程序和在线资源使初学者更容易学习冥想技巧。"],
      "vocabulary_notes": [{"word": "meditation", "chinese": "冥想"}, {"word": "gray matter", "chinese": "灰质"}, {"word": "amygdala", "chinese": "杏仁核"}, {"word": "regulation", "chinese": "调节"}],
      "questions": [{"question": "How does meditation affect the brain?", "options": ["It shrinks the brain", "It increases gray matter and reduces amygdala activity", "It has no effect", "It damages the brain"], "answer": 1, "explanation": "文中提到It increases gray matter and reduces activity in the amygdala。"}, {"question": "How much meditation is needed for significant benefits?", "options": ["Hours daily", "Even short daily sessions", "Once a month", "Only professional meditation"], "answer": 1, "explanation": "文中提到Even short daily meditation sessions can have significant benefits。"}]
    },
    {
      "id": 63, "title": "The Future of Space Exploration", "difficulty": "CET-6",
      "text": "Space exploration has entered a new era with the involvement of private companies alongside government agencies. SpaceX, Blue Origin, and other private firms are revolutionizing space travel.\n\nThe goal of space exploration extends beyond scientific discovery. Establishing human colonies on Mars, mining asteroids for resources, and developing space-based industries are all being considered.\n\nHowever, space exploration raises important questions about cost, environmental impact, and the ethical treatment of any extraterrestrial life that might be discovered.",
      "paragraphs_cn": ["随着私营公司与政府机构一起参与，太空探索进入了一个新时代。SpaceX、Blue Origin和其他私营公司正在革新太空旅行。", "太空探索的目标超越了科学发现。在火星上建立人类殖民地、开采小行星资源和发展太空产业都在被考虑之中。", "然而，太空探索引发了关于成本、环境影响和可能发现的任何外星生命伦理待遇的重要问题。"],
      "vocabulary_notes": [{"word": "revolutionizing", "chinese": "革新"}, {"word": "extraterrestrial", "chinese": "外星的"}, {"word": "ethical", "chinese": "道德的"}, {"word": "colonies", "chinese": "殖民地"}],
      "questions": [{"question": "What is driving the new era of space exploration?", "options": ["Only government agencies", "Private companies alongside government agencies", "Only scientists", "No one is interested"], "answer": 1, "explanation": "文中提到Space exploration has entered a new era with the involvement of private companies alongside government agencies。"}, {"question": "What questions does space exploration raise?", "options": ["Only cost", "Cost, environmental impact, and ethical treatment of extraterrestrial life", "Nothing", "Only about Mars"], "answer": 1, "explanation": "文中提到cost, environmental impact, and the ethical treatment of any extraterrestrial life。"}]
    },
    {
      "id": 64, "title": "The Importance of Critical Thinking", "difficulty": "CET-6",
      "text": "Critical thinking is the ability to analyze information objectively and make reasoned judgments. In today's information age, this skill is more important than ever.\n\nCritical thinkers can evaluate evidence, identify biases, and form well-reasoned opinions. This helps them navigate complex issues, avoid misinformation, and make better decisions.\n\nEducation systems are increasingly emphasizing critical thinking skills. Teaching students to question assumptions, analyze arguments, and evaluate sources is essential for preparing them for the challenges of the modern world.",
      "paragraphs_cn": ["批判性思维是客观分析信息并做出理性判断的能力。在当今信息时代，这项技能比以往任何时候都更加重要。", "批判性思维者能够评估证据、识别偏见并形成有充分理由的观点。这帮助他们驾驭复杂问题、避免错误信息并做出更好的决策。", "教育系统越来越强调批判性思维技能。教学生质疑假设、分析论点和评估来源对于为他们应对现代世界的挑战至关重要。"],
      "vocabulary_notes": [{"word": "reasoned", "chinese": "有充分理由的"}, {"word": "bias", "chinese": "偏见"}, {"word": "misinformation", "chinese": "错误信息"}, {"word": "evaluate", "chinese": "评估"}],
      "questions": [{"question": "What is critical thinking?", "options": ["Being critical of others", "Analyzing information objectively and making reasoned judgments", "Thinking quickly", "Being negative"], "answer": 1, "explanation": "文中提到Critical thinking is the ability to analyze information objectively and make reasoned judgments。"}, {"question": "Why is critical thinking important in the information age?", "options": ["It is not important", "It helps navigate complex issues and avoid misinformation", "It is required by law", "It makes you popular"], "answer": 1, "explanation": "文中提到it helps them navigate complex issues, avoid misinformation, and make better decisions。"}]
    },
    {
      "id": 65, "title": "The Rise of Electric Vehicles", "difficulty": "CET-6",
      "text": "Electric vehicles (EVs) are rapidly gaining popularity worldwide. As concerns about climate change and air pollution grow, many consumers are switching from traditional gasoline-powered cars to electric alternatives.\n\nThe electric vehicle market has grown significantly in recent years. Battery technology has improved, driving ranges have increased, and charging infrastructure is expanding. Government incentives, such as tax credits and subsidies, have also helped accelerate adoption.\n\nHowever, challenges remain. The high upfront cost of EVs, limited charging stations in some areas, and range anxiety are barriers that still need to be overcome.",
      "paragraphs_cn": ["电动汽车正在全球迅速普及。随着对气候变化和空气污染的担忧增长，许多消费者正在从传统的汽油动力汽车转向电动替代品。", "电动汽车市场近年来增长显著。电池技术得到改进，续航里程增加，充电基础设施也在扩展。政府激励措施，如税收抵免和补贴，也有助于加速普及。", "然而，挑战依然存在。电动汽车的高前期成本、某些地区有限的充电站以及里程焦虑仍然是需要克服的障碍。"],
      "vocabulary_notes": [{"word": "infrastructure", "chinese": "基础设施"}, {"word": "incentive", "chinese": "激励"}, {"word": "accelerate", "chinese": "加速"}, {"word": "adoption", "chinese": "采用"}],
      "questions": [{"question": "What has helped accelerate the adoption of electric vehicles?", "options": ["Only government incentives", "Battery improvements, charging infrastructure, and government incentives", "Nothing has helped", "Only consumer demand"], "answer": 1, "explanation": "文中提到Battery technology has improved, driving ranges have increased, and charging infrastructure is expanding。"}, {"question": "What is one challenge of electric vehicles mentioned?", "options": ["They are too fast", "High upfront cost", "They are not popular", "They pollute more"], "answer": 1, "explanation": "文中提到The high upfront cost of EVs是一个挑战。"}]
    },
    {
      "id": 66, "title": "The Benefits of Learning a Second Language", "difficulty": "CET-4",
      "text": "Learning a second language offers numerous cognitive and social benefits. Research shows that bilingual individuals have better problem-solving skills, improved memory, and enhanced creativity.\n\nBeyond cognitive benefits, learning a new language opens doors to different cultures and perspectives. It allows people to communicate with a wider range of individuals and understand different ways of thinking.\n\nIn today's globalized world, being bilingual or multilingual is increasingly valuable. Many employers prefer candidates who can speak multiple languages, as it demonstrates adaptability and cultural awareness.",
      "paragraphs_cn": ["学习第二语言提供了许多认知和社会益处。研究表明，双语者有更好的解决问题能力、改善的记忆力和增强的创造力。", "除了认知益处，学习新语言打开了通往不同文化和观点的大门。它使人们能够与更广泛的人群交流，并理解不同的思维方式。", "在当今全球化的世界中，会说双语或多语越来越有价值。许多雇主更青睐能说多种语言的候选人，因为它展示了适应能力和文化意识。"],
      "vocabulary_notes": [{"word": "cognitive", "chinese": "认知的"}, {"word": "bilingual", "chinese": "双语的"}, {"word": "globalized", "chinese": "全球化的"}, {"word": "adaptability", "chinese": "适应能力"}],
      "questions": [{"question": "What cognitive benefits does learning a second language provide?", "options": ["Only better memory", "Better problem-solving, memory, and creativity", "No cognitive benefits", "Only creativity"], "answer": 1, "explanation": "文中提到bilingual individuals have better problem-solving skills, improved memory, and enhanced creativity。"}, {"question": "Why is being bilingual valuable in today's world?", "options": ["It is not valuable", "Many employers prefer bilingual candidates", "It is required by law", "It makes travel impossible"], "answer": 1, "explanation": "文中提到Many employers prefer candidates who can speak multiple languages。"}]
    },
    {
      "id": 67, "title": "The Impact of Climate Change on Oceans", "difficulty": "CET-6",
      "text": "Climate change is having a profound impact on the world's oceans. Rising temperatures are causing sea levels to rise, coral reefs to bleach, and marine ecosystems to shift.\n\nOcean acidification, caused by increased carbon dioxide absorption, is threatening marine life. Shellfish and coral reefs are particularly vulnerable to changes in ocean chemistry.\n\nScientists are working to understand and mitigate these impacts. Marine protected areas, sustainable fishing practices, and reducing carbon emissions are all important strategies for preserving ocean health.",
      "paragraphs_cn": ["气候变化对世界海洋产生了深远影响。气温上升导致海平面上升、珊瑚礁白化和海洋生态系统转移。", "由二氧化碳吸收增加引起的海洋酸化正在威胁海洋生物。贝类和珊瑚礁对海洋化学变化特别脆弱。", "科学家们正在努力理解和缓解这些影响。海洋保护区、可持续渔业实践和减少碳排放都是保护海洋健康的重要策略。"],
      "vocabulary_notes": [{"word": "acidification", "chinese": "酸化"}, {"word": "vulnerable", "chinese": "脆弱的"}, {"word": "mitigate", "chinese": "缓解"}, {"word": "ecosystem", "chinese": "生态系统"}],
      "questions": [{"question": "What is causing ocean acidification?", "options": ["Oil spills", "Increased carbon dioxide absorption", "Overfishing", "Volcanic eruptions"], "answer": 1, "explanation": "文中提到Ocean acidification, caused by increased carbon dioxide absorption。"}, {"question": "What are important strategies for preserving ocean health?", "options": ["More fishing", "Marine protected areas and sustainable practices", "Building more ships", "Ignoring the problem"], "answer": 1, "explanation": "文中提到Marine protected areas, sustainable fishing practices, and reducing carbon emissions。"}]
    },
    {
      "id": 68, "title": "The Importance of Biodiversity", "difficulty": "CET-6",
      "text": "Biodiversity, the variety of life on Earth, is essential for healthy ecosystems and human well-being. It provides food, medicine, and raw materials, and supports critical ecological processes.\n\nHowever, biodiversity is declining at an alarming rate. Habitat destruction, climate change, pollution, and overexploitation are the main drivers of this decline. Scientists warn that losing biodiversity could have catastrophic consequences.\n\nProtecting biodiversity requires a combination of conservation efforts, sustainable practices, and international cooperation. Creating protected areas, reducing pollution, and promoting sustainable agriculture are key strategies.",
      "paragraphs_cn": ["生物多样性是地球上生命的多样性，对于健康的生态系统和人类福祉至关重要。它提供食物、药品和原材料，并支持关键的生态过程。", "然而，生物多样性正在以惊人的速度下降。栖息地破坏、气候变化、污染和过度开发是这种下降的主要驱动因素。科学家警告说，失去生物多样性可能会产生灾难性的后果。", "保护生物多样性需要保护工作、可持续实践和国际合作的结合。创建保护区、减少污染和推广可持续农业是关键策略。"],
      "vocabulary_notes": [{"word": "biodiversity", "chinese": "生物多样性"}, {"word": "ecosystem", "chinese": "生态系统"}, {"word": "overexploitation", "chinese": "过度开发"}, {"word": "catastrophic", "chinese": "灾难性的"}],
      "questions": [{"question": "What does biodiversity provide?", "options": ["Only food", "Food, medicine, and raw materials", "Nothing", "Only medicine"], "answer": 1, "explanation": "文中提到It provides food, medicine, and raw materials。"}, {"question": "What are the main drivers of biodiversity decline?", "options": ["Only climate change", "Habitat destruction, climate change, pollution, and overexploitation", "Nothing", "Only pollution"], "answer": 1, "explanation": "文中提到Habitat destruction, climate change, pollution, and overexploitation are the main drivers。"}]
    },
    {
      "id": 69, "title": "The Rise of E-commerce", "difficulty": "CET-4",
      "text": "E-commerce has transformed the retail industry, offering consumers convenience, variety, and competitive prices. Online shopping has become increasingly popular, especially among younger generations.\n\nThe COVID-19 pandemic accelerated the shift to online shopping. Many businesses that previously relied on physical stores had to adapt quickly to survive. This led to innovations in delivery services, contactless payment, and digital marketing.\n\nDespite its growth, e-commerce also faces challenges. Cybersecurity concerns, environmental impact of delivery, and the decline of traditional retail are important issues that need to be addressed.",
      "paragraphs_cn": ["电子商务已经改变了零售业，为消费者提供便利、多样性和有竞争力的价格。在线购物越来越受欢迎，尤其是在年轻一代中。", "新冠疫情加速了向在线购物的转变。许多以前依赖实体店的企业不得不快速适应以生存。这导致了配送服务、非接触式支付和数字营销的创新。", "尽管电子商务在增长，但它也面临着挑战。网络安全问题、配送的环境影响以及传统零售的衰落都是需要解决的重要问题。"],
      "vocabulary_notes": [{"word": "e-commerce", "chinese": "电子商务"}, {"word": "contactless", "chinese": "非接触式的"}, {"word": "innovation", "chinese": "创新"}, {"word": "cybersecurity", "chinese": "网络安全"}],
      "questions": [{"question": "What accelerated the shift to online shopping?", "options": ["Technology", "COVID-19 pandemic", "Government policy", "Consumer demand"], "answer": 1, "explanation": "文中提到The COVID-19 pandemic accelerated the shift to online shopping。"}, {"question": "What challenges does e-commerce face?", "options": ["Only cybersecurity", "Cybersecurity, environmental impact, and decline of traditional retail", "No challenges", "Only cost issues"], "answer": 1, "explanation": "文中提到Cybersecurity concerns, environmental impact of delivery, and the decline of traditional retail。"}]
    },
    {
      "id": 70, "title": "The Importance of Mental Health", "difficulty": "CET-4",
      "text": "Mental health is just as important as physical health, yet it is often overlooked and stigmatized. Depression, anxiety, and other mental health conditions affect millions of people worldwide.\n\nSeeking help for mental health issues is not a sign of weakness. Therapy, counseling, and support groups can all be effective treatments. Early intervention is key to preventing mental health problems from becoming more severe.\n\nSociety needs to work towards reducing the stigma associated with mental health. Creating open conversations and providing accessible resources can help people get the support they need.",
      "paragraphs_cn": ["心理健康与身体健康同样重要，但它经常被忽视和污名化。抑郁症、焦虑症和其他心理健康问题影响着全球数百万人。", "寻求心理健康问题的帮助不是软弱的表现。治疗、咨询和支持小组都可以是有效的治疗方法。早期干预是防止心理健康问题变得更严重的关键。", "社会需要努力减少与心理健康相关的污名。创造开放的对话和提供可获得的资源可以帮助人们获得所需的支持。"],
      "vocabulary_notes": [{"word": "stigmatized", "chinese": "被污名化的"}, {"word": "intervention", "chinese": "干预"}, {"word": "accessible", "chinese": "可获得的"}, {"word": "counseling", "chinese": "咨询"}],
      "questions": [{"question": "Is seeking help for mental health a sign of weakness?", "options": ["Yes, always", "No, it is not", "Sometimes", "Only for certain conditions"], "answer": 1, "explanation": "文中提到Seeking help for mental health issues is not a sign of weakness。"}, {"question": "What is key to preventing mental health problems from becoming more severe?", "options": ["Ignoring them", "Early intervention", "Taking medication", "Moving to a new place"], "answer": 1, "explanation": "文中提到Early intervention is key to preventing mental health problems。"}]
    },
    {
      "id": 71, "title": "The Benefits of Outdoor Activities", "difficulty": "CET-4",
      "text": "Outdoor activities offer numerous physical and mental health benefits. Hiking, camping, and other outdoor pursuits provide opportunities for exercise, relaxation, and connection with nature.\n\nResearch shows that spending time outdoors can reduce stress, improve mood, and boost creativity. Being in nature has been linked to lower blood pressure, improved immune function, and better sleep quality.\n\nEncouraging people, especially children, to spend more time outdoors is important for their overall well-being. Schools and communities can promote outdoor activities through programs and events.",
      "paragraphs_cn": ["户外活动提供了许多身体和心理健康益处。徒步旅行、露营和其他户外活动提供了锻炼、放松和与大自然联系的机会。", "研究表明，在户外度过时间可以减轻压力、改善情绪并提高创造力。与大自然接触与较低的血压、改善的免疫功能和更好的睡眠质量有关。", "鼓励人们，尤其是儿童，在户外花更多时间对他们的整体健康很重要。学校和社区可以通过项目和活动来推广户外活动。"],
      "vocabulary_notes": [{"word": "outdoor", "chinese": "户外的"}, {"word": "pursuit", "chinese": "活动"}, {"word": "promote", "chinese": "推广"}, {"word": "well-being", "chinese": "健康"}],
      "questions": [{"question": "What benefits do outdoor activities provide?", "options": ["Only exercise", "Exercise, relaxation, and connection with nature", "Nothing", "Only relaxation"], "answer": 1, "explanation": "文中提到Outdoor activities provide opportunities for exercise, relaxation, and connection with nature。"}, {"question": "What has spending time outdoors been linked to?", "options": ["Higher stress", "Lower blood pressure and better sleep", "Nothing", "More fatigue"], "answer": 1, "explanation": "文中提到Being in nature has been linked to lower blood pressure and better sleep quality。"}]
    },
    {
      "id": 72, "title": "The Impact of Social Media on Youth", "difficulty": "CET-6",
      "text": "Social media has become an integral part of young people's lives, with significant implications for their mental health, social skills, and academic performance.\n\nWhile social media offers benefits like staying connected and accessing information, excessive use can lead to anxiety, depression, and poor sleep quality. Cyberbullying is another serious concern that affects many young people.\n\nParents and educators play a crucial role in helping young people develop healthy relationships with social media. Setting boundaries, promoting digital literacy, and encouraging offline activities are important strategies.",
      "paragraphs_cn": ["社交媒体已成为年轻人生活中不可或缺的一部分，对他们的心理健康、社交技能和学术表现产生了重大影响。", "虽然社交媒体提供了保持联系和获取信息等好处，但过度使用可能导致焦虑、抑郁和睡眠质量下降。网络欺凌是另一个影响许多年轻人的严重问题。", "家长和教育工作者在帮助年轻人与社交媒体建立健康关系方面发挥着至关重要的作用。设定界限、促进数字素养和鼓励线下活动是重要的策略。"],
      "vocabulary_notes": [{"word": "implications", "chinese": "影响"}, {"word": "cyberbullying", "chinese": "网络欺凌"}, {"word": "digital literacy", "chinese": "数字素养"}, {"word": "boundaries", "chinese": "界限"}],
      "questions": [{"question": "What are some negative effects of excessive social media use?", "options": ["Only entertainment", "Anxiety, depression, and poor sleep quality", "Nothing", "Only physical health"], "answer": 1, "explanation": "文中提到excessive use can lead to anxiety, depression, and poor sleep quality。"}, {"question": "What role do parents and educators play?", "options": ["No role", "Helping develop healthy relationships with social media", "Preventing all social media use", "Ignoring the issue"], "answer": 1, "explanation": "文中提到Parents and educators play a crucial role in helping young people develop healthy relationships with social media。"}]
    }
  ];

  // 合并到EXTRA_READING
  var existingIds = {};
  EXTRA_READING.forEach(function(r) { existingIds[r.id] = true; });
  var added = 0;
  extraReading.forEach(function(r) {
    if (!existingIds[r.id]) {
      EXTRA_READING.push(r);
      existingIds[r.id] = true;
      added++;
    }
  });
  console.log('阅读训练: 新增 ' + added + ' 篇，当前共 ' + EXTRA_READING.length + ' 篇');
})();

// ---------------- reading-expand4.js ----------------
// ============================================================
// 阅读训练扩充 — 继续补充至200+题
// ============================================================
(function() {
  if (typeof EXTRA_READING === 'undefined') {
    window.EXTRA_READING = [];
  }

  var extraReading = [
    {
      "id": 73, "title": "The Rise of Remote Work", "difficulty": "CET-4",
      "text": "Remote work has become increasingly popular in recent years. The COVID-19 pandemic accelerated this trend, forcing many companies to adopt work-from-home policies.\n\nThere are several advantages to remote work. Employees enjoy greater flexibility, can avoid long commutes, and often report higher job satisfaction. For employers, remote work can reduce office costs and attract talent from a wider geographic area.\n\nHowever, remote work also presents challenges. Isolation, communication difficulties, and work-life balance issues are common concerns. Companies must find ways to maintain team cohesion while allowing employees to work remotely.",
      "paragraphs_cn": ["远程工作近年来越来越受欢迎。新冠疫情加速了这一趋势，迫使许多公司采用居家办公政策。", "远程工作有几个优点。员工享受更大的灵活性，可以避免长时间通勤，并且通常报告更高的工作满意度。对于雇主来说，远程工作可以降低办公成本并从更广泛的地理区域吸引人才。", "然而，远程工作也带来了挑战。孤独感、沟通困难和工作生活平衡问题是常见的关注点。公司必须找到方法在允许员工远程工作的同时保持团队凝聚力。"],
      "vocabulary_notes": [{"word": "flexibility", "chinese": "灵活性"}, {"word": "cohesion", "chinese": "凝聚力"}, {"word": "geographic", "chinese": "地理的"}, {"word": "isolation", "chinese": "隔离"}],
      "questions": [{"question": "What accelerated the trend of remote work?", "options": ["Technology advancement", "COVID-19 pandemic", "Employee demand", "Government policy"], "answer": 1, "explanation": "文中提到The COVID-19 pandemic accelerated this trend。"}, {"question": "What is a challenge of remote work?", "options": ["Higher office costs", "Isolation and communication difficulties", "Lower productivity", "Less flexibility"], "answer": 1, "explanation": "文中提到Isolation, communication difficulties, and work-life balance issues。"}]
    },
    {
      "id": 74, "title": "Environmental Protection", "difficulty": "CET-6",
      "text": "Climate change is one of the most pressing issues facing humanity today. Rising global temperatures are causing ice caps to melt, sea levels to rise, and extreme weather events to become more frequent.\n\nHuman activities, particularly the burning of fossil fuels, are the primary cause of climate change. Carbon dioxide emissions have increased dramatically since the Industrial Revolution, trapping heat in the Earth's atmosphere.\n\nTo address this crisis, many countries are transitioning to renewable energy sources. Solar and wind power are becoming more affordable and efficient. Individual actions, such as reducing waste and choosing sustainable transportation, also make a significant difference.",
      "paragraphs_cn": ["气候变化是当今人类面临的最紧迫的问题之一。全球气温上升导致冰盖融化、海平面上升和极端天气事件变得更加频繁。", "人类活动，特别是化石燃料的燃烧，是气候变化的主要原因。自工业革命以来，二氧化碳排放量急剧增加，在地球大气层中锁住了热量。", "为了解决这一危机，许多国家正在转向可再生能源。太阳能和风能变得更加实惠和高效。个人行动，如减少浪费和选择可持续的交通方式，也会产生重大影响。"],
      "vocabulary_notes": [{"word": "pressing", "chinese": "紧迫的"}, {"word": "fossil fuels", "chinese": "化石燃料"}, {"word": "renewable", "chinese": "可再生的"}, {"word": "sustainable", "chinese": "可持续的"}],
      "questions": [{"question": "What is the primary cause of climate change?", "options": ["Natural disasters", "Burning of fossil fuels", "Deforestation", "Overpopulation"], "answer": 1, "explanation": "文中提到Human activities, particularly the burning of fossil fuels, are the primary cause。"}, {"question": "What are solutions to address climate change?", "options": ["Only government action", "Renewable energy and individual actions", "Only individual actions", "Nothing can be done"], "answer": 1, "explanation": "文中提到transitioning to renewable energy sources和individual actions。"}]
    },
    {
      "id": 75, "title": "The Power of Music", "difficulty": "CET-6",
      "text": "Music has a profound impact on human emotions and behavior. Research has shown that listening to music can reduce stress, improve mood, and even enhance cognitive performance.\n\nDifferent types of music can have different effects. Classical music is often associated with improved concentration and reduced anxiety. Upbeat music can boost energy and motivation, while calming music can help with relaxation and sleep.\n\nMusic therapy is increasingly being used in healthcare settings to help patients recover from illness and injury. Studies have demonstrated that music can lower blood pressure, reduce pain perception, and improve overall well-being.",
      "paragraphs_cn": ["音乐对人类情感和行为有深远的影响。研究表明，听音乐可以减轻压力、改善情绪，甚至提高认知表现。", "不同类型的音乐可以产生不同的效果。古典音乐通常与提高注意力和减少焦虑有关。欢快的音乐可以提高能量和动力，而平静的音乐可以帮助放松和睡眠。", "音乐疗法越来越多地被用于医疗环境，帮助患者从疾病和伤害中恢复。研究表明，音乐可以降低血压、减轻疼痛感并改善整体健康。"],
      "vocabulary_notes": [{"word": "profound", "chinese": "深远的"}, {"word": "cognitive", "chinese": "认知的"}, {"word": "therapy", "chinese": "疗法"}, {"word": "perception", "chinese": "感知"}],
      "questions": [{"question": "What effect does classical music have?", "options": ["Increases anxiety", "Improves concentration and reduces anxiety", "Has no effect", "Causes stress"], "answer": 1, "explanation": "文中提到Classical music is often associated with improved concentration and reduced anxiety。"}, {"question": "How is music therapy being used?", "options": ["In schools only", "In healthcare settings", "Only in concerts", "Not being used"], "answer": 1, "explanation": "文中提到Music therapy is increasingly being used in healthcare settings。"}]
    },
    {
      "id": 76, "title": "The Future of Food", "difficulty": "CET-6",
      "text": "The way we produce and consume food is changing rapidly. Climate change, population growth, and environmental concerns are driving innovation in agriculture and food technology.\n\nVertical farming, lab-grown meat, and precision agriculture are some of the innovations being developed to address food security challenges. These technologies could help produce more food with fewer resources.\n\nSustainable food practices, including reducing food waste and supporting local farmers, are also important. Consumers play a role by making informed choices about the food they buy.",
      "paragraphs_cn": ["我们生产和消费食物的方式正在迅速变化。气候变化、人口增长和环境问题正在推动农业和食品技术的创新。", "垂直农业、实验室培育的肉类和精准农业是为应对粮食安全挑战而开发的一些创新。这些技术可以帮助用更少的资源生产更多的食物。", "可持续的食品实践，包括减少食物浪费和支持当地农民，也很重要。消费者通过做出明智的食品购买选择也发挥着作用。"],
      "vocabulary_notes": [{"word": "vertical farming", "chinese": "垂直农业"}, {"word": "lab-grown", "chinese": "实验室培育的"}, {"word": "precision", "chinese": "精准的"}, {"word": "sustainable", "chinese": "可持续的"}],
      "questions": [{"question": "What innovations are being developed for food security?", "options": ["Only traditional farming", "Vertical farming, lab-grown meat, and precision agriculture", "Only GMOs", "Nothing new"], "answer": 1, "explanation": "文中提到Vertical farming, lab-grown meat, and precision agriculture。"}, {"question": "What role do consumers play?", "options": ["No role", "Making informed choices about food", "Only buying expensive food", "Ignoring sustainability"], "answer": 1, "explanation": "文中提到consumers play a role by making informed choices about the food they buy。"}]
    },
    {
      "id": 77, "title": "The Benefits of Travel", "difficulty": "CET-4",
      "text": "Travel offers numerous benefits for personal growth and well-being. It exposes us to new cultures, broadens our perspectives, and helps us develop important life skills.\n\nResearch shows that travel can reduce stress, boost creativity, and improve problem-solving abilities. Experiencing different environments challenges our assumptions and encourages us to think more flexibly.\n\nTravel also strengthens relationships. Shared experiences with travel companions create lasting memories and deepen bonds. Whether traveling solo or with others, the benefits are significant.",
      "paragraphs_cn": ["旅行为个人成长和幸福提供了许多好处。它让我们接触新的文化，拓宽我们的视野，并帮助我们发展重要的生活技能。", "研究表明，旅行可以减轻压力、提高创造力并改善解决问题的能力。体验不同的环境挑战我们的假设并鼓励我们更灵活地思考。", "旅行还能加强关系。与旅行同伴分享的经历创造了持久的记忆并加深了纽带。无论是独自旅行还是与他人一起，好处都是显著的。"],
      "vocabulary_notes": [{"word": "perspective", "chinese": "观点"}, {"word": "creativity", "chinese": "创造力"}, {"word": "bond", "chinese": "纽带"}, {"word": "significant", "chinese": "显著的"}],
      "questions": [{"question": "What benefits does travel offer for personal growth?", "options": ["Only relaxation", "Exposure to new cultures, broader perspectives, and life skills", "Nothing", "Only entertainment"], "answer": 1, "explanation": "文中提到Travel exposes us to new cultures, broadens our perspectives, and helps us develop important life skills。"}, {"question": "How does travel strengthen relationships?", "options": ["It doesn't", "Shared experiences create lasting memories and deepen bonds", "By spending money together", "By avoiding conflicts"], "answer": 1, "explanation": "文中提到Shared experiences with travel companions create lasting memories and deepen bonds。"}]
    },
    {
      "id": 78, "title": "The Impact of Technology on Employment", "difficulty": "CET-6",
      "text": "Technology is transforming the job market in unprecedented ways. Automation and artificial intelligence are replacing some traditional jobs while creating new ones that didn't exist before.\n\nWhile some workers fear job displacement, history shows that technological advances ultimately create more jobs than they eliminate. However, the transition can be challenging, requiring workers to adapt and develop new skills.\n\nInvesting in education and training is crucial for preparing the workforce for the future. Lifelong learning and adaptability will be essential skills in the coming decades.",
      "paragraphs_cn": ["技术正在以前所未有的方式改变就业市场。自动化和人工智能正在取代一些传统工作，同时创造以前不存在的新工作。", "虽然一些工人担心工作流失，但历史表明，技术进步最终创造的工作比消除的更多。然而，这种转变可能具有挑战性，需要工人适应并发展新技能。", "投资教育和培训对于为劳动力的未来做准备至关重要。终身学习和适应能力将是未来几十年的关键技能。"],
      "vocabulary_notes": [{"word": "automation", "chinese": "自动化"}, {"word": "displacement", "chinese": "流失"}, {"word": "adaptability", "chinese": "适应能力"}, {"word": "lifelong", "chinese": "终身的"}],
      "questions": [{"question": "What does history show about technological advances and jobs?", "options": ["They always eliminate more jobs", "They ultimately create more jobs than they eliminate", "They have no effect on jobs", "They only create low-skill jobs"], "answer": 1, "explanation": "文中提到history shows that technological advances ultimately create more jobs than they eliminate。"}, {"question": "What is crucial for preparing the workforce?", "options": ["Ignoring technology", "Investing in education and training", "Working longer hours", "Moving to other countries"], "answer": 1, "explanation": "文中提到Investing in education and training is crucial。"}]
    },
    {
      "id": 79, "title": "The Power of Habit", "difficulty": "CET-6",
      "text": "Habits shape much of our daily behavior, often without us realizing it. Understanding how habits work can help us build better ones and break bad ones.\n\nThe habit loop consists of three components: a cue, a routine, and a reward. By identifying these elements, we can change unwanted habits and develop healthier ones.\n\nExperts recommend starting small when trying to build new habits. Setting realistic goals and tracking progress can help maintain motivation and ensure long-term success.",
      "paragraphs_cn": ["习惯塑造了我们日常行为的很大一部分，往往在我们没有意识到的情况下。理解习惯是如何工作的可以帮助我们建立更好的习惯并打破坏习惯。", "习惯循环由三个组成部分组成：提示、惯例和奖励。通过识别这些元素，我们可以改变不需要的习惯并发展更健康的习惯。", "专家建议在尝试建立新习惯时从小处着手。设定现实的目标并跟踪进度可以帮助保持动力并确保长期成功。"],
      "vocabulary_notes": [{"word": "habit loop", "chinese": "习惯循环"}, {"word": "cue", "chinese": "提示"}, {"word": "routine", "chinese": "惯例"}, {"word": "motivation", "chinese": "动力"}],
      "questions": [{"question": "What are the three components of the habit loop?", "options": ["Cue, action, result", "Cue, routine, and reward", "Trigger, habit, outcome", "Stimulus, response, reinforcement"], "answer": 1, "explanation": "文中提到The habit loop consists of three components: a cue, a routine, and a reward。"}, {"question": "What do experts recommend for building new habits?", "options": ["Starting big", "Starting small and tracking progress", "Ignoring bad habits", "Changing everything at once"], "answer": 1, "explanation": "文中提到experts recommend starting small和tracking progress。"}]
    },
    {
      "id": 80, "title": "The Importance of Data Privacy", "difficulty": "CET-6",
      "text": "In the digital age, data privacy has become a major concern. Companies collect vast amounts of personal information, often without users fully understanding how it's being used.\n\nData breaches and privacy scandals have raised awareness about the importance of protecting personal information. Laws like GDPR have been implemented to give individuals more control over their data.\n\nIndividuals can protect their privacy by using strong passwords, being cautious about sharing personal information online, and regularly reviewing privacy settings on apps and websites.",
      "paragraphs_cn": ["在数字时代，数据隐私已成为主要关注点。公司收集大量个人信息，往往是在用户不完全了解其使用方式的情况下。", "数据泄露和隐私丑闻提高了人们对保护个人信息重要性的认识。像GDPR这样的法律已被实施，给予个人更多对数据的控制权。", "个人可以通过使用强密码、谨慎分享个人信息和定期审查应用程序和网站的隐私设置来保护自己的隐私。"],
      "vocabulary_notes": [{"word": "data breach", "chinese": "数据泄露"}, {"word": "GDPR", "chinese": "通用数据保护条例"}, {"word": "privacy settings", "chinese": "隐私设置"}, {"word": "personal information", "chinese": "个人信息"}],
      "questions": [{"question": "Why is data privacy a major concern?", "options": ["Because people don't care", "Because companies collect vast amounts of personal information", "Because there is no data", "Because privacy laws don't exist"], "answer": 1, "explanation": "文中提到Companies collect vast amounts of personal information。"}, {"question": "How can individuals protect their privacy?", "options": ["By sharing more information", "Using strong passwords and being cautious online", "By avoiding technology", "By ignoring the issue"], "answer": 1, "explanation": "文中提到using strong passwords, being cautious about sharing personal information online。"}]
    },
    {
      "id": 81, "title": "The Future of Transportation", "difficulty": "CET-6",
      "text": "Transportation is undergoing a significant transformation. Electric vehicles, autonomous cars, and high-speed rail are reshaping how people and goods move around the world.\n\nUrban areas are particularly affected by these changes. Ride-sharing services, electric scooters, and improved public transit are making cities more accessible and reducing carbon emissions.\n\nThe future of transportation will likely involve even more innovation. Flying cars, hyperloop systems, and advanced drone delivery are all being developed and tested.",
      "paragraphs_cn": ["交通正在经历重大变革。电动汽车、自动驾驶汽车和高速铁路正在重塑人们和货物在世界各地的移动方式。", "城市地区尤其受到这些变化的影响。共享出行服务、电动滑板车和改善的公共交通使城市更易到达并减少碳排放。", "交通的未来可能涉及更多创新。飞行汽车、超级高铁系统和先进的无人机配送都在开发和测试中。"],
      "vocabulary_notes": [{"word": "autonomous", "chinese": "自主的"}, {"word": "accessible", "chinese": "可到达的"}, {"word": "innovation", "chinese": "创新"}, {"word": "hyperloop", "chinese": "超级高铁"}],
      "questions": [{"question": "What is reshaping transportation?", "options": ["Only walking", "Electric vehicles, autonomous cars, and high-speed rail", "Only traditional cars", "Nothing is changing"], "answer": 1, "explanation": "文中提到Electric vehicles, autonomous cars, and high-speed rail are reshaping how people and goods move。"}, {"question": "What innovations are being developed for the future?", "options": ["More horses", "Flying cars, hyperloop systems, and drone delivery", "Walking only", "Nothing new"], "answer": 1, "explanation": "文中提到Flying cars, hyperloop systems, and advanced drone delivery。"}]
    },
    {
      "id": 82, "title": "The Benefits of Bilingual Education", "difficulty": "CET-4",
      "text": "Bilingual education programs offer students the opportunity to learn in two languages. Research shows that bilingual students often perform better academically and develop stronger cognitive skills.\n\nLearning in two languages helps students become more flexible thinkers and better problem-solvers. It also increases cultural awareness and empathy, as students learn to see the world from different perspectives.\n\nWhile some argue that bilingual education may slow academic progress, studies show that bilingual students eventually outperform their monolingual peers in many areas.",
      "paragraphs_cn": ["双语教育项目为学生提供了用两种语言学习的机会。研究表明，双语学生往往在学业上表现更好，并发展出更强的认知能力。", "用两种语言学习帮助学生成为更灵活的思考者和更好的问题解决者。它还增加了文化意识和同理心，因为学生学会从不同的角度看世界。", "虽然一些人认为双语教育可能会减慢学术进度，但研究表明双语学生最终在许多领域超过了单语同龄人。"],
      "vocabulary_notes": [{"word": "bilingual", "chinese": "双语的"}, {"word": "cognitive", "chinese": "认知的"}, {"word": "empathy", "chinese": "同理心"}, {"word": "monolingual", "chinese": "单语的"}],
      "questions": [{"question": "What benefits do bilingual students often have?", "options": ["Only language skills", "Better academic performance and cognitive skills", "Nothing", "Only social skills"], "answer": 1, "explanation": "文中提到bilingual students often perform better academically and develop stronger cognitive skills。"}, {"question": "How do bilingual students compare to monolingual peers?", "options": ["They perform worse", "They eventually outperform monolingual peers in many areas", "They perform the same", "They don't compare"], "answer": 1, "explanation": "文中提到bilingual students eventually outperform their monolingual peers in many areas。"}]
    },
    {
      "id": 83, "title": "The Impact of Urbanization", "difficulty": "CET-6",
      "text": "Urbanization is transforming societies around the world. As people move from rural to urban areas, cities are growing rapidly, bringing both opportunities and challenges.\n\nUrban areas offer better access to education, healthcare, and employment opportunities. However, rapid urbanization can also lead to overcrowding, pollution, and strain on infrastructure.\n\nSustainable urban planning is essential for managing growth. Creating green spaces, improving public transportation, and investing in renewable energy can help cities become more livable and environmentally friendly.",
      "paragraphs_cn": ["城市化正在改变世界各地的社会。随着人们从农村地区迁移到城市地区，城市正在快速增长，带来机遇和挑战。", "城市地区提供更好的教育、医疗保健和就业机会。然而，快速城市化也可能导致过度拥挤、污染和基础设施压力。", "可持续的城市规划对于管理增长至关重要。创建绿色空间、改善公共交通和投资可再生能源可以帮助城市变得更宜居、更环保。"],
      "vocabulary_notes": [{"word": "urbanization", "chinese": "城市化"}, {"word": "infrastructure", "chinese": "基础设施"}, {"word": "sustainable", "chinese": "可持续的"}, {"word": "livable", "chinese": "宜居的"}],
      "questions": [{"question": "What opportunities do urban areas offer?", "options": ["Only entertainment", "Better education, healthcare, and employment opportunities", "Nothing", "Only shopping"], "answer": 1, "explanation": "文中提到Urban areas offer better access to education, healthcare, and employment opportunities。"}, {"question": "What is essential for managing urban growth?", "options": ["Building more buildings", "Sustainable urban planning", "Ignoring problems", "Moving back to rural areas"], "answer": 1, "explanation": "文中提到Sustainable urban planning is essential for managing growth。"}]
    },
    {
      "id": 84, "title": "The Science of Sleep", "difficulty": "CET-4",
      "text": "Sleep is a fundamental biological process that affects every aspect of our health and well-being. During sleep, the body repairs tissues, consolidates memories, and regulates hormones.\n\nAdults typically need 7-9 hours of sleep per night. Chronic sleep deprivation has been linked to numerous health problems, including obesity, diabetes, and cardiovascular disease.\n\nImproving sleep hygiene can help ensure better rest. This includes maintaining a consistent sleep schedule, avoiding caffeine and screens before bed, and creating a comfortable sleep environment.",
      "paragraphs_cn": ["睡眠是一个基本的生物过程，影响我们健康和幸福的方方面面。在睡眠期间，身体修复组织、巩固记忆并调节荷尔蒙。", "成年人通常每晚需要7-9小时的睡眠。慢性睡眠不足与许多健康问题有关，包括肥胖、糖尿病和心血管疾病。", "改善睡眠卫生可以帮助确保更好的休息。这包括保持一致的睡眠时间表、睡前避免咖啡因和屏幕，以及创造舒适的睡眠环境。"],
      "vocabulary_notes": [{"word": "chronic", "chinese": "慢性的"}, {"word": "deprivation", "chinese": "剥夺"}, {"word": "hormones", "chinese": "荷尔蒙"}, {"word": "cardiovascular", "chinese": "心血管的"}],
      "questions": [{"question": "How much sleep do adults typically need?", "options": ["5-6 hours", "7-9 hours", "10-12 hours", "4-5 hours"], "answer": 1, "explanation": "文中提到Adults typically need 7-9 hours of sleep per night。"}, {"question": "What is sleep hygiene?", "options": ["Keeping clean", "Practices that improve sleep quality", "Medical treatment", "Exercise routine"], "answer": 1, "explanation": "文中提到improving sleep hygiene can help ensure better rest。"}]
    },
    {
      "id": 85, "title": "The Rise of Remote Learning", "difficulty": "CET-4",
      "text": "Remote learning has become increasingly common, especially since the COVID-19 pandemic. Online courses and virtual classrooms have made education accessible to students around the world.\n\nRemote learning offers several advantages, including flexibility, accessibility, and the ability to learn at your own pace. Students can access courses from prestigious institutions without relocating.\n\nHowever, remote learning also has challenges. Lack of face-to-face interaction, technical difficulties, and self-discipline requirements can make it difficult for some students. Balancing remote and in-person learning may be the best approach.",
      "paragraphs_cn": ["远程学习变得越来越普遍，尤其是自新冠疫情以来。在线课程和虚拟课堂使世界各地的学生都能获得教育。", "远程学习提供了几个优势，包括灵活性、可及性和按自己的节奏学习的能力。学生可以从著名机构获得课程，而无需搬迁。", "然而，远程学习也有挑战。缺乏面对面互动、技术困难和自律要求可能使一些学生感到困难。平衡远程和面对面学习可能是最好的方法。"],
      "vocabulary_notes": [{"word": "accessibility", "chinese": "可及性"}, {"word": "prestigious", "chinese": "有声望的"}, {"word": "relocating", "chinese": "搬迁"}, {"word": "self-discipline", "chinese": "自律"}],
      "questions": [{"question": "What advantages does remote learning offer?", "options": ["Only flexibility", "Flexibility, accessibility, and learning at own pace", "Nothing", "Only cost savings"], "answer": 1, "explanation": "文中提到Remote learning offers flexibility, accessibility, and the ability to learn at your own pace。"}, {"question": "What is a challenge of remote learning?", "options": ["Too much interaction", "Lack of face-to-face interaction and technical difficulties", "Too many teachers", "Nothing"], "answer": 1, "explanation": "文中提到Lack of face-to-face interaction, technical difficulties, and self-discipline requirements。"}]
    },
    {
      "id": 86, "title": "The Benefits of Walking", "difficulty": "CET-4",
      "text": "Walking is one of the simplest and most effective forms of exercise. It requires no special equipment and can be done almost anywhere. Regular walking has been shown to improve cardiovascular health, reduce stress, and boost mood.\n\nStudies indicate that walking for just 30 minutes a day can significantly reduce the risk of heart disease, diabetes, and certain cancers. It also helps maintain a healthy weight and improves bone density.\n\nWalking is also beneficial for mental health. It can reduce anxiety, improve sleep quality, and enhance creativity. Many people find that walking helps them think more clearly.",
      "paragraphs_cn": ["步行是最简单和最有效的锻炼形式之一。它不需要特殊设备，几乎可以在任何地方进行。定期步行已被证明可以改善心血管健康、减轻压力并提升情绪。", "研究表明，每天步行30分钟可以显著降低患心脏病、糖尿病和某些癌症的风险。它还有助于保持健康的体重并改善骨密度。", "步行对心理健康也有益处。它可以减少焦虑、改善睡眠质量并提高创造力。许多人发现步行帮助他们更清晰地思考。"],
      "vocabulary_notes": [{"word": "cardiovascular", "chinese": "心血管的"}, {"word": "density", "chinese": "密度"}, {"word": "anxiety", "chinese": "焦虑"}, {"word": "creativity", "chinese": "创造力"}],
      "questions": [{"question": "How much walking is recommended per day?", "options": ["10 minutes", "30 minutes", "1 hour", "2 hours"], "answer": 1, "explanation": "文中提到walking for just 30 minutes a day can significantly reduce the risk。"}, {"question": "What are the mental health benefits of walking?", "options": ["Only relaxation", "Reducing anxiety, improving sleep, and enhancing creativity", "Nothing", "Only exercise"], "answer": 1, "explanation": "文中提到It can reduce anxiety, improve sleep quality, and enhance creativity。"}]
    },
    {
      "id": 87, "title": "The Importance of Civic Engagement", "difficulty": "CET-6",
      "text": "Civic engagement, the act of participating in community and political life, is essential for a healthy democracy. Voting, volunteering, and community organizing are all forms of civic engagement.\n\nWhen citizens are actively engaged, they can influence policy decisions, hold leaders accountable, and contribute to the betterment of their communities. Research shows that engaged citizens report higher levels of satisfaction and well-being.\n\nBarriers to civic engagement include lack of information, time constraints, and political apathy. Addressing these barriers through education and accessible participation opportunities is crucial for strengthening democracy.",
      "paragraphs_cn": ["公民参与，即参与社区和政治生活的行为，对于健康的民主至关重要。投票、志愿服务和社区组织都是公民参与的形式。", "当公民积极参与时，他们可以影响政策决策、追究领导者的责任并为社区的改善做出贡献。研究表明，参与的公民报告更高水平的满意度和幸福感。", "公民参与的障碍包括缺乏信息、时间限制和政治冷漠。通过教育和可获得的参与机会来解决这些障碍对于加强民主至关重要。"],
      "vocabulary_notes": [{"word": "civic engagement", "chinese": "公民参与"}, {"word": "accountable", "chinese": "有责任的"}, {"word": "apathy", "chinese": "冷漠"}, {"word": "democracy", "chinese": "民主"}],
      "questions": [{"question": "What is civic engagement?", "options": ["Only voting", "Participating in community and political life", "Only volunteering", "Only protesting"], "answer": 1, "explanation": "文中提到Civic engagement is the act of participating in community and political life。"}, {"question": "What are barriers to civic engagement?", "options": ["Too much information", "Lack of information, time constraints, and political apathy", "Nothing", "Only cost"], "answer": 1, "explanation": "文中提到Barriers include lack of information, time constraints, and political apathy。"}]
    },
    {
      "id": 88, "title": "The Impact of Climate Change on Wildlife", "difficulty": "CET-6",
      "text": "Climate change is having a devastating impact on wildlife around the world. Rising temperatures, changing weather patterns, and habitat loss are threatening many species with extinction.\n\nPolar bears, coral reefs, and many bird species are particularly vulnerable to climate change. As their habitats change, these animals struggle to adapt and survive.\n\nConservation efforts are underway to protect endangered species. Creating protected areas, reducing carbon emissions, and promoting sustainable practices are all important steps in preserving biodiversity.",
      "paragraphs_cn": ["气候变化正在对世界各地的野生动物产生毁灭性影响。气温上升、天气模式变化和栖息地丧失正威胁着许多物种的生存。", "北极熊、珊瑚礁和许多鸟类物种对气候变化特别脆弱。随着它们的栖息地发生变化，这些动物难以适应和生存。", "保护工作正在进行中，以保护濒危物种。创建保护区、减少碳排放和推广可持续实践都是保护生物多样性的重要步骤。"],
      "vocabulary_notes": [{"word": "devastating", "chinese": "毁灭性的"}, {"word": "extinction", "chinese": "灭绝"}, {"word": "vulnerable", "chinese": "脆弱的"}, {"word": "biodiversity", "chinese": "生物多样性"}],
      "questions": [{"question": "What is having a devastating impact on wildlife?", "options": ["Only pollution", "Climate change", "Only hunting", "Nothing"], "answer": 1, "explanation": "文中提到Climate change is having a devastating impact on wildlife。"}, {"question": "What species are particularly vulnerable?", "options": ["Only fish", "Polar bears, coral reefs, and bird species", "Only mammals", "Nothing is vulnerable"], "answer": 1, "explanation": "文中提到Polar bears, coral reefs, and many bird species are particularly vulnerable。"}]
    },
    {
      "id": 89, "title": "The Benefits of Reading Fiction", "difficulty": "CET-4",
      "text": "Reading fiction offers unique benefits that extend beyond entertainment. Studies show that reading fiction can improve empathy, enhance social cognition, and boost creative thinking.\n\nWhen we read fiction, we enter the minds of characters and experience their emotions. This process helps us understand different perspectives and develop greater emotional intelligence.\n\nFiction also provides a safe space to explore complex ideas and emotions. By living vicariously through characters, readers can gain insights into experiences they may never encounter in real life.",
      "paragraphs_cn": ["阅读小说提供了超越娱乐的独特益处。研究表明，阅读小说可以提高同理心、增强社会认知并促进创造性思维。", "当我们阅读小说时，我们进入角色的思想并体验他们的情感。这个过程帮助我们理解不同的观点并发展更高的情商。", "小说还提供了一个探索复杂思想和情感的安全空间。通过间接体验角色的经历，读者可以获得他们在现实生活中可能永远不会遇到的见解。"],
      "vocabulary_notes": [{"word": "empathy", "chinese": "同理心"}, {"word": "cognition", "chinese": "认知"}, {"word": "vicariously", "chinese": "间接地"}, {"word": "insights", "chinese": "见解"}],
      "questions": [{"question": "What unique benefits does reading fiction offer?", "options": ["Only entertainment", "Improved empathy, social cognition, and creative thinking", "Nothing", "Only vocabulary"], "answer": 1, "explanation": "文中提到reading fiction can improve empathy, enhance social cognition, and boost creative thinking。"}, {"question": "How does reading fiction help develop emotional intelligence?", "options": ["By watching TV", "By entering the minds of characters and experiencing their emotions", "By ignoring emotions", "By being alone"], "answer": 1, "explanation": "文中提到When we read fiction, we enter the minds of characters and experience their emotions。"}]
    },
    {
      "id": 90, "title": "The Rise of Plant-Based Diets", "difficulty": "CET-4",
      "text": "Plant-based diets have gained popularity in recent years, driven by health concerns, environmental awareness, and animal welfare considerations. More people are choosing to reduce or eliminate meat consumption.\n\nResearch suggests that plant-based diets can offer significant health benefits, including lower risk of heart disease, diabetes, and certain cancers. They are also better for the environment, producing fewer greenhouse gas emissions.\n\nThe food industry is responding to this trend with a growing range of plant-based alternatives. From meat substitutes to dairy-free products, there are now more options than ever for those following a plant-based diet.",
      "paragraphs_cn": ["植物性饮食近年来越来越受欢迎，这是由健康担忧、环境意识和动物福利考虑所驱动的。越来越多的人选择减少或消除肉类消费。", "研究表明，植物性饮食可以提供显著的健康益处，包括降低患心脏病、糖尿病和某些癌症的风险。它们对环境也更好，产生更少的温室气体排放。", "食品行业正在响应这一趋势，提供更多植物性替代品。从肉类替代品到无乳制品，植物性饮食者现在有了比以往更多的选择。"],
      "vocabulary_notes": [{"word": "plant-based", "chinese": "植物性的"}, {"word": "greenhouse gas", "chinese": "温室气体"}, {"word": "substitute", "chinese": "替代品"}, {"word": "eliminate", "chinese": "消除"}],
      "questions": [{"question": "What is driving the popularity of plant-based diets?", "options": ["Only taste", "Health concerns, environmental awareness, and animal welfare", "Only cost", "Nothing"], "answer": 1, "explanation": "文中提到driven by health concerns, environmental awareness, and animal welfare considerations。"}, {"question": "What is the food industry doing in response?", "options": ["Nothing", "Providing more plant-based alternatives", "Stopping all food production", "Only selling meat"], "answer": 1, "explanation": "文中提到The food industry is responding with a growing range of plant-based alternatives。"}]
    },
    {
      "id": 91, "title": "The Importance of Soft Skills", "difficulty": "CET-4",
      "text": "Soft skills, such as communication, teamwork, and problem-solving, are increasingly important in the modern workplace. While technical skills are essential, employers value candidates who can work well with others and adapt to changing situations.\n\nSoft skills include communication, emotional intelligence, leadership, and critical thinking. These skills help people build relationships, resolve conflicts, and navigate complex work environments.\n\nDeveloping soft skills can be challenging, but it is worth the effort. These skills not only enhance career prospects but also improve personal relationships and overall well-being.",
      "paragraphs_cn": ["软技能，如沟通、团队合作和解决问题，在现代工作场所中越来越重要。虽然技术技能是必不可少的，但雇主更看重能够与他人良好合作并适应不断变化情况的候选人。", "软技能包括沟通、情商、领导力和批判性思维。这些技能帮助人们建立关系、解决冲突并驾驭复杂的工作环境。", "发展软技能可能具有挑战性，但值得付出努力。这些技能不仅提高了职业前景，还改善了人际关系和整体幸福感。"],
      "vocabulary_notes": [{"word": "soft skills", "chinese": "软技能"}, {"word": "emotional intelligence", "chinese": "情商"}, {"word": "navigate", "chinese": "驾驭"}, {"word": "prospects", "chinese": "前景"}],
      "questions": [{"question": "What are soft skills?", "options": ["Technical skills only", "Communication, teamwork, and problem-solving", "Physical abilities", "Computer skills"], "answer": 1, "explanation": "文中提到Soft skills include communication, teamwork, and problem-solving。"}, {"question": "Why are soft skills valuable?", "options": ["They are easy to learn", "They enhance career prospects and improve personal relationships", "They are not valuable", "They only matter in school"], "answer": 1, "explanation": "文中提到These skills enhance career prospects and improve personal relationships。"}]
    },
    {
      "id": 92, "title": "The Impact of Artificial Intelligence on Education", "difficulty": "CET-6",
      "text": "Artificial intelligence is transforming education in numerous ways. AI-powered tools can personalize learning, provide instant feedback, and help teachers identify students who need additional support.\n\nAdaptive learning platforms use AI to adjust the difficulty of content based on individual student performance. This personalized approach can help students learn more effectively and at their own pace.\n\nWhile AI offers many benefits for education, there are concerns about data privacy, job displacement, and the potential for AI to reinforce existing biases. Balancing these concerns with the benefits of AI in education is an ongoing challenge.",
      "paragraphs_cn": ["人工智能正在以多种方式改变教育。AI驱动的工具可以个性化学习、提供即时反馈，并帮助教师识别需要额外支持的学生。", "自适应学习平台使用AI根据个别学生的表现调整内容的难度。这种个性化方法可以帮助学生更有效地学习并按自己的节奏学习。", "虽然AI为教育提供了许多好处，但也存在关于数据隐私、就业流失和AI可能强化现有偏见的担忧。在这些担忧与AI在教育中的好处之间取得平衡是一个持续的挑战。"],
      "vocabulary_notes": [{"word": "adaptive", "chinese": "自适应的"}, {"word": "personalize", "chinese": "个性化"}, {"word": "bias", "chinese": "偏见"}, {"word": "reinforce", "chinese": "强化"}],
      "questions": [{"question": "How is AI transforming education?", "options": ["By replacing teachers", "By personalizing learning and providing feedback", "By making education more expensive", "By eliminating homework"], "answer": 1, "explanation": "文中提到AI-powered tools can personalize learning, provide instant feedback。"}, {"question": "What concerns exist about AI in education?", "options": ["No concerns", "Data privacy, job displacement, and reinforcing biases", "Only cost concerns", "Nothing"], "answer": 1, "explanation": "文中提到concerns about data privacy, job displacement, and the potential for AI to reinforce existing biases。"}]
    },
    {
      "id": 93, "title": "The Benefits of Public Transportation", "difficulty": "CET-4",
      "text": "Public transportation offers numerous benefits for individuals and communities. It reduces traffic congestion, lowers carbon emissions, and provides affordable mobility options.\n\nStudies show that people who use public transportation tend to be more physically active, as they often walk to and from transit stops. Public transit also reduces stress by eliminating the need to drive in traffic.\n\nInvesting in public transportation infrastructure is essential for sustainable development. Improved transit systems can boost economic growth, create jobs, and improve quality of life in urban areas.",
      "paragraphs_cn": ["公共交通为个人和社区提供了许多好处。它减少了交通拥堵，降低了碳排放，并提供了负担得起的出行选择。", "研究表明，使用公共交通的人往往更活跃，因为他们经常步行到公交站点。公共交通还通过消除在交通中驾驶的需要来减少压力。", "投资公共交通基础设施对于可持续发展至关重要。改善的交通系统可以促进经济增长、创造就业并改善城市地区的生活质量。"],
      "vocabulary_notes": [{"word": "congestion", "chinese": "拥堵"}, {"word": "mobility", "chinese": "出行能力"}, {"word": "infrastructure", "chinese": "基础设施"}, {"word": "sustainable", "chinese": "可持续的"}],
      "questions": [{"question": "What benefits does public transportation provide?", "options": ["Only convenience", "Reduces congestion, lowers emissions, and provides affordable mobility", "Nothing", "Only saves money"], "answer": 1, "explanation": "文中提到It reduces traffic congestion, lowers carbon emissions, and provides affordable mobility options。"}, {"question": "Why is investing in public transportation important?", "options": ["It's not important", "For sustainable development and economic growth", "Only for saving money", "To reduce walking"], "answer": 1, "explanation": "文中提到Investing in public transportation infrastructure is essential for sustainable development。"}]
    },
    {
      "id": 94, "title": "The Impact of Social Media on Business", "difficulty": "CET-6",
      "text": "Social media has revolutionized how businesses communicate with customers, build brands, and generate revenue. Platforms like Instagram, LinkedIn, and Twitter have become essential marketing tools.\n\nSocial media allows businesses to reach global audiences at relatively low cost. It also enables direct interaction with customers, providing valuable feedback and building brand loyalty.\n\nHowever, social media also presents challenges. Managing online reputation, dealing with negative reviews, and maintaining consistent brand messaging require careful strategy and resources.",
      "paragraphs_cn": ["社交媒体彻底改变了企业与客户沟通、建立品牌和创造收入的方式。Instagram、LinkedIn和Twitter等平台已成为重要的营销工具。", "社交媒体使企业能够以相对较低的成本接触到全球受众。它还能够与客户进行直接互动，提供宝贵的反馈并建立品牌忠诚度。", "然而，社交媒体也带来了挑战。管理在线声誉、处理负面评论和保持一致的品牌信息需要仔细的策略和资源。"],
      "vocabulary_notes": [{"word": "revolutionized", "chinese": "彻底改变了"}, {"word": "loyalty", "chinese": "忠诚度"}, {"word": "reputation", "chinese": "声誉"}, {"word": "messaging", "chinese": "信息"}],
      "questions": [{"question": "How has social media changed business?", "options": ["It hasn't changed anything", "Revolutionized communication, branding, and revenue generation", "Only increased costs", "Only for large companies"], "answer": 1, "explanation": "文中提到Social media has revolutionized how businesses communicate, build brands, and generate revenue。"}, {"question": "What challenges does social media present for businesses?", "options": ["Too many customers", "Managing reputation, dealing with negative reviews, and brand messaging", "Nothing", "Only technical issues"], "answer": 1, "explanation": "文中提到Managing online reputation, dealing with negative reviews, and maintaining consistent brand messaging。"}]
    },
    {
      "id": 95, "title": "The Benefits of Lifelong Learning", "difficulty": "CET-4",
      "text": "Lifelong learning, the ongoing pursuit of knowledge and skills throughout life, is becoming increasingly important in today's rapidly changing world.\n\nBenefits of lifelong learning include improved cognitive function, better job prospects, and greater personal fulfillment. People who continue learning tend to stay mentally sharp and adaptable.\n\nThere are many opportunities for lifelong learning, including online courses, community classes, and self-directed study. The key is to remain curious and open to new experiences.",
      "paragraphs_cn": ["终身学习，即在整个生命过程中持续追求知识和技能，在当今快速变化的世界中变得越来越重要。", "终身学习的好处包括改善认知功能、更好的工作前景和个人成就感。继续学习的人往往保持思维敏捷和适应性强。", "终身学习有很多机会，包括在线课程、社区课程和自主学习。关键是保持好奇心并乐于接受新体验。"],
      "vocabulary_notes": [{"word": "lifelong", "chinese": "终身的"}, {"word": "cognitive", "chinese": "认知的"}, {"word": "adaptable", "chinese": "适应性强的"}, {"word": "self-directed", "chinese": "自主的"}],
      "questions": [{"question": "What are benefits of lifelong learning?", "options": ["Only entertainment", "Improved cognitive function, job prospects, and personal fulfillment", "Nothing", "Only making money"], "answer": 1, "explanation": "文中提到Benefits include improved cognitive function, better job prospects, and greater personal fulfillment。"}, {"question": "What is the key to lifelong learning?", "options": ["Working harder", "Remaining curious and open to new experiences", "Getting a degree", "Only reading books"], "answer": 1, "explanation": "文中提到The key is to remain curious and open to new experiences。"}]
    },
    {
      "id": 96, "title": "The Impact of Fast Fashion", "difficulty": "CET-6",
      "text": "Fast fashion has transformed the clothing industry, making trendy clothes available at low prices. However, this convenience comes at a significant environmental cost.\n\nThe fast fashion industry is responsible for a large portion of global carbon emissions and water pollution. The production process uses enormous amounts of water and chemicals, and much of the clothing ends up in landfills.\n\nConsumers can help by choosing sustainable clothing options, buying less but higher quality items, and supporting ethical brands. The fashion industry itself is also beginning to adopt more sustainable practices.",
      "paragraphs_cn": ["快时尚已经改变了服装业，以低价提供时尚服装。然而，这种便利付出了巨大的环境代价。", "快时尚行业是全球碳排放和水污染的重要来源。生产过程使用大量的水和化学品，而且许多服装最终进入垃圾填埋场。", "消费者可以通过选择可持续的服装选择、购买更少但更高质量的物品和支持道德品牌来提供帮助。时尚行业本身也开始采用更可持续的做法。"],
      "vocabulary_notes": [{"word": "fast fashion", "chinese": "快时尚"}, {"word": "carbon emissions", "chinese": "碳排放"}, {"word": "landfills", "chinese": "垃圾填埋场"}, {"word": "ethical", "chinese": "道德的"}],
      "questions": [{"question": "What is the environmental cost of fast fashion?", "options": ["No cost", "Carbon emissions and water pollution", "Only cost issues", "Nothing"], "answer": 1, "explanation": "文中提到The fast fashion industry is responsible for a large portion of global carbon emissions and water pollution。"}, {"question": "How can consumers help?", "options": ["Buy more clothes", "Choose sustainable options and buy less", "Ignore the problem", "Only shop at expensive stores"], "answer": 1, "explanation": "文中提到choosing sustainable clothing options, buying less but higher quality items。"}]
    },
    {
      "id": 97, "title": "The Benefits of Outdoor Education", "difficulty": "CET-4",
      "text": "Outdoor education, learning that takes place outside the traditional classroom, offers unique benefits for students of all ages. It combines academic learning with hands-on experiences in nature.\n\nResearch shows that outdoor education improves academic performance, enhances social skills, and boosts physical fitness. Students who participate in outdoor programs often show increased confidence and teamwork abilities.\n\nSchools are increasingly incorporating outdoor education into their curricula. Field trips, nature camps, and environmental projects are some of the ways schools are bringing learning outside.",
      "paragraphs_cn": ["户外教育，即在传统教室外进行的学习，为所有年龄段的学生提供了独特的好处。它将学术学习与大自然中的动手体验相结合。", "研究表明，户外教育可以提高学业成绩、增强社交技能并促进身体健康。参加户外项目的学生往往表现出更高的信心和团队合作能力。", "学校越来越多地将户外教育纳入课程。实地考察、自然营地和环保项目是学校将学习带出户外的一些方式。"],
      "vocabulary_notes": [{"word": "outdoor education", "chinese": "户外教育"}, {"word": "curriculum", "chinese": "课程"}, {"word": "hands-on", "chinese": "动手的"}, {"word": "incorporating", "chinese": "纳入"}],
      "questions": [{"question": "What does outdoor education combine?", "options": ["Only exercise", "Academic learning with hands-on experiences in nature", "Only socializing", "Only entertainment"], "answer": 1, "explanation": "文中提到It combines academic learning with hands-on experiences in nature。"}, {"question": "How are schools incorporating outdoor education?", "options": ["By closing schools", "Through field trips, nature camps, and environmental projects", "By ignoring it", "By only teaching indoors"], "answer": 1, "explanation": "文中提到Field trips, nature camps, and environmental projects are some of the ways。"}]
    },
    {
      "id": 98, "title": "The Power of Gratitude", "difficulty": "CET-4",
      "text": "Practicing gratitude, the act of being thankful for what we have, has been shown to have profound effects on mental and physical health. Research suggests that grateful people are happier, healthier, and more resilient.\n\nStudies have found that keeping a gratitude journal, where you write down things you're thankful for, can significantly improve well-being. Even simple practices like expressing thanks to others can boost happiness.\n\nGratitude also strengthens relationships. People who express gratitude regularly report stronger connections with friends and family.",
      "paragraphs_cn": ["练习感恩，即对我们所拥有的表示感谢的行为，已被证明对心理健康和身体健康有深远的影响。研究表明，感恩的人更快乐、更健康、更有韧性。", "研究发现，写感恩日记，即写下你感恩的事情，可以显著改善幸福感。即使是像向他人表达感谢这样简单的实践也能提升快乐。", "感恩还能加强人际关系。经常表达感恩的人报告与朋友和家人有更强的联系。"],
      "vocabulary_notes": [{"word": "gratitude", "chinese": "感恩"}, {"word": "resilient", "chinese": "有韧性的"}, {"word": "profound", "chinese": "深远的"}, {"word": "well-being", "chinese": "幸福"}],
      "questions": [{"question": "What effects does practicing gratitude have?", "options": ["No effects", "People are happier, healthier, and more resilient", "Only makes people tired", "Only physical effects"], "answer": 1, "explanation": "文中提到grateful people are happier, healthier, and more resilient。"}, {"question": "How does gratitude strengthen relationships?", "options": ["By avoiding people", "People who express gratitude report stronger connections", "By being distant", "It doesn't"], "answer": 1, "explanation": "文中提到People who express gratitude regularly report stronger connections with friends and family。"}]
    },
    {
      "id": 99, "title": "The Impact of Noise Pollution", "difficulty": "CET-6",
      "text": "Noise pollution is a growing environmental concern that affects millions of people worldwide. Excessive noise from traffic, construction, and industrial activities can have serious effects on health.\n\nStudies show that chronic noise exposure can lead to hearing loss, sleep disturbances, and increased stress levels. Children exposed to high levels of noise may experience learning difficulties and reduced academic performance.\n\nCities are implementing various strategies to reduce noise pollution, including quieter road surfaces, noise barriers, and regulations on construction hours. Individual actions, such as using noise-cancelling headphones, can also help manage noise exposure.",
      "paragraphs_cn": ["噪音污染是一个日益严重的环境问题，影响着全球数百万人。来自交通、建筑和工业活动的过度噪音会对健康产生严重影响。", "研究表明，长期暴露于噪音可能导致听力损失、睡眠障碍和压力水平增加。暴露于高噪音水平的儿童可能会经历学习困难和学业成绩下降。", "城市正在实施各种策略来减少噪音污染，包括更安静的路面、隔音屏障和施工时间规定。个人行动，如使用降噪耳机，也可以帮助管理噪音暴露。"],
      "vocabulary_notes": [{"word": "noise pollution", "chinese": "噪音污染"}, {"word": "chronic", "chinese": "慢性的"}, {"word": "exposure", "chinese": "暴露"}, {"word": "regulations", "chinese": "规定"}],
      "questions": [{"question": "What are effects of chronic noise exposure?", "options": ["Only annoyance", "Hearing loss, sleep disturbances, and increased stress", "Nothing", "Only headaches"], "answer": 1, "explanation": "文中提到chronic noise exposure can lead to hearing loss, sleep disturbances, and increased stress levels。"}, {"question": "What strategies are cities using to reduce noise?", "options": ["Making more noise", "Quieter roads, noise barriers, and regulations", "Ignoring the problem", "Only banning cars"], "answer": 1, "explanation": "文中提到quieter road surfaces, noise barriers, and regulations on construction hours。"}]
    },
    {
      "id": 100, "title": "The Benefits of Play for Children", "difficulty": "CET-4",
      "text": "Play is essential for children's development. Through play, children learn important skills, develop creativity, and build social connections. Research shows that play helps children develop problem-solving abilities, emotional regulation, and language skills.\n\nUnstructured play, where children choose their own activities, is particularly valuable. It allows children to explore, experiment, and learn at their own pace.\n\nDespite its importance, many children today have less opportunity for free play due to increased screen time and academic pressure. Encouraging outdoor play and limiting screen time can help children develop more fully.",
      "paragraphs_cn": ["玩耍对儿童的发展至关重要。通过玩耍，儿童学习重要的技能，发展创造力并建立社交联系。研究表明，玩耍帮助儿童发展解决问题的能力、情绪调节和语言技能。", "非结构化玩耍，即儿童选择自己的活动，特别有价值。它让儿童可以探索、实验并按自己的节奏学习。", "尽管玩耍很重要，但由于屏幕时间增加和学业压力，许多孩子今天有更少的自由玩耍机会。鼓励户外玩耍和限制屏幕时间可以帮助儿童更全面地发展。"],
      "vocabulary_notes": [{"word": "unstructured", "chinese": "非结构化的"}, {"word": "emotional regulation", "chinese": "情绪调节"}, {"word": "screen time", "chinese": "屏幕时间"}, {"word": "develop fully", "chinese": "全面发展"}],
      "questions": [{"question": "What do children learn through play?", "options": ["Only physical skills", "Problem-solving, emotional regulation, and language skills", "Nothing", "Only social skills"], "answer": 1, "explanation": "文中提到play helps children develop problem-solving abilities, emotional regulation, and language skills。"}, {"question": "Why do many children have less opportunity for free play?", "options": ["School is too short", "Increased screen time and academic pressure", "Parents are too busy", "Nothing"], "answer": 1, "explanation": "文中提到due to increased screen time and academic pressure。"}]
    },
    {
      "id": 101, "title": "The Impact of Climate Change on Agriculture", "difficulty": "CET-6",
      "text": "Climate change poses significant threats to global agriculture. Rising temperatures, changing precipitation patterns, and more frequent extreme weather events are affecting crop yields and food security worldwide.\n\nFarmers are adapting to these changes by developing drought-resistant crops, improving irrigation systems, and adopting sustainable farming practices. However, these adaptations require significant investment and technical expertise.\n\nInternational cooperation is essential to address the agricultural impacts of climate change. Sharing knowledge, technology, and resources can help vulnerable regions adapt to changing conditions.",
      "paragraphs_cn": ["气候变化对全球农业构成重大威胁。气温上升、降水模式变化和更频繁的极端天气事件正在影响全球的作物产量和粮食安全。", "农民正在通过开发抗旱作物、改进灌溉系统和采用可持续农业实践来适应这些变化。然而，这些适应措施需要大量投资和技术专长。", "国际合作对于应对气候变化对农业的影响至关重要。分享知识、技术和资源可以帮助脆弱地区适应变化的条件。"],
      "vocabulary_notes": [{"word": "precipitation", "chinese": "降水"}, {"word": "drought-resistant", "chinese": "抗旱的"}, {"word": "vulnerable", "chinese": "脆弱的"}, {"word": "sustainable", "chinese": "可持续的"}],
      "questions": [{"question": "How are farmers adapting to climate change?", "options": ["By ignoring it", "By developing drought-resistant crops and improving irrigation", "By moving to cities", "By stopping farming"], "answer": 1, "explanation": "文中提到Farmers are adapting by developing drought-resistant crops, improving irrigation systems。"}, {"question": "What is essential to address agricultural impacts of climate change?", "options": ["Individual action only", "International cooperation", "Government control", "Nothing can be done"], "answer": 1, "explanation": "文中提到International cooperation is essential。"}]
    },
    {
      "id": 102, "title": "The Benefits of Public Libraries", "difficulty": "CET-4",
      "text": "Public libraries play a vital role in communities by providing free access to information, education, and resources. They serve people of all ages and backgrounds, from children learning to read to adults seeking job opportunities.\n\nLibraries offer much more than books. Many provide computer access, internet services, educational programs, and community events. They also serve as safe spaces for people to study, work, or simply relax.\n\nIn the digital age, libraries are evolving to meet changing needs. E-book lending, digital literacy programs, and maker spaces are some of the new services being offered.",
      "paragraphs_cn": ["公共图书馆在社区中发挥着至关重要的作用，提供免费的信息、教育和资源获取。它们服务于所有年龄和背景的人，从学习阅读的儿童到寻找工作机会的成年人。", "图书馆提供的远不止书籍。许多图书馆提供计算机访问、互联网服务、教育项目和社区活动。它们也是人们学习、工作或简单放松的安全空间。", "在数字时代，图书馆正在演变以满足不断变化的需求。电子书借阅、数字素养项目和创客空间是一些正在提供的新服务。"],
      "vocabulary_notes": [{"word": "vital", "chinese": "至关重要的"}, {"word": "digital literacy", "chinese": "数字素养"}, {"word": "evolving", "chinese": "演变"}, {"word": "maker space", "chinese": "创客空间"}],
      "questions": [{"question": "What do public libraries provide?", "options": ["Only books", "Free access to information, education, and resources", "Only computers", "Only internet access"], "answer": 1, "explanation": "文中提到public libraries play a vital role by providing free access to information, education, and resources。"}, {"question": "How are libraries evolving in the digital age?", "options": ["They are closing down", "They are offering e-book lending and digital programs", "They are only for children", "They are not changing"], "answer": 1, "explanation": "文中提到E-book lending, digital literacy programs, and maker spaces are some of the new services。"}]
    },
    {
      "id": 103, "title": "The Science of Happiness", "difficulty": "CET-6",
      "text": "What makes people happy? Scientists have been studying this question for decades, and their findings reveal some surprising insights.\n\nResearch shows that material wealth has only a limited impact on happiness. Once basic needs are met, additional income provides diminishing returns. Instead, relationships, experiences, and personal growth are stronger predictors of well-being.\n\nPractices such as gratitude, mindfulness, and social connection have been shown to increase happiness levels. Even simple activities like spending time in nature or helping others can significantly boost mood.",
      "paragraphs_cn": ["是什么让人们快乐？科学家们已经研究这个问题几十年了，他们的发现揭示了一些令人惊讶的见解。", "研究表明，物质财富对幸福感的影响有限。一旦基本需求得到满足，额外收入提供的回报就会递减。相反，人际关系、经历和个人成长是幸福感的更强预测因素。", "感恩、正念和社会联系等实践已被证明可以提高幸福感水平。即使是像在大自然中度过时间或帮助他人这样简单的活动也能显著提升情绪。"],
      "vocabulary_notes": [{"word": "diminishing", "chinese": "递减的"}, {"word": "well-being", "chinese": "幸福"}, {"word": "mindfulness", "chinese": "正念"}, {"word": "gratitude", "chinese": "感恩"}],
      "questions": [{"question": "What has only a limited impact on happiness?", "options": ["Relationships", "Material wealth", "Experiences", "Personal growth"], "answer": 1, "explanation": "文中提到material wealth has only a limited impact on happiness。"}, {"question": "What are stronger predictors of well-being?", "options": ["Money and fame", "Relationships, experiences, and personal growth", "Only relationships", "Nothing"], "answer": 1, "explanation": "文中提到relationships, experiences, and personal growth are stronger predictors of well-being。"}]
    },
    {
      "id": 104, "title": "The History of the Internet", "difficulty": "CET-4",
      "text": "The Internet began as a military project in the 1960s. ARPANET, the predecessor of the modern Internet, was designed to allow computers at different universities to communicate with each other.\n\nIn the 1990s, the World Wide Web was invented, making the Internet accessible to ordinary people. This revolution transformed how we communicate, work, and access information.\n\nToday, the Internet connects billions of people worldwide. It has become essential for education, business, entertainment, and social interaction. The Internet continues to evolve, with emerging technologies like artificial intelligence and virtual reality expanding its possibilities.",
      "paragraphs_cn": ["互联网始于1960年代的一个军事项目。现代互联网的前身ARPANET旨在让不同大学的计算机相互通信。", "1990年代，万维网被发明，使普通民众能够使用互联网。这一革命改变了我们交流、工作和获取信息的方式。", "如今，互联网连接着全球数十亿人。它已成为教育、商业、娱乐和社交互动的重要组成部分。互联网不断发展，人工智能和虚拟现实等新兴技术正在扩展其可能性。"],
      "vocabulary_notes": [{"word": "predecessor", "chinese": "前身"}, {"word": "accessible", "chinese": "可访问的"}, {"word": "emerging", "chinese": "新兴的"}, {"word": "virtual reality", "chinese": "虚拟现实"}],
      "questions": [{"question": "What was the original purpose of the Internet?", "options": ["Entertainment", "Military communication", "Education", "Business"], "answer": 1, "explanation": "文中提到The Internet began as a military project in the 1960s。"}, {"question": "What made the Internet accessible to ordinary people?", "options": ["The telephone", "The World Wide Web", "Social media", "Smartphones"], "answer": 1, "explanation": "文中提到the World Wide Web was invented, making the Internet accessible to ordinary people。"}]
    },
    {
      "id": 105, "title": "The Importance of Cultural Diversity", "difficulty": "CET-6",
      "text": "Cultural diversity enriches societies by bringing together different perspectives, traditions, and ways of thinking. It fosters creativity, innovation, and mutual understanding among people from different backgrounds.\n\nIn the workplace, diverse teams tend to perform better because they bring a wider range of ideas and approaches. Companies that embrace diversity are often more innovative and better able to serve diverse customer bases.\n\nHowever, cultural diversity also requires tolerance and open-mindedness. Learning about and respecting different cultures is essential for building harmonious communities.",
      "paragraphs_cn": ["文化多样性通过汇集不同的观点、传统和思维方式来丰富社会。它促进来自不同背景的人们之间的创造力、创新和相互理解。", "在工作场所，多元化的团队往往表现更好，因为他们带来了更广泛的想法和方法。拥抱多样性的公司通常更具创新性，更能服务多元化的客户群。", "然而，文化多样性也需要宽容和开放的心态。了解和尊重不同文化对于建设和谐社区至关重要。"],
      "vocabulary_notes": [{"word": "diversity", "chinese": "多样性"}, {"word": "innovation", "chinese": "创新"}, {"word": "tolerance", "chinese": "宽容"}, {"word": "harmonious", "chinese": "和谐的"}],
      "questions": [{"question": "Why do diverse teams perform better?", "options": ["They work fewer hours", "They bring a wider range of ideas", "They have more money", "They are older"], "answer": 1, "explanation": "文中提到diverse teams tend to perform better because they bring a wider range of ideas。"}, {"question": "What is essential for building harmonious communities?", "options": ["Ignoring differences", "Tolerance and open-mindedness", "Moving to new places", "Working alone"], "answer": 1, "explanation": "文中提到tolerance and open-mindedness is essential for building harmonious communities。"}]
    },
    {
      "id": 106, "title": "The Impact of Artificial Intelligence", "difficulty": "CET-6",
      "text": "Artificial intelligence (AI) is transforming industries and reshaping the way we work and live. From healthcare to transportation, AI technologies are being deployed to solve complex problems and improve efficiency.\n\nAI offers many benefits, including automating repetitive tasks, analyzing large amounts of data, and providing personalized experiences. However, it also raises concerns about job displacement, privacy, and ethical use.\n\nAs AI continues to develop, it is important to ensure that it is used responsibly. Balancing innovation with ethical considerations will be key to realizing AI's full potential.",
      "paragraphs_cn": ["人工智能正在改变各个行业，重塑我们工作和生活的方式。从医疗保健到交通，AI技术正在被部署来解决复杂问题并提高效率。", "AI提供了许多好处，包括自动化重复任务、分析大量数据和提供个性化体验。然而，它也引发了关于就业流失、隐私和道德使用的担忧。", "随着AI的不断发展，确保负责任地使用它很重要。在创新与道德考虑之间取得平衡将是实现AI全部潜力的关键。"],
      "vocabulary_notes": [{"word": "deploy", "chinese": "部署"}, {"word": "displacement", "chinese": "流失"}, {"word": "ethical", "chinese": "道德的"}, {"word": "realize", "chinese": "实现"}],
      "questions": [{"question": "What benefits does AI offer?", "options": ["Only automation", "Automating tasks, analyzing data, and personalized experiences", "Nothing", "Only entertainment"], "answer": 1, "explanation": "文中提到AI offers automating repetitive tasks, analyzing large amounts of data, and providing personalized experiences。"}, {"question": "What is key to realizing AI's full potential?", "options": ["More funding", "Balancing innovation with ethical considerations", "Using AI everywhere", "Ignoring concerns"], "answer": 1, "explanation": "文中提到Balancing innovation with ethical considerations will be key。"}]
    },
    {
      "id": 107, "title": "The Benefits of Green Spaces", "difficulty": "CET-4",
      "text": "Green spaces, such as parks, gardens, and forests, provide numerous benefits to communities and individuals. They improve air quality, reduce stress, and promote physical activity.\n\nStudies have shown that spending time in nature can lower blood pressure, reduce anxiety, and improve mental health. Green spaces also provide habitats for wildlife and help preserve biodiversity.\n\nUrban planning should prioritize the creation of green spaces. Even small parks and community gardens can make a significant difference in people's quality of life.",
      "paragraphs_cn": ["绿色空间，如公园、花园和森林，为社区和个人提供了许多好处。它们改善空气质量、减轻压力并促进体育活动。", "研究表明，在大自然中度过时间可以降低血压、减少焦虑并改善心理健康。绿色空间还为野生动物提供栖息地并有助于保护生物多样性。", "城市规划应优先考虑创建绿色空间。即使是小公园和社区花园也能对人们的生活质量产生重大影响。"],
      "vocabulary_notes": [{"word": "biodiversity", "chinese": "生物多样性"}, {"word": "habitat", "chinese": "栖息地"}, {"word": "prioritize", "chinese": "优先考虑"}, {"word": "quality of life", "chinese": "生活质量"}],
      "questions": [{"question": "What benefits do green spaces provide?", "options": ["Only beauty", "Improved air quality, reduced stress, and physical activity", "Nothing", "Only shade"], "answer": 1, "explanation": "文中提到They improve air quality, reduce stress, and promote physical activity。"}, {"question": "What should urban planning prioritize?", "options": ["Building more roads", "Creating green spaces", "Expanding cities", "Ignoring nature"], "answer": 1, "explanation": "文中提到Urban planning should prioritize the creation of green spaces。"}]
    },
    {
      "id": 108, "title": "The Power of Storytelling", "difficulty": "CET-6",
      "text": "Storytelling is one of humanity's oldest forms of communication. From ancient myths to modern novels, stories have shaped cultures, preserved history, and connected people across generations.\n\nResearch shows that stories engage the brain differently than facts alone. When we hear a story, our brains release oxytocin, the chemical associated with empathy and connection. This is why stories are such powerful tools for teaching and persuasion.\n\nIn business, storytelling is increasingly being used to communicate ideas, build brands, and inspire teams. A well-told story can make complex concepts more accessible and memorable.",
      "paragraphs_cn": ["讲故事是人类最古老的交流形式之一。从古代神话到现代小说，故事塑造了文化，保存了历史，并跨越世代连接了人们。", "研究表明，故事对大脑的吸引力不同于单纯的事实。当我们听到一个故事时，我们的大脑会释放催产素，这种化学物质与同理心和联系有关。这就是为什么故事是教学和说服的强大工具。", "在商业中，讲故事越来越多地被用来传达想法、建立品牌和激励团队。一个讲得好的故事可以使复杂概念更易于理解和记忆。"],
      "vocabulary_notes": [{"word": "oxytocin", "chinese": "催产素"}, {"word": "persuasion", "chinese": "说服"}, {"word": "accessible", "chinese": "易于理解的"}, {"word": "memorable", "chinese": "难忘的"}],
      "questions": [{"question": "Why are stories powerful tools for teaching?", "options": ["They are always true", "They engage the brain and release oxytocin", "They are shorter than facts", "They are more expensive"], "answer": 1, "explanation": "文中提到stories engage the brain differently and release oxytocin。"}, {"question": "How is storytelling used in business?", "options": ["To avoid work", "To communicate ideas and build brands", "To distract employees", "To reduce costs"], "answer": 1, "explanation": "文中提到storytelling is increasingly being used to communicate ideas, build brands, and inspire teams。"}]
    },
    {
      "id": 109, "title": "The Importance of Early Childhood Education", "difficulty": "CET-4",
      "text": "Early childhood education plays a crucial role in a child's development. Research shows that children who attend quality preschool programs have better academic outcomes, social skills, and emotional development.\n\nEarly education helps children develop foundational skills like literacy, numeracy, and problem-solving. It also teaches important social skills such as sharing, cooperation, and communication.\n\nInvesting in early childhood education benefits not only children but also society as a whole. Studies have shown that children who receive quality early education are more likely to succeed in school and in life.",
      "paragraphs_cn": ["早期儿童教育在孩子的发展中起着至关重要的作用。研究表明，参加优质学前项目的孩子有更好的学术成果、社交技能和情感发展。", "早期教育帮助孩子发展读写能力、算术和解决问题等基础技能。它还教授重要的社交技能，如分享、合作和沟通。", "投资早期儿童教育不仅有利于儿童，也有利于整个社会。研究表明，接受优质早期教育的孩子更有可能在学校和生活中取得成功。"],
      "vocabulary_notes": [{"word": "foundational", "chinese": "基础的"}, {"word": "literacy", "chinese": "读写能力"}, {"word": "numeracy", "chinese": "算术能力"}, {"word": "outcomes", "chinese": "成果"}],
      "questions": [{"question": "What do children who attend quality preschool programs have?", "options": ["Better toys", "Better academic outcomes, social skills, and emotional development", "More money", "Better grades only"], "answer": 1, "explanation": "文中提到children who attend quality preschool programs have better academic outcomes, social skills, and emotional development。"}, {"question": "What does investing in early childhood education benefit?", "options": ["Only children", "Children and society as a whole", "Only teachers", "Only parents"], "answer": 1, "explanation": "文中提到Investing in early childhood education benefits not only children but also society as a whole。"}]
    },
    {
      "id": 110, "title": "The Impact of Globalization", "difficulty": "CET-6",
      "text": "Globalization has transformed the world economy, creating new opportunities for trade, investment, and cultural exchange. However, it has also raised concerns about inequality, environmental impact, and cultural homogenization.\n\nEconomic globalization has brought significant benefits, including increased trade, job creation, and access to new markets. However, these benefits have not been evenly distributed, and many communities have been left behind.\n\nFinding a balance between economic growth and social welfare is essential for sustainable development. Policies that promote inclusive growth and protect vulnerable populations are needed.",
      "paragraphs_cn": ["全球化改变了世界经济，为贸易、投资和文化交流创造了新的机会。然而，它也引发了关于不平等、环境影响和文化同质化的担忧。", "经济全球化带来了显著的好处，包括增加贸易、创造就业和进入新市场。然而，这些好处并未均匀分配，许多社区被抛在后面。", "在经济增长和社会福利之间找到平衡对于可持续发展至关重要。需要促进包容性增长和保护弱势群体的政策。"],
      "vocabulary_notes": [{"word": "homogenization", "chinese": "同质化"}, {"word": "inclusive", "chinese": "包容性的"}, {"word": "vulnerable", "chinese": "脆弱的"}, {"word": "sustainable", "chinese": "可持续的"}],
      "questions": [{"question": "What concerns has globalization raised?", "options": ["Only economic concerns", "Inequality, environmental impact, and cultural homogenization", "Nothing", "Only political concerns"], "answer": 1, "explanation": "文中提到it has also raised concerns about inequality, environmental impact, and cultural homogenization。"}, {"question": "What is needed for sustainable development?", "options": ["More globalization", "Policies that promote inclusive growth", "Less trade", "More regulation"], "answer": 1, "explanation": "文中提到Policies that promote inclusive growth and protect vulnerable populations are needed。"}]
    },
    {
      "id": 111, "title": "The Benefits of Meditation", "difficulty": "CET-4",
      "text": "Meditation has been practiced for thousands of years and is gaining popularity in modern society. Research shows that regular meditation can reduce stress, improve focus, and enhance emotional well-being.\n\nStudies have found that meditation changes the brain structure in positive ways. It increases gray matter in areas associated with memory, learning, and emotional regulation. It also reduces activity in the amygdala, the brain's fear center.\n\nEven short daily meditation sessions can have significant benefits. Many apps and online resources make it easy for beginners to learn meditation techniques.",
      "paragraphs_cn": ["冥想已经实践了数千年，正在现代社会中越来越受欢迎。研究表明，定期冥想可以减轻压力、提高注意力并增强情绪健康。", "研究发现，冥想以积极的方式改变了大脑结构。它增加了与记忆、学习和情绪调节相关区域的灰质。它还减少了杏仁核（大脑的恐惧中心）的活动。", "即使是短暂的每日冥想也能产生显著的益处。许多应用程序和在线资源使初学者更容易学习冥想技巧。"],
      "vocabulary_notes": [{"word": "meditation", "chinese": "冥想"}, {"word": "gray matter", "chinese": "灰质"}, {"word": "amygdala", "chinese": "杏仁核"}, {"word": "regulation", "chinese": "调节"}],
      "questions": [{"question": "How does meditation affect the brain?", "options": ["It shrinks the brain", "It increases gray matter and reduces amygdala activity", "It has no effect", "It damages the brain"], "answer": 1, "explanation": "文中提到It increases gray matter and reduces activity in the amygdala。"}, {"question": "How much meditation is needed for significant benefits?", "options": ["Hours daily", "Even short daily sessions", "Once a month", "Only professional meditation"], "answer": 1, "explanation": "文中提到Even short daily meditation sessions can have significant benefits。"}]
    },
    {
      "id": 112, "title": "The Future of Space Exploration", "difficulty": "CET-6",
      "text": "Space exploration has entered a new era with the involvement of private companies alongside government agencies. SpaceX, Blue Origin, and other private firms are revolutionizing space travel.\n\nThe goal of space exploration extends beyond scientific discovery. Establishing human colonies on Mars, mining asteroids for resources, and developing space-based industries are all being considered.\n\nHowever, space exploration raises important questions about cost, environmental impact, and the ethical treatment of any extraterrestrial life that might be discovered.",
      "paragraphs_cn": ["随着私营公司与政府机构一起参与，太空探索进入了一个新时代。SpaceX、Blue Origin和其他私营公司正在革新太空旅行。", "太空探索的目标超越了科学发现。在火星上建立人类殖民地、开采小行星资源和发展太空产业都在被考虑之中。", "然而，太空探索引发了关于成本、环境影响和可能发现的任何外星生命伦理待遇的重要问题。"],
      "vocabulary_notes": [{"word": "revolutionizing", "chinese": "革新"}, {"word": "extraterrestrial", "chinese": "外星的"}, {"word": "ethical", "chinese": "道德的"}, {"word": "colonies", "chinese": "殖民地"}],
      "questions": [{"question": "What is driving the new era of space exploration?", "options": ["Only government agencies", "Private companies alongside government agencies", "Only scientists", "No one is interested"], "answer": 1, "explanation": "文中提到Space exploration has entered a new era with the involvement of private companies alongside government agencies。"}, {"question": "What questions does space exploration raise?", "options": ["Only cost", "Cost, environmental impact, and ethical treatment of extraterrestrial life", "Nothing", "Only about Mars"], "answer": 1, "explanation": "文中提到cost, environmental impact, and the ethical treatment of any extraterrestrial life。"}]
    },
    {
      "id": 113, "title": "The Importance of Critical Thinking", "difficulty": "CET-6",
      "text": "Critical thinking is the ability to analyze information objectively and make reasoned judgments. In today's information age, this skill is more important than ever.\n\nCritical thinkers can evaluate evidence, identify biases, and form well-reasoned opinions. This helps them navigate complex issues, avoid misinformation, and make better decisions.\n\nEducation systems are increasingly emphasizing critical thinking skills. Teaching students to question assumptions, analyze arguments, and evaluate sources is essential for preparing them for the challenges of the modern world.",
      "paragraphs_cn": ["批判性思维是客观分析信息并做出理性判断的能力。在当今信息时代，这项技能比以往任何时候都更加重要。", "批判性思维者能够评估证据、识别偏见并形成有充分理由的观点。这帮助他们驾驭复杂问题、避免错误信息并做出更好的决策。", "教育系统越来越强调批判性思维技能。教学生质疑假设、分析论点和评估来源对于为他们应对现代世界的挑战至关重要。"],
      "vocabulary_notes": [{"word": "reasoned", "chinese": "有充分理由的"}, {"word": "bias", "chinese": "偏见"}, {"word": "misinformation", "chinese": "错误信息"}, {"word": "evaluate", "chinese": "评估"}],
      "questions": [{"question": "What is critical thinking?", "options": ["Being critical of others", "Analyzing information objectively and making reasoned judgments", "Thinking quickly", "Being negative"], "answer": 1, "explanation": "文中提到Critical thinking is the ability to analyze information objectively and make reasoned judgments。"}, {"question": "Why is critical thinking important in the information age?", "options": ["It is not important", "It helps navigate complex issues and avoid misinformation", "It is required by law", "It makes you popular"], "answer": 1, "explanation": "文中提到it helps them navigate complex issues, avoid misinformation, and make better decisions。"}]
    },
    {
      "id": 114, "title": "The Rise of Electric Vehicles", "difficulty": "CET-6",
      "text": "Electric vehicles (EVs) are rapidly gaining popularity worldwide. As concerns about climate change and air pollution grow, many consumers are switching from traditional gasoline-powered cars to electric alternatives.\n\nThe electric vehicle market has grown significantly in recent years. Battery technology has improved, driving ranges have increased, and charging infrastructure is expanding. Government incentives, such as tax credits and subsidies, have also helped accelerate adoption.\n\nHowever, challenges remain. The high upfront cost of EVs, limited charging stations in some areas, and range anxiety are barriers that still need to be overcome.",
      "paragraphs_cn": ["电动汽车正在全球迅速普及。随着对气候变化和空气污染的担忧增长，许多消费者正在从传统的汽油动力汽车转向电动替代品。", "电动汽车市场近年来增长显著。电池技术得到改进，续航里程增加，充电基础设施也在扩展。政府激励措施，如税收抵免和补贴，也有助于加速普及。", "然而，挑战依然存在。电动汽车的高前期成本、某些地区有限的充电站以及里程焦虑仍然是需要克服的障碍。"],
      "vocabulary_notes": [{"word": "infrastructure", "chinese": "基础设施"}, {"word": "incentive", "chinese": "激励"}, {"word": "accelerate", "chinese": "加速"}, {"word": "adoption", "chinese": "采用"}],
      "questions": [{"question": "What has helped accelerate the adoption of electric vehicles?", "options": ["Only government incentives", "Battery improvements, charging infrastructure, and government incentives", "Nothing has helped", "Only consumer demand"], "answer": 1, "explanation": "文中提到Battery technology has improved, driving ranges have increased, and charging infrastructure is expanding。"}, {"question": "What is one challenge of electric vehicles mentioned?", "options": ["They are too fast", "High upfront cost", "They are not popular", "They pollute more"], "answer": 1, "explanation": "文中提到The high upfront cost of EVs是一个挑战。"}]
    },
    {
      "id": 115, "title": "The Benefits of Learning a Second Language", "difficulty": "CET-4",
      "text": "Learning a second language offers numerous cognitive and social benefits. Research shows that bilingual individuals have better problem-solving skills, improved memory, and enhanced creativity.\n\nBeyond cognitive benefits, learning a new language opens doors to different cultures and perspectives. It allows people to communicate with a wider range of individuals and understand different ways of thinking.\n\nIn today's globalized world, being bilingual or multilingual is increasingly valuable. Many employers prefer candidates who can speak multiple languages, as it demonstrates adaptability and cultural awareness.",
      "paragraphs_cn": ["学习第二语言提供了许多认知和社会益处。研究表明，双语者有更好的解决问题能力、改善的记忆力和增强的创造力。", "除了认知益处，学习新语言打开了通往不同文化和观点的大门。它使人们能够与更广泛的人群交流，并理解不同的思维方式。", "在当今全球化的世界中，会说双语或多语越来越有价值。许多雇主更青睐能说多种语言的候选人，因为它展示了适应能力和文化意识。"],
      "vocabulary_notes": [{"word": "cognitive", "chinese": "认知的"}, {"word": "bilingual", "chinese": "双语的"}, {"word": "globalized", "chinese": "全球化的"}, {"word": "adaptability", "chinese": "适应能力"}],
      "questions": [{"question": "What cognitive benefits does learning a second language provide?", "options": ["Only better memory", "Better problem-solving, memory, and creativity", "No cognitive benefits", "Only creativity"], "answer": 1, "explanation": "文中提到bilingual individuals have better problem-solving skills, improved memory, and enhanced creativity。"}, {"question": "Why is being bilingual valuable in today's world?", "options": ["It is not valuable", "Many employers prefer bilingual candidates", "It is required by law", "It makes travel impossible"], "answer": 1, "explanation": "文中提到Many employers prefer candidates who can speak multiple languages。"}]
    },
    {
      "id": 116, "title": "The Impact of Climate Change on Oceans", "difficulty": "CET-6",
      "text": "Climate change is having a profound impact on the world's oceans. Rising temperatures are causing sea levels to rise, coral reefs to bleach, and marine ecosystems to shift.\n\nOcean acidification, caused by increased carbon dioxide absorption, is threatening marine life. Shellfish and coral reefs are particularly vulnerable to changes in ocean chemistry.\n\nScientists are working to understand and mitigate these impacts. Marine protected areas, sustainable fishing practices, and reducing carbon emissions are all important strategies for preserving ocean health.",
      "paragraphs_cn": ["气候变化对世界海洋产生了深远影响。气温上升导致海平面上升、珊瑚礁白化和海洋生态系统转移。", "由二氧化碳吸收增加引起的海洋酸化正在威胁海洋生物。贝类和珊瑚礁对海洋化学变化特别脆弱。", "科学家们正在努力理解和缓解这些影响。海洋保护区、可持续渔业实践和减少碳排放都是保护海洋健康的重要策略。"],
      "vocabulary_notes": [{"word": "acidification", "chinese": "酸化"}, {"word": "vulnerable", "chinese": "脆弱的"}, {"word": "mitigate", "chinese": "缓解"}, {"word": "ecosystem", "chinese": "生态系统"}],
      "questions": [{"question": "What is causing ocean acidification?", "options": ["Oil spills", "Increased carbon dioxide absorption", "Overfishing", "Volcanic eruptions"], "answer": 1, "explanation": "文中提到Ocean acidification, caused by increased carbon dioxide absorption。"}, {"question": "What are important strategies for preserving ocean health?", "options": ["More fishing", "Marine protected areas and sustainable practices", "Building more ships", "Ignoring the problem"], "answer": 1, "explanation": "文中提到Marine protected areas, sustainable fishing practices, and reducing carbon emissions。"}]
    },
    {
      "id": 117, "title": "The Importance of Biodiversity", "difficulty": "CET-6",
      "text": "Biodiversity, the variety of life on Earth, is essential for healthy ecosystems and human well-being. It provides food, medicine, and raw materials, and supports critical ecological processes.\n\nHowever, biodiversity is declining at an alarming rate. Habitat destruction, climate change, pollution, and overexploitation are the main drivers of this decline. Scientists warn that losing biodiversity could have catastrophic consequences.\n\nProtecting biodiversity requires a combination of conservation efforts, sustainable practices, and international cooperation. Creating protected areas, reducing pollution, and promoting sustainable agriculture are key strategies.",
      "paragraphs_cn": ["生物多样性是地球上生命的多样性，对于健康的生态系统和人类福祉至关重要。它提供食物、药品和原材料，并支持关键的生态过程。", "然而，生物多样性正在以惊人的速度下降。栖息地破坏、气候变化、污染和过度开发是这种下降的主要驱动因素。科学家警告说，失去生物多样性可能会产生灾难性的后果。", "保护生物多样性需要保护工作、可持续实践和国际合作的结合。创建保护区、减少污染和推广可持续农业是关键策略。"],
      "vocabulary_notes": [{"word": "biodiversity", "chinese": "生物多样性"}, {"word": "ecosystem", "chinese": "生态系统"}, {"word": "overexploitation", "chinese": "过度开发"}, {"word": "catastrophic", "chinese": "灾难性的"}],
      "questions": [{"question": "What does biodiversity provide?", "options": ["Only food", "Food, medicine, and raw materials", "Nothing", "Only medicine"], "answer": 1, "explanation": "文中提到It provides food, medicine, and raw materials。"}, {"question": "What are the main drivers of biodiversity decline?", "options": ["Only climate change", "Habitat destruction, climate change, pollution, and overexploitation", "Nothing", "Only pollution"], "answer": 1, "explanation": "文中提到Habitat destruction, climate change, pollution, and overexploitation are the main drivers。"}]
    },
    {
      "id": 118, "title": "The Rise of E-commerce", "difficulty": "CET-4",
      "text": "E-commerce has transformed the retail industry, offering consumers convenience, variety, and competitive prices. Online shopping has become increasingly popular, especially among younger generations.\n\nThe COVID-19 pandemic accelerated the shift to online shopping. Many businesses that previously relied on physical stores had to adapt quickly to survive. This led to innovations in delivery services, contactless payment, and digital marketing.\n\nDespite its growth, e-commerce also faces challenges. Cybersecurity concerns, environmental impact of delivery, and the decline of traditional retail are important issues that need to be addressed.",
      "paragraphs_cn": ["电子商务已经改变了零售业，为消费者提供便利、多样性和有竞争力的价格。在线购物越来越受欢迎，尤其是在年轻一代中。", "新冠疫情加速了向在线购物的转变。许多以前依赖实体店的企业不得不快速适应以生存。这导致了配送服务、非接触式支付和数字营销的创新。", "尽管电子商务在增长，但它也面临着挑战。网络安全问题、配送的环境影响以及传统零售的衰落都是需要解决的重要问题。"],
      "vocabulary_notes": [{"word": "e-commerce", "chinese": "电子商务"}, {"word": "contactless", "chinese": "非接触式的"}, {"word": "innovation", "chinese": "创新"}, {"word": "cybersecurity", "chinese": "网络安全"}],
      "questions": [{"question": "What accelerated the shift to online shopping?", "options": ["Technology", "COVID-19 pandemic", "Government policy", "Consumer demand"], "answer": 1, "explanation": "文中提到The COVID-19 pandemic accelerated the shift to online shopping。"}, {"question": "What challenges does e-commerce face?", "options": ["Only cybersecurity", "Cybersecurity, environmental impact, and decline of traditional retail", "No challenges", "Only cost issues"], "answer": 1, "explanation": "文中提到Cybersecurity concerns, environmental impact of delivery, and the decline of traditional retail。"}]
    },
    {
      "id": 119, "title": "The Importance of Mental Health", "difficulty": "CET-4",
      "text": "Mental health is just as important as physical health, yet it is often overlooked and stigmatized. Depression, anxiety, and other mental health conditions affect millions of people worldwide.\n\nSeeking help for mental health issues is not a sign of weakness. Therapy, counseling, and support groups can all be effective treatments. Early intervention is key to preventing mental health problems from becoming more severe.\n\nSociety needs to work towards reducing the stigma associated with mental health. Creating open conversations and providing accessible resources can help people get the support they need.",
      "paragraphs_cn": ["心理健康与身体健康同样重要，但它经常被忽视和污名化。抑郁症、焦虑症和其他心理健康问题影响着全球数百万人。", "寻求心理健康问题的帮助不是软弱的表现。治疗、咨询和支持小组都可以是有效的治疗方法。早期干预是防止心理健康问题变得更严重的关键。", "社会需要努力减少与心理健康相关的污名。创造开放的对话和提供可获得的资源可以帮助人们获得所需的支持。"],
      "vocabulary_notes": [{"word": "stigmatized", "chinese": "被污名化的"}, {"word": "intervention", "chinese": "干预"}, {"word": "accessible", "chinese": "可获得的"}, {"word": "counseling", "chinese": "咨询"}],
      "questions": [{"question": "Is seeking help for mental health a sign of weakness?", "options": ["Yes, always", "No, it is not", "Sometimes", "Only for certain conditions"], "answer": 1, "explanation": "文中提到Seeking help for mental health issues is not a sign of weakness。"}, {"question": "What is key to preventing mental health problems from becoming more severe?", "options": ["Ignoring them", "Early intervention", "Taking medication", "Moving to a new place"], "answer": 1, "explanation": "文中提到Early intervention is key to preventing mental health problems。"}]
    },
    {
      "id": 120, "title": "The Benefits of Outdoor Activities", "difficulty": "CET-4",
      "text": "Outdoor activities offer numerous physical and mental health benefits. Hiking, camping, and other outdoor pursuits provide opportunities for exercise, relaxation, and connection with nature.\n\nResearch shows that spending time outdoors can reduce stress, improve mood, and boost creativity. Being in nature has been linked to lower blood pressure, improved immune function, and better sleep quality.\n\nEncouraging people, especially children, to spend more time outdoors is important for their overall well-being. Schools and communities can promote outdoor activities through programs and events.",
      "paragraphs_cn": ["户外活动提供了许多身体和心理健康益处。徒步旅行、露营和其他户外活动提供了锻炼、放松和与大自然联系的机会。", "研究表明，在户外度过时间可以减轻压力、改善情绪并提高创造力。与大自然接触与较低的血压、改善的免疫功能和更好的睡眠质量有关。", "鼓励人们，尤其是儿童，在户外花更多时间对他们的整体健康很重要。学校和社区可以通过项目和活动来推广户外活动。"],
      "vocabulary_notes": [{"word": "outdoor", "chinese": "户外的"}, {"word": "pursuit", "chinese": "活动"}, {"word": "promote", "chinese": "推广"}, {"word": "well-being", "chinese": "健康"}],
      "questions": [{"question": "What benefits do outdoor activities provide?", "options": ["Only exercise", "Exercise, relaxation, and connection with nature", "Nothing", "Only relaxation"], "answer": 1, "explanation": "文中提到Outdoor activities provide opportunities for exercise, relaxation, and connection with nature。"}, {"question": "What has spending time outdoors been linked to?", "options": ["Higher stress", "Lower blood pressure and better sleep", "Nothing", "More fatigue"], "answer": 1, "explanation": "文中提到Being in nature has been linked to lower blood pressure and better sleep quality。"}]
    },
    {
      "id": 121, "title": "The Impact of Social Media on Youth", "difficulty": "CET-6",
      "text": "Social media has become an integral part of young people's lives, with significant implications for their mental health, social skills, and academic performance.\n\nWhile social media offers benefits like staying connected and accessing information, excessive use can lead to anxiety, depression, and poor sleep quality. Cyberbullying is another serious concern that affects many young people.\n\nParents and educators play a crucial role in helping young people develop healthy relationships with social media. Setting boundaries, promoting digital literacy, and encouraging offline activities are important strategies.",
      "paragraphs_cn": ["社交媒体已成为年轻人生活中不可或缺的一部分，对他们的心理健康、社交技能和学术表现产生了重大影响。", "虽然社交媒体提供了保持联系和获取信息等好处，但过度使用可能导致焦虑、抑郁和睡眠质量下降。网络欺凌是另一个影响许多年轻人的严重问题。", "家长和教育工作者在帮助年轻人与社交媒体建立健康关系方面发挥着至关重要的作用。设定界限、促进数字素养和鼓励线下活动是重要的策略。"],
      "vocabulary_notes": [{"word": "implications", "chinese": "影响"}, {"word": "cyberbullying", "chinese": "网络欺凌"}, {"word": "digital literacy", "chinese": "数字素养"}, {"word": "boundaries", "chinese": "界限"}],
      "questions": [{"question": "What are some negative effects of excessive social media use?", "options": ["Only entertainment", "Anxiety, depression, and poor sleep quality", "Nothing", "Only physical health"], "answer": 1, "explanation": "文中提到excessive use can lead to anxiety, depression, and poor sleep quality。"}, {"question": "What role do parents and educators play?", "options": ["No role", "Helping develop healthy relationships with social media", "Preventing all social media use", "Ignoring the issue"], "answer": 1, "explanation": "文中提到Parents and educators play a crucial role in helping young people develop healthy relationships with social media。"}]
    },
    {
      "id": 122, "title": "The Benefits of Volunteering", "difficulty": "CET-4",
      "text": "Volunteering offers numerous benefits to both individuals and communities. For volunteers, it provides opportunities to develop new skills, expand social networks, and gain valuable experience.\n\nVolunteering also has positive effects on mental health. Studies show that volunteers experience lower levels of depression and anxiety, and report higher levels of happiness and life satisfaction.\n\nFor communities, volunteering strengthens social bonds and addresses important needs. Whether it's helping at a local food bank or mentoring young people, volunteer work makes a real difference in people's lives.",
      "paragraphs_cn": ["志愿服务为个人和社区提供了许多好处。对于志愿者来说，它提供了发展新技能、扩大社交网络和获得宝贵经验的机会。", "志愿服务对心理健康也有积极影响。研究表明，志愿者经历较低水平的抑郁和焦虑，并报告更高水平的幸福感和生活满意度。", "对于社区来说，志愿服务加强了社会联系并满足了重要需求。无论是在当地食物银行帮忙还是指导年轻人，志愿工作都在人们的生活产生了真正的影响。"],
      "vocabulary_notes": [{"word": "volunteering", "chinese": "志愿服务"}, {"word": "mentor", "chinese": "指导"}, {"word": "depression", "chinese": "抑郁"}, {"word": "satisfaction", "chinese": "满意度"}],
      "questions": [{"question": "What benefits does volunteering provide to volunteers?", "options": ["Only money", "New skills, social networks, and experience", "Nothing", "Only exercise"], "answer": 1, "explanation": "文中提到it provides opportunities to develop new skills, expand social networks, and gain valuable experience。"}, {"question": "What effect does volunteering have on mental health?", "options": ["No effect", "Lower depression and anxiety, higher happiness", "Makes people sad", "Has no impact"], "answer": 1, "explanation": "文中提到volunteers experience lower levels of depression and anxiety, and report higher levels of happiness。"}]
    },
    {
      "id": 123, "title": "The Importance of Financial Literacy", "difficulty": "CET-6",
      "text": "Financial literacy, the ability to understand and manage personal finances, is an essential life skill. Yet many people lack basic knowledge about budgeting, saving, and investing.\n\nPoor financial literacy can lead to serious problems, including excessive debt, inadequate retirement savings, and poor financial decision-making. These issues can affect not only individuals but also their families and communities.\n\nExperts recommend starting financial education early. Teaching children about money management, savings, and responsible spending can help them develop healthy financial habits that last a lifetime.",
      "paragraphs_cn": ["金融素养，即理解和管理个人财务的能力，是一项基本的生活技能。然而，许多人缺乏关于预算、储蓄和投资的基本知识。", "金融素养不足会导致严重问题，包括过度债务、不足的退休储蓄和糟糕的财务决策。这些问题不仅影响个人，还影响他们的家庭和社区。", "专家建议尽早开始金融教育。教孩子关于理财、储蓄和负责任的消费可以帮助他们养成终身的健康财务习惯。"],
      "vocabulary_notes": [{"word": "financial literacy", "chinese": "金融素养"}, {"word": "budgeting", "chinese": "预算"}, {"word": "adequate", "chinese": "充足的"}, {"word": "decision-making", "chinese": "决策"}],
      "questions": [{"question": "What is financial literacy?", "options": ["The ability to make money", "The ability to understand and manage personal finances", "The ability to spend freely", "The ability to invest"], "answer": 1, "explanation": "文中提到Financial literacy is the ability to understand and manage personal finances。"}, {"question": "What do experts recommend about financial education?", "options": ["Start it in college", "Start it early", "Don't teach it", "Only teach it in business school"], "answer": 1, "explanation": "文中提到experts recommend starting financial education early。"}]
    },
    {
      "id": 124, "title": "The Impact of Climate Change on Agriculture", "difficulty": "CET-6",
      "text": "Climate change poses significant threats to global agriculture. Rising temperatures, changing precipitation patterns, and more frequent extreme weather events are affecting crop yields and food security worldwide.\n\nFarmers are adapting to these changes by developing drought-resistant crops, improving irrigation systems, and adopting sustainable farming practices. However, these adaptations require significant investment and technical expertise.\n\nInternational cooperation is essential to address the agricultural impacts of climate change. Sharing knowledge, technology, and resources can help vulnerable regions adapt to changing conditions.",
      "paragraphs_cn": ["气候变化对全球农业构成重大威胁。气温上升、降水模式变化和更频繁的极端天气事件正在影响全球的作物产量和粮食安全。", "农民正在通过开发抗旱作物、改进灌溉系统和采用可持续农业实践来适应这些变化。然而，这些适应措施需要大量投资和技术专长。", "国际合作对于应对气候变化对农业的影响至关重要。分享知识、技术和资源可以帮助脆弱地区适应变化的条件。"],
      "vocabulary_notes": [{"word": "precipitation", "chinese": "降水"}, {"word": "drought-resistant", "chinese": "抗旱的"}, {"word": "vulnerable", "chinese": "脆弱的"}, {"word": "sustainable", "chinese": "可持续的"}],
      "questions": [{"question": "How are farmers adapting to climate change?", "options": ["By ignoring it", "By developing drought-resistant crops and improving irrigation", "By moving to cities", "By stopping farming"], "answer": 1, "explanation": "文中提到Farmers are adapting by developing drought-resistant crops, improving irrigation systems。"}, {"question": "What is essential to address agricultural impacts of climate change?", "options": ["Individual action only", "International cooperation", "Government control", "Nothing can be done"], "answer": 1, "explanation": "文中提到International cooperation is essential。"}]
    },
    {
      "id": 125, "title": "The Benefits of Public Libraries", "difficulty": "CET-4",
      "text": "Public libraries play a vital role in communities by providing free access to information, education, and resources. They serve people of all ages and backgrounds, from children learning to read to adults seeking job opportunities.\n\nLibraries offer much more than books. Many provide computer access, internet services, educational programs, and community events. They also serve as safe spaces for people to study, work, or simply relax.\n\nIn the digital age, libraries are evolving to meet changing needs. E-book lending, digital literacy programs, and maker spaces are some of the new services being offered.",
      "paragraphs_cn": ["公共图书馆在社区中发挥着至关重要的作用，提供免费的信息、教育和资源获取。它们服务于所有年龄和背景的人，从学习阅读的儿童到寻找工作机会的成年人。", "图书馆提供的远不止书籍。许多图书馆提供计算机访问、互联网服务、教育项目和社区活动。它们也是人们学习、工作或简单放松的安全空间。", "在数字时代，图书馆正在演变以满足不断变化的需求。电子书借阅、数字素养项目和创客空间是一些正在提供的新服务。"],
      "vocabulary_notes": [{"word": "vital", "chinese": "至关重要的"}, {"word": "digital literacy", "chinese": "数字素养"}, {"word": "evolving", "chinese": "演变"}, {"word": "maker space", "chinese": "创客空间"}],
      "questions": [{"question": "What do public libraries provide?", "options": ["Only books", "Free access to information, education, and resources", "Only computers", "Only internet access"], "answer": 1, "explanation": "文中提到public libraries play a vital role by providing free access to information, education, and resources。"}, {"question": "How are libraries evolving in the digital age?", "options": ["They are closing down", "They are offering e-book lending and digital programs", "They are only for children", "They are not changing"], "answer": 1, "explanation": "文中提到E-book lending, digital literacy programs, and maker spaces are some of the new services。"}]
    },
    {
      "id": 126, "title": "The Science of Happiness", "difficulty": "CET-6",
      "text": "What makes people happy? Scientists have been studying this question for decades, and their findings reveal some surprising insights.\n\nResearch shows that material wealth has only a limited impact on happiness. Once basic needs are met, additional income provides diminishing returns. Instead, relationships, experiences, and personal growth are stronger predictors of well-being.\n\nPractices such as gratitude, mindfulness, and social connection have been shown to increase happiness levels. Even simple activities like spending time in nature or helping others can significantly boost mood.",
      "paragraphs_cn": ["是什么让人们快乐？科学家们已经研究这个问题几十年了，他们的发现揭示了一些令人惊讶的见解。", "研究表明，物质财富对幸福感的影响有限。一旦基本需求得到满足，额外收入提供的回报就会递减。相反，人际关系、经历和个人成长是幸福感的更强预测因素。", "感恩、正念和社会联系等实践已被证明可以提高幸福感水平。即使是像在大自然中度过时间或帮助他人这样简单的活动也能显著提升情绪。"],
      "vocabulary_notes": [{"word": "diminishing", "chinese": "递减的"}, {"word": "well-being", "chinese": "幸福"}, {"word": "mindfulness", "chinese": "正念"}, {"word": "gratitude", "chinese": "感恩"}],
      "questions": [{"question": "What has only a limited impact on happiness?", "options": ["Relationships", "Material wealth", "Experiences", "Personal growth"], "answer": 1, "explanation": "文中提到material wealth has only a limited impact on happiness。"}, {"question": "What are stronger predictors of well-being?", "options": ["Money and fame", "Relationships, experiences, and personal growth", "Only relationships", "Nothing"], "answer": 1, "explanation": "文中提到relationships, experiences, and personal growth are stronger predictors of well-being。"}]
    },
    {
      "id": 127, "title": "The History of the Internet", "difficulty": "CET-4",
      "text": "The Internet began as a military project in the 1960s. ARPANET, the predecessor of the modern Internet, was designed to allow computers at different universities to communicate with each other.\n\nIn the 1990s, the World Wide Web was invented, making the Internet accessible to ordinary people. This revolution transformed how we communicate, work, and access information.\n\nToday, the Internet connects billions of people worldwide. It has become essential for education, business, entertainment, and social interaction. The Internet continues to evolve, with emerging technologies like artificial intelligence and virtual reality expanding its possibilities.",
      "paragraphs_cn": ["互联网始于1960年代的一个军事项目。现代互联网的前身ARPANET旨在让不同大学的计算机相互通信。", "1990年代，万维网被发明，使普通民众能够使用互联网。这一革命改变了我们交流、工作和获取信息的方式。", "如今，互联网连接着全球数十亿人。它已成为教育、商业、娱乐和社交互动的重要组成部分。互联网不断发展，人工智能和虚拟现实等新兴技术正在扩展其可能性。"],
      "vocabulary_notes": [{"word": "predecessor", "chinese": "前身"}, {"word": "accessible", "chinese": "可访问的"}, {"word": "emerging", "chinese": "新兴的"}, {"word": "virtual reality", "chinese": "虚拟现实"}],
      "questions": [{"question": "What was the original purpose of the Internet?", "options": ["Entertainment", "Military communication", "Education", "Business"], "answer": 1, "explanation": "文中提到The Internet began as a military project in the 1960s。"}, {"question": "What made the Internet accessible to ordinary people?", "options": ["The telephone", "The World Wide Web", "Social media", "Smartphones"], "answer": 1, "explanation": "文中提到the World Wide Web was invented, making the Internet accessible to ordinary people。"}]
    },
    {
      "id": 128, "title": "The Importance of Cultural Diversity", "difficulty": "CET-6",
      "text": "Cultural diversity enriches societies by bringing together different perspectives, traditions, and ways of thinking. It fosters creativity, innovation, and mutual understanding among people from different backgrounds.\n\nIn the workplace, diverse teams tend to perform better because they bring a wider range of ideas and approaches. Companies that embrace diversity are often more innovative and better able to serve diverse customer bases.\n\nHowever, cultural diversity also requires tolerance and open-mindedness. Learning about and respecting different cultures is essential for building harmonious communities.",
      "paragraphs_cn": ["文化多样性通过汇集不同的观点、传统和思维方式来丰富社会。它促进来自不同背景的人们之间的创造力、创新和相互理解。", "在工作场所，多元化的团队往往表现更好，因为他们带来了更广泛的想法和方法。拥抱多样性的公司通常更具创新性，更能服务多元化的客户群。", "然而，文化多样性也需要宽容和开放的心态。了解和尊重不同文化对于建设和谐社区至关重要。"],
      "vocabulary_notes": [{"word": "diversity", "chinese": "多样性"}, {"word": "innovation", "chinese": "创新"}, {"word": "tolerance", "chinese": "宽容"}, {"word": "harmonious", "chinese": "和谐的"}],
      "questions": [{"question": "Why do diverse teams perform better?", "options": ["They work fewer hours", "They bring a wider range of ideas", "They have more money", "They are older"], "answer": 1, "explanation": "文中提到diverse teams tend to perform better because they bring a wider range of ideas。"}, {"question": "What is essential for building harmonious communities?", "options": ["Ignoring differences", "Tolerance and open-mindedness", "Moving to new places", "Working alone"], "answer": 1, "explanation": "文中提到tolerance and open-mindedness is essential for building harmonious communities。"}]
    },
    {
      "id": 129, "title": "The Impact of Artificial Intelligence", "difficulty": "CET-6",
      "text": "Artificial intelligence (AI) is transforming industries and reshaping the way we work and live. From healthcare to transportation, AI technologies are being deployed to solve complex problems and improve efficiency.\n\nAI offers many benefits, including automating repetitive tasks, analyzing large amounts of data, and providing personalized experiences. However, it also raises concerns about job displacement, privacy, and ethical use.\n\nAs AI continues to develop, it is important to ensure that it is used responsibly. Balancing innovation with ethical considerations will be key to realizing AI's full potential.",
      "paragraphs_cn": ["人工智能正在改变各个行业，重塑我们工作和生活的方式。从医疗保健到交通，AI技术正在被部署来解决复杂问题并提高效率。", "AI提供了许多好处，包括自动化重复任务、分析大量数据和提供个性化体验。然而，它也引发了关于就业流失、隐私和道德使用的担忧。", "随着AI的不断发展，确保负责任地使用它很重要。在创新与道德考虑之间取得平衡将是实现AI全部潜力的关键。"],
      "vocabulary_notes": [{"word": "deploy", "chinese": "部署"}, {"word": "displacement", "chinese": "流失"}, {"word": "ethical", "chinese": "道德的"}, {"word": "realize", "chinese": "实现"}],
      "questions": [{"question": "What benefits does AI offer?", "options": ["Only automation", "Automating tasks, analyzing data, and personalized experiences", "Nothing", "Only entertainment"], "answer": 1, "explanation": "文中提到AI offers automating repetitive tasks, analyzing large amounts of data, and providing personalized experiences。"}, {"question": "What is key to realizing AI's full potential?", "options": ["More funding", "Balancing innovation with ethical considerations", "Using AI everywhere", "Ignoring concerns"], "answer": 1, "explanation": "文中提到Balancing innovation with ethical considerations will be key。"}]
    },
    {
      "id": 130, "title": "The Benefits of Green Spaces", "difficulty": "CET-4",
      "text": "Green spaces, such as parks, gardens, and forests, provide numerous benefits to communities and individuals. They improve air quality, reduce stress, and promote physical activity.\n\nStudies have shown that spending time in nature can lower blood pressure, reduce anxiety, and improve mental health. Green spaces also provide habitats for wildlife and help preserve biodiversity.\n\nUrban planning should prioritize the creation of green spaces. Even small parks and community gardens can make a significant difference in people's quality of life.",
      "paragraphs_cn": ["绿色空间，如公园、花园和森林，为社区和个人提供了许多好处。它们改善空气质量、减轻压力并促进体育活动。", "研究表明，在大自然中度过时间可以降低血压、减少焦虑并改善心理健康。绿色空间还为野生动物提供栖息地并有助于保护生物多样性。", "城市规划应优先考虑创建绿色空间。即使是小公园和社区花园也能对人们的生活质量产生重大影响。"],
      "vocabulary_notes": [{"word": "biodiversity", "chinese": "生物多样性"}, {"word": "habitat", "chinese": "栖息地"}, {"word": "prioritize", "chinese": "优先考虑"}, {"word": "quality of life", "chinese": "生活质量"}],
      "questions": [{"question": "What benefits do green spaces provide?", "options": ["Only beauty", "Improved air quality, reduced stress, and physical activity", "Nothing", "Only shade"], "answer": 1, "explanation": "文中提到They improve air quality, reduce stress, and promote physical activity。"}, {"question": "What should urban planning prioritize?", "options": ["Building more roads", "Creating green spaces", "Expanding cities", "Ignoring nature"], "answer": 1, "explanation": "文中提到Urban planning should prioritize the creation of green spaces。"}]
    }
  ];

  // 合并到EXTRA_READING
  var existingIds = {};
  EXTRA_READING.forEach(function(r) { existingIds[r.id] = true; });
  var added = 0;
  extraReading.forEach(function(r) {
    if (!existingIds[r.id]) {
      EXTRA_READING.push(r);
      existingIds[r.id] = true;
      added++;
    }
  });
  console.log('阅读训练: 新增 ' + added + ' 篇，当前共 ' + EXTRA_READING.length + ' 篇');
})();
