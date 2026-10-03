/**
 * 梅花易數 — 邵雍時間起卦核心演算法
 * 全程無 Math.random，用於卦象計算
 */

// 先天卦數對照（邵雍易數）
// 1: 乾  2: 兌  3: 離  4: 震
// 5: 巽  6: 坎  7: 艮  8: 坤
const TRIGRAMS = [
  { id: 0, name: '乾', symbol: '☰', nature: '陽', desc: '天' },
  { id: 1, name: '兌', symbol: '☱', nature: '陰', desc: '澤' },
  { id: 2, name: '離', symbol: '☲', nature: '陰', desc: '火' },
  { id: 3, name: '震', symbol: '☳', nature: '陽', desc: '雷' },
  { id: 4, name: '巽', symbol: '☴', nature: '陰', desc: '風' },
  { id: 5, name: '坎', symbol: '☵', nature: '陽', desc: '水' },
  { id: 6, name: '艮', symbol: '☶', nature: '陽', desc: '山' },
  { id: 7, name: '坤', symbol: '☷', nature: '陰', desc: '地' }
];

// 爻辭（精簡版，取易經原典）
const LINE_TEXTS = {
  乾: {
    1: '潛龍勿用，陽在下也',
    2: '見龍在田，德施普也',
    3: '終日乾乾，反復道也',
    4: '或躍在淵，進無咎也',
    5: '飛龍在天，大人造也',
    6: '亢龍有悔，盈不可久也',
    7: '用九，群龍無首，吉'
  },
  坤: {
    1: '履霜堅冰，陰始凝也',
    2: '直方大，不習無不利',
    3: '含章可貞，或從王事',
    4: '括囊無咎，慎不害也',
    5: '黃裳元吉，文在中也',
    6: '龍戰於野，其血玄黃',
    7: '用六，永貞以大終也'
  },
  屯: {
    1: '雖盤桓，志行正也',
    2: '反復循序，以求小利',
    3: '即鹿無虞，困蒙也',
    4: '求而往，明也',
    5: '屯其膏，小貞吉',
    6: '泣血漣如，何可長也'
  },
  蒙: {
    1: '發蒙，利用刑人',
    2: '納婦吉，子克家',
    3: '勿用娶女，見金夫',
    4: '困蒙，吝',
    5: '童蒙，吉',
    6: '擊蒙，不利為寇'
  },
  需: {
    1: '需於郊，利用恆',
    2: '需於沙，小有言',
    3: '需於泥，致寇至',
    4: '需於血，出自穴',
    5: '需於酒食，貞吉',
    6: '入於穴，有不速之客'
  },
  讼: {
    1: '不永所事，訴訟不长',
    2: '食舊德，貞終吉',
    3: '食舊德，畏去就',
    4: '不克讼，歸而逋',
    5: '元吉，讼不可長',
    6: '朝歌之悲，未光也'
  },
  師: {
    1: '師出以律，失律凶',
    2: '在師中吉，承天寵',
    3: '師或輿尸，凶',
    4: '師左次，無咎',
    5: '田有禽，利執言',
    6: '大君有命，開國承家'
  },
  比: {
    1: '有孚比之，終來有他',
    2: '比之自內，貞吉',
    3: '比之匪人，凶',
    4: '外比之，貞吉',
    5: '顯比，王用三驅',
    6: '比之無首，無所終'
  },
  小畜: {
    1: '復自道，何其咎',
    2: '牽復，吉',
    3: '輿說輻，夫妻反目',
    4: '有孚，血去惕出',
    5: '有孚攣如，富',
    6: '既雨既處，尚德載'
  },
  履: {
    1: '素履往，無咎',
    2: '履道坦坦，幽人貞吉',
    3: '眇能視，跛能履',
    4: '愬愬終吉，志行也',
    5: '夬履，貞厲',
    6: '視履考祥，旋元吉'
  },
  泰: {
    1: '拔茅茹以其彙，吉',
    2: '包荒，用馮河，不遐遺',
    3: '無平不陂，無往不復',
    4: '翩翩，不富皆失實',
    5: '帝乙歸妹，以祉元吉',
    6: '城覆於隍，勿用師'
  },
  否: {
    1: '拔茅茹以其彙，貞吉亨',
    2: '包承，小人吉，大人否',
    3: '包羞',
    4: '有命，無咎，疇離祉',
    5: '休否，大人吉',
    6: '傾否，先否後喜'
  },
  同人: {
    1: '出門同人，又誰咎',
    2: '同人於宗，吝道',
    3: '伏戎於莽，敵剛',
    4: '乘其墉，弗克攻，吉',
    5: '同人先號咷而後笑',
    6: '同人於郊，無悔'
  },
  大有: {
    1: '大車以載，積中不敗',
    2: '公用亨於天子，小人弗克',
    3: '匪其彭，無咎',
    4: '匪其彭，明辨皙也',
    5: '厥孚交如，威如，吉',
    6: '自天祐之，吉無不利'
  },
  謙: {
    1: '謙謙君子，卑以自牧',
    2: '鳴謙，貞吉',
    3: '勞謙君子，萬民服',
    4: '無不利，撝謙',
    5: '不富以其鄰，利用侵伐',
    6: '鳴謙，志未得也'
  },
  豫: {
    1: '鳴豫，凶',
    2: '介于石，不終日',
    3: '盱豫，遲有悔',
    4: '由豫，大有得',
    5: '貞疾，恆不死',
    6: '冥豫，成有渝，無咎'
  },
  隨: {
    1: '官有渝，從正吉',
    2: '係小子，失丈夫',
    3: '係丈夫，失小子',
    4: '有孚在，道以明',
    5: '孚於嘉，吉',
    6: '拘係之，乃從維之'
  },
  蠱: {
    1: '幹母之蠱，不可貞',
    2: '幹母之蠱，得中道',
    3: '幹父之蠱，無大咎',
    4: '裕父之蠱，往見吝',
    5: '幹父之蠱，用譽',
    6: '不事王侯，志可則'
  },
  臨: {
    1: '鹹臨，貞吉',
    2: '鹹臨，吉，無不利',
    3: '甘臨，無攸利',
    4: '至臨，無咎',
    5: '知臨，大君之宜',
    6: '敦臨，吉，無咎'
  },
  觀: {
    1: '童觀，小人無咎',
    2: '闚觀，利女貞',
    3: '觀我生，進退',
    4: '觀國之光，尚實',
    5: '觀我生，君子無咎',
    6: '觀其生，君子無咎'
  },
  噬嗑: {
    1: '履校滅趾，無咎',
    2: '噬膚滅鼻，無咎',
    3: '噬腊肉，遇毒',
    4: '噬乾胏，得金矢',
    5: '噬乾肉，得黃金',
    6: '何校滅耳，凶'
  },
  賁: {
    1: '賁其趾，舍車而徒',
    2: '賁其須',
    3: '賁如濡如，永貞吉',
    4: '賁如皤如，白馬翰如',
    5: '丘園束帛，丘園',
    6: '白賁，無咎'
  },
  剝: {
    1: '剝床以足，蔑貞凶',
    2: '剝床以辨，蔑貞凶',
    3: '剝之，無咎',
    4: '剝床以膚，凶',
    5: '貫魚，宮人寵',
    6: '碩果不食，君子得輿'
  },
  復: {
    1: '不遠復，無祇悔',
    2: '休復，吉',
    3: '頻復，厲，無咎',
    4: '中行獨復',
    5: '敦復，無悔',
    6: '迷復，凶，有茲害'
  },
  無妄: {
    1: '無妄，往吉',
    2: '不耕獲，不菑畬',
    3: '行人得牛，或傷之',
    4: '可貞，無咎',
    5: '無妄之疾，勿藥有喜',
    6: '無妄行，有眚，無攸利'
  },
  大畜: {
    1: '有厲，利已',
    2: '輿脫輻',
    3: '良馬逐，利艱貞',
    4: '童牛之牿，元吉',
    5: '豶豕之牙，吉',
    6: '何天之衢，亨'
  },
  頤: {
    1: '舍爾靈龜，觀我朵頤',
    2: '顛頤拂經於丘頤',
    3: '拂頤，貞凶',
    4: '顛頤，吉，虎視眈眈',
    5: '拂經，居貞吉',
    6: '由頤屬之，利貞'
  },
  大過: {
    1: '藉用白茅，無咎',
    2: '枯楊生梯，老夫得其女妻',
    3: '棟橈，凶',
    4: '棟隆，吉，橈之玆甚',
    5: '枯楊生華，老婦得其士夫',
    6: '過涉滅頂，凶，無咎'
  },
  坎: {
    1: '習坎，入於坎窞，凶',
    2: '坎有險，求小得',
    3: '來之坎坎，險且枕',
    4: '尊酒簋貳，用納',
    5: '坎不盈，趾既平',
    6: '係用徵纆，寘於叢棘'
  },
  離: {
    1: '履錯然，敬之無咎',
    2: '黃離，元吉',
    3: '日昃之離，不鼓缶而歌',
    4: '突如其來如，無所容',
    5: '出涕沱若，威嗟若',
    6: '王用出征，有嘉折首'
  },
  咸: {
    1: '咸其拇，志在外',
    2: '咸其腓，凶',
    3: '咸其股，執其隨',
    4: '貞吉悔亡，憧憧往來',
    5: '咸其脢，無悔',
    6: '咸其輔頰舌'
  },
  恆: {
    1: '浚恆，凶，往不勝',
    2: '悔亡',
    3: '不恆其德，或承之羞',
    4: '田無禽',
    5: '恆其德，貞',
    6: '振恆，凶'
  },
  遯: {
    1: '遯尾，厲，勿用有攸往',
    2: '執之用黃牛之革',
    3: '係遯，有疾厲',
    4: '好遯，君子吉',
    5: '嘉遯，貞吉',
    6: '肥遯，無不利'
  },
  大壯: {
    1: '壯於趾，凶',
    2: '小人用壯，君子用罔',
    3: '小人壯，君子羞',
    4: '壯於大輿之輻',
    5: '喪羊於易，無悔',
    6: '羝羊觸藩，不能退'
  },
  晉: {
    1: '晉如摧如，貞吉',
    2: '晉如愁如，貞吉',
    3: '眾允，悔亡',
    4: '晉如鼫鼠，貞厲',
    5: '悔亡，失得勿恤',
    6: '晉其角，維用伐邑'
  },
  明夷: {
    1: '明夷於飛，垂其翼',
    2: '明夷于左股，用援馬壯',
    3: '明夷于南狩，得其大首',
    4: '入于左腹，獲明夷之心',
    5: '箕子之明夷，利貞',
    6: '不明晦，初登于天'
  },
  家人: {
    1: '閒有家，悔亡',
    2: '無攸遂，在中潰',
    3: '家人嗃嗃，悔厲吉',
    4: '富家，大吉',
    5: '王假有家，交相愛',
    6: '有孚威如，終吉'
  },
  睽: {
    1: '見惡人，無咎',
    2: '遇主於巷，無咎',
    3: '見車曳，其牛掣',
    4: '睽孤，遇元夫',
    5: '悔亡，厥宗噬膚',
    6: '無初有終，先睽後吉'
  },
  蹇: {
    1: '往蹇來譽',
    2: '王臣蹇蹇，匪躬之故',
    3: '往蹇來反',
    4: '往蹇來連',
    5: '大蹇，朋來',
    6: '往蹇來碩，吉'
  },
  解: {
    1: '無咎',
    2: '田獲三狐，得黃矢',
    3: '負且乘，致寇至',
    4: '解而拇，朋至斯孚',
    5: '君子維有解，吉',
    6: '公用射隼於高墉之上'
  },
  損: {
    1: '祀事遄往，無咎',
    2: '利貞，益之凶',
    3: '三人行，損一人',
    4: '行其損之疾',
    5: '或益之龜，弗克違',
    6: '弗損加之，一惠敵朝'
  },
  益: {
    1: '利用為大作，元吉',
    2: '或益之十朋之龜',
    3: '益之，用凶事，無咎',
    4: '中行，告公從，利用為依',
    5: '有孚惠心，勿問之',
    6: '莫益之，無攸利'
  },
  夬: {
    1: '壯於前趾，無咎',
    2: '惕號，莫夜有戎',
    3: '壯於頊，有凶',
    4: '臀無膚，其行次且',
    5: '莧陸夬夬，中行無咎',
    6: '無號，終有凶'
  },
  姤: {
    1: '系於金柅，貞吉',
    2: '包有魚，無咎',
    3: '臂無膚，其行次且',
    4: '包無魚，起凶',
    5: '含章，有隕自天',
    6: '姤其角，吝，無咎'
  },
  萃: {
    1: '乃亂乃萃，若號',
    2: '引吉，無咎',
    3: '萃如嗟如，無攸利',
    4: '大吉，無咎',
    5: '萃有位，無咎',
    6: '齎咨涕洟，無咎'
  },
  升: {
    1: '允升，大吉',
    2: '孚乃利用禴，無咎',
    3: '升虛邑',
    4: '王用亨於岐山，吉',
    5: '貞吉，升階',
    6: '冥升，利不息'
  },
  困: {
    1: '入於幽谷，困而不失其所亨',
    2: '困於酒食，朱紱方來',
    3: '困於石，據於蒺藜',
    4: '來徐徐，困於金車',
    5: '劓刖，困於赤紱',
    6: '困於葛藟，於臲卼'
  },
  井: {
    1: '井泥不食，舊井無禽',
    2: '井谷射鮒，甕敝漏',
    3: '井渫不食，為我心惻',
    4: '井甃，無咎',
    5: '井冽寒泉食',
    6: '井收，勿幕，有孚'
  },
  革: {
    1: '鞏用黃牛之革',
    2: '己日乃孚，元亨利貞',
    3: '悔亡，有孚改命',
    4: '悔亡，震懼未定',
    5: '大人虎變，君子豹變',
    6: '小人革面，順以從君'
  },
  鼎: {
    1: '鼎顛趾，利出否',
    2: '鼎有實，我仇有疾',
    3: '鼎耳革，其行塞',
    4: '鼎折足，覆公餗',
    5: '鼎黃耳，金鉉',
    6: '鼎玉鉉，大吉'
  },
  震: {
    1: '震來虩虩，笑言啞啞',
    2: '震來厲，億喪貝',
    3: '震蘇蘇，震行無眚',
    4: '震遂泥',
    5: '震往來厲，億無喪有事',
    6: '震索索，視矍矍'
  },
  艮: {
    1: '艮其趾，無咎',
    2: '艮其腓，不拯其隨',
    3: '艮其限，厲薰心',
    4: '艮其身，無咎',
    5: '艮其輔，言有序',
    6: '敦艮，吉'
  },
  漸: {
    1: '小子厲，有言，無咎',
    2: '鴻漸於干',
    3: '鴻漸於磐，飲食衎衎',
    4: '鴻漸於木，或得其桷',
    5: '鴻漸於陵，終莫之勝',
    6: '鴻漸於阿，其羽可用為儀'
  },
  歸妹: {
    1: '歸妹以娣，跛能履',
    2: '眇能視，利幽人之貞',
    3: '歸妹以須，反歸以娣',
    4: '歸妹愆期，遲歸有時',
    5: '帝乙歸妹，其君之袂',
    6: '女承筐無實，士刲羊無血'
  },
  豐: {
    1: '遇其配主，雖旬無咎',
    2: '豐其蔀，日中見斗',
    3: '遇其夷主，吉',
    4: '豐其屋，蔀其家',
    5: '來章，有慶譽',
    6: '豐其屋，天際翔也'
  },
  旅: {
    1: '旅瑣瑣，斯其所取災',
    2: '旅即次，懷其資',
    3: '旅焚其次，喪其童僕',
    4: '旅於處，得其資斧',
    5: '射雉，一矢亡',
    6: '鳥焚其巢，旅人先笑後嚎咷'
  },
  巽: {
    1: '進退，利武人之貞',
    2: '巽在床下，用史巫',
    3: '頻巽，吝',
    4: '悔亡，田獲三品',
    5: '貞吉悔亡，無不利',
    6: '巽在床下，喪其資斧'
  },
  兌: {
    1: '和兌，吉',
    2: '孚兌，吉，悔亡',
    3: '來兌，凶',
    4: '商兌，未寧',
    5: '孚於剝，有厲',
    6: '引兌'
  },
  渙: {
    1: '渙汗其大號，渙王居',
    2: '渙責其躬，無咎',
    3: '渙其群，元吉',
    4: '渙其躬，無悔',
    5: '渙其汗，天際翔也',
    6: '渙其血，去逖出'
  },
  節: {
    1: '不出戶庭，無咎',
    2: '不出門庭，凶',
    3: '不節若，則嗟若',
    4: '安節，亨',
    5: '甘節，吉，往有尚',
    6: '苦節，貞凶'
  },
  中孚: {
    1: '虞吉，有他不燕',
    2: '鶴鳴在陰，其子和之',
    3: '得敵，或鼓或罷',
    4: '月幾望，馬匹亡',
    5: '有孚攣如，無咎',
    6: '翰音登於天，凶'
  },
  小過: {
    1: '飛鳥以凶',
    2: '不及其君，遇其臣',
    3: '從或戕之，凶',
    4: '無咎，弗過遇之',
    5: '密雲不雨，自我西郊',
    6: '弗遇過之，亢極'
  },
  既濟: {
    1: '曳其輪，濡其尾，無咎',
    2: '婦喪其茀，勿逐',
    3: '高宗伐鬼方，三年剋之',
    4: '繻有衣袽，終日戒',
    5: '東鄰殺牛，不如西鄰',
    6: '濡其首，厲'
  },
  未濟: {
    1: '濡其尾，吝',
    2: '曳其輪，貞吉',
    3: '未濟，征凶',
    4: '貞吉，悔亡，震用伐鬼方',
    5: '貞吉，無悔',
    6: '有孚於酒食，無咎'
  }
};

