/**
 * 每日能量卡系統
 * 28張：7天 × 4時段（晨/午/暮/夜）
 */

const ENERGY_CARDS = [
  // 晨（06:00-12:00）
  { id: 'm1', period: '晨', title: '起始的安靜', text: '今天適合讓自己落後於這個世界五分鐘。不是焦慮，是校準。', action: '出門前在原地坐三十秒' },
  { id: 'm2', period: '晨', title: '先問代價', text: '一件事能不能做，不看它有多正確，而看它有多少代價你還沒算進去。', action: '今天要做的第一件事，先想最壞的結果' },
  { id: 'm3', period: '晨', title: '不追的藝術', text: '有些人不是追來的，是你自己走到了他們會路過的地方。早上先想清楚你今天要走哪條路。', action: '今天選擇走一條稍微不同的路' },
  { id: 'm4', period: '晨', title: '能量守恆', text: '你浪費在別人身上的時間，其實都是在浪費自己。因為時間不疊加，精力是限量供應。', action: '今天刪除三件事再開始' },
  { id: 'm5', period: '晨', title: '慢啟動', text: '早上的前十分鐘決定了這一天的心理水位。不是要快，是要準。', action: '今天第一件事，不要看手機，直接做' },
  { id: 'm6', period: '晨', title: '破除預設', text: '你以為今天的你會跟昨天一樣，這個預設本身就是最大的陷阱。早上先否定昨天的自己。', action: '早上先問：今天有什麼事是我不會做的？' },
  { id: 'm7', period: '晨', title: '留白效應', text: '日曆上空白的那幾格，是你今天最大的資產。不要急著填滿它們。', action: '今天留一個時段不安排任何事' },

  // 午（12:00-17:00）
  { id: 'a1', period: '午', title: '午後的地雷', text: '下午兩點到三點是情緒最低點。這個時候做的決定，質量大概只有早上的六成。盡量不要在這個時間段做不可逆的決定。', action: '下午情緒波動的時候，先喝水再說話' },
  { id: 'a2', period: '午', title: '半場效應', text: '事情做到一半的時候，困難感是最強的。但實際上它只是在中間，往前走的路和走過的路一樣長。', action: '下午遇到卡點，給自己十分鐘再堅持' },
  { id: 'a3', period: '午', title: '飯後決策力', text: '吃飽了容易犯困，但吃飽了也容易衝動。下午的社交決策，吃飯前做比吃飯後做靠譜三倍。', action: '下午有約，先想好再吃飯' },
  { id: 'a4', period: '午', title: '阻力最小', text: '下午適合處理那些你一直在拖延的小事。因為阻力最小的時刻，就是現在。', action: '今天下午做一件你推遲了三天以上的事' },
  { id: 'a5', period: '午', title: '讓他過去', text: '中午之前沒有處理完的問題，下午就不要再去碰那個情緒了。情緒有半衰期，過了就是過了。', action: '下午三點後，別回覆讓你早上不舒服的那條訊息' },
  { id: 'a6', period: '午', title: '午後心流', text: '如果下午有兩個小時可以完全不被打斷，你能完成的事大概是平時的兩倍。保護那兩個小時。', action: '今天下午爭取一個不打斷的窗口' },
  { id: 'a7', period: '午', title: '提問的重量', text: '下午問對一個問題，比早上做對十個決定更有價值。問自己：這件事，一個月後我還會記得嗎？', action: '下午問自己：今天最重要的是什麼？' },

  // 暮（17:00-21:00）
  { id: 'e1', period: '暮', title: '收工的藝術', text: '沒有明確收工時間的人，工作會佔用他整個人生。晚上九點前強迫自己離開工作狀態，是一種生產力策略。', action: '今天晚上八點半開始收工' },
  { id: 'e2', period: '暮', title: '晚餐桌', text: '晚飯吃什麼不重要，和誰吃也不重要。重要的是有沒有在吃飯的時候，完全不在想白天的事。', action: '今天晚飯不看手機，專心吃完' },
  { id: 'e3', period: '暮', title: '暮光陷阱', text: '一天當中最後兩個小時，是認知能力開始快速下降的時段。這時候做的判斷，失誤率是白天的兩倍。', action: '晚上重要的話，明天早上再說' },
  { id: 'e4', period: '暮', title: '拋錨', text: '一天的船要靠岸前，得先把錨放下來。今天遇到的那些爛事，讓它們在晚上留在船上，不要帶回家。', action: '回家前在門口站三十秒，把白天的事留在外面' },
  { id: 'e5', period: '暮', title: '回家的路', text: '通勤的那段時間，是你一天當中唯一可以「不作為」的窗口。用來焦慮是浪費，用來放空是奢侈。', action: '今天通勤時不戴耳機，只走路' },
  { id: 'e6', period: '暮', title: '晚間人際', text: '晚上約人出來見面，其實是一種信任的表達。願意把一天的尾巴分給你的人，不多，珍惜。', action: '今天主動約一個你很久沒見的人' },
  { id: 'e7', period: '暮', title: '光的時段', text: '傍晚是創造力最高的時候。不是早上那種分析的創造力，而是那種「突然想到」的靈感。這個時候想到的事，往往是對的。', action: '今天傍晚記錄一個突然想到的想法' },

  // 夜（21:00-06:00）
  { id: 'n1', period: '夜', title: '睡眠是最好的算命', text: '你前一天晚上想不通的事，早上起來常常發現不是問題。睡眠是大自然的調和劑。晚上不要試圖解決太複雜的事。', action: '今晚睡前把最困擾的事寫下來，然後不再想它' },
  { id: 'n2', period: '夜', title: '手機的罪', text: '睡前的最後一小時看手機，相當於讓大腦在興奮狀態下強迫入睡。這個一小時，是一天當中質量最低的一小時。', action: '今晚提前半小時放下手機' },
  { id: 'n3', period: '夜', title: '複盤時刻', text: '睡前十分鐘是唯一一個你會對自己完全誠實的時間。用這十分鐘問自己：今天做的哪個決定，明天我還會這樣選？', action: '今晚睡前做一分鐘的今日複盤' },
  { id: 'n4', period: '夜', title: '預支的焦慮', text: '明天的事今晚想，屬於情緒預支。利息很高，你還不起。明天的事，明天再面對。', action: '今晚把明天要做的第一件事想好，然後睡覺' },
  { id: 'n5', period: '夜', title: '身體的帳本', text: '身體比你自己更清楚你這幾天的狀態。晚上十一點之前開始犯困，說明你這幾天節奏是對的。如果沒有，身體遲早會找你算帳。', action: '今晚注意自己幾點開始犯困' },
  { id: 'n6', period: '夜', title: '夢的解析', text: '有時候夢不是隨機的，它是你大腦在整理這一天時，發現某件事你白天處理得不太好。留意那些讓你醒來還記得的夢。', action: '今晚做一個夢的記錄（如果記得的話）' },
  { id: 'n7', period: '夜', title: '睡前清單', text: '大腦喜歡把事情放在心裡而不是清單上。清空的方法：把今天讓你情緒波動最大的那件事，轉化成一個具體的明天行動。', action: '今晚把今天最大的情緒翻譯成明天的一個行動' },
  { id: 'n8', period: '夜', title: '最後的思想', text: '睡前的最後一個念頭，會在睡眠中繼續生長。不是吸引力法則，是大腦神經元的夜間重組。選擇一個讓你安心的想法入睡。', action: '今晚選擇一個讓自己安心的想法帶入睡' }
];

// 根據時段抽取卡片
function getCardByPeriod(period) {
  const filtered = ENERGY_CARDS.filter(c => c.period === period);
  if (filtered.length === 0) return ENERGY_CARDS[0];
  
  // 用日期作 seed，同一天同一時段同一張卡
  const today = new Date();
  const seed = (today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate() + period.charCodeAt(0)) % filtered.length;
  return filtered[seed];
}

// 自動根據當前時間判斷時段
function getCurrentCard() {
  const hour = new Date().getHours();
  let period;
  if (hour >= 6 && hour < 12) period = '晨';
  else if (hour >= 12 && hour < 17) period = '午';
  else if (hour >= 17 && hour < 21) period = '暮';
  else period = '夜';
  
  return getCardByPeriod(period);
}

// 隨機抽一張（用於手動刷新）
function drawRandomCard(excludeId = null) {
  const pool = ENERGY_CARDS.filter(c => c.id !== excludeId);
  const idx = Math.floor(Math.random() * pool.length); // 這裡允許 random 因為是卡片抽取不是卦象
  return pool[idx];
}

export { ENERGY_CARDS, getCardByPeriod, getCurrentCard, drawRandomCard };
