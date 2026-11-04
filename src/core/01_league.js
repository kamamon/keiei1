/* =========================================================
   リーグの切り替え：日本のプロ野球（npb）／メジャーリーグ（mlb）
   G.mode に合わせて setLeague() が LG（決まりごと）とデータ表の中身を入れ替える。
   メジャー版の球団・リーグ・球場・企業・人物もすべて架空です（都市名だけ実在）
   ========================================================= */
const LG_NPB = {
  mode: 'npb', mlb: false, name: '日本プロ野球', sub: 'プロ野球経営シミュレーション', teams: 12, games: 143, dpw: 6, weekend: [3, 4, 5],
  dayAtt: [0.80, 0.80, 0.84, 1.0, 1.20, 1.14], rot: 6, rest: 6, nrp: 8, nbat: 15, maxInn: 12, maxInnPost: 15, ghost: false,
  draftT: 39, asgT: 27, postEnd: 38, faYears: 8, maxYrs: 5, salK: 1, hofWait: 3, hofYears: 15, velAdd: 0,
  champ: '日本一', series: 'グランドシリーズ', aceAward: 'ゴールデンアーム賞', glove: 'ゴールデングラブ賞'
};
const LG_MLB = {
  mode: 'mlb', mlb: true, name: 'メジャーリーグ', sub: 'メジャーリーグ経営シミュレーション', teams: 30, games: 162, dpw: 7, weekend: [4, 5, 6],
  dayAtt: [0.78, 0.80, 0.80, 0.86, 1.02, 1.20, 1.12], rot: 5, rest: 5, nrp: 8, nbat: 13, maxInn: 25, maxInnPost: 25, ghost: true,
  draftT: 26, asgT: 26, postEnd: 39, faYears: 6, arbYears: 3, maxYrs: 10, salK: 2.2, hofWait: 5, hofYears: 10,
  /* 球速：メジャーは日本より5キロほど速い（速球の平均はおよそ151キロ＝94マイル、救援の速球派は160キロ＝100マイル超え）。
     能力の評価（総合力・球速のバー）はリーグの水準に合わせるので、同じ評価でも数字が velAdd だけ大きい */
  velAdd: 5,
  /* 得点環境：球が速いぶん三振が多く、本塁打も多い（三振率22〜23%・本塁打は1打席あたり約3%・平均防御率4点前後）。
     本塁打はふつうの打者ほど日本より多く、強打者どうしの差は日本ほど開かない（hrB：パワーの効き方） */
  sim: { k: .212, hr: .0285, hrB: 0.95, bb: .080, era0: 4.0 },
  /* 先発の球数のめど：72＋スタミナ×0.34（スタミナ90でおよそ100球）。日本版は 68＋スタミナ×0.56 */
  spPit: [72, 0.34],
  champ: 'ワールドチャンピオン', series: 'ワールドシリーズ', aceAward: '最優秀投手賞', glove: '最優秀守備賞',
  divs: ['東地区', '中地区', '西地区'],
  /* ぜいたく税：基準額（2億4400万ドル）を超えた分に課税。連続で超えるほど税率が上がる */
  lux: { th: 813300, rates: [0.2, 0.3, 0.5], sur: [[66700, 0.12], [133300, 0.425], [200000, 0.6]] },
  draftRounds: 8
};

/* ---------- メジャー版のデータ ---------- */
const US_FIRST = ['マイク', 'ジョン', 'ジェイク', 'タイラー', 'ブランドン', 'ライアン', 'ケビン', 'ジャスティン', 'カイル', 'コナー', 'ディラン', 'オースティン',
  'ネイト', 'マット', 'クリス', 'ザック', 'コーディ', 'トレバー', 'ジョシュ', 'ルーク', 'ローガン', 'メイソン', 'イーサン', 'ノア', 'ハンター', 'チェイス',
  'ブレイク', 'ギャレット', 'ウェス', 'カーソン', 'ブレット', 'デレク', 'グラント', 'トラビス', 'ショーン', 'エヴァン', 'アダム', 'ベン', 'サム', 'ジャック',
  'ウィル', 'ヘンリー', 'オーウェン', 'カルビン', 'ブライス', 'ジャクソン', 'ライリー', 'コルトン', 'ブレイデン', 'ゲイブ', 'トミー', 'ボビー', 'ジミー',
  'ダニー', 'ドリュー', 'リード', 'パーカー', 'スペンサー', 'ホイット', 'ランドン', 'エリック', 'スコット', 'ジェレミー', 'マーカス', 'ダリル', 'テレンス',
  'アンドレ', 'ジャマール', 'ドノバン', 'ケイデン', 'ニコ', 'イアン', 'コール', 'ギャビン', 'カーター', 'ディーン', 'ハリソン', 'シェーン', 'トレント', 'ヴィンス'];