// 64 卦完整資料表（卦象：八卦重疊，上在外，下在內）
const HEXAGRAMS = [
  // 8 卦疊加（0-7：上卦 0 乾，上卦 1-7）
  { id: 1,  name: '乾',  upper: 0, lower: 0, guaci: '元亨利貞', tiyong: '陽陽比和', nature: '大吉' },
  { id: 2,  name: '兌',  upper: 0, lower: 1, guaci: '亨，利貞', tiyong: '上柔下剛', nature: '小吉' },
  { id: 3,  name: '離',  upper: 0, lower: 2, guaci: '離，利貞，亨', tiyong: '上剛下柔', nature: '中吉' },
  { id: 4,  name: '震',  upper: 0, lower: 3, guaci: '亨，震來虩虩', tiyong: '上剛下動', nature: '震動' },
  { id: 5,  name: '巽',  upper: 0, lower: 4, guaci: '小亨，利有攸往', tiyong: '上柔下入', nature: '漸進' },
  { id: 6,  name: '坎',  upper: 0, lower: 5, guaci: '習坎，有孚維心亨', tiyong: '上下皆險', nature: '險阻' },
  { id: 7,  name: '艮',  upper: 0, lower: 6, guaci: '艮其背，不獲其身', tiyong: '上剛下止', nature: '止止' },
  { id: 8,  name: '坤',  upper: 0, lower: 7, guaci: '元亨利牝馬之貞', tiyong: '陰陰比和', nature: '大吉' },
  // 上卦 1 兌
  { id: 9,  name: '履',  upper: 1, lower: 0, guaci: '履虎尾，不咥人，亨', tiyong: '柔上剛下', nature: '謹慎' },
  { id: 10, name: '兌',  upper: 1, lower: 1, guaci: '亨，利貞', tiyong: '陰陰比和', nature: '喜悅' },
  { id: 11, name: '睽',  upper: 1, lower: 2, guaci: '小事吉', tiyong: '柔離剛歸', nature: '乖離' },
  { id: 12, name: '歸妹', upper: 1, lower: 3, guaci: '征凶，無攸利', tiyong: '柔動剛上', nature: '不正' },
  { id: 13, name: '中孚', upper: 1, lower: 4, guaci: '豚魚，吉', tiyong: '柔入剛中', nature: '誠信' },
  { id: 14, name: '節',  upper: 1, lower: 5, guaci: '亨，苦節不可貞', tiyong: '柔坎剛中', nature: '節制' },
  { id: 15, name: '損',  upper: 1, lower: 6, guaci: '有孚，元吉', tiyong: '柔山剛上', nature: '減損' },
  { id: 16, name: '臨',  upper: 1, lower: 7, guaci: '元亨利貞', tiyong: '柔坤剛振', nature: '監臨' },
  // 上卦 2 離
  { id: 17, name: '同人', upper: 2, lower: 0, guaci: '同人於野，亨', tiyong: '柔乾剛中', nature: '和同' },
  { id: 18, name: '革',  upper: 2, lower: 1, guaci: '己日乃孚，元亨利貞', tiyong: '柔兌離中', nature: '改革' },
  { id: 19, name: '離',  upper: 2, lower: 2, guaci: '離，利貞，亨', tiyong: '陰陰比和', nature: '光明' },
  { id: 20, name: '豐',  upper: 2, lower: 3, guaci: '亨，王假之', tiyong: '柔震離明', nature: '豐盛' },
  { id: 21, name: '家人', upper: 2, lower: 4, guaci: '利女貞', tiyong: '柔風離明', nature: '家庭' },
  { id: 22, name: '賁',  upper: 2, lower: 5, guaci: '亨，小利有攸往', tiyong: '柔坎離明', nature: '文飾' },
  { id: 23, name: '蠱',  upper: 2, lower: 6, guaci: '元亨，利涉大川', tiyong: '柔艮蟲生', nature: '除弊' },
  { id: 24, name: '明夷', upper: 2, lower: 7, guaci: '利艱貞', tiyong: '柔坤離明', nature: '晦暗' },
  // 上卦 3 震
  { id: 25, name: '無妄', upper: 3, lower: 0, guaci: '元亨利貞', tiyong: '剛乾震動', nature: '天動' },
  { id: 26, name: '隨',  upper: 3, lower: 1, guaci: '元亨利貞，無咎', tiyong: '剛兌震從', nature: '隨從' },
  { id: 27, name: '噬嗑', upper: 3, lower: 2, guaci: '亨，利用獄', tiyong: '剛離震動', nature: '刑罰' },
  { id: 28, name: '震',  upper: 3, lower: 3, guaci: '亨，震來虩虩', tiyong: '陽陽比和', nature: '震動' },
  { id: 29, name: '益',  upper: 3, lower: 4, guaci: '利有攸往，利涉大川', tiyong: '剛巽震動', nature: '增益' },
  { id: 30, name: '屯',  upper: 3, lower: 5, guaci: '元亨利貞，勿用有攸往', tiyong: '剛坎震動', nature: '初生' },
  { id: 31, name: '頤',  upper: 3, lower: 6, guaci: '貞吉，觀頤', tiyong: '剛艮震動', nature: '養生' },
  { id: 32, name: '復',  upper: 3, lower: 7, guaci: '亨，出入無疾', tiyong: '剛坤震復', nature: '復歸' },
  // 上卦 4 巽
  { id: 33, name: '垢',  upper: 4, lower: 0, guaci: '女壯，勿用取女', tiyong: '柔乾剛退', nature: '邂逅' },
  { id: 34, name: '大畜', upper: 4, lower: 1, guaci: '利貞，不家食吉', tiyong: '柔乾剛上', nature: '蓄積' },
  { id: 35, name: '鼎',  upper: 4, lower: 2, guaci: '元吉，亨', tiyong: '柔離鼎立', nature: '鼎新' },
  { id: 36, name: '恆',  upper: 4, lower: 3, guaci: '亨，利貞，無咎', tiyong: '柔震雷風', nature: '恆久' },
  { id: 37, name: '巽',  upper: 4, lower: 4, guaci: '小亨，利有攸往', tiyong: '陰陰比和', nature: '滲入' },
  { id: 38, name: '井',  upper: 4, lower: 5, guaci: '改邑不改井，無喪無得', tiyong: '柔坎巽入', nature: '養人' },
  { id: 39, name: '蠱',  upper: 4, lower: 6, guaci: '元亨，利涉大川', tiyong: '柔艮風止', nature: '事務' },
  { id: 40, name: '升',  upper: 4, lower: 7, guaci: '南征吉', tiyong: '柔坤地風', nature: '上升' },
  // 上卦 5 坎
  { id: 41, name: '需',  upper: 5, lower: 0, guaci: '有孚，光亨', tiyong: '剛乾坎險', nature: '等待' },
  { id: 42, name: '節',  upper: 5, lower: 1, guaci: '亨，苦節不可貞', tiyong: '柔兌坎下', nature: '節制' },
  { id: 43, name: '既濟', upper: 5, lower: 2, guaci: '亨，小利貞', tiyong: '剛離坎水', nature: '已成' },
  { id: 44, name: '解',  upper: 5, lower: 3, guaci: '利西南，無所往', tiyong: '柔震坎雨', nature: '解除' },
  { id: 45, name: '渙',  upper: 5, lower: 4, guaci: '亨，王假有廟', tiyong: '柔巽坎風', nature: '渙散' },
  { id: 46, name: '坎',  upper: 5, lower: 5, guaci: '習坎，有孚維心亨', tiyong: '陽陽比和', nature: '險陷' },
  { id: 47, name: '蒙',  upper: 5, lower: 6, guaci: '亨，匪我求童蒙', tiyong: '柔艮坎陷', nature: '蒙昧' },
  { id: 48, name: '師',  upper: 5, lower: 7, guaci: '貞，丈人吉，無咎', tiyong: '柔坤坎師', nature: '兵師' },
  // 上卦 6 艮
  { id: 49, name: '大畜', upper: 6, lower: 0, guaci: '利貞，不家食吉', tiyong: '柔乾山止', nature: '止健' },
  { id: 50, name: '損',  upper: 6, lower: 1, guaci: '有孚，元吉', tiyong: '柔兌山止', nature: '減損' },
  { id: 51, name: '賁',  upper: 6, lower: 2, guaci: '亨，小利有攸往', tiyong: '柔離山止', nature: '飾美' },
  { id: 52, name: '頤',  upper: 6, lower: 3, guaci: '貞吉，觀頤', tiyong: '柔震山止', nature: '保養' },
  { id: 53, name: '漸',  upper: 6, lower: 4, guaci: '女歸吉，利貞', tiyong: '柔巽山止', nature: '漸進' },
  { id: 54, name: '蒙',  upper: 6, lower: 5, guaci: '亨，匪我求童蒙', tiyong: '柔坎山止', nature: '蒙童' },
  { id: 55, name: '艮',  upper: 6, lower: 6, guaci: '艮其背，不獲其身', tiyong: '陽陽比和', nature: '靜止' },
  { id: 56, name: '謙',  upper: 6, lower: 7, guaci: '亨，君子有終', tiyong: '柔坤山止', nature: '謙遜' },
  // 上卦 7 坤
  { id: 57, name: '剝',  upper: 7, lower: 0, guaci: '不利有攸往', tiyong: '柔乾剝落', nature: '剝落' },
  { id: 58, name: '萃',  upper: 7, lower: 1, guaci: '亨，利貞', tiyong: '柔兌坤聚', nature: '聚集' },
  { id: 59, name: '晉',  upper: 7, lower: 2, guaci: '康侯用錫馬蕃庶', tiyong: '柔離坤明', nature: '進長' },
  { id: 60, name: '豫',  upper: 7, lower: 3, guaci: '利建侯行師', tiyong: '柔震坤樂', nature: '安逸' },
  { id: 61, name: '觀',  upper: 7, lower: 4, guaci: '盥而不薦，有孚顒若', tiyong: '柔巽坤順', nature: '觀仰' },
  { id: 62, name: '比',  upper: 7, lower: 5, guaci: '吉，原筮元永貞', tiyong: '柔坎坤比', nature: '親比' },
  { id: 63, name: '剝',  upper: 7, lower: 6, guaci: '剝床以足，蔑貞凶', tiyong: '柔艮剝消', nature: '剝落' },
  { id: 64, name: '坤',  upper: 7, lower: 7, guaci: '元亨利牝馬之貞', tiyong: '陰陰比和', nature: '柔順' }
];

