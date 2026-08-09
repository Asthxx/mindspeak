(function(){
  if(typeof WORD_LIBRARY==="undefined") return;
  var words=[

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