const US_LAST = ['ジョンソン', 'スミス', 'ウィリアムズ', 'ブラウン', 'ジョーンズ', 'ミラー', 'デイビス', 'ウィルソン', 'アンダーソン', 'テイラー', 'トーマス', 'ムーア',
  'ジャクソン', 'マーティン', 'リー', 'トンプソン', 'ホワイト', 'ハリス', 'クラーク', 'ルイス', 'ロビンソン', 'ウォーカー', 'ヤング', 'アレン', 'キング',
  'ライト', 'スコット', 'ヒル', 'グリーン', 'アダムス', 'ベイカー', 'ネルソン', 'カーター', 'ミッチェル', 'ロバーツ', 'ターナー', 'フィリップス', 'キャンベル',
  'パーカー', 'エバンス', 'エドワーズ', 'コリンズ', 'スチュワート', 'モリス', 'マーフィー', 'クック', 'ロジャース', 'モーガン', 'クーパー', 'ピーターソン',
  'ベイリー', 'リード', 'ケリー', 'ハワード', 'コックス', 'ワード', 'リチャードソン', 'ワトソン', 'ブルックス', 'ウッド', 'ジェームズ', 'ベネット', 'グレイ',
  'ヒューズ', 'プライス', 'サンダース', 'マイヤーズ', 'ロング', 'ロス', 'フォスター', 'パウエル', 'ジェンキンス', 'ペリー', 'ラッセル', 'サリバン', 'ベル',
  'コールマン', 'バトラー', 'ヘンダーソン', 'バーンズ', 'フィッシャー', 'ハミルトン', 'グラハム', 'ウォレス', 'ウエスト', 'コール', 'ヘイズ', 'ブライアント',
  'エリス', 'スティーブンス', 'マーシャル', 'オーウェンス', 'マクドナルド', 'ハリソン', 'ギブソン', 'ケネディ', 'ウェルズ', 'ショー', 'ハント', 'パーマー',
  'ロバートソン', 'ブラック', 'ホームズ', 'ストーン', 'メイヤー', 'ボイド', 'ミルズ', 'ウォーレン', 'フォックス', 'ローズ', 'ライス', 'モレノ', 'シュミット',
  'ナイト', 'ハドソン', 'ハンセン', 'ハーパー', 'ウェバー', 'バーク', 'マッケンジー', 'オコナー', 'シュルツ', 'ダンカン', 'ブレイディ', 'ラーセン', 'ホフマン'];
const LAT_FIRST = ['ホセ', 'ルイス', 'カルロス', 'ミゲル', 'フアン', 'ペドロ', 'ラファエル', 'ラモン', 'フランシスコ', 'エウヘニオ', 'フリオ', 'エドゥアルド',
  'ヨアン', 'ヤディエル', 'エリー', 'ウィルマー', 'ロナルド', 'ヘラルド', 'アンドレス', 'オスカル', 'マヌエル', 'ビクトル', 'ヘスス', 'アレハンドロ',
  'ダビド', 'フェリックス', 'エンリケ', 'アドニス', 'ヨルダン', 'ヘンリー', 'ヨエル', 'オネイル', 'クリスティアン', 'エマヌエル', 'サンティアゴ', 'ディエゴ'];