// 根據上下卦找 64 卦
function getHexagram(upper, lower) {
  return HEXAGRAMS.find(h => h.upper === upper && h.lower === lower) || null;
}

// 體用生剋判定（梅花易數核心邏輯）
function getTiYong(hexagram, movingLine) {
  const upperTrigram = TRIGRAMS[hexagram.upper];
  const lowerTrigram = TRIGRAMS[hexagram.lower];
  
  // 動爻所在卦：若動爻在三爻以下，屬下卦（體）；以上屬上卦（用）
  // 梅花易數取動爻位置定體用
  const movingInLower = movingLine <= 3;
  
  let ti, yong;
  
  if (movingInLower) {
    ti = lowerTrigram;
    yong = upperTrigram;
  } else {
    ti = upperTrigram;
    yong = lowerTrigram;
  }
  
  // 生剋關係
  // 陽生陽/陰生陰：比和（平）
  // 陽生陰/陰生陽：相生（吉）
  // 陽剋陰：相剋（通常剋者為兇，但需看具體）
  let result;
  if (ti.nature === yong.nature) {
    result = { relation: '比和', judgment: '平', desc: `${ti.name}與${yong.name}比和，事情平稳無大波瀾` };
  } else if (
    (ti.nature === '陽' && yong.nature === '陰') ||
    (ti.nature === '陰' && yong.nature === '陽')
  ) {
    result = { relation: '相生', judgment: '吉', desc: `${ti.name}之氣生${yong.name}，生者得助，事情有助力推進` };
  } else {
    result = { relation: '相剋', judgment: '兇', desc: `${ti.name}之氣剋${yong.name}，需謹慎應對，不可冒進` };
  }
  
  return { ti, yong, ...result };
}

