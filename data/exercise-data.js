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