const LAT_LAST = ['ロドリゲス', 'マルティネス', 'ガルシア', 'ヘルナンデス', 'ロペス', 'ゴンザレス', 'ペレス', 'サンチェス', 'ラミレス', 'トーレス', 'フローレス',
  'リベラ', 'ゴメス', 'ディアス', 'クルーズ', 'オルティス', 'モラレス', 'レイエス', 'グティエレス', 'チャベス', 'ラモス', 'メンドーサ', 'カスティーヨ',
  'ヒメネス', 'ロメロ', 'アルバレス', 'バスケス', 'エスピナル', 'デラクルス', 'ソト', 'メヒア', 'ベタンセス', 'アルカンタラ', 'ペーニャ', 'ゲレーロ',
  'カブレラ', 'サラサール', 'セベリーノ', 'マチャド', 'アコスタ', 'ベラスケス', 'カストロ', 'ヌニェス', 'オスーナ', 'バティスタ', 'パディージャ'];
const KR_FAM = ['キム', 'イ', 'パク', 'チェ', 'チョン', 'カン', 'チョ', 'ユン', 'ハン', 'ソン'];
const KR_GIV = ['ジフン', 'ミンジュン', 'ヒョンス', 'ソンミン', 'ドヒョン', 'ジュンヒョク', 'ウジン', 'テヨン', 'ハソン', 'ジョンウ', 'セフン', 'ヨンジェ'];
const TW_FAM = ['リン', 'チェン', 'ワン', 'ホアン', 'チャン', 'リー', 'ウー', 'ツァイ'];
const TW_GIV = ['ユーミン', 'ジャーハオ', 'ウェイロン', 'ツーハン', 'ボーユー', 'イーチェン', 'ジュンジエ', 'グァンユー'];