// 互卦計算
function getHuGua(hexagram) {
  const { upper, lower } = hexagram;
  // 上互 = 上卦的中爻(2) + 下卦的初爻(0)
  const huUpper = TRIGRAMS[upper];
  // 下互 = 下卦的中爻(1) + 上卦的初爻(0)
  const huLower = TRIGRAMS[lower];
  return {
    upper: huUpper,
    lower: huLower,
    name: `${huUpper.name}${huLower.name}`
  };
}

// 變卦計算
function getBianGua(hexagram, movingLine) {
  // 動爻陰陽反轉：陽→陰爻，陰→陽爻
  // 上卦（第4、5、6爻）與下卦（第1、2、3爻）
  const { upper, lower } = hexagram;
  
  // 變爻進位：遇6（老陽）變陰，遇9（老陰）變陽
  // 這裡 movingLine 1-6 直接用
  // 若動爻在上卦(4,5,6) 則上卦對應爻反轉
  // 若動爻在下卦(1,2,3) 則下卦對應爻反轉
  
  // 梅花易數：動爻陰變陽，陽變陰，換卦
  // 這裡我們用簡化：動爻在三爻以內，下卦變；以上上卦變
  let newUpper = upper, newLower = lower;
  if (movingLine <= 3) {
    // 下卦變：下卦id+1繞回（模擬陰陽反轉）
    newLower = (lower + 1) % 8;
  } else {
    newUpper = (upper + 1) % 8;
  }
  
  return getHexagram(newUpper, newLower);
}

