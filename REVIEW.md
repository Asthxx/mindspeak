# 鑻辫APP 浠ｇ爜瀹℃煡鎶ュ憡锛坉efect-first锛?

> [!IMPORTANT] SUPERSEDED — 2026-09-12 复核：本清单为 2026-08 快照产出，**全部条目（###1~###4 + server 批）对应的缺陷作者已在后续开发中逐条补焊**，逐编号 TDD 复现均得假 RED。⛔ 勿再按本清单编号驱动修复；报缺陷请基于当前代码实测或用户亲见。


瀹℃煡鑼冨洿锛歚index.html`锛?1148 琛岋級銆乣js/app.js`锛?2598 琛岋級銆乣css/*`锛?5 涓? CSS锛夈?乣data/*`锛?70+ 鏁版嵁 JS锛夋娊鏍枫??
閲嶇偣锛氬繀鐒跺穿婧冦?佸姛鑳介敊璇?佸仴澹?с?佸畨鍏ㄣ?佹?ц兘銆傛寜涓ラ噸绋嬪害闄嶅簭锛屽悓绫诲悎骞躲??

---

## 馃敶 鑷村懡 / 鍔熻兘鎬у交搴曞け鏁?

### 1. 閿欓鏈案杩滄槸绌虹殑 鈥斺?? 娌℃湁浠讳綍妯″潡寰? `mistakes` 鍐欐暟鎹?
- 鍏ㄤ唬鐮佷腑 `mistakes` 杩欎釜 localStorage key 鍙湪 `MistakeModule.markKnown:1716`銆乣MistakeModule.clearAll:1723` 閲?**鍐欏叆**锛岀函绮规槸鍒?/鏍囪銆?
- 鎷煎啓 `SpellingModule.submit:1083`銆佽窡璇? `SpeakModule.checkPronunciation:1801`銆佸惉鍔? `ListeningModule.submit:979`銆佽娉? `GrammarModule.submitFill/submitTransform`銆佽澧冨～绌? `ContextModule.submit:1444` 鈥斺?旂瓟閿欐椂閮藉彧 `this.wrong++`锛?**娌℃湁涓?澶勬妸閿欓 push 鍒? `mistakes`**銆?
- **鍚庢灉**锛氶敊棰樻湰濮嬬粓绌虹櫧锛涢敊璇嶅己鍖栬缁冿紙渚濊禆 `mistakes`锛夋案杩滆烦"鏆傛棤閿欓"锛涢敊棰樻湰瀵煎嚭鎸夐挳铏芥湁缁戝畾锛坄exportMistakes`锛夛紝浣嗗鍑烘潵姘歌繙鏄┖ CSV銆?

### 2. 娓告垙鍖栫Н鍒嗗拰姣忔棩鎸戞垬浠庢湭琚帹杩?
- `GamificationSystem.recordActivity` 瀹氫箟浜? `app.js:1918`锛屽叏浠ｇ爜**0 娆¤皟鐢?**銆傜敤鎴风瓟棰樸?佽儗璇嶃?佸仛缁冧範閮戒笉瑙﹀彂绉垎銆?
- `DailyChallenge.updateProgress` 瀹氫箟浜? `app.js:1986`锛屽叏浠ｇ爜**0 娆¤皟鐢?**銆備换浣曟ā鍧楀畬鎴愬悗閮戒笉浼氶?氱煡姣忔棩鎸戞垬銆?
- `GamificationSystem.addPoints:1910` 涓? `this.data.streak` 涔熶粠鏉ユ病鑷杩囷紝姘歌繙鏄垵濮嬪寲鏃剁殑 `0`銆?
- `App.updateGlobalStats:2566` 鐢? `gami.streak`锛堟案杩滄槸 0锛夋樉绀洪《鏍?"杩炵画鎵撳崱 X 澶?"锛屼絾 `AnalysisModule.render:2107` 閲岃嚜宸辫绠? streak 鈥斺?? **鍚屼竴涓?"杩炵画鎵撳崱"鍦ㄤ袱澶勬暟瀛椾笉涓?鑷?**銆?
- **鍚庢灉**锛氱瓑绾с?佺Н鍒嗐?佽繛缁墦鍗℃暟锛堥《鏍忥級銆佹瘡鏃ユ寫鎴樿繘搴﹂兘鏃犳硶澧為暱銆傛暣涓父鎴忓寲绯荤粺鐨? UI 鏄?"鎽嗚"銆?

### 3. 澶ф壒璁剧疆椤垫寜閽牴鏈病缁戝畾 handler
`App.prototype.bindSettings` 鍙粦浜? `btn-save-progress`銆乣btn-export-data`銆乣btn-import-data`銆乣btn-reset-data`銆乣btn-save-goal`銆備笅鍒楁寜閽湪 HTML 閲屽瓨鍦紝**JS 涓浂缁戝畾**锛?
| 鎸夐挳 id | HTML 琛? | 鏈熸湜琛屼负 | 瀹為檯 |
|---|---|---|---|
| `btn-export-fav` | 930 | 璋? `exportFavorites()` | 鐐瑰嚮鏃犲弽搴? |
| `btn-export-mistakes` | 931 | 璋? `exportMistakes()` | 鐐瑰嚮鏃犲弽搴? |
| `btn-share-card` | 963 | 璋? `generateShareCard()` | 鐐瑰嚮鏃犲弽搴? |
| `btn-download-card` | 966 | 璋? `downloadShareCard()` | 鐐瑰嚮鏃犲弽搴? |
| `toggle-active-recall` | 941 | 鍒囦富鍔ㄥ洖蹇嗘ā寮? | 鏃犱换浣曟ā寮忛?昏緫瀹炵幇 |
- `generateShareCard` / `downloadShareCard` / `exportFavorites` / `exportMistakes` 鏄? `App.prototype` 涓婄殑姝讳唬鐮併??

### 4. 涓诲姩鍥炲繂寮圭獥瀹屽叏娌℃帴涓?
- HTML `index.html:1108` 鏈? `modal-recall` 寮圭獥锛岄噷闈㈡湁 `recall-input` / `btn-recall-check` / `btn-recall-show` / `recall-meaning` / `recall-result` 绛? id銆?
- `app.js` 涓?**娌℃湁浠讳綍 `safeBind('btn-recall-*', ...)`锛屼篃娌℃湁浠讳綍妯″潡浼氭樉绀鸿繖涓脊绐?**銆?
- 鍞竴鐩稿叧鐨勪簨浠跺彧鏈? `index.html:1110` 閭ｅ紶鐮村浘锛堣涓嬫潯锛夈??
- **鍚庢灉**锛氬脊绐楁槸姝荤殑锛涚敤鎴峰垏鍒颁换浣曟ā鍧楅兘涓嶄細瑙﹀彂涓诲姩鍥炲繂锛屽嵆浣垮嬀浜嗚缃噷鐨?"涓诲姩鍥炲繂妯″紡"涔熸病鐢ㄣ??

### 5. SVG 寮曠敤 `#i-psychology` 鍦? sprite 閲屾病鏈夊畾涔?
- `index.html:1110` 鐢? `<use href="#i-psychology"/>`銆?
- 浣? SVG sprite锛坄index.html:24-62`锛夐噷鍙畾涔変簡 `i-book / i-trophy / i-diamond / i-fire / i-check / i-translate / i-spellcheck / i-error / i-mic / i-edit / i-article / i-headphones / i-text / i-timer / i-bookmark / i-bookmark-add / i-search / i-settings / i-volume / i-add / i-chart / i-carousel / i-list / i-thumb-down / i-help / i-thumb-up / i-flip / i-quiz / i-analytics / i-calendar / i-save / i-upload / i-download / i-delete / i-sparkle / i-play / i-refresh`銆?
- **鍚庢灉**锛氫富鍔ㄥ洖蹇嗗脊绐楁爣棰樺墠鏄竴涓┖鐧?/鎹熷潖鐨? SVG placeholder锛堝嵆渚垮脊绐楁帴閫氫簡涔熺牬锛夈??

---

## 馃煚 鍔熻兘閿欒锛堜細璺戜絾琛屼负閿欙級

### 6. 璺熻缁冧範锛氬崟渚? SpeechRecognition 涓嶈兘杩炵偣
- `SpeakModule.startRecord:1784` 姣忔鐐?"寮?濮嬭窡璇?"閮? `new SpeechRecognition()` 骞? `.start()`銆?
- 涓婁竴娆℃病鏈? `.stop()` 鎴栧鐞? `onend`锛岄噸澶嶇偣浼氳娴忚鍣ㄦ姤"Recognition has already started"銆?
- `this.recognition` 涔熶綔涓哄疄渚嬪睘鎬х洿鎺ヨ鐩栵紝鏃у疄渚嬬殑浜嬩欢鍥炶皟鍙兘寮曠敤 `self.words[this.currentIndex]`锛岃?? `currentIndex` 宸茬粡 `next()` 璧颁簡 鈥斺?? 琛ㄧ幇灏辨槸绛旈敊鏄剧ず鎴愪笅涓?棰樼殑璇嶃??

### 7. 鍚姏"鍙ュ瓙妯″紡"鐢? `new RegExp(w.word, 'gi')` 瀛樺湪娉ㄥ叆涓庢鍒欏厓瀛楃闂
- `ListeningModule.showQuestion:964`銆乣ContextModule.start:1421` 閮界洿鎺ユ嬁鍗曡瘝鍘绘瀯閫? RegExp銆?
- 鑻ヨ瘝搴撲腑瀛樺湪 `word: "I"` 鎴? `"?"` 绛夊惈姝ｅ垯鍏冨瓧绗︾殑鏉＄洰锛屼細鎶? `SyntaxError`锛?"I" 杩樺尮閰嶄笉鍒帮紝"?" 鐩存帴宕╋級锛屾暣閬撻/鏁翠釜妯″潡鍗′綇銆?
- 璇嶅簱鏄? IIFE push 鍐欏叆鐨勶紝鏃犳硶淇濊瘉鏃犵壒娈婂瓧绗︺??

### 8. `closeAnswer` 鍦ㄩ槄璇荤悊瑙ｃ?丳K 绛夐噷闈? `querySelectorAll('.btn')` 鍙栧叏閮ㄦ寜閽紝浼氳鍏朵粬鍚岀骇鎸夐挳姹℃煋
- `ReadingModule.checkAnswer:908`锛歚btn.parentElement.querySelectorAll('.btn')`锛屼絾闃呰棰樼殑閫夐」 `button` 鏄敤 `<button class="btn btn-sm">` 娓叉煋鐨勶紙`app.js:898`锛夈??
- 濡傛灉鏌愰閫夐」瓒呰繃 4 涓紝鎴栬?呭悗缁? CSS 鏀逛簡璁? button 濂椾簡鍒殑 `.btn` 瀛愬厓绱狅紝浼氭寜閿欑储寮? disable銆?
- 涓嶈嚧鍛戒絾寰堣剢銆?

### 9. PK 缁撴潫閫昏緫涓嶄弗璋?
- `PKModule.endGame:1383` 鏃㈠彲鑳界敱 `timeLeft<=0` 瑙﹀彂锛屼篃鍙兘鐢? `currentIndex>=words.length` 瑙﹀彂銆?
- 璁℃椂鍣ㄥ湪 `endGame` 閲岃 `clearInterval` 鈥斺?? OK锛屼絾 `startGame` 绗簩娆¤璋冪敤鏃跺鏋滀笂涓?娆℃病缁撴潫锛堢悊璁轰笂涓嶄細锛屼絾 `startTimer` 鍓嶅凡 `if(this.timer) clearInterval(this.timer)`锛夆?斺?? 杈圭晫 OK锛屼絾濡傛灉鐢ㄦ埛涓?斿垏鍒板埆鐨? tab 閫犳垚 `setInterval` 鑺傛祦鍒? 1Hz 浠ヤ笅锛屽?掕鏃跺拰瀹為檯鍓╀綑绉掓暟浼氬亸銆?
- 鐪熸鐨勯棶棰橈細`PKModule.startGame:1318` 璁句簡 `timeLeft=60` 纭紪鐮侊紝**娌℃湁璇诲彇浠讳綍閰嶇疆**銆侶TML 閲屽啓鐨勪篃鏄? 60锛屼絾鑻ヤ互鍚庢兂鏀规椂闀匡紝寰楁敼涓や釜鍦版柟銆?

### 10. `markWord('known')` 鐢ㄩ敊"鏈"杩樻槸"涓嬫"鐨? reviewCount
- `app.js:667`锛歚prog.nextReview = DataStore.getNextReview(key, prog.reviewCount);`锛堢敤**褰撳墠**璁℃暟绠椾笅娆￠棿闅旓級锛岀劧鍚庣 668 琛屾墠 `prog.reviewCount++`銆?
- 鑰? `DataStore.getNextReview` 閲? `idx = Math.min(reviewCount, intervals.length-1)`銆?
- 涔熷氨鏄锛岀涓?娆＄瓟瀵? 鈫? `reviewCount`=0 鈫? idx=0 鈫? 1 澶╁悗澶嶄範 鈫? 鐒跺悗 `reviewCount` 鍙? 1銆傝繖閫昏緫鏈韩娌￠敊锛屼絾涓? ring 鏄剧ず鐨?"闃舵 reviewCount/8"**宸竴鏍兼劅瑙?**锛氬垰绛旂涓?棰樻椂 ring 鏄? `1/8`浣嗕笅娆″涔犲湪"1 澶╁悗"锛堥棿闅斿搴旈樁娈? 0锛孉I 鑻辨枃 Coach 鐨勮壘瀹炬旦鏂〃绗? 1 娆″涔犱篃鏄? 1 澶╋級銆?**杩欏潡鍏跺疄鏄鐨?**锛屼絾 ring 鍦? `showCurrentWord:626` 閲岀敤 `reviewCount/8*100` 鐢昏繘搴︼紝绛斿畬 8 娆″垰濂藉～婊★紝浣? `pct` 鍙兘鏄? `NaN`锛堝鏋滄槸 `0/8*100 = 0` 娌￠棶棰橈紱浣? `reviewCount/8*100` 褰? `reviewCount` 鏄? undefined 鏃舵槸 `NaN`锛屼細鐢诲嚭 `<svg style="stroke-dasharray: NaN, 100">` 鈥斺?? 娴忚鍣ㄤ細蹇界暐锛宺ing 鏄剧ず绌虹櫧锛夈??
- 瑙﹀彂鏉′欢锛氳瘝鍦? `wordProgress` 閲屼絾鎰忓娌? `reviewCount` 瀛楁锛堝瀵煎叆鍧忔暟鎹椂锛夈?傚缓璁? `prog.reviewCount || 0`銆?

---

## 馃煛 鍋ュ．鎬? / 璧勬簮娉勬紡

### 11. 50+ 涓? `<script defer>` 鍔犺浇澶辫触鍏ㄩ潬"璇诲彇鏃惰繑鍥? []"鍏滃簳
- `DataStore.getDefaultWords` 杩斿洖 `typeof WORD_LIBRARY !== 'undefined' ? WORD_LIBRARY : {categories: []}` 鈥斺?? 鑹ソ銆?
- 浣? `WORD_LIBRARY` 鏈韩瀹氫箟鍦? `words-data.js`锛?420KB锛夛紝濡傛灉杩欎釜鏂囦欢鍥犵綉缁?/浠ｇ悊/CSP 澶辫触锛屽悗闈㈡墍鏈夋墿鍏? IIFE 鍗充娇鍔犺浇浜嗕篃閮? `if(typeof WORD_LIBRARY==="undefined") return`锛?**鍏ㄩ儴鏁版嵁涓㈠け浣嗘病鏈変换浣? UI 鎻愮ず**锛岀敤鎴风湅鍒?"鍔犺浇涓?..."鐨? select 涓?鐩存寕鐫?锛屼笖鎶ラ敊鍙湪 console銆?
- 寤鸿鑷冲皯鍦? `populateCategories` 閲屾娴? `categories.length===0` 鏃? Toast.error 鎻愮ず鏁版嵁鍔犺浇澶辫触銆?

### 12. localStorage 娌℃湁閰嶉淇濇姢锛岃嚜瀹氫箟鑳屾櫙鑳界洿鎺ユ拺鐖?
- `Storage.setJSON` 宸茬粡鏈? try/catch 闈欓粯澶辫触锛屼笉浼氬穿銆?
- 浣? `applyCustomBg` 鎶婃暣寮? 5MB 鍥剧墖鐨? dataURL 瀛樿繘 `custom_bg` 杩欎釜 key 鈥斺?? 瀹為檯涓婂ぇ澶氭暟娴忚鍣? localStorage 涓婇檺 5-10MB锛屽啀鍔犱笂 `favorites` / `word_progress` / `checkins` / `mistakes` 绛変笟鍔℃暟鎹紝鍗? hit 閰嶉姒傜巼寰堥珮銆?
- 瀛樻弧鍚庯紝鍐嶇偣"淇濆瓨瀛︿範杩涘害"浼?**闈欓粯澶辫触**锛坄setItem` 鎶涢敊琚悶锛夛紝鐢ㄦ埛浣撻獙涓?"鎴戠偣浜嗕繚瀛樹絾娌″弽搴?"銆?

### 13. 骞跺彂 tab 涓嶇洃鍚? `storage` 浜嬩欢锛岃繘搴︿細琚鐩?
- 涓や釜 tab 鍚屾椂寮?锛欰 鍦ㄨ儗璇嶏紙鍐欏叆 `word_progress`锛夛紝B 涔熷啓鑷繁鐨? `word_progress`锛屾渶鍚庝繚瀛樼殑瑕嗙洊鍏堜繚瀛樼殑銆?
- 娌℃湁浠讳綍 `window.addEventListener('storage', ...)`銆傚 tab 瀛︿範鏃舵暟鎹細涓€??

### 14. `confirm()`/`alert()` 鍦? CSP 涓庣Щ鍔ㄧ浼氬鑷存棤 UI 鍙嶉
- 澶氬鐢? `confirm('纭畾娓呯┖锛?')`锛歚FavoritesModule.clearAll:1625`銆乣MistakeModule.clearAll:1722`銆乣App.resetData:2307`銆乣PomodoroModule.initUI:1495`銆?
- 鍦ㄦ煇浜? Webview锛堝挨鍏跺井淇°?佷紒涓? IM 鍐呭祵锛塦confirm` 鐩存帴杩斿洖 false 鎴栧崱姝伙紝鐢ㄦ埛鐐规竻绌轰篃娌″弽搴斻??

### 15. `SpeechUtil.speak` 鍏ㄥ眬 cancel锛屽妯″潡浜掔浉鎵撴柇
- `SpeechUtil.speak:53` 姣忔閮? `window.speechSynthesis.cancel()`锛屾剰鍛崇潃鐢ㄦ埛鍦ㄨ儗鍗曡瘝椤靛惉鏈楄鏃讹紝濡傛灉鍒囧埌鍚姏椤靛紑濮嬭缁冿紝鍓嶈?呬細琚珛鍗虫墦鏂紙OK锛夛紝浣嗗鏋滅敤鎴峰悓鏃舵墦寮?浜?"渚嬪彞鏈楄"鍜屽叾浠栨寜閽紝鍚庣偣鐨勪細鍙栨秷鍓嶉潰鐨? 鈥斺?? 杩欐槸璁捐閫夋嫨銆傛洿涓ラ噸鐨勬槸 `speechSynthesis` **娌″湪鐢ㄦ埛鎵嬪娍閲岃Е鍙戝氨鐩存帴 speak**锛歩OS Safari 瑕佹眰蹇呴』鍦ㄧ敤鎴锋墜鍔夸笂涓嬫枃閲? speak锛屽惉鍔涜缁冨洜涓烘槸鍦? `showQuestion` 閲岃嚜鍔? `this.playAudio()`锛堥潪鐩存帴 click handler 鍐咃級鈫? iOS 涓?**鍚笉鍒板０闊?**銆?
- 褰卞搷锛歩OS Safari 鐢ㄦ埛鍚姏璁粌绗竴娆℃挱鏀句笉鍑哄０銆?

---

## 鈿? 浠ｇ爜璐ㄩ噺 / 鍙淮鎶ゆ??

### 16. CSP 涓嶅绱?
- `index.html:7` 褰撳墠锛歚default-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data: blob:`
- 娌¤ `connect-src` / `media-src` / `style-src`锛屾墍浠ュ畠浠洖钀藉埌 `default-src 'self' 'unsafe-inline'` 鈥斺?? 娌￠棶棰橈紝浣? `unsafe-inline` 鍦? script 閲屾剰鍛崇潃浠讳綍 innerHTML 娉ㄥ叆鐨? `<script>` 閮戒細琚墽琛屻??
- 濂芥秷鎭細鎵?鏈夌敤 `innerHTML` 鎷? DOM 鐨勫湴鏂癸紝瀵?**鐢ㄦ埛鏉ユ簮鏁版嵁**锛堟悳绱㈠崟璇嶃?佹敹钘忋?侀敊棰樸?丳K 閫夐」銆侀槄璇婚锛夐兘璧颁簡 `escapeHtml`锛坄app.js:10`锛夛紝杩欓儴鍒嗗緢鍒颁綅銆?
- 浣嗕粛鏈夊嚑澶?**鏈? escape 鐨? innerHTML**锛?
  - `app.js:1170` 鎼滅储鍗曡瘝缁撴灉鐨? `'<div class="search-count">鎵惧埌 ' + results.length + ' 涓粨鏋?</div>'` 鈥斺?? `results.length` 鏄? number 娌￠棶棰樸??
  - `app.js:2153` `<li>' + t + '</li>` 鈥斺?? `t` 鏄‖缂栫爜 tips 瀛楃涓诧紝瀹夊叏銆?
  - `app.js:898` 闃呰棰橀?夐」鎷兼帴鐨? `onclick="window.app.readingModule.checkAnswer(' + i + ',' + j + ',this)"` 鈥斺?? `i`/`j` 鏄簭鍙凤紝瀹夊叏銆?
  - `app.js:1600` 鏀惰棌鏈楄鎸夐挳锛歚onclick="SpeechUtil.speakWord(\'' + escapeHtml(f.word) + '\')"` 鈥斺?? 宸? escape銆?
  - `app.js:2406` 鑷畾涔夎儗鏅細`style.backgroundImage = 'url(' + bgData + ')'`锛宍bgData` 鏄? FileReader 鐢熸垚鐨? dataURL 鈥斺?? 瀹夊叏锛屼絾**娌℃湁闀垮害涓婇檺鏍￠獙**锛堝疄闄? `file.size>5MB` 宸叉嫤锛孫K锛夈??
- **缁撹**锛氬綋鍓? XSS 椋庨櫓浣庯紝浣滆?呭緢娉ㄦ剰銆備絾 CSP 浠嶅彲鏀剁揣涓? `script-src 'self'`锛屾妸 `index.html:14-20` 鍐呰仈 theme-init 鑴氭湰鎻愬彇鍒? `js/` 鏂囦欢閲屻??

### 17. 60+ 涓? `words-expand*.js` 鏄畬鍏ㄧ瓑浠风殑妯℃澘浠ｇ爜
- 鏂囦欢 `words-expand17.js` ~ `words-expand41.js` 澶у皬閮芥伆濂芥槸 18384 / 18387 瀛楄妭锛岀粨鏋勪綔涓? IIFE 瀹屽叏鐩稿悓锛屽彧鏄? push 鍒? `WORD_LIBRARY.categories[i]` 涓嶅悓 index銆佹暟鎹笉鍚屻??
- 姣忎釜鏂囦欢寮?澶撮兘鏈? `console.log("S... added: "+added+", total: "+cat.words.length)` 鈥斺?? 鍔犺浇瀹? 50 涓紝console 50 鏉″櫔闊炽??
- 鐪熸鐨勯棶棰橈細鍔犺浇 50 涓皬鏂囦欢锛?**HTTP/1.1 涓嬫瘡涓兘鏄崟鐙姹?**锛?50 涓? RTT锛岄椤电櫧灞忔椂闂存樉钁楁媺闀匡紙鍗充究 defer 涔熼樆濉炶В鏋愭椂鏈猴級銆傚缓璁悎骞舵垚 1-3 涓ぇ鏂囦欢锛屾垨鏈嶅姟鍣ㄥ紑 HTTP/2 鎺ㄩ?併??

### 18. `safeBind` 涓庣洿鎺? `addEventListener` 骞跺瓨锛屾棤缁熶竴绾︽潫
- 浣滆?呯敤 `safeBind` 闃插尽鍏冪礌涓嶅瓨鍦紝浣嗗緢澶氬湴鏂圭洿鎺? `document.getElementById(...).addEventListener(...)`銆佹垨 `document.querySelectorAll(...).forEach(addEventListener)`锛岃繖浜涘湴鏂归兘鍋囪鍏冪礌涓?瀹氬瓨鍦ㄣ??
- 渚嬶細`WordModule.bindEvents:489` 鐨? `document.querySelectorAll('.filter-btn')`锛岃嫢 `wordlist.css` 鍔犺浇澶辫触瀵艰嚧 filter 鎸夐挳鍙樻垚 display:none锛宖ilter 浠嶈兘鐐瑰嚮锛涜嫢 HTML 琚敼鍒犱簡 `.filter-btn`锛宷uerySelectorAll 杩斿洖绌? NodeList锛宖orEach 闈欓粯鏃犳搷浣? 鈥斺?? OK銆備絾鑻? `.card-area` 琚垹锛宍switchView:503` `document.querySelector('.card-area').classList.toggle(...)` 鐩存帴鎶? `Cannot read property 'classList' of null`锛屾暣涓? WordModule 鍒濆鍖栧け璐ャ??
- 寤鸿鍏ㄩ儴璧? `safeBind` / `safeQuery` 鐨勭粺涓?椋庢牸銆?

### 19. `==` 涓? `===` 娣风敤
- 澶氬鐢? `===`锛堜竴鑷淬?佽壇濂斤級锛屼絾 `ThemeColor.applyPreset:240` `if (color === 'sage' || this.PRESETS.indexOf(color) === -1)` OK锛沗Storage.get:70` `v === null` OK锛沗escapeHtml:11` `str == null` 鈥斺?? 鏁呮剰鏀惧鍏兼晠 undefined锛孫K銆?
- 浣? `ThemeColor.applyPreset:240` 鎶? `'sage'` 鍙? set 鍥炲幓褰? key 瀛橈紝涓? `setActiveButton:288` 姣旇緝 `data-color === color` 鈥斺?? 涓?鑷淬??
- 鎬讳綋娌￠棶棰橈紝浣? `safeNumber:14` 鐢? `val ? val : fallback` 鍦? `val==='0'` 鏃朵細閿欙紙瀹為檯 `parseInt('0')` 鏄? 0锛宍0 || fallback` 浼氬洖钀? fallback锛夛紝PK 棰樺簱閫夋嫨 0 鏃舵纭彇鍒? 0 vs 璧? fallback 鈥斺?? 杩欓噷**闅愬惈 bug锛歅KModule.startGame:1308** `parseInt(value)` 鑻ョ敤鎴烽?変簡绗竴椤癸紙value='0'锛夛紝`safeNumber('0', 0)` 杩斿洖 0锛孫K銆傚悓鍑芥暟鍏跺畠鍦版柟 `catIdx` 娌¤蛋 safeNumber锛歚ListeningModule.start:947` `parseInt(...)` 杩斿洖 NaN 鏃? `if(catIdx >= cats.length) return` 鈥斺?? NaN鈮ength 鏄? false锛屼笉 return锛宍cats[NaN]` undefined 鈫? `.words.slice()` 鎶? TypeError锛屾暣涓惉鍔涜缁冩寕鎺夈??**鐪? bug**锛屽缓璁兘璧? safeNumber銆?

### 20. 澶囦唤鐩綍鍦ㄤ富鐩綍閲?
- `O:\宸ヤ綔\鑻辫APP\鑻辫APP澶囦唤_20260727_151355\` 涓? `...\154627\` 鍖呭惈涓?浠藉畬鏁翠唬鐮佸壇鏈紙鍏? 100+ 鏂囦欢鍓湰锛屽嚑 MB锛夛紝鏀惧湪浜や粯鐩綍閲屻??
- 涓嶆槸 bug锛屼絾 Live Server / GitHub Pages 浼氭妸瀹冧滑涓?璧锋毚闇插嚭鍘伙紱鑰屼笖 `data/` 涓嬬殑 expand*.js 鍦ㄥ浠介噷鍜屼富鐩綍閲?**鍚屽悕涓嶅悓鍐呭**鍙兘寮曡捣娣锋穯銆?
- 寤鸿鎶婂浠芥尓鍒? `O:\宸ヤ綔\_backup\鑻辫APP\` 鎴栧共鑴嗘墦鍖呮垚 zip 鍗曠嫭鏀俱??

---

## 鎬讳綋缁撹

**鑳借窇**锛屼綔鑰呭湪宸ュ叿灞傦紙`safeBind`銆乣Storage` 鍖呰銆乣escapeHtml`銆佹ā鍧? try/catch 鍖呭湪 App.init锛夌浉褰撳厠鍒讹紝鍗曢〉鑲竻鍩烘湰鏋舵瀯娌￠棶棰樸??

**鏈?澶ч闄╃偣锛堟寜淇捣鏉ヤ唬浠风敱楂樺埌浣庯級**锛?
1. 馃敶 **閿欓鏈? + 娓告垙鍖栫郴缁熸暣濂楀け鏁?**锛氶敊棰樻湰浠庝笉鍐欏叆銆佺Н鍒嗕粠涓嶅鍔犮?佹瘡鏃ユ寫鎴樹粠涓嶆帹杩涖?佷富鍔ㄥ洖蹇嗗脊绐楁槸姝荤殑銆佽缃〉涓?鍗婃寜閽病缁? 鈥斺?? 杩欐槸涓?缁勫叧鑱旂己闄凤紝鏈川鏄?"杩欎簺妯″潡鐨勮繛鎺ョ嚎"娌″啓瀹屻?傚鏋滅敤鎴锋湡寰呰繖浜涘姛鑳藉彲鐢紝浼氱珛鍒诲彂鐜?"涓轰粈涔堟垜鑳屼簡涓?鍫嗚瘝绛夌骇杩樻槸 Lv.1"銆?
2. 馃煚 **`new RegExp(w.word)` 姝ｅ垯娉ㄥ叆** + **Apple iOS speech 涓嶅湪鎵嬪娍鍐?** 鈥斺?? 涓や釜闅愯棌宕╂簝/鏃犲０ bug锛岃Е鍙戦潰骞裤??
3. 馃煛 **5MB 鑷畾涔夎儗鏅帇鐖? localStorage** 璁?"淇濆瓨杩涘害"闈欓粯澶辫触 鈥斺?? 闀挎湡鐢ㄦ埛鐨勬暟鎹畨鍏ㄣ??
4. 鈿? **50+ expand.js 鍏ㄦ槸鍗曠嫭璇锋眰 + 50 鏉? console.log** 鈥斺?? 棣栧睆鎬ц兘 + 鎺у埗鍙板櫔闊炽??

寤鸿鎸? #1 鈫? #2 鈫? #3 椤哄簭淇?傛姤鍛婂畬銆?
