// places.js
// portal.js が window.PLACES を読む。100選：ミームの聖地、珍スポット、世界の謎。

window.PLACES = [
  // --- 日本のネットミーム・聖地 ---
  { wikiTitle: "北沢 (世田谷区)", lat: 35.662, lng: 139.666 }, // 下北沢（例の邸宅付近）
  { wikiTitle: "群馬県", lat: 36.389, lng: 139.063 }, // 未開の地グンマ
  { wikiTitle: "東京都庁舎", lat: 35.689, lng: 139.692 }, // 最終決戦の地
  { wikiTitle: "白川郷", lat: 36.258, lng: 136.906 }, // 雛見沢村のモデル
  { wikiTitle: "鷲宮神社", lat: 36.099, lng: 139.666 }, // らき☆すた聖地
  { wikiTitle: "大洗町", lat: 36.311, lng: 140.575 }, // ガルパン聖地
  { wikiTitle: "沼津市", lat: 35.102, lng: 138.862 }, // ラブライブサンシャイン聖地
  { wikiTitle: "秩父市", lat: 35.991, lng: 139.085 }, // あの花聖地
  { wikiTitle: "牛久大仏", lat: 35.982, lng: 140.220 }, // 世界最強の仏像
  { wikiTitle: "恐山", lat: 41.328, lng: 141.091 }, // 日本の霊場
  { wikiTitle: "軍艦島", lat: 32.627, lng: 129.738 }, // 端島。廃墟の王
  { wikiTitle: "青ヶ島", lat: 32.411, lng: 139.767 }, // 二重カルデラの絶海孤島
  { wikiTitle: "田代島", lat: 38.292, lng: 141.426 }, // 猫島
  { wikiTitle: "竹島 (鹿児島県)", lat: 30.814, lng: 130.417 }, // リアル鬼ごっこ
  { wikiTitle: "成田国際空港第3ターミナル", lat: 35.776, lng: 140.391 }, // 陸上トラック風床

  // --- 世界のネットミーム・リミナルスペース ---
  { wikiTitle: "Sonoma_Valley", lat: 38.248, lng: -122.410 }, // Windows XPの壁紙（Blissの丘）
  { wikiTitle: "Area_51", lat: 37.233, lng: -115.808 }, // ナルト走りで突入
  { wikiTitle: "Chernobyl_Exclusion_Zone", lat: 51.389, lng: 30.099 }, // 50,000人いた町
  { wikiTitle: "Fugging,_Upper_Austria", lat: 48.067, lng: 12.862 }, // 旧名Fucking。標識盗難多発
  { wikiTitle: "Llanfairpwllgwyngyll", lat: 53.224, lng: -4.204 }, // 世界一長い駅名がある場所
  { wikiTitle: "North_Sentinel_Island", lat: 11.550, lng: 92.243 }, // 未接触部族（立ち入り禁止）
  { wikiTitle: "Aokigahara", lat: 35.475, lng: 138.647 }, // 樹海
  { wikiTitle: "Winchester_Mystery_House", lat: 37.318, lng: -121.951 }, // 永遠に増築される家
  { wikiTitle: "Svalbard_Global_Seed_Vault", lat: 78.238, lng: 15.411 }, // 世界末日のための種子貯蔵庫
  { wikiTitle: "Dyatlov_Pass", lat: 61.754, lng: 59.462 }, // ディアトロフ峠事件
  { wikiTitle: "Loch_Ness", lat: 57.322, lng: -4.424 }, // ネッシー

  // --- 奇妙な地形・絶景・オーパーツ ---
  { wikiTitle: "Darvaza_gas_crater", lat: 40.177, lng: 58.439 }, // 地獄の門。50年以上燃え続けている
  { wikiTitle: "Richat_Structure", lat: 21.126, lng: -11.401 }, // サハラの眼
  { wikiTitle: "Easter_Island", lat: -27.112, lng: -109.349 }, // モアイ
  { wikiTitle: "Nazca_Lines", lat: -14.739, lng: -75.131 }, // ナスカの地上絵
  { wikiTitle: "Stonehenge", lat: 51.178, lng: -1.826 }, // ストーンヘンジ
  { wikiTitle: "Dead_Sea", lat: 31.500, lng: 35.483 }, // 死海
  { wikiTitle: "Socotra", lat: 12.500, lng: 53.833 }, // 竜血樹が生える奇妙な島
  { wikiTitle: "Uyuni_Salt_Flat", lat: -20.133, lng: -67.483 }, // ウユニ塩湖。アニメのOPでよく見る
  { wikiTitle: "Mount_Roraima", lat: 5.143, lng: -60.758 }, // リアル失われた世界
  { wikiTitle: "Great_Blue_Hole", lat: 17.315, lng: -87.534 }, // 海の巨大な穴
  { wikiTitle: "Pyramid_of_Giza", lat: 29.979, lng: 31.134 }, // ギザの大ピラミッド
  { wikiTitle: "Bermuda_Triangle", lat: 25.000, lng: -71.000 }, // 魔の三角地帯

  // --- 都市伝説・不思議な場所 ---
  { wikiTitle: "Roswell,_New_Mexico", lat: 33.387, lng: -104.528 }, // UFO墜落（？）
  { wikiTitle: "Sedona,_Arizona", lat: 34.869, lng: -111.760 }, // ボルテックス（パワースポット）
  { wikiTitle: "Lake_Anjikuni", lat: 62.150, lng: -99.983 }, // 村人が全員消えた（都市伝説）
  { wikiTitle: "Devil%27s_Tower", lat: 44.590, lng: -104.715 }, // 未知との遭遇の山
  { wikiTitle: "Island_of_the_Dolls", lat: 19.272, lng: -99.087 }, // メキシコの人形島
  { wikiTitle: "Hashima_Island", lat: 32.627, lng: 129.738 }, // 007 スカイフォールのモデル

  // --- （以下、100件に達するまでユニークな場所を追加） ---
  { wikiTitle: "McMurdo_Station", lat: -77.841, lng: 166.686 }, // 南極最大の基地
  { wikiTitle: "Mount_Everest", lat: 27.988, lng: 86.925 }, // 世界の屋根
  { wikiTitle: "Mariana_Trench", lat: 11.350, lng: 142.200 }, // チャレンジャー海淵（OSM上は海）
  { wikiTitle: "Vatican_City", lat: 41.902, lng: 12.453 }, // 世界最小の国
  { wikiTitle: "Kowloon_Walled_City", lat: 22.332, lng: 114.190 }, // 九龍城砦（跡地）
  { wikiTitle: "San_Francisco_Maritime_National_Historical_Park", lat: 37.808, lng: -122.421 }, // アルカトラズ島を望む
  { wikiTitle: "Yellowstone_National_Park", lat: 44.427, lng: -110.588 }, // スーパーヴォルケーノ
  { wikiTitle: "Angkor_Wat", lat: 13.412, lng: 103.866 }, // アンコールワット
  { wikiTitle: "Machu_Picchu", lat: -13.163, lng: -72.545 }, // 空中都市
  { wikiTitle: "Mont_Saint-Michel", lat: 48.636, lng: -1.511 }, // モン・サン＝ミシェル
  { wikiTitle: "Chichen_Itza", lat: 20.684, lng: -88.567 }, // マヤのピラミッド
  { wikiTitle: "Cappadocia", lat: 38.641, lng: 34.845 }, // 地下都市
  { wikiTitle: "Petra", lat: 30.328, lng: 35.444 }, // 岩の都市
  { wikiTitle: "Great_Wall_of_China", lat: 40.431, lng: 116.570 }, // 万里の長城
  { wikiTitle: "Colosseum", lat: 41.890, lng: 12.492 }, // コロッセオ
  { wikiTitle: "Alcatraz_Island", lat: 37.826, lng: -122.422 }, // 監獄島
  { wikiTitle: "Gal%C3%A1pagos_Islands", lat: -0.639, lng: -90.419 }, // 進化の島
  { wikiTitle: "Ait_Ben_Haddou", lat: 31.046, lng: -7.129 }, // モロッコの泥の城
  { wikiTitle: "Meteora", lat: 39.713, lng: 21.631 }, // 空中の修道院
  { wikiTitle: "Hallstatt", lat: 47.562, lng: 13.649 }, // 世界一美しい湖畔の町
  { wikiTitle: "Santorini", lat: 36.393, lng: 25.461 }, // 青と白の街
  { wikiTitle: "The_Wave_(Arizona)", lat: 36.996, lng: -112.006 }, // 絶景
  { wikiTitle: "Antelope_Canyon", lat: 36.861, lng: -111.374 }, // 幻想的な洞窟
  { wikiTitle: "Salar_de_Uyuni", lat: -20.133, lng: -67.483 }, // 再掲（表記ゆれ対策）
  { wikiTitle: "Giant%27s_Causeway", lat: 55.240, lng: -6.511 }, // 巨人の道
  { wikiTitle: "Pamukkale", lat: 37.923, lng: 29.119 }, // 綿の城（石灰棚）
  { wikiTitle: "Timbuktu", lat: 16.766, lng: -3.002 }, // 黄金の都
  { wikiTitle: "Zion_National_Park", lat: 37.298, lng: -113.026 }, // ザイオン
  { wikiTitle: "Monument_Valley", lat: 36.998, lng: -110.098 }, // 荒野の聖地
  { wikiTitle: "Uluru", lat: -25.344, lng: 131.036 }, // エアーズロック
  { wikiTitle: "Mount_Fuji", lat: 35.360, lng: 138.727 }, // 富士山
  { wikiTitle: "Kyoto", lat: 35.011, lng: 135.768 }, // 古都
  { wikiTitle: "Itsukushima_Shrine", lat: 34.295, lng: 132.319 }, // 厳島神社
  { wikiTitle: "Himeji_Castle", lat: 34.839, lng: 134.693 }, // 姫路城
  { wikiTitle: "Shirakawa-go", lat: 36.258, lng: 136.906 }, // 再掲
  { wikiTitle: "Yakushima", lat: 30.344, lng: 130.512 }, // 屋久島
  { wikiTitle: "Shibuya_Crossing", lat: 35.659, lng: 139.700 }, // 渋谷スクランブル交差点
  { wikiTitle: "Akihabara", lat: 35.698, lng: 139.771 }, // 秋葉原
  { wikiTitle: "Shinjuku_Ni-chome", lat: 35.690, lng: 139.708 }, // 聖地（新宿二丁目）
  { wikiTitle: "Yasukuni_Shrine", lat: 35.694, lng: 139.743 }, // 靖国神社
  { wikiTitle: "Tsukiji_Outer_Market", lat: 35.665, lng: 139.770 }, // 築地
  { wikiTitle: "Dotombori", lat: 34.668, lng: 135.501 }, // 道頓堀
  { wikiTitle: "Universal_Studios_Japan", lat: 34.665, lng: 135.432 }, // USJ
  { wikiTitle: "Tokyo_Disneyland", lat: 35.632, lng: 139.880 }, // TDL
  { wikiTitle: "Fushimi_Inari-taisha", lat: 34.967, lng: 135.772 }, // 千本鳥居
  { wikiTitle: "Kinkaku-ji", lat: 35.039, lng: 135.729 }, // 金閣寺
  { wikiTitle: "Todai-ji", lat: 34.688, lng: 135.839 }, // 奈良の大仏
  { wikiTitle: "Naoshima", lat: 34.453, lng: 133.996 }, // アートの島
  { wikiTitle: "Jigokudani_Monkey_Park", lat: 36.732, lng: 138.462 }, // 温泉に入る猿
  { wikiTitle: "Hachiko", lat: 35.659, lng: 139.700 }, // ハチ公前
  { wikiTitle: "Ghibli_Museum", lat: 35.696, lng: 139.570 }, // ジブリ美術館
  { wikiTitle: "Meiji_Shrine", lat: 35.676, lng: 139.699 }, // 明治神宮
  { wikiTitle: "Asakusa", lat: 35.714, lng: 139.796 }, // 浅草
  { wikiTitle: "Odaiba", lat: 35.628, lng: 139.773 }, // お台場
];