// 完整解卦
function divinate(input) {
  let upper, lower, movingLine, method;
  
  if (input.type === 'time') {
    const { year, month, day, hour } = input;
    upper = (year + month + day) % 8;
    lower = (year + month + day + hour) % 8;
    movingLine = ((year + month + day + hour) % 6) + 1;
    method = '時間起卦';
  } else if (input.type === 'number') {
    const { a, b } = input;
    upper = ((a - 1) % 8 + 8) % 8;
    lower = ((b - 1) % 8 + 8) % 8;
    movingLine = (((a + b) % 6) + 6) % 6 + 1;
    method = '數字起卦';
  } else if (input.type === 'text') {
    const text = input.text || '';
    const count = text.trim().length || 1;
    const secondCharCode = text.length > 1 ? text.charCodeAt(1) : 0;
    upper = count % 8;
    lower = ((count + secondCharCode) % 8);
    movingLine = ((count % 6) + 6) % 6 + 1;
    method = '字數起卦';
  } else {
    return null;
  }
  
  const hexagram = getHexagram(upper, lower);
  if (!hexagram) return null;
  
  const tiyong = getTiYong(hexagram, movingLine);
  const hugua = getHuGua(hexagram);
  const biangua = getBianGua(hexagram, movingLine);
  
  const upperTrigram = TRIGRAMS[upper];
  const lowerTrigram = TRIGRAMS[lower];
  
  // 動爻爻辭
  const movingLineText = LINE_TEXTS[hexagram.name]?.[movingLine] || '動爻無辭';
  
  return {
    method,
    input,
    hexagram,
    upperTrigram,
    lowerTrigram,
    movingLine,
    movingLineText,
    tiyong,
    hugua,
    biangua,
    guaci: hexagram.guaci,
    // 顯示用卦象序列（6爻，從上到下）
    sequence: buildSequence(hexagram, movingLine)
  };
}

