// places.js
// portal.js が window.PLACES を読む（wikiTitle / lat / lng）
// 注意：個人宅・特定個人の住所推定に繋がる場所は入れてない（安全のため）。
// ここは「公共スポット／観光地／ネットでネタにされがちな有名場所」100選（日本語Wikipedia想定）。

window.PLACES = [
  // ===== Japan (40) =====
  { wikiTitle: "渋谷スクランブル交差点", lat: 35.6595, lng: 139.7005 },
  { wikiTitle: "忠犬ハチ公", lat: 35.6591, lng: 139.7005 },
  { wikiTitle: "秋葉原", lat: 35.6984, lng: 139.7730 },
  { wikiTitle: "中野ブロードウェイ", lat: 35.7099, lng: 139.6645 },
  { wikiTitle: "東京ビッグサイト", lat: 35.6298, lng: 139.7976 },
  { wikiTitle: "お台場", lat: 35.6273, lng: 139.7766 },
  { wikiTitle: "レインボーブリッジ", lat: 35.6356, lng: 139.7636 },
  { wikiTitle: "東京ディズニーランド", lat: 35.6329, lng: 139.8804 },
  { wikiTitle: "三鷹の森ジブリ美術館", lat: 35.6962, lng: 139.5704 },
  { wikiTitle: "池袋", lat: 35.7295, lng: 139.7109 },
  { wikiTitle: "原宿", lat: 35.6702, lng: 139.7026 },
  { wikiTitle: "新大久保駅", lat: 35.7017, lng: 139.7007 },
  { wikiTitle: "浅草寺", lat: 35.7148, lng: 139.7967 },
  { wikiTitle: "東京スカイツリー", lat: 35.7101, lng: 139.8107 },
  { wikiTitle: "新宿駅", lat: 35.6900, lng: 139.7000 },
  { wikiTitle: "歌舞伎町", lat: 35.6940, lng: 139.7030 },
  { wikiTitle: "チームラボプラネッツ", lat: 35.6492, lng: 139.7883 },

  { wikiTitle: "横浜コスモワールド", lat: 35.4550, lng: 139.6360 },
  { wikiTitle: "横浜中華街", lat: 35.4437, lng: 139.6453 },
  { wikiTitle: "鎌倉", lat: 35.3192, lng: 139.5467 },
  { wikiTitle: "鎌倉大仏", lat: 35.3167, lng: 139.5353 },
  { wikiTitle: "江の島", lat: 35.2993, lng: 139.4808 },
  { wikiTitle: "富士山", lat: 35.3606, lng: 138.7274 },

  { wikiTitle: "伏見稲荷大社", lat: 34.9671, lng: 135.7727 },
  { wikiTitle: "清水寺", lat: 34.9949, lng: 135.7849 },
  { wikiTitle: "嵐山", lat: 35.0094, lng: 135.6668 },
  { wikiTitle: "京都国際マンガミュージアム", lat: 35.0116, lng: 135.7569 },

  { wikiTitle: "道頓堀", lat: 34.6687, lng: 135.5010 },
  { wikiTitle: "通天閣", lat: 34.6525, lng: 135.5063 },
  { wikiTitle: "ユニバーサル・スタジオ・ジャパン", lat: 34.6654, lng: 135.4323 },
  { wikiTitle: "大阪城", lat: 34.6873, lng: 135.5259 },

  { wikiTitle: "奈良公園", lat: 34.6851, lng: 135.8430 },
  { wikiTitle: "東大寺", lat: 34.6889, lng: 135.8398 },

  { wikiTitle: "広島平和記念公園", lat: 34.3955, lng: 132.4536 },
  { wikiTitle: "厳島神社", lat: 34.2950, lng: 132.3199 },

  { wikiTitle: "札幌市時計台", lat: 43.0621, lng: 141.3544 },
  { wikiTitle: "すすきの", lat: 43.0544, lng: 141.3520 },

  { wikiTitle: "鳥取砂丘", lat: 35.5417, lng: 134.2203 },
  { wikiTitle: "青ヶ島", lat: 32.4667, lng: 139.7667 },

  // ★ 追加（指定）
{ wikiTitle: "野獣邸", lat: 35.6644, lng: 139.6678 },

  // ===== World (60) =====
  { wikiTitle: "タイムズスクエア", lat: 40.7580, lng: -73.9855 },
  { wikiTitle: "自由の女神像", lat: 40.6892, lng: -74.0445 },
  { wikiTitle: "セントラル・パーク", lat: 40.7829, lng: -73.9654 },
  { wikiTitle: "ゴールデンゲートブリッジ", lat: 37.8199, lng: -122.4783 },
  { wikiTitle: "シリコンバレー", lat: 37.3875, lng: -122.0575 },
  { wikiTitle: "ハリウッドサイン", lat: 34.1341, lng: -118.3215 },
  { wikiTitle: "ディズニーランド", lat: 33.8121, lng: -117.9190 },
  { wikiTitle: "ラスベガス・ストリップ", lat: 36.1147, lng: -115.1728 },
  { wikiTitle: "エリア51", lat: 37.2350, lng: -115.8111 },
  { wikiTitle: "ラシュモア山", lat: 43.8791, lng: -103.4591 },
  { wikiTitle: "グランドキャニオン", lat: 36.0544, lng: -112.1401 },
  { wikiTitle: "イエローストーン国立公園", lat: 44.4280, lng: -110.5885 },
  { wikiTitle: "ナイアガラの滝", lat: 43.0828, lng: -79.0742 },
  { wikiTitle: "CNタワー", lat: 43.6426, lng: -79.3871 },

  { wikiTitle: "マチュ・ピチュ", lat: -13.1631, lng: -72.5450 },
  { wikiTitle: "コルコバードのキリスト像", lat: -22.9519, lng: -43.2105 },
  { wikiTitle: "ナスカの地上絵", lat: -14.7390, lng: -75.1300 },
  { wikiTitle: "イースター島", lat: -27.1127, lng: -109.3497 },

  { wikiTitle: "ストーンヘンジ", lat: 51.1789, lng: -1.8262 },
  { wikiTitle: "ジャイアンツ・コーズウェイ", lat: 55.2408, lng: -6.5116 },
  { wikiTitle: "ネス湖", lat: 57.3229, lng: -4.4244 },

  { wikiTitle: "エッフェル塔", lat: 48.8584, lng: 2.2945 },
  { wikiTitle: "ルーヴル美術館", lat: 48.8606, lng: 2.3376 },
  { wikiTitle: "ヴェルサイユ宮殿", lat: 48.8049, lng: 2.1204 },
  { wikiTitle: "モン・サン＝ミシェル", lat: 48.6361, lng: -1.5115 },

  { wikiTitle: "コロッセオ", lat: 41.8902, lng: 12.4922 },
  { wikiTitle: "トレビの泉", lat: 41.9009, lng: 12.4833 },
  { wikiTitle: "ピサの斜塔", lat: 43.7230, lng: 10.3966 },
  { wikiTitle: "ヴェネツィア", lat: 45.4408, lng: 12.3155 },
  { wikiTitle: "ポンペイ", lat: 40.7484, lng: 14.4840 },

  { wikiTitle: "サグラダ・ファミリア", lat: 41.4036, lng: 2.1744 },
  { wikiTitle: "グエル公園", lat: 41.4145, lng: 2.1527 },

  { wikiTitle: "ブランデンブルク門", lat: 52.5163, lng: 13.3777 },
  { wikiTitle: "ベルリンの壁", lat: 52.5075, lng: 13.4395 },

  { wikiTitle: "赤の広場", lat: 55.7539, lng: 37.6208 },
  { wikiTitle: "聖ワシリイ大聖堂", lat: 55.7525, lng: 37.6231 },

  { wikiTitle: "万里の長城", lat: 40.4319, lng: 116.5704 },
  { wikiTitle: "紫禁城", lat: 39.9163, lng: 116.3972 },
  { wikiTitle: "兵馬俑", lat: 34.3840, lng: 109.2730 },

  { wikiTitle: "ギザの大ピラミッド", lat: 29.9792, lng: 31.1342 },
  { wikiTitle: "ペトラ", lat: 30.3285, lng: 35.4444 },
  { wikiTitle: "ブルジュ・ハリファ", lat: 25.1972, lng: 55.2744 },

  { wikiTitle: "タージ・マハル", lat: 27.1751, lng: 78.0421 },
  { wikiTitle: "アンコール・ワット", lat: 13.4125, lng: 103.8670 },
  { wikiTitle: "ハロン湾", lat: 20.9101, lng: 107.1839 },

  { wikiTitle: "マリーナベイ・サンズ", lat: 1.2834, lng: 103.8607 },
  { wikiTitle: "マーライオン", lat: 1.2868, lng: 103.8545 },

  { wikiTitle: "台北101", lat: 25.0339, lng: 121.5645 },

  { wikiTitle: "Nソウルタワー", lat: 37.5512, lng: 126.9882 },
  { wikiTitle: "景福宮", lat: 37.5796, lng: 126.9770 },

  { wikiTitle: "シドニー・オペラハウス", lat: -33.8568, lng: 151.2153 },
  { wikiTitle: "ウルル", lat: -25.3444, lng: 131.0369 },
  { wikiTitle: "グレート・バリア・リーフ", lat: -18.2871, lng: 147.6992 },

  { wikiTitle: "エベレスト", lat: 27.9881, lng: 86.9250 },
  { wikiTitle: "キリマンジャロ", lat: -3.0674, lng: 37.3556 },
  { wikiTitle: "セレンゲティ国立公園", lat: -2.3333, lng: 34.8333 },

  { wikiTitle: "テーブルマウンテン", lat: -33.9628, lng: 18.4098 },
  { wikiTitle: "喜望峰", lat: -34.3568, lng: 18.4740 },

  { wikiTitle: "レイキャビク", lat: 64.1466, lng: -21.9426 },
  { wikiTitle: "バチカン市国", lat: 41.9029, lng: 12.4534 },
];
