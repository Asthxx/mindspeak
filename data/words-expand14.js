// ============================================================
// 词库扩充第十四轮 — 阶段11-12 最终补充
// ============================================================
(function() {
  if (typeof WORD_LIBRARY === 'undefined') return;

  // 阶段11 · 商务英语 补充
  var s11 = [
    { word:"accommodate", phonetic:"/əˈkɒmədeɪt/", pos:"v.", chinese:"容纳", example:"Accommodate guests.", example_cn:"容纳客人。" },
    { word:"acquisition", phonetic:"/ˌækwɪˈzɪʃn/", pos:"n.", chinese:"收购", example:"Company acquisition.", example_cn:"公司收购。" },
    { word:"allocate", phonetic:"/ˈæləkeɪt/", pos:"v.", chinese:"分配", example:"Allocate resources.", example_cn:"分配资源。" },
    { word:"analyze", phonetic:"/ˈænəlaɪz/", pos:"v.", chinese:"分析", example:"Analyze data.", example_cn:"分析数据。" },
    { word:"assess", phonetic:"/əˈses/", pos:"v.", chinese:"评估", example:"Assess performance.", example_cn:"评估表现。" },
    { word:"benchmark", phonetic:"/ˈbentʃmɑːrk/", pos:"n.", chinese:"基准", example:"Set benchmark.", example_cn:"设定基准。" },
    { word:"capitalize", phonetic:"/ˈkæpɪtəlaɪz/", pos:"v.", chinese:"利用", example:"Capitalize on opportunity.", example_cn:"利用机会。" },
    { word:"collaborate", phonetic:"/kəˈlæbəreɪt/", pos:"v.", chinese:"合作", example:"Collaborate with team.", example_cn:"与团队合作。" },
    { word:"compensation", phonetic:"/ˌkɒmpenˈseɪʃn/", pos:"n.", chinese:"补偿", example:"Employee compensation.", example_cn:"员工薪酬。" },
    { word:"compliance", phonetic:"/kəmˈplaɪəns/", pos:"n.", chinese:"合规", example:"Regulatory compliance.", example_cn:"法规合规。" },
    { word:"consolidate", phonetic:"/kənˈsɒlɪdeɪt/", pos:"v.", chinese:"合并", example:"Consolidate companies.", example_cn:"合并公司。" },
    { word:"consultant", phonetic:"/kənˈsʌltənt/", pos:"n.", chinese:"顾问", example:"Hire consultant.", example_cn:"聘请顾问。" },
    { word:"contingency", phonetic:"/kənˈtɪndʒənsi/", pos:"n.", chinese:"应急", example:"Contingency plan.", example_cn:"应急计划。" },
    { word:"contractor", phonetic:"/ˈkɒntræktər/", pos:"n.", chinese:"承包商", example:"Hire contractor.", example_cn:"雇佣承包商。" },
    { word:"corporate", phonetic:"/ˈkɔːrpərət/", pos:"adj.", chinese:"公司的", example:"Corporate culture.", example_cn:"企业文化。" },
    { word:"curriculum", phonetic:"/kəˈrɪkjələm/", pos:"n.", chinese:"课程", example:"Training curriculum.", example_cn:"培训课程。" },
    { word:"delegate", phonetic:"/ˈdelɪɡeɪt/", pos:"v.", chinese:"委托", example:"Delegate tasks.", example_cn:"委托任务。" },
    { word:"diversify", phonetic:"/daɪˈvɜːrsɪfaɪ/", pos:"v.", chinese:"使多样化", example:"Diversify portfolio.", example_cn:"分散投资。" },
    { word:"dividend", phonetic:"/ˈdɪvɪdend/", pos:"n.", chinese:"股息", example:"Pay dividend.", example_cn:"支付股息。" },
    { word:"eliminate", phonetic:"/ɪˈlɪmɪneɪt/", pos:"v.", chinese:"消除", example:"Eliminate waste.", example_cn:"消除浪费。" },
    { word:"empower", phonetic:"/ɪmˈpaʊər/", pos:"v.", chinese:"赋权", example:"Empower employees.", example_cn:"赋予员工权力。" },
    { word:"endorse", phonetic:"/ɪnˈdɔːrs/", pos:"v.", chinese:"赞同", example:"Endorse proposal.", example_cn:"赞同提议。" },
    { word:"entrepreneur", phonetic:"/ˌɒntrəprəˈnɜːr/", pos:"n.", chinese:"企业家", example:"Young entrepreneur.", example_cn:"年轻企业家。" },
    { word:"facilitate", phonetic:"/fəˈsɪlɪteɪt/", pos:"v.", chinese:"促进", example:"Facilitate meeting.", example_cn:"促进会议。" },
    { word:"forecast", phonetic:"/ˈfɔːrkæst/", pos:"n./v.", chinese:"预测", example:"Sales forecast.", example_cn:"销售预测。" },
    { word:"franchise", phonetic:"/ˈfræntʃaɪz/", pos:"n.", chinese:"特许经营", example:"Fast food franchise.", example_cn:"快餐特许经营。" },
    { word:"frugal", phonetic:"/ˈfruːɡl/", pos:"adj.", chinese:"节俭的", example:"Frugal spending.", example_cn:"节俭的花费。" },
    { word:"generate", phonetic:"/ˈdʒenəreɪt/", pos:"v.", chinese:"产生", example:"Generate revenue.", example_cn:"产生收入。" },
    { word:"headquarters", phonetic:"/ˈhedkwɔːrtərz/", pos:"n.", chinese:"总部", example:"Company headquarters.", example_cn:"公司总部。" },
    { word:"hierarchy", phonetic:"/ˈhaɪərɑːrki/", pos:"n.", chinese:"层级", example:"Corporate hierarchy.", example_cn:"公司层级。" },
    { word:"implement", phonetic:"/ˈɪmplɪment/", pos:"v.", chinese:"实施", example:"Implement strategy.", example_cn:"实施策略。" },
    { word:"incentive", phonetic:"/ɪnˈsentɪv/", pos:"n.", chinese:"激励", example:"Sales incentive.", example_cn:"销售激励。" },
    { word:"incorporate", phonetic:"/ɪnˈkɔːrpəreɪt/", pos:"v.", chinese:"合并", example:"Incorporate new ideas.", example_cn:"纳入新想法。" },
    { word:"infrastructure", phonetic:"/ˈɪnfrəstrʌktʃər/", pos:"n.", chinese:"基础设施", example:"Digital infrastructure.", example_cn:"数字基础设施。" },
    { word:"inventory", phonetic:"/ˈɪnvəntɔːri/", pos:"n.", chinese:"库存", example:"Manage inventory.", example_cn:"管理库存。" },
    { word:"liability", phonetic:"/ˌlaɪəˈbɪləti/", pos:"n.", chinese:"负债", example:"Limited liability.", example_cn:"有限责任。" },
    { word:"logistics", phonetic:"/ləˈdʒɪstɪks/", pos:"n.", chinese:"物流", example:"Supply logistics.", example_cn:"供应物流。" },
    { word:"lucrative", phonetic:"/ˈluːkrətɪv/", pos:"adj.", chinese:"有利可图的", example:"Lucrative deal.", example_cn:"有利可图的交易。" },
    { word:"merchandise", phonetic:"/ˈmɜːrtʃəndaɪz/", pos:"n.", chinese:"商品", example:"Sell merchandise.", example_cn:"销售商品。" },
    { word:"negotiate", phonetic:"/nɪˈɡoʊʃieɪt/", pos:"v.", chinese:"谈判", example:"Negotiate salary.", example_cn:"谈判工资。" },
    { word:"outsource", phonetic:"/ˈaʊtsɔːrs/", pos:"v.", chinese:"外包", example:"Outsource services.", example_cn:"外包服务。" },
    { word:"partnership", phonetic:"/ˈpɑːrtnərʃɪp/", pos:"n.", chinese:"伙伴关系", example:"Strategic partnership.", example_cn:"战略伙伴关系。" },
    { word:"procurement", phonetic:"/prəˈkjʊərmənt/", pos:"n.", chinese:"采购", example:"Procurement process.", example_cn:"采购流程。" },
    { word:"productivity", phonetic:"/ˌprɒdʌkˈtɪvəti/", pos:"n.", chinese:"生产力", example:"Improve productivity.", example_cn:"提高生产力。" },
    { word:"proficiency", phonetic:"/prəˈfɪʃnsi/", pos:"n.", chinese:"熟练", example:"Language proficiency.", example_cn:"语言熟练度。" },
    { word:"restructure", phonetic:"/ˌriːˈstrʌktʃər/", pos:"v.", chinese:"重组", example:"Restructure company.", example_cn:"重组公司。" },
    { word:"retention", phonetic:"/rɪˈtenʃn/", pos:"n.", chinese:"保留", example:"Employee retention.", example_cn:"员工保留。" },
    { word:"revenue", phonetic:"/ˈrevənjuː/", pos:"n.", chinese:"收入", example:"Annual revenue.", example_cn:"年收入。" },
    { word:"stakeholder", phonetic:"/ˈsteɪkhoʊldər/", pos:"n.", chinese:"利益相关者", example:"Key stakeholder.", example_cn:"关键利益相关者。" },
    { word:"subsidiary", phonetic:"/səbˈsɪdiəri/", pos:"n.", chinese:"子公司", example:"Overseas subsidiary.", example_cn:"海外子公司。" },
    { word:"turnover", phonetic:"/ˈtɜːrnoʊvər/", pos:"n.", chinese:"营业额", example:"Annual turnover.", example_cn:"年营业额。" },
    { word:"venture", phonetic:"/ˈventʃər/", pos:"n.", chinese:"风险企业", example:"Joint venture.", example_cn:"合资企业。" },
    { word:"workforce", phonetic:"/ˈwɜːrkfɔːrs/", pos:"n.", chinese:"劳动力", example:"Skilled workforce.", example_cn:"熟练劳动力。" }
  ];

  // 合并到阶段11
  if (WORD_LIBRARY.categories[10]) {
    var cat = WORD_LIBRARY.categories[10];
    var existingWords = {};
    cat.words.forEach(function(w) { existingWords[w.word.toLowerCase()] = true; });
    var added = 0;
    s11.forEach(function(w) {
      if (w.word && !existingWords[w.word.toLowerCase()]) {
        cat.words.push(w);
        existingWords[w.word.toLowerCase()] = true;
        added++;
      }
    });
    console.log('阶段11: 新增 ' + added + ' 词');
  }

})();