const MLB_DATA = {
  REGIONS: ['北東部', '南東部', '中西部', '南部', '西部', '中南米'],
  REGION_W: [20, 18, 20, 18, 18, 6],
  PLACES: [
    ['ニューヨーク', 'ボストン', 'フィラデルフィア', 'ピッツバーグ', 'ボルチモア', 'ワシントン', 'ハートフォード', 'プロビデンス', 'バッファロー', 'ニューアーク', 'トロント'],
    ['アトランタ', 'マイアミ', 'タンパ', 'シャーロット', 'ナッシュビル', 'オーランド', 'ジャクソンビル', 'ローリー', 'チャールストン', 'メンフィス'],
    ['シカゴ', 'デトロイト', 'クリーブランド', 'シンシナティ', 'ミルウォーキー', 'セントルイス', 'カンザスシティ', 'ミネアポリス', 'インディアナポリス', 'コロンバス', 'オマハ'],
    ['ヒューストン', 'ダラス', 'オースティン', 'サンアントニオ', 'ニューオーリンズ', 'オクラホマシティ', 'フォートワース', 'エルパソ', 'リトルロック', 'バトンルージュ'],
    ['ロサンゼルス', 'サンフランシスコ', 'サンディエゴ', 'シアトル', 'デンバー', 'フェニックス', 'ラスベガス', 'ポートランド', 'ソルトレイクシティ', 'サクラメント', 'アナハイム'],
    ['サンフアン', 'ポンセ', 'バヤモン', 'カグアス', 'マヤグエス', 'サントドミンゴ', 'サンペドロ・デ・マコリス', 'バレンシア', 'マラカイボ', 'ハバナ']
  ],
  LEAGUES: ['リバティ・リーグ', 'ユニオン・リーグ'],
  /* 30球団。div：0東・1中・2西。kanji はマークの文字（英字1〜2字） */
  TEAM_DEFS: [
    { city: 'ニューヨーク', nick: 'ハーバーキングス', kanji: 'HK', color: '#0E3B5C', color2: '#E8B04B', league: 0, div: 0, market: 5, pop: 80, star: 1, shift: 4, fac: 4,
      parent: 'ハドソン・キャピタル', stadium: 'ハドソン・フィールド', cap: 47000, dome: false, hrF: 1.10, rent: 60000, cash: 900000, region: 0 },
    { city: 'ボストン', nick: 'ベイシャークス', kanji: 'BS', color: '#14524A', color2: '#F2F0E6', league: 0, div: 0, market: 4, pop: 76, star: 2, shift: 2, fac: 3,
      parent: 'ベイステート・スポーツ', stadium: 'バックベイ・パーク', cap: 37000, dome: false, hrF: 1.06, rent: 20000, cash: 620000, region: 0 },
    { city: 'トロント', nick: 'ルーンズ', kanji: 'L', color: '#2B6CB0', color2: '#F5F7FA', league: 0, div: 0, market: 4, pop: 64, star: 3, shift: 0, fac: 3,
      parent: 'グレートレイクス・メディア', stadium: 'オンタリオ・ドーム', cap: 41000, dome: true, hrF: 1.03, rent: 50000, cash: 450000, region: 0 },
    { city: 'ボルチモア', nick: 'クラバーズ', kanji: 'C', color: '#E4572E', color2: '#1F1F1F', league: 0, div: 0, market: 2, pop: 55, star: 4, shift: -1, fac: 2,
      parent: 'チェサピーク・ベイ・グループ', stadium: 'インナーハーバー・パーク', cap: 45000, dome: false, hrF: 1.04, rent: 15000, cash: 250000, region: 0 },
    { city: 'タンパ', nick: 'ガルフスターズ', kanji: 'GS', color: '#21A0A0', color2: '#0B2545', league: 0, div: 0, market: 2, pop: 46, star: 4, shift: 1, fac: 2,
      parent: 'サンコースト・ベンチャーズ', stadium: 'ガルフコースト・ドーム', cap: 30000, dome: true, hrF: 0.96, rent: 15000, cash: 220000, region: 1 },
    { city: 'シカゴ', nick: 'レイクウルブズ', kanji: 'W', color: '#3A3A3A', color2: '#C9D6DF', league: 0, div: 1, market: 4, pop: 60, star: 3, shift: -1, fac: 3,
      parent: 'ミシガン湖ホールディングス', stadium: 'サウスショア・パーク', cap: 40000, dome: false, hrF: 1.05, rent: 30000, cash: 400000, region: 2 },
    { city: 'クリーブランド', nick: 'レイクショアーズ', kanji: 'LS', color: '#A4161A', color2: '#0B132B', league: 0, div: 1, market: 2, pop: 55, star: 3, shift: 1, fac: 2,
      parent: 'カヤホガ・インダストリーズ', stadium: 'レイクショア・フィールド', cap: 35000, dome: false, hrF: 0.98, rent: 15000, cash: 230000, region: 2 },
    { city: 'デトロイト', nick: 'ギアヘッズ', kanji: 'G', color: '#F28C28', color2: '#13294B', league: 0, div: 1, market: 3, pop: 57, star: 3, shift: -1, fac: 3,
      parent: 'モーターシティ・グループ', stadium: 'ウッドワード・パーク', cap: 41000, dome: false, hrF: 0.95, rent: 25000, cash: 300000, region: 2 },
    { city: 'カンザスシティ', nick: 'ファウンテンズ', kanji: 'F', color: '#5FA8D3', color2: '#1B4965', league: 0, div: 1, market: 2, pop: 50, star: 4, shift: -2, fac: 2,
      parent: 'プレーリー・ファーム・グループ', stadium: 'ファウンテン・スタジアム', cap: 38000, dome: false, hrF: 1.02, rent: 12000, cash: 200000, region: 2 },
    { city: 'ミネアポリス', nick: 'ツインレイクス', kanji: 'TL', color: '#2D6A4F', color2: '#D8F3DC', league: 0, div: 1, market: 3, pop: 56, star: 3, shift: 0, fac: 3,
      parent: 'ノーススター・リテール', stadium: 'リバーフロント・パーク', cap: 39000, dome: false, hrF: 1.00, rent: 20000, cash: 300000, region: 2 },
    { city: 'ヒューストン', nick: 'オービターズ', kanji: 'O', color: '#F4A259', color2: '#2B2D42', league: 0, div: 2, market: 4, pop: 68, star: 2, shift: 3, fac: 3,
      parent: 'ガルフ・エナジー', stadium: 'ミッションコントロール・パーク', cap: 41000, dome: true, hrF: 1.04, rent: 35000, cash: 500000, region: 3 },
    { city: 'シアトル', nick: 'ノースパインズ', kanji: 'NP', color: '#1B4332', color2: '#95D5B2', league: 0, div: 2, market: 3, pop: 60, star: 3, shift: 0, fac: 3,
      parent: 'ピュージェット・テック', stadium: 'エメラルドベイ・パーク', cap: 47000, dome: true, hrF: 0.92, rent: 30000, cash: 380000, region: 4 },
    { city: 'アナハイム', nick: 'サーファーズ', kanji: 'S', color: '#C1121F', color2: '#FDF0D5', league: 0, div: 2, market: 4, pop: 62, star: 3, shift: -1, fac: 3,
      parent: 'パシフィック・リゾーツ', stadium: 'オレンジグローブ・スタジアム', cap: 45000, dome: false, hrF: 1.00, rent: 25000, cash: 420000, region: 4 },
    { city: 'ラスベガス', nick: 'ハイローラーズ', kanji: 'HR', color: '#7B2CBF', color2: '#FFD60A', league: 0, div: 2, market: 2, pop: 52, star: 4, shift: -2, fac: 4,
      parent: 'ネオン・エンターテインメント', stadium: 'デザートネオン・ボールパーク', cap: 33000, dome: true, hrF: 1.08, rent: 40000, cash: 350000, region: 4 },
    { city: 'ダラス', nick: 'デザートホークス', kanji: 'D', color: '#003F88', color2: '#FDC500', league: 0, div: 2, market: 4, pop: 63, star: 3, shift: 0, fac: 4,
      parent: 'ローンスター・ホールディングス', stadium: 'ローンスター・ドーム', cap: 40000, dome: true, hrF: 1.02, rent: 35000, cash: 450000, region: 3 },
    { city: 'ニューヨーク', nick: 'スカイライナーズ', kanji: 'SK', color: '#FF6B35', color2: '#004E89', league: 1, div: 0, market: 5, pop: 72, star: 2, shift: 2, fac: 3,
      parent: 'クイーンズボロ・グループ', stadium: 'フラッシングベイ・パーク', cap: 42000, dome: false, hrF: 0.96, rent: 40000, cash: 650000, region: 0 },
    { city: 'フィラデルフィア', nick: 'リバティベルズ', kanji: 'LB', color: '#9D0208', color2: '#F8EDEB', league: 1, div: 0, market: 4, pop: 72, star: 2, shift: 3, fac: 3,
      parent: 'デラウェアバレー・グループ', stadium: 'インディペンデンス・パーク', cap: 43000, dome: false, hrF: 1.05, rent: 25000, cash: 480000, region: 0 },
    { city: 'アトランタ', nick: 'ピーチフライヤーズ', kanji: 'P', color: '#F79D84', color2: '#1D3557', league: 1, div: 0, market: 4, pop: 70, star: 2, shift: 3, fac: 4,
      parent: 'ピーチツリー・メディア', stadium: 'ピーチツリー・ボールパーク', cap: 41000, dome: false, hrF: 1.02, rent: 20000, cash: 500000, region: 1 },
    { city: 'マイアミ', nick: 'コーラルウェーブス', kanji: 'CW', color: '#FF5D8F', color2: '#00A6A6', league: 1, div: 0, market: 3, pop: 45, star: 5, shift: -3, fac: 3,
      parent: 'ビスケーン・パートナーズ', stadium: 'ビスケーン・ドーム', cap: 36000, dome: true, hrF: 0.92, rent: 20000, cash: 200000, region: 1 },
    { city: 'ワシントン', nick: 'ポトマックス', kanji: 'PX', color: '#BC4749', color2: '#F2E8CF', league: 1, div: 0, market: 4, pop: 58, star: 3, shift: -2, fac: 3,
      parent: 'キャピトルヒル・グループ', stadium: 'ポトマック・リバーパーク', cap: 41000, dome: false, hrF: 1.01, rent: 25000, cash: 380000, region: 0 },
    { city: 'シカゴ', nick: 'ゲイルズ', kanji: 'GL', color: '#5BC0EB', color2: '#2E4057', league: 1, div: 1, market: 5, pop: 74, star: 2, shift: 1, fac: 3,
      parent: 'ウィンディシティ・ホールディングス', stadium: 'ノースサイド・フィールド', cap: 41000, dome: false, hrF: 1.03, rent: 25000, cash: 620000, region: 2 },
    { city: 'ミルウォーキー', nick: 'ホッパーズ', kanji: 'H', color: '#E9C46A', color2: '#264653', league: 1, div: 1, market: 1, pop: 52, star: 4, shift: 1, fac: 3,
      parent: 'ブリューシティ・ファミリー', stadium: 'ホップヤード・ドーム', cap: 41000, dome: true, hrF: 1.03, rent: 12000, cash: 180000, region: 2 },
    { city: 'セントルイス', nick: 'アーチャーズ', kanji: 'A', color: '#D00000', color2: '#FFBA08', league: 1, div: 1, market: 3, pop: 70, star: 2, shift: 1, fac: 3,
      parent: 'ゲートウェイ・グループ', stadium: 'ゲートウェイ・パーク', cap: 45000, dome: false, hrF: 0.97, rent: 15000, cash: 400000, region: 2 },
    { city: 'シンシナティ', nick: 'リバーボーツ', kanji: 'RB', color: '#8338EC', color2: '#FFBE0B', league: 1, div: 1, market: 2, pop: 52, star: 4, shift: -2, fac: 2,
      parent: 'オハイオリバー・カンパニー', stadium: 'リバーボート・パーク', cap: 42000, dome: false, hrF: 1.12, rent: 12000, cash: 200000, region: 2 },
    { city: 'ピッツバーグ', nick: 'フォージャーズ', kanji: 'FG', color: '#FFB703', color2: '#023047', league: 1, div: 1, market: 2, pop: 48, star: 5, shift: -3, fac: 2,
      parent: 'スリーリバーズ・スチール', stadium: 'アレゲニー・パーク', cap: 38000, dome: false, hrF: 0.97, rent: 12000, cash: 170000, region: 0 },
    { city: 'ロサンゼルス', nick: 'サンライダーズ', kanji: 'SR', color: '#FFB000', color2: '#2D00F7', league: 1, div: 2, market: 5, pop: 82, star: 1, shift: 5, fac: 4,
      parent: 'サンセット・エンタープライズ', stadium: 'サンセットヒルズ・スタジアム', cap: 56000, dome: false, hrF: 0.98, rent: 30000, cash: 950000, region: 4 },
    { city: 'サンフランシスコ', nick: 'フォグホーンズ', kanji: 'FH', color: '#4D908E', color2: '#F9C74F', league: 1, div: 2, market: 4, pop: 66, star: 3, shift: 0, fac: 4,
      parent: 'ゴールデンゲート・テック', stadium: 'フォグベイ・パーク', cap: 41000, dome: false, hrF: 0.88, rent: 15000, cash: 450000, region: 4 },
    { city: 'サンディエゴ', nick: 'シーライオンズ', kanji: 'SD', color: '#118AB2', color2: '#FFD166', league: 1, div: 2, market: 3, pop: 64, star: 3, shift: 1, fac: 3,
      parent: 'ラホヤ・インベストメンツ', stadium: 'ミッションベイ・パーク', cap: 42000, dome: false, hrF: 0.93, rent: 20000, cash: 380000, region: 4 },
    { city: 'フェニックス', nick: 'カクタスジャックス', kanji: 'CJ', color: '#2A9D8F', color2: '#E76F51', league: 1, div: 2, market: 3, pop: 54, star: 4, shift: -1, fac: 3,
      parent: 'ソノラ・デザート・グループ', stadium: 'カクタス・ドーム', cap: 48000, dome: true, hrF: 1.06, rent: 20000, cash: 300000, region: 4 },
    { city: 'デンバー', nick: 'サミッツ', kanji: 'SM', color: '#6A4C93', color2: '#B8C0FF', league: 1, div: 2, market: 3, pop: 56, star: 4, shift: -2, fac: 3,
      parent: 'ロッキーマウンテン・ホールディングス', stadium: 'サミット・フィールド', cap: 50000, dome: false, hrF: 1.28, rent: 15000, cash: 280000, region: 4 }
  ],
  COMPANIES: ['ノーススター銀行', 'ブルーリッジ保険', 'サミット・モーターズ', 'イーグルライン航空', 'パシフィック・ビバレッジ', 'リバティ・ワイヤレス',
    'ゴールドコースト証券', 'ハーバーライト電力', 'フロンティア・フーズ', 'アトラス物流', 'メリディアン製薬', 'コンパス・ソフトウェア', 'アイアンブリッジ建設',
    'クレストビュー不動産', 'スターライン・ホテルズ', 'ウィロー・アパレル', 'ブライトウェーブ通信', 'ハイランド・ピザ', 'レッドキャニオン醸造', 'シルバーオーク保険',
    'ノーブル時計', 'クリアスカイ航空', 'ヘリテージ・エナジー', 'グリーンフィールド・マーケット', 'オーシャンパーク銀行', 'ベンチマーク証券', 'ストームライト自動車',
    'ポラリス・ペイ', 'ミッドウェスト乳業', 'カスケード・アウトドア'],
  DOW: ['月', '火', '水', '木', '金', '土', '日'],
  DRAFT_CATS: [['高校', 130], ['大学', 170], ['短大', 30]],
  BONUS: [13300, 4300, 2500, 1830, 1400, 1100, 870, 730, 670, 600],
  ROOKIE_SAL: [150, 150, 150, 150, 150, 150, 150, 150, 150, 150],
  FRN_FROM: ['日本', '日本', '日本', '韓国', '台湾', 'キューバ', 'ドミニカ共和国', 'ベネズエラ', 'メキシコ', 'オーストラリア'],
  LIM: { first: 26, shihai: 40, frn1: 99, ikusei: 34 },
  TIX: {
    out: { n: '外野席', share: 0.32, ref: 800, el: 1.35 },
    inn: { n: '内野席', share: 0.60, ref: 1700, el: 1.15 },
    pre: { n: 'プレミアム席', share: 0.08, ref: 6500, el: 0.85 }
  },
  CAMP_SITES: {
    arizona: { n: 'アリゾナ（カクタスリーグ）', cost: 30000, grow: 1.10, pop: 1.2, inj: 0.9, d: '乾いた気候で仕上げやすく、施設も最新' },
    florida: { n: 'フロリダ（グレープフルーツリーグ）', cost: 26000, grow: 1.08, pop: 1.8, inj: 0.95, d: '東海岸から大勢のファンが見学に来る' },
    academy: { n: 'ドミニカのアカデミー併設', cost: 22000, grow: 1.12, pop: 0.4, inj: 0.95, frn: true, d: '若手の育成に強い。中南米出身の選手もなじみやすい' },
    home: { n: '本拠地近くの屋内施設', cost: 9000, grow: 0.98, pop: 0.6, inj: 1.0, d: '費用は抑えられるが、仕上がりは遅め' }
  },
  REC_SEED_LG: { hr: 71, h: 259, rbi: 188, sb: 128, avg: 0.401, hstr: 52, w: 33, so: 372, sv: 60, hld: 42, era: 1.18 },
  REC_SEED_CAR: { hr: 752, h: 4189, rbi: 2290, sb: 1388, w: 495, so: 5610, sv: 640, hld: 380 },
  REC_SEED_TM: { hr: [44, 62], h: [205, 245], rbi: [135, 175], sb: [55, 105], avg: [0.345, 0.390], hstr: [28, 40], w: [21, 28], so: [260, 340], sv: [44, 58], hld: [32, 41], era: [1.55, 2.10] },
  MILESTONES: { hr: [100, 200, 300, 400, 500, 600, 700], h: [1000, 1500, 2000, 2500, 3000, 3500, 4000], sb: [200, 300, 400, 500], w: [100, 150, 200, 250, 300], sv: [100, 200, 300, 400, 500], so: [1000, 1500, 2000, 2500, 3000, 3500], hld: [100, 200, 300] },
  MS_BIG: { hr: 500, h: 3000, sb: 500, w: 300, sv: 400, so: 3000, hld: 300 },
  MS_NEAR: { hr: 3, h: 10, sb: 3, w: 1, sv: 3, so: 15, hld: 3 },
  MIN_SAL: 2600, MIN_SAL_IK: 150,
  PERS_mlb: { n: '大舞台志向', d: '大都市の球団や、優勝を狙える球団を好む', grow: 1.05 },
  GOALS: {
    pennant: { n: 'リーグ優勝', d: '計画期間中に一度リーグ優勝（ワールドシリーズ進出）する' },
    gs: { n: 'ワールドシリーズ制覇', d: '計画期間中に一度ワールドシリーズを制覇する' },
    aclass: { n: '毎年ポストシーズン進出', d: '計画期間中、毎年ポストシーズンに進出する' }
  }
};