// 構建6爻序列（用於顯示）
function buildSequence(hexagram, movingLine) {
  const { upper, lower } = hexagram;
  // 上卦：爻4、5、6（從上往下）
  // 下卦：爻1、2、3（從上往下）
  const lines = [];
  // 上爻(6)、五爻(5)、四爻(4)、三爻(3)、二爻(2)、初爻(1)
  // 上卦 = 4/5/6爻，下卦 = 1/2/3爻
  // 傳統：初二三爻為下卦，四五六爻為上卦
  // 上卦由 upper 的 8 疊方式決定爻的陰陽
  
  // 簡化：每個三爻卦視為 8 個可能的疊法（0-7）
  // 7 為 111（全部陽爻），0 為 000（全部陰爻）
  const upperBinary = upper; // 0-7
  const lowerBinary = lower; // 0-7
  
  // 上卦：六爻(bit2)、五爻(bit1)、四爻(bit0)
  lines.push({ num: 6, yang: (upperBinary >> 2) & 1, moving: movingLine === 6 });
  lines.push({ num: 5, yang: (upperBinary >> 1) & 1, moving: movingLine === 5 });
  lines.push({ num: 4, yang: upperBinary & 1, moving: movingLine === 4 });
  // 下卦：三爻(bit2)、二爻(bit1)、初爻(bit0)
  lines.push({ num: 3, yang: (lowerBinary >> 2) & 1, moving: movingLine === 3 });
  lines.push({ num: 2, yang: (lowerBinary >> 1) & 1, moving: movingLine === 2 });
  lines.push({ num: 1, yang: lowerBinary & 1, moving: movingLine === 1 });
  
  return lines;
}

// 判斷卦象吉凶（用於配對金句）
function getAuspicious(hexagram, tiyong, scenario) {
  const { nature, upper, lower } = hexagram;
  const ti = tiyong.ti;

  // 根據體用關係與卦象性質綜合判定
  if (tiyong.relation === '相生') return 'good';
  if (tiyong.relation === '比和') return 'neutral';
  // consumption 場景對阻力更敏感，剋直接降級
  if (scenario === 'consumption' && tiyong.relation === '相剋') return 'bad';
  return 'bad';
}

// 獲取所有64卦（供其他模組調用）
function getAllHexagrams() {
  return HEXAGRAMS;
}

// 獲取單一卦
function getHexagramByName(name) {
  return HEXAGRAMS.find(h => h.name === name) || null;
}

export { divinate, getHexagram, getTiYong, getHuGua, getBianGua, getAuspicious, getAllHexagrams, getHexagramByName, TRIGRAMS, HEXAGRAMS };
