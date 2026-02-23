【patch_FULL_20260223】
適用方法：
1) zipを展開
2) 展開した中身をリポジトリの同じ場所へ上書きアップロード（GitHubのUpload filesでOK）
3) 反映が遅い場合：Ctrl+F5 / キャッシュ削除

内容：
- img/noise_128.png / img/paper_texture.png / img/omikuji.png をデザインに適用（hero/card）
- おみくじページ：hero右上に omikuji アイコン
- Aero WMP：⏮/⏭で曲切替、▶で再生/停止。曲の同時再生（被り）を防止
- shell 側もMUSIC制御に対応
- app.js/style.css/shell.js/aero/index.html を更新