/* ---------- 切り替え ---------- */
function lgTables() {
  return { REGIONS, REGION_W, PLACES, LEAGUES, TEAM_DEFS, COMPANIES, DOW, DRAFT_CATS, BONUS, ROOKIE_SAL, FRN_FROM, LIM, TIX, CAMP_SITES,
    REC_SEED_LG, REC_SEED_CAR, REC_SEED_TM, MILESTONES, MS_BIG, MS_NEAR };
}
let LG_NPB_DATA = null;
function lgCopy(v) { return JSON.parse(JSON.stringify(v)); }
function lgAssign(target, src) {
  if (Array.isArray(target)) { target.length = 0; for (const x of lgCopy(src)) target.push(x); }
  else { for (const k of Object.keys(target)) delete target[k]; Object.assign(target, lgCopy(src)); }
}
function setLeague(mode) {
  mode = mode === 'mlb' ? 'mlb' : 'npb';
  const tb = lgTables();
  if (!LG_NPB_DATA) {
    LG_NPB_DATA = {};
    for (const k in tb) LG_NPB_DATA[k] = lgCopy(tb[k]);
    LG_NPB_DATA.MIN_SAL = MIN_SAL; LG_NPB_DATA.MIN_SAL_IK = MIN_SAL_IK; LG_NPB_DATA.PERS_mlb = lgCopy(PERS.mlb);
    LG_NPB_DATA.GOALS = {}; for (const k of ['pennant', 'gs', 'aclass']) LG_NPB_DATA.GOALS[k] = { n: GOALS[k].n, d: GOALS[k].d };
  }
  const src = mode === 'mlb' ? MLB_DATA : LG_NPB_DATA;
  if (LG.mode === mode && LG.ready) return;
  for (const k in tb) lgAssign(tb[k], src[k]);
  MIN_SAL = src.MIN_SAL; MIN_SAL_IK = src.MIN_SAL_IK;
  PERS.mlb = lgCopy(src.PERS_mlb);
  for (const k in src.GOALS) Object.assign(GOALS[k], src.GOALS[k]);
  LG = Object.assign({ ready: true }, mode === 'mlb' ? LG_MLB : LG_NPB);
  setSimEnv();
  if (G && G.teams) for (const T of G.teams) { T._roles = null; T._lu = null; }
}
function isMLB() { return !!LG.mlb; }

/* ---------- 順位の単位（日本版はリーグ、メジャー版は地区） ---------- */
function grpOf(T) { return LG.mlb ? T.league * 3 + (T.div || 0) : T.league; }
function grpCount() { return LG.mlb ? 6 : 2; }
function grpName(g) { return LG.mlb ? LEAGUES[Math.floor(g / 3)] + ' ' + LG.divs[g % 3] : LEAGUES[g]; }
function grpShort(g) { return LG.mlb ? LEAGUES[Math.floor(g / 3)].replace('・リーグ', '') + LG.divs[g % 3] : LEAGUES[g]; }
function teamGrpName(tid) { return grpName(grpOf(G.teams[tid])); }
function rankStr(r) { return r ? (LG.mlb ? '地区' + r + '位' : r + '位') : '―'; }
