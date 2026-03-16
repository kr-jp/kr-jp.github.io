# Colabの活用—応用編
## 探偵事務所のフル稼働
[__基礎編__](10a-colab-basics.md)で、私たちは「クラウド上の研究室」を立ち上げ、fugashiとUniDicを使った形態素解析の基礎を学びました。そして、AIの力を借りてコードを生成し、テキストデータ分析の味見をしました。

しかし、現状は研究室を立ち上げただけで、まだ本格的な捜査には取り組んでいません。この応用編では、研究室の設備をフル稼働させ、より高度な分析に挑戦します。外部のデータに直接アクセスしてデータを取得してみる。大規模なテキストを一括で処理してみる。結果をグラフで可視化する。これらの技術を身につければ、あなたは言葉の謎を解き明かす本格的な探偵になれるでしょう。

!!! info "この章で学ぶこと"
    - 外部API（国会会議録）を使ってデータを収集する方法を学ぶ
    - 青空文庫のテキストをColabで直接取得・分析する方法を身につける
    - 複数のテキストファイルを一括で形態素解析する
    - 分析結果をグラフで可視化する技術を習得する

## 国会会議録APIを使う
### 国会会議録検索システム
[__8. 資料収集__](08-data-collection.md)で、国会会議録検索システムについて触れました。このシステムには[__4. 形態素と形態素解析__](04-pos.md)で使ってみたAPIが用意されていて、システムから直接データを取得することができるようになっています。ウェブサイトを手作業で検索する代わりに、Colabからコードを実行することで、必要なデータを自動的に収集することができるということです。

```mermaid
graph LR
    A[Colab] -->|リクエスト| B[国会会議録API]
    B -->|XMLデータ| A
    A --> C[形態素解析]
    C --> D[分析・可視化]
    
    style A fill:#e1f5ff,stroke:#0288d1,stroke-width:2px
    style B fill:#fff9c4,stroke:#f9a825
    style C fill:#c8e6c9,stroke:#43a047
    style D fill:#ffccbc,stroke:#ef6c00
```

### 国会会議録検索システムの検索用API
国会会議録検索システムを、API経由で利用する方法として、ここでは3つの方法を試してみることにします。

| API | 説明 | 用途 |
|-----|------|------|
| `meeting_list` | 会議録の一覧を取得 | どんな会議があるか調べる |
| `meeting` | 会議単位でデータを取得 | 特定の会議の全発言を取得 |
| `speech` | 発言単位でデータを取得 | 特定のキーワードを含む発言を検索 |

!!! warning "利用条件・免責事項"
    本格的にAPIを使用する前に、[利用条件・免責事項](https://kokkai.ndl.go.jp/api.html#terms_of_condition)を確認しておきましょう。特に「短時間での大量アクセス等」には注意する必要があります。連続してリクエストを送る場合は、数秒の間隔を空けるといいでしょう（後ほど`time`ライブラリを使用します）。

!!! example "国会でのチャッピー"
    以下の作業は、まずColabに[fugashiをインストール](https://kr-jp.github.io/01-special-lecture-on-linguistics/10a-colab-basics/#_7)してから進めるようにしましょう。

    === "① 基本的なリクエスト"
        「ＧＰＴ」という言葉を含む発言を検索します。各行にコメントで説明を入れていますので、じっくり読んでみてください。
        
        ??? abstract "コード（Claude Opus 4.5）"

            ```python { .text .copy }
            # ============================================================
            # ライブラリの読み込み（import）
            # ライブラリとは、誰かが作ってくれた便利な機能の集まりです
            # ============================================================
            
            import requests  # ウェブサイトやサーバーにアクセスするためのライブラリ
            import xml.etree.ElementTree as ET  # XMLデータを解析するためのライブラリ
            
            # ============================================================
            # APIにリクエストを送る準備
            # ============================================================
            
            # APIのURL（このアドレスにアクセスするとデータがもらえる）
            base_url = "https://kokkai.ndl.go.jp/api/speech"
            
            # 検索条件を辞書形式で指定
            # 辞書形式とは「項目名: 値」のペアで情報を整理する方法です
            params = {
                "any": "ＧＰＴ",           # 検索キーワード（この言葉を含む発言を探す）
                "from": "2022-11-30",        # 検索開始日（この日以降の発言を対象）
                "until": "2025-12-31",       # 検索終了日（この日以前の発言を対象）
                "maximumRecords": 100,        # 取得する件数（最大100件まで指定可能）
                "recordPacking": "xml"       # データの形式（XML形式で受け取る）
            }
            
            # ============================================================
            # APIにリクエストを送信
            # ============================================================
            
            # requests.get() でサーバーにデータを要求し、結果をresponseに格納
            response = requests.get(base_url, params=params)
            
            # ============================================================
            # 結果を確認
            # ============================================================
            
            # status_code（ステータスコード）はリクエストが成功したかを示す数字
            # 200 = 成功、404 = ページが見つからない、500 = サーバーエラー
            print(f"ステータスコード: {response.status_code}")
            print(f"（200なら成功、それ以外はエラーの可能性あり）")
            print(f"\n取得したデータの長さ: {len(response.text):,} 文字")
            ```
        
    === "② 検索キーワードを含む部分を抽出"
        APIから返ってくるデータには、会議の冒頭部分（委員の異動など）も含まれています「ＧＰＴ」を実際に含む部分だけを抽出して表示します。
        
        ??? abstract "コード（Claude Opus 4.5）"

            ```python { .text .copy }
            import re  # 正規表現を使うためのライブラリ
            
            # ============================================================
            # XMLを解析して発言データを取り出す
            # ============================================================
            
            # XMLデータを解析可能な形式に変換
            root = ET.fromstring(response.content)
            
            # 検索結果の総件数を確認
            num_records = root.find('.//numberOfRecords')
            if num_records is not None:
                print(f"該当する発言の総数: {num_records.text} 件\n")
            
            # すべての発言レコードを取得
            speeches = root.findall('.//speechRecord')
            
            # ============================================================
            # 検索キーワードを含む部分を抽出して表示
            # ============================================================
            
            search_keyword = "ＧＰＴ"  # 検索に使ったキーワード
            
            print(f"【「{search_keyword}」を含む発言（上位{len(speeches)}件）】")
            print("=" * 60)
            
            for i, speech in enumerate(speeches, 1):
                # 発言者名を取得
                speaker = speech.find('speaker')
                speaker_name = speaker.text if speaker is not None else "不明"
                
                # 会議名を取得
                meeting = speech.find('nameOfMeeting')
                meeting_name = meeting.text if meeting is not None else "不明"
                
                # 日付を取得
                date = speech.find('date')
                date_text = date.text if date is not None else "不明"
                
                # 発言内容を取得
                content = speech.find('speech')
                
                if content is not None and content.text:
                    full_text = content.text
                    
                    # キーワードを含む文を抽出
                    # 「。」で文に分割し、キーワードを含む文だけを取り出す
                    sentences = re.split(r'[。\n]', full_text)
                    keyword_sentences = [s.strip() for s in sentences 
                                        if search_keyword in s and len(s.strip()) > 10]
                    
                    if keyword_sentences:
                        print(f"\n{i}. {speaker_name}")
                        print(f"   （{meeting_name}、{date_text}）")
                        print(f"   ─" * 25)
                        
                        # キーワードを含む文を最大3文まで表示
                        for j, sentence in enumerate(keyword_sentences[:3], 1):
                            # キーワード部分を【】で囲んで目立たせる
                            highlighted = sentence.replace(search_keyword, f"【{search_keyword}】")
                            # 長すぎる場合は省略
                            if len(highlighted) > 200:
                                highlighted = highlighted[:200] + "..."
                            print(f"   {j}) {highlighted}")
            
            print("\n" + "=" * 60)
            ```
        
    === "③ キーワード周辺の語を分析"
        「ＧＰＴ」という言葉がどのような文脈で使われているかを知るために、キーワードを含む文だけを対象に形態素解析を行い、一緒に使われている単語（共起語）を抽出します。
        
        ??? abstract "コード（Claude Opus 4.5）"

            ```python { .text .copy }
            from fugashi import Tagger
            from collections import Counter
            
            # ============================================================
            # 形態素解析の準備
            # ============================================================
            
            tagger = Tagger()  # 形態素解析器を初期化
            search_keyword = "ＧＰＴ"
            
            # キーワードを含む文だけを集める
            keyword_sentences_all = []
            
            for speech in speeches:
                content = speech.find('speech')
                if content is not None and content.text:
                    # 文に分割
                    sentences = re.split(r'[。\n]', content.text)
                    # キーワードを含む文だけを追加
                    for s in sentences:
                        if search_keyword in s and len(s.strip()) > 10:
                            keyword_sentences_all.append(s.strip())
            
            print(f"「{search_keyword}」を含む文の数: {len(keyword_sentences_all)}文\n")
            
            # ============================================================
            # キーワードを含む文から名詞を抽出
            # ============================================================
            
            nouns_near_keyword = []

            for sentence in keyword_sentences_all:
                for word in tagger(sentence):
                    # 普通名詞だけを抽出（ただし検索キーワード自体は除外）
                    if word.pos.startswith('名詞,普通名詞'):
                        lemma = word.feature.lemma
                        if lemma is not None and lemma not in ['ＧＰＴ']:
                            nouns_near_keyword.append(lemma)
            
            # 頻度をカウント
            noun_counts = Counter(nouns_near_keyword)
            
            # ============================================================
            # 結果を表示
            # ============================================================
            
            print(f"【「{search_keyword}」と一緒に使われている名詞（上位20語）】")
            print("─" * 40)
            
            for rank, (noun, count) in enumerate(noun_counts.most_common(20), 1):
                # 棒グラフ風に表示（10回につき1つの█）
                bar = "█" * min(count // 10, 20)
                print(f"{rank:2}. {noun:<10} {count:3}回 {bar}")
            ```

### 特定のトピックの時系列分析

国会での議論がどのように変化してきたかを分析することもできます。たとえば、「AI」という言葉が国会でいつ頃から頻繁に使われるようになったのか、社会的な出来事（ChatGPTの登場など）と関連があるのかを調べることができます。

!!! example "「AI」への言及"
    
    === "① 年ごとの発言数を集計"       
        言葉の使用頻度の変化を追うことで、社会の関心の移り変わりを観察することができます。たとえば「AI」の発言数が急増した年があれば、その年に何か重要な出来事（技術革新・法整備・社会問題など）があった可能性があります。このような分析方法は、言語と社会の関係を探る**社会言語学**的な研究とも接点があります。

        ??? abstract "コード（Claude Opus 4.5）"

            ```python { .text .copy }
            import requests
            import xml.etree.ElementTree as ET
            import time  # 待機処理に使用
            
            base_url = "https://kokkai.ndl.go.jp/api/speech"
            
            # ============================================================
            # 年ごとの発言数を格納する辞書
            # 辞書は {キー: 値} の形でデータを保存できる便利な形式
            # 例: {2020: 150, 2021: 230, 2022: 450, ...}
            # ============================================================
            yearly_counts = {}
            
            # ============================================================
            # 2016年から2025年まで、1年ずつ検索を繰り返す
            # range(2016, 2026) は 2016, 2017, ..., 2025 を順に生成
            # ============================================================
            for year in range(2016, 2026):
                # 検索条件を設定
                params = {
                    "any": "ＡＩ",                      # 検索キーワード
                    "from": f"{year}-01-01",          # その年の1月1日から
                    "until": f"{year}-12-31",         # その年の12月31日まで
                    "maximumRecords": 1,              # データは1件だけ取得（件数確認が目的）
                    "recordPacking": "xml"
                }
                
                # APIにリクエストを送信
                response = requests.get(base_url, params=params)
                root = ET.fromstring(response.content)
                
                # 総件数を取得（numberOfRecordsに検索結果の総数が入っている）
                num_records = root.find('.//numberOfRecords')
                count = int(num_records.text) if num_records is not None else 0
                
                # 辞書に保存: キーが年、値が発言数
                yearly_counts[year] = count
                
                print(f"{year}年: {count:,}件")  # :, で数字を3桁区切りに
                
                # ============================================================
                # APIへの負荷を避けるため、0.5秒待機してから次のリクエスト
                # サーバーに短時間で大量のリクエストを送ると、
                # アクセス制限がかかる可能性があるため、マナーとして待機する
                # ============================================================
                time.sleep(0.5)
            
            print(f"\n全期間の合計: {sum(yearly_counts.values()):,}件")
            ```
        
    === "② 結果を可視化" 
        数字の羅列を見ただけでは、傾向をつかむのが難しいです。グラフにすると、「どの年に急増したか」「増加傾向なのか減少傾向なのか」などが一目でわかります。ここでは、簡単な棒グラフを描画してみましょう。
        
        ??? abstract "コード（Claude Opus 4.5）"

            ```python { .text .copy }
            import matplotlib.pyplot as plt  # グラフ描画ライブラリ
            
            # ============================================================
            # 日本語フォントの設定
            # matplotlibは標準では日本語を表示できないため、
            # japanize-matplotlibをインストールして日本語対応にする
            # -q オプションは「静かに」= インストール中のメッセージを非表示
            # ============================================================
            !pip install japanize-matplotlib -q
            import japanize_matplotlib
            
            # ============================================================
            # グラフ用のデータを準備
            # 辞書から年のリストと発言数のリストを作成
            # ============================================================
            years = list(yearly_counts.keys())    # [2016, 2017, ..., 2025]
            counts = list(yearly_counts.values()) # [件数, 件数, ..., 件数]
            
            # ============================================================
            # グラフを作成
            # ============================================================
            plt.figure(figsize=(10, 6))  # 図のサイズ（横10インチ、縦6インチ）
            
            # 棒グラフを描画
            plt.bar(years, counts, color='steelblue')
            
            # 軸ラベルとタイトルを設定
            plt.xlabel('年')
            plt.ylabel('発言数')
            plt.title('国会における「AI」を含む発言数の推移')
            
            # x軸の目盛りを設定（45度回転して見やすく）
            plt.xticks(years, rotation=45)
            
            # y軸に薄いグリッド線を追加（alpha=0.3で透明度30%）
            plt.grid(axis='y', alpha=0.3)
            
            # レイアウトを自動調整（文字が切れないように）
            plt.tight_layout()
            
            # 画像ファイルとして保存（dpi=150で高解像度）
            plt.savefig('ai_kokkai_trend.png', dpi=150)
            
            # グラフを表示
            plt.show()
            
            # ============================================================
            # 簡単な考察を出力
            # ============================================================
            max_year = max(yearly_counts, key=yearly_counts.get)
            min_year = min(yearly_counts, key=yearly_counts.get)
            print(f"\n【簡易分析】")
            print(f"最も発言が多かった年: {max_year}年（{yearly_counts[max_year]:,}件）")
            print(f"最も発言が少なかった年: {min_year}年（{yearly_counts[min_year]:,}件）")
            ```
        
    === "③ 結果の読み取り方"
        グラフができたら、色々な点に注目して考察をしてみましょう。
        
        - 急増・急減した年があれば、その年に何があったのか。 
        - 全体的な傾向はどうなっているのか？右肩上がりか、横ばいか、それとも、右肩下がりなのか。
        - 他のキーワードと比較すると、どのような傾向があるのか。たとえば、「AI」と「人工知能」で傾向は同じか。

        !!! tip "視野を広げる"
            分析結果をもとに、以下のような研究に発展させることも考えられます。

            - 急増した年の発言内容を詳しく分析（どの会議録、誰の発言なのか）
            - 新聞記事におけるキーワードの出現頻度との比較
            - 法律の制定・改正との関連分析

## 青空文庫のテキストを直接取得する

### 特定の作家の全作品を取得
[__8. 資料収集__](08-data-collection.md)と[__9. コーパスの構築__](09-corpus-building.md)では、[青空文庫](https://www.aozora-renewal.cloud/)や[GitHub](https://github.com/aozorahack/aozorabunko_text)から作品を手動でダウンロードする方法を学びました。この方法でも、特定の作家の作品を集めたり、分析したりすることはできます。

実は、青空文庫のデータは、Colabから直接取得することもできます。ここでは、太宰治の全作品をColabから取得し、分析する方法を紹介します。

!!! example "太宰治の全作品を取得する"
    
    === "① GitHubからダウンロード"
        [総合インデックス](https://www.aozora-renewal.cloud/index_pages/index_top.html)の「作家別」から、「太宰治」が分類されている「[た](https://www.aozora-renewal.cloud/index_pages/person_ta.html)」に入ります。「太宰」で検索して「[作家別作品リスト](https://www.aozora-renewal.cloud/index_pages/person35.html)」に入ってみると、太宰治の番号は「35」になっていることがわかります。これを手がかりにするといいでしょう。

        ??? abstract "コード（Claude Opus 4.5）"

            ```python { .text .copy }
            # ============================================================
            # 方法: sparse-checkout で太宰治のフォルダだけをダウンロード
            # 全リポジトリをダウンロードせず、必要な部分だけ取得できる
            # ============================================================
            
            # リポジトリを初期化（ファイルはまだダウンロードしない）
            !git clone --filter=blob:none --sparse --depth 1 \
                https://github.com/aozorahack/aozorabunko_text.git
            
            # 太宰治（000035）のフォルダだけをダウンロード
            %cd aozorabunko_text
            !git sparse-checkout set cards/000035
            %cd ..
            
            # ダウンロードしたフォルダの中身を確認（最初の10件）
            !ls aozorabunko_text/cards/000035/files/ | head -10
            
            # 展開されたテキストファイルの数を確認
            import glob
            txt_files = glob.glob('./aozorabunko_text/cards/000035/files/**/*.txt', recursive=True)
            print(f"\n作品数: {len(txt_files)}個")
            
            # ダウンロードしたサイズを確認
            !du -sh aozorabunko_text/
            ```
            
            !!! tip "他の作家を作家番号"
                `000035`を以下の番号に変えると、別の作家の作品を取得することができます。
                
                - 000148：夏目漱石
                - 000879：芥川龍之介
                - 000081：宮沢賢治
                - 000129：森鷗外


                すでにダウンロードしている作家の作品フォルダを削除せずに、別の作家のフォルダを追加したい場合は、以下のように「set」を「add」にするといいでしょう。

                ```python { .text .copy title="コード" }
                # 最初の作家（太宰治）をダウンロード
                !git sparse-checkout set cards/000035

                # 2人目以降は add で追加（既存のフォルダは保持される）
                !git sparse-checkout add cards/000148
                ```

    === "② テキストの前処理"
        青空文庫のテキストには、本文以外にルビ（ふりがな）や注記が含まれています。これらをそのまま形態素解析すると、「《わがはい》」などが1つの単語として認識されてしまいます。正確な分析のために、本文だけを抽出する[前処理](https://kr-jp.github.io/01-special-lecture-on-linguistics/09-corpus-building/#_3)が必要です。

        ??? abstract "コード（Claude Opus 4.5）"
        
            ```python { .text .copy }
            import re
            
            def clean_aozora_text(text):
                """
                青空文庫のテキストからルビと注記を除去する関数
                """
                
                # ルビを除去: 《...》
                text = re.sub(r'《[^》]+》', '', text)
                
                # ルビ開始記号を除去
                text = re.sub(r'｜', '', text)
                
                # 注記を除去: ［＃...］
                text = re.sub(r'［＃[^］]+］', '', text)
                
                # 底本情報以降を削除
                if '底本：' in text:
                    text = text.split('底本：')[0]
                
                # ヘッダー部分を削除（修正版）
                # 連続するハイフン（10個以上）を区切り線として認識
                parts = re.split(r'-{10,}', text)
                if len(parts) >= 3:
                    # 3番目以降を本文として結合（複数の区切り線がある場合に対応）
                    text = ''.join(parts[2:])
                
                return text.strip()
            
            # ============================================================
            # 動作テスト
            # ============================================================
            test_file = txt_files[0]
            with open(test_file, 'r', encoding='shift_jis', errors='ignore') as f:
                text_raw = f.read()
            
            text_cleaned = clean_aozora_text(text_raw)
            print(f"処理前: {len(text_raw):,}文字 → 処理後: {len(text_cleaned):,}文字")
            print(f"\n【処理後の最初の200文字】\n{text_cleaned[:200]}")
            ```

    === "③ 全作品を読み込んで分析"
        太宰治の全作品を読み込んで形態素解析をし、名詞の頻度を数える作業をやってみましょう。
        
        ??? abstract "コード（Claude Opus 4.5）"

            ```python { .text .copy}
            import os
            from fugashi import Tagger
            from collections import Counter
            
            tagger = Tagger()  # 形態素解析器を初期化
            
            # ============================================================
            # 結果を格納するリスト
            # ============================================================
            all_stats = []   # 各作品の統計情報
            all_nouns = []   # 全作品から抽出した名詞
            
            # ============================================================
            # 全テキストファイルを処理
            # txt_files は①でダウンロードしたファイルのリスト
            # ============================================================
            print("分析中...")
            
            for i, txt_path in enumerate(txt_files):
                try:
                    # Shift-JISで読み込み（青空文庫の標準エンコーディング）
                    # errors='ignore': 読めない文字があっても無視して続行
                    with open(txt_path, 'r', encoding='shift_jis', errors='ignore') as f:
                        text = f.read()
                    
                    # 前処理を適用
                    text = clean_aozora_text(text)
                    
                    # 短すぎるファイルはスキップ（目次や奥付のみの場合など）
                    if len(text) < 50:
                        continue
                    
                    # ファイル名を取得（作品の識別用）
                    filename = os.path.basename(txt_path)
                    
                    # 形態素解析を実行
                    words = list(tagger(text))
                    
                    # 普通名詞の語彙素（原形）を抽出
                    # lemmaがNoneの場合は除外
                    nouns = [w.feature.lemma for w in words 
                            if w.pos.startswith('名詞,普通名詞') 
                            and w.feature.lemma is not None]
                    
                    # 統計情報を記録
                    all_stats.append({
                        'ファイル名': filename,
                        '文字数': len(text),
                        '形態素数': len(words),
                        '名詞数': len(nouns)
                    })
                    
                    # 名詞を全体リストに追加
                    all_nouns.extend(nouns)
                    
                    # 進捗を表示（50作品ごと）
                    if (i + 1) % 50 == 0:
                        print(f"  {i + 1}作品を処理しました...")
                    
                except Exception as e:
                    pass  # エラーが出たファイルはスキップ
            
            # ============================================================
            # 結果を表示
            # ============================================================
            print(f"\n分析完了！")
            print(f"分析した作品数: {len(all_stats)}")
            print(f"総名詞数: {len(all_nouns):,}")
            print(f"異なり語数: {len(set(all_nouns)):,}")
            
            # 頻度をカウント
            noun_counts = Counter(all_nouns)
            
            print("\n【太宰治作品で頻出する名詞（上位20語）】")
            print("─" * 40)
            for rank, (noun, count) in enumerate(noun_counts.most_common(20), 1):
                bar = "█" * min(count // 100, 30)  # 100回につき1つの█
                print(f"{rank:2}. {noun:<8} {count:5,}回 {bar}")
            ```

### 作家の文体を数値で捉える
夏目漱石の全作品を分析できるようになったので、彼の文体を定量的に分析してみましょう。品詞の使い方や文の長さなどの要素を、数値化できそうです。ここでは**文体**を、作家の書き方の癖として考えておきましょう。

!!! example "夏目漱石の文体分析"
    === "① 品詞分布の分析"
        名詞が多い文章は「情報伝達型」、動詞が多い文章は「行動描写型」、形容詞・副詞が多い文章は「感情表現型」といった傾向があります。作家ごとの品詞分布を比較することで、文体の違いを客観的に捉えることができます。
        
        ??? abstract "コード（Claude Opus 4.5）"

            ```python { .text .copy}
            # ============================================================
            # 必要なライブラリのインポート
            # ============================================================
            from collections import Counter
            # Counter: リストの要素を数えるための便利なツール
            # 例: ['名詞', '名詞', '動詞'] → Counter({'名詞': 2, '動詞': 1})
            
            
            # ============================================================
            # 全作品の品詞を集計
            # ============================================================
            # 空のリストを作成(ここに全ての品詞を入れていく)
            all_pos = []
            
            # 最初の50作品で分析(全作品だと時間がかかるため)
            print("品詞分布を分析中...")
            
            # txt_files[:50] は、txt_filesリストの最初から50番目までの要素を取得
            # for文で1作品ずつ処理していく
            for txt_path in txt_files[:50]:
                try:
                    # ファイルを開いて読み込む
                    # encoding='shift_jis': 青空文庫の文字コード
                    # errors='ignore': 読めない文字があってもスキップ
                    with open(txt_path, 'r', encoding='shift_jis', errors='ignore') as f:
                        text = clean_aozora_text(f.read())
                    
                    # 短すぎるテキスト(100文字未満)はスキップ
                    # これでルビや注釈だけのファイルを除外できる
                    if len(text) < 100:
                        continue
                    
                    # tagger(text)で形態素解析を実行
                    # 「吾輩は猫である」→ [「吾輩」「は」「猫」「で」「ある」] のように分割
                    for word in tagger(text):
                        # 品詞情報の大分類を取得
                        # word.pos の形式: 「名詞,普通名詞,一般,*,*,*」
                        # 例: 「猫」の品詞は「名詞,普通名詞,一般,*,*,*」
                        
                        # split(',') でカンマで分割 → ['名詞', '普通名詞', '一般', '*', '*', '*']
                        # [0] で最初の要素だけ取得 → '名詞'
                        pos_major = word.pos.split(',')[0]
                        
                        # 取得した品詞をリストに追加
                        # all_posには「名詞」「動詞」「助詞」...がどんどん追加されていく
                        all_pos.append(pos_major)
                
                except:
                    # エラーが出ても止まらずに次のファイルへ
                    pass
            
            
            # ============================================================
            # 品詞の頻度と割合を計算
            # ============================================================
            # Counterで品詞を集計
            # 例: all_pos = ['名詞', '名詞', '動詞', '助詞', '名詞']
            #     → pos_counts = Counter({'名詞': 3, '動詞': 1, '助詞': 1})
            pos_counts = Counter(all_pos)
            
            # 全品詞の合計数を計算
            # sum(pos_counts.values()) = 3 + 1 + 1 = 5
            total = sum(pos_counts.values())
            
            
            # ============================================================
            # 結果を表示
            # ============================================================
            print("\n【夏目漱石作品の品詞分布】")
            print("─" * 45)  # 区切り線(全角ダッシュ45個)
            print(f"{'品詞':<12} {'出現回数':>10} {'割合':>8}")
            print("─" * 45)
            
            # most_common(10): 出現回数が多い順に10個取得
            # 例: [('名詞', 15000), ('助詞', 12000), ('動詞', 8000), ...]
            for pos, count in pos_counts.most_common(10):
                # 割合を計算(パーセンテージ)
                # 例: 15000 / 50000 * 100 = 30.0%
                percentage = count / total * 100
                
                # 視覚化用のバーを作成
                # 2%につき1つの█を表示
                # 例: 30% → 15個の█
                bar = "█" * int(percentage / 2)
                
                # 結果を1行ずつ表示
                # f-string内の記号の意味:
                #   {pos:<12}  : posを左寄せで12文字分の幅で表示
                #   {count:>10,}: countを右寄せで10文字分、カンマ区切りで表示
                #   {percentage:>7.1f}%: percentageを右寄せ、小数点1桁で表示
                print(f"{pos:<12} {count:>10,} {percentage:>7.1f}% {bar}")
            
            print("─" * 45)
            print(f"{'合計':<12} {total:>10,}")
            ```
        
    === "② 文長の分析"      
        短い文を多用する作家はテンポの良い文体、長い文を好む作家は重厚な文体（捉え方によっては悪文）と言えるかもしれません。
        ??? abstract "コード（Claude Opus 4.5）"

            ```python { .text .copy}
            import numpy as np  # 数値計算ライブラリ
            
            # ============================================================
            # 全作品の文長（形態素数）を収集
            # ============================================================
            sentence_lengths = []
            
            print("文長を分析中...")
            
            for txt_path in txt_files[:50]:
                try:
                    with open(txt_path, 'r', encoding='shift_jis', errors='ignore') as f:
                        text = clean_aozora_text(f.read())
                    
                    # 文末記号で文に分割
                    # 。！？のいずれかで区切る
                    sentences = re.split(r'[。！？]', text)
                    
                    for sentence in sentences:
                        sentence = sentence.strip()
                        if len(sentence) > 0:
                            # 形態素解析して単語数をカウント
                            words = list(tagger(sentence))
                            sentence_lengths.append(len(words))
                            
                except:
                    pass
            
            # ============================================================
            # 統計値を計算
            # ============================================================
            print("\n【夏目漱石作品の文長統計】")
            print("─" * 40)
            print(f"  分析した文の数: {len(sentence_lengths):,}文")
            print(f"  平均文長:       {np.mean(sentence_lengths):.1f} 形態素")
            print(f"  中央値:         {np.median(sentence_lengths):.1f} 形態素")
            print(f"  最短文:         {np.min(sentence_lengths)} 形態素")
            print(f"  最長文:         {np.max(sentence_lengths)} 形態素")
            print(f"  標準偏差:       {np.std(sentence_lengths):.1f}")
            print("─" * 40)
            
            # 文長の分布を簡易表示
            print("\n【文長の分布（簡易ヒストグラム）】")
            bins = [0, 10, 20, 30, 50, 100, float('inf')]
            labels = ['1-10', '11-20', '21-30', '31-50', '51-100', '101以上']
            
            for i in range(len(bins) - 1):
                count = sum(1 for x in sentence_lengths if bins[i] < x <= bins[i+1])
                percentage = count / len(sentence_lengths) * 100
                bar = "█" * int(percentage / 2)
                print(f"  {labels[i]:>8}形態素: {percentage:5.1f}% {bar}")
            ```
        
    === "③ 可視化の味見"       
        数値だけでは伝わりにくい「分布の形」がグラフで一目瞭然になります。夏目漱石の文長分布が正規分布に近いのか、それとも偏った形なのかを視覚的に確認できます。

        ??? abstract "コード（Claude Opus 4.5）"
        
            ```python { .text .copy}
            import matplotlib.pyplot as plt
            
            # 日本語フォントを有効化
            !pip install japanize-matplotlib -q
            import japanize_matplotlib
            
            # ============================================================
            # ヒストグラムを作成
            # ============================================================
            plt.figure(figsize=(10, 6))  # 図のサイズ
            
            # ヒストグラムを描画
            # bins=50: 50個の区間に分割
            # range=(0, 100): 0〜100の範囲を表示
            # alpha=0.7: 70%の不透明度（少し透ける）
            plt.hist(sentence_lengths, bins=50, range=(0, 100), 
                    color='steelblue', edgecolor='white', alpha=0.7)
            
            # 軸ラベルとタイトル
            plt.xlabel('文長（形態素数）')
            plt.ylabel('頻度（文の数）')
            plt.title('夏目漱石作品における文長の分布')
            
            # 平均値の位置に赤い縦線を追加
            mean_val = np.mean(sentence_lengths)
            plt.axvline(mean_val, color='red', linestyle='--', linewidth=2,
                        label=f'平均: {mean_val:.1f}形態素')
            
            # 中央値の位置に緑の縦線を追加
            median_val = np.median(sentence_lengths)
            plt.axvline(median_val, color='green', linestyle=':', linewidth=2,
                        label=f'中央値: {median_val:.1f}形態素')
            
            # 凡例を表示
            plt.legend()
            
            # グリッド線を追加
            plt.grid(alpha=0.3)
            
            # レイアウト調整
            plt.tight_layout()
            
            # 画像として保存
            plt.savefig('natsume_sentence_length.png', dpi=150)
            
            # 表示
            plt.show()
            
            print("グラフを 'natsume_sentence_length.png' として保存しました")
            ```
        
!!! tip "比較対象が必要"
    夏目漱石の数値だけを見ていても、他の作家の作品を分析した結果と比べてみないと、それが本当に多いのか、それとも少ない、判断するのが難しいです。たとえば、太宰治や芥川龍之介など、他の作家と同じ方法で分析を行い、比較することで初めて、夏目漱石の特徴が浮かび上がるようになるでしょう。

## データの可視化
### なぜ可視化が重要か

「チャ・ウヌは韓国の男性アイドルで、顔立ちは全体にすごく整ってる。輪郭はすっきりしていて、眉と目の形がきれいに揃って見えるタイプ。鼻筋が通っていて、髪型も黒髪系で清潔感のあるスタイルが多い。雰囲気としては、派手というより上品で落ち着いた印象だよ。」と、文字で長々と説明するより、写真で見た方が理解しやすいです。

数字の羅列だけを眺めていても、パターンを見つけるのは難しいでしょう。データをグラフにして「見える化」することで、直感的に傾向を把握できます。探偵で言えば、捜査報告書を「文字だらけ」にするより、「写真や図表」を入れた方が、依頼人（そして自分自身）も理解しやすいでしょう。

### 棒グラフで頻度を表示

最も基本的な可視化は、棒グラフによる頻度の表示です。

!!! example "単語頻度の棒グラフ"
    
    ```python { .text .copy title="頻度の棒グラフ" }
    import matplotlib.pyplot as plt
    import japanize_matplotlib
    from collections import Counter
    
    # 先ほど集計した名詞の頻度データを使用
    top_20 = noun_counts.most_common(20)
    words = [item[0] for item in top_20]
    counts = [item[1] for item in top_20]
    
    # 棒グラフを作成
    plt.figure(figsize=(12, 8))
    plt.barh(words[::-1], counts[::-1], color='steelblue')
    plt.xlabel('出現回数')
    plt.title('夏目漱石作品における頻出名詞（上位20語）')
    plt.tight_layout()
    plt.savefig('natsume_noun_freq.png', dpi=150)
    plt.show()
    ```

### 折れ線グラフで変化を追う
折れ線グラフは「時間経過による変化」を追うのに最適です。

!!! example "複数キーワードの推移比較"
    国会会議録で「AI」と「人工知能」という2つの表現がどのように使い分けられてきたかを、折れ線グラフで比較してみましょう。

    === "① データ準備"
        まずは必要なデータを準備します。

        ??? abstract "コード"

            ```python { .text .copy }
            import requests
            import xml.etree.ElementTree as ET
            import time
            
            base_url = "https://kokkai.ndl.go.jp/api/speech"
            
            # ============================================================
            # 2つのキーワードの年次データを収集
            # ============================================================
            keywords = {
                'AI': 'ＡＩ',
                '人工知能': '人工知能'
            }
            
            # 結果を格納する辞書
            # 構造: {'AI': {2016: 100, 2017: 150, ...}, '人工知能': {...}}
            keyword_trends = {key: {} for key in keywords.keys()}
            
            # 各キーワードについて年次データを取得
            for label, search_term in keywords.items():
                print(f"\n「{label}」を検索中...")
                
                for year in range(2016, 2026):
                    params = {
                        "any": search_term,
                        "from": f"{year}-01-01",
                        "until": f"{year}-12-31",
                        "maximumRecords": 1,
                        "recordPacking": "xml"
                    }
                    
                    response = requests.get(base_url, params=params)
                    root = ET.fromstring(response.content)
                    
                    num_records = root.find('.//numberOfRecords')
                    count = int(num_records.text) if num_records is not None else 0
                    
                    keyword_trends[label][year] = count
                    print(f"  {year}年: {count:,}件")
                    
                    time.sleep(0.5)  # API負荷軽減
            ```
    
    === "② 折れ線グラフで可視化"
        簡単な折れ線グラフを描いてみましょう。

        ??? abstract "コード"

            ```python { .text .copy }
            import matplotlib.pyplot as plt
            !pip install japanize-matplotlib -q
            import japanize_matplotlib
            
            # ============================================================
            # グラフの準備
            # ============================================================
            plt.figure(figsize=(12, 6))
            
            # 各キーワードの折れ線を描画
            for label, data in keyword_trends.items():
                years = list(data.keys())
                counts = list(data.values())
                
                # 折れ線グラフを描画
                # marker='o': 各データポイントに丸印
                # linewidth=2: 線の太さ
                # markersize=6: 丸印のサイズ
                plt.plot(years, counts, marker='o', linewidth=2, 
                        markersize=6, label=label)
            
            # ============================================================
            # グラフの装飾
            # ============================================================
            plt.xlabel('年', fontsize=12)
            plt.ylabel('発言数', fontsize=12)
            plt.title('国会における「AI」と「人工知能」の使用頻度推移', fontsize=14)
            plt.legend(fontsize=11)
            plt.grid(True, alpha=0.3)  # グリッド線を表示
            
            # x軸の目盛りを全ての年で表示
            plt.xticks(years, rotation=45)
            
            plt.tight_layout()
            plt.savefig('keyword_trends_comparison.png', dpi=150)
            plt.show()
            ```

### ワードクラウドで直感的に

**ワードクラウド**は、単語の頻度を文字の大きさで表現する可視化手法です。

!!! example "ワードクラウドを作成する"
    日本語のワードクラウドを描いてみましょう。

    ??? abstract "コード"

        ```python { .text .copy }
        !pip install wordcloud -q
        
        from wordcloud import WordCloud
        import matplotlib.pyplot as plt
        
        # 日本語フォントのインストール
        !apt-get install fonts-ipafont-gothic -q
        font_path = '/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf'
        
        # ワードクラウドを生成
        wc = WordCloud(
            font_path=font_path,
            width=1200,
            height=600,
            background_color='white',
            max_words=100,
            colormap='viridis'
        ).generate_from_frequencies(noun_counts)
        
        # 表示
        plt.figure(figsize=(15, 8))
        plt.imshow(wc, interpolation='bilinear')
        plt.axis('off')
        plt.title('夏目漱石作品のワードクラウド')
        plt.savefig('natsume_wordcloud.png', dpi=150)
        plt.show()
        ```

!!! warning "ワードクラウドの注意点"
    ワードクラウドは見た目がキャッチーですが、学術的な分析には向いていません。
    
    - 文字の大きさの差が正確に頻度の差を反映しているとは限らない
    - 配置がランダムなので、位置関係に意味はない
    - 長い単語が目立ちやすいというバイアスがある
    
    プレゼンテーションや概要把握には便利ですが、論文などでは棒グラフの方が適切です。

## 比較してみる
ここからは、ここまで学んできた知識を総動員する必要があります。今回は、研究課題として「作家の文体比較」に取り組んでみましょう。大まかな流れは、次のようになっています。

```mermaid
graph TD
    A[研究課題設定] --> B[データ収集]
    B --> C[前処理]
    C --> D[形態素解析]
    D --> E[統計分析]
    E --> F[可視化]
    F --> G[考察・結論]
    
    B --> B1[GitHubからダウンロード]
    C --> C1[ルビ・注記の除去]
    D --> D1[fugashiで解析]
    E --> E1[品詞分布<br/>平均文長<br/>語彙多様性]
    F --> F1[グラフ作成]
    
    style A fill:#e1f5ff,stroke:#0288d1,stroke-width:2px
    style G fill:#c8e6c9,stroke:#43a047,stroke-width:2px
```

分析の方法として、「品詞分布」「平均文長」「語彙多様性」が書いてあります。今回は、「語彙多様性」に焦点を当ててみましょう。「語彙が豊か」とはどういうことでしょうか。直感的には「同じ言葉を繰り返さず、バリエーション豊かな表現を使っている」というイメージがあると思います。では、それをどうやって測定すればいいでしょうか。

### TTR
最もシンプルな語彙多様性の指標が、**TTR**（Type-Token Ratio）です。**タイプ**（Type）とは「異なり語数」、つまり何種類の語を使っているのかを指します。そして**トークン**（Token）とは「延べ語数」のことで、同じ語が出てくる度に数えた総数です。TTRは、以下の式で求めることができます（VはVocabulary、NはNumber）。

$$
\text{TTR} = \frac{V \text{（異なり語数）}}{N \text{（延べ語数）}}
$$

たとえば、「犬 犬 犬 猫」という（語ですがとりあえず）文の集まりがあると考えてみましょう。この場合、異なり語数（V）は「犬」と「猫」の2種類なので2、延べ語数（N）は4なので、TTRは次のようになります。

$$
\text{TTR} = \frac{2}{4} = 0.5
$$

「犬 猫 鳥 魚」なら $\text{TTR} = 4/4 = 1.0$（すべて異なる語）、「犬 犬 犬 犬」なら $\text{TTR} = 1/4 = 0.25$（同じ語の繰り返し）となります。つまり、TTRの値が高いほど、多様な語を使っているということになります。

!!! note "TTRの歴史"
    TTRはアメリカの心理学者・言語療法士 Johnson（1944）[@johnson1944]が提唱した指標です。興味深いことに、Johnsonはこの論文の中で、自らTTRの欠点にも言及し、その補正方法（後述のMSTTR）も同時に提案しています。

### TTRの落とし穴
TTRはシンプルで理解しやすい指標ですが、重大な弱点があります。それは、テキストが長くなるほど、TTRは低くなりやすいという点です。

なぜでしょうか。短い文章なら、出てくる語はほぼ新しい語である可能性が高いでしょう。しかし文章が長くなると、一度使った語がまた出てくる可能性が高くなります。「を」「は」「の」のような機能語はもちろん、「思う」「する」「なる」のような高頻度の語も繰り返して出現する確率が高いでしょう。その結果、TTRも自然と下がっていくようになります。

$$
N \uparrow \;\Rightarrow\; \frac{V}{N} \downarrow \quad \text{（Nが増えるにつれてTTRは下がる傾向）}
$$

!!! warning "コーパスサイズが違うとき、TTRはそのまま使えない"
    短編作品と長編作品のTTRを単純比較すると、テキストが長いからTTRが下がっただけなのに「この作品は語彙が貧しい」と誤って結論づけてしまうリスクがあります。

    テキスト長がほぼ揃っているコーパス同士の比較ならTTRは有効ですが、サイズが大きく異なる場合は補正指標を使う必要があります。

```mermaid
graph TD
    A["短編作品（例：羅生門）"] --> C["TTR = 高い"]
    B["長編作品（例：こゝろ）"] --> D["TTR = 低い"]
    C --> E["単純比較"]
    D --> E
    E --> F["「長編は語彙が貧しい」？"]
    F --> G["❌ テキスト長の差を\n反映しているだけかもしれない"]
```
この「テキストが長くなるとTTRが下がる」という問題は、実は昔から多くの研究者が気づいていました。そして、TTR以外の指標（Root TTR、Log TTRなど）なら、テキストの長さに左右されない「定数」として使えるのではないか、という期待もありました。

しかし、Tweedie & Baayen（1998）[@tweedie1998]は、それらの指標も含めて大規模な検証を行い、ほぼすべての指標がテキスト長の影響を受けることを示しました。つまり、「定数だと思われていたものが、実は定数ではなかった」ということです。彼らの研究は、語彙多様性をどう測るかという問題を問い直すきっかけとなった論文となっています。

### MSTTR—同じ長さで切って揃える

**MSTTR**（Mean Segmental TTR）は、テキストを固定長のかたまり（セグメント）に分割し、各セグメントのTTRを計算して、その平均をとる方法です。TTRと同じくJohnson（1944）が提案しました。日本語の文献では「標準化TTR」と呼ばれることもあります。

$$
\text{MSTTR} = \frac{1}{k} \sum_{i=1}^{k} \text{TTR}_i
\quad \text{（}k\text{ = セグメント数）}
$$

!!! tip "MSTTRのイメージ"
    たとえば、100mの短距離選手と42.195kmのマラソン選手では、そもそも「走った距離」が違うので、かかった時間をそのまま比較しても意味がありませんよね。MSTTRの発想は、「全員を同じ100m区間ごとに区切って、各区間のタイムの平均を出す」というものです。テキストに置き換えると、長い作品も短い作品も「100語ずつ」に区切って、各区間のTTRの平均をとります。

たとえばテキストを100語ずつのセグメントに分割し、セグメント1のTTRが0.65、セグメント2が0.62、セグメント3が0.68だったとすると、

$$
\text{MSTTR} = \frac{0.65 + 0.62 + 0.68}{3} \approx 0.65
$$

となります。各セグメントを「同じ長さ」で揃えているため、テキストの総量に関わらず一定の基準で比較できます。

```mermaid
graph TD
    A["テキスト全体"] --> B["100語ずつに分割"]
    B --> C["セグメント1\nTTR = 0.65"]
    B --> D["セグメント2\nTTR = 0.62"]
    B --> E["セグメント3\nTTR = 0.68"]
    B --> F["..."]
    C --> G["平均 → MSTTR = 0.65"]
    D --> G
    E --> G
```

注意点は、セグメント長（100語 vs 200語など）の選び方によって値が変わるという点です。異なるテキストを比較する際は、同じセグメント長を使うようにしましょう。

また、最後のセグメントがセグメント長に満たない場合、そのセグメントは切り捨てられます。つまり、テキストの末尾が分析に含まれない可能性があるという点にも注意が必要です。

### MTLD—閾値を保てる連続長を測る
**MTLD**（Measure of Textual Lexical Diversity、テキスト語彙多様性指標）は、
「TTRが一定の閾値（0.720）を保てる、連続した語の平均的な長さ」を測ります。
McCarthy（2005）[@mccarthy2005]の博士論文で提案され、McCarthy & Jarvis（2010）[@mccarthy2010]で広く知られるようになりました。
 
$$
\text{MTLD} = \frac{\text{MTLD}_{\text{forward}} + \text{MTLD}_{\text{reverse}}}{2}
$$

ここで、各方向の値は次のように求めます：

$$
\text{MTLD}_{\text{forward（または reverse）}} = \frac{N}{\text{完全なセグメント数} + \text{残余の割合}}
$$
 
!!! tip "MTLDのイメージ"
    「同じ人に何度も会うまで、何人の新しい人に会えるか」をイメージしてみてください。語彙が豊かな文章は、同じ語がなかなか繰り返されないので、閾値（0.720）を割るまでの距離が長くなります。つまり、MTLDの値が大きいほど語彙が豊かです。逆に同じ語を多く繰り返すシンプルな文章は、すぐに閾値を割るので値が小さくなります。
 
!!! example "具体例で理解する「残余の割合」"
    100語のテキストを順方向に走査した結果、閾値（0.720）を割る完全なセグメントが2つできたとします。しかし、3つ目のセグメントの途中でテキストが終わってしまいました。この「途中で終わった区間」が**残余**です。残余区間のTTRが0.800だった場合、閾値までの進行度は次のように計算します：
 
    $$
    \text{残余の割合} = \frac{1 - 0.800}{1 - 0.720} = \frac{0.200}{0.280} \approx 0.714
    $$
 
    したがって：
 
    $$
    \text{MTLD} = \frac{100}{2 + 0.714} \approx 36.8
    $$
 
#### MTLDの計算アルゴリズム
 
下のフローチャートは、順方向走査の手順を示しています。
実際にはこの手順を**逆方向からも繰り返し**、2つの値を平均してMTLDとします。
 
``` mermaid
flowchart TD
    A["テキストの先頭から開始<br/>TTR = 1.0"] --> B["次の語を読む"]
    B --> C["TTRを再計算"]
    C --> D{"TTR < 0.720?"}
    D -- "No" --> B
    D -- "Yes" --> E["セグメント完了<br/>カウント +1、TTRリセット"]
    E --> F{"テキスト終了?"}
    F -- "No" --> B
    F -- "Yes" --> G["残余の割合を算出"]
    G --> H["MTLD = N ÷<br/>（セグメント数＋残余の割合）"]
```
 
#### MTLDの計算を体験してみよう
 
下のウィジェットでは、日本語テキストを1語ずつ読みながらTTRが変化し、
セグメントが完了していく様子をステップごとに確認できます。
「自動再生」を押すと自動で進みます。
 
<iframe src="../../assets/viz/mtld_interactive.html" width="100%" height="520" frameborder="0" style="border: none; display: block;"></iframe>
 
McCarthy & Jarvis（2010）の検証では、TTR系の指標の中でMTLDが最もテキスト長の影響を受けにくいと報告されています。
 
### 3つの指標を比べてみよう
 
| 指標 | 提唱者（年） | 発想 | テキスト長への<br/>ロバスト性 | 直感的な<br/>わかりやすさ |
|------|------------|------|:---:|:---:|
| **TTR** | Johnson (1944) | 異なり語数 ÷ 延べ語数 | ✗ 低い | ◎ |
| **MSTTR** | Johnson (1944) | 固定長セグメントのTTR平均 | △ 中程度 | ○ |
| **MTLD** | McCarthy (2005) | 閾値を保てる連続語列の長さ | ○ 高い | △ |

では、どれを使えばいいでしょうか。たとえば、以下のような基準を考えて見るといいでしょう。

- テキスト長がほぼ揃っている → TTRでもOK
- テキスト長が大きく異なる → MSTTRかMTLDを使う（またはサイズを揃えてからTTR）
- 論文やレポートで報告するなら → TTR・MSTTR・MTLDなど、異なる原理の指標を2つ以上報告し、計算条件を明示する（セグメント長・閾値など）

!!! tip "主張をより堅固なものにする"
    3つの指標はそれぞれ「語彙の豊かさ」を別々の角度から測っています。同じ文章に対してTTRとMTLDの「順位」が一致するとは限りません。では、複数の指標が「同じ結論を示した」とき、その結論は信頼できると言えるでしょうか？

    異なる原理で動く指標が同じ結論を出したなら、その結論はより信頼できます。これは研究法でいう**三角検証**（triangulation）の考え方です。
    
    逆に、指標間で結論が食い違う場合も重要な情報です。食い違いの原因を考えることで、テキストの特徴をより深く理解できます。

### 文豪たちの文体比較

事前準備として語彙多様性の指標を学んだところで、いよいよ本格的な文体比較に入りましょう。

!!! example "夏目漱石と芥川龍之介の文体比較"
    
    === "① データ準備"
        まずは、データを準備します。Colabに別の作家のデータを追加するために、`add`を利用します。

        ??? abstract "コード（Claude Sonnet 4.6 拡張）"

            ```python
            # ============================================================
            # 夏目漱石（000148）はすでにダウンロード済み
            # 同じリポジトリに芥川龍之介（000879）を追加
            # ============================================================
            
            # 既存のリポジトリに移動
            %cd aozorabunko_text
            
            # 芥川龍之介のフォルダを追加（add を使う！）
            !git sparse-checkout add cards/000879
            
            # 元のディレクトリに戻る
            %cd ..
            
            # ダウンロードしたフォルダの中身を確認（最初の10件）
            !ls aozorabunko_text/cards/000879/files/ | head -10
            
            # ============================================================
            # 芥川龍之介のテキストファイルを取得
            # ============================================================
            import glob
            akutagawa_files = glob.glob('./aozorabunko_text/cards/000879/files/**/*.txt', recursive=True)
            print(f"\n芥川龍之介の作品数: {len(akutagawa_files)}個")
            
            # 両作家のファイルが入っているか確認
            !du -sh aozorabunko_text/cards/*/
            ```
        
    === "② 分析関数を定義"
        前節で学んだように、TTRはテキスト長に依存するため、
        サイズが違う作品群の比較には不向きです。
        ここでは**TTRに加えてMTLDも計算**し、2つの指標を並べて比較します。

        ??? abstract "コード（Claude Sonnet 4.6 拡張）"

            ```python
            # ============================================================
            # 語彙多様性ライブラリのインポート
            # ============================================================
            from lexicalrichness import LexicalRichness

            def analyze_author(txt_files, max_files=50):
                """
                作家の文体を分析する関数
                
                Parameters:
                -----------
                txt_files : list
                    分析対象のテキストファイルのパス一覧
                max_files : int
                    分析する最大ファイル数（デフォルト50作品）
                
                Returns:
                --------
                dict : 文体の統計情報を含む辞書
                """
                # ============================================================
                # 【ステップ1】分析用のリストを初期化
                # ============================================================
                all_pos = []              # 全ての品詞を記録するリスト
                sentence_lengths = []     # 各文の長さ（単語数）を記録するリスト
                all_lemmas = []           # 全ての語彙（基本形）を記録するリスト
                
                # ============================================================
                # 【ステップ2】各テキストファイルを順番に処理
                # ============================================================
                for txt_path in txt_files[:max_files]:  # 指定した数だけのファイルを処理
                    try:
                        # --- ファイルを開いて読み込む ---
                        # shift_jis: 青空文庫のテキストエンコーディング
                        # errors='ignore': 読めない文字は無視して続行
                        with open(txt_path, 'r', encoding='shift_jis', errors='ignore') as f:
                            text = clean_aozora_text(f.read())  # 青空文庫の注記を除去
                        
                        # --- 短すぎるテキストはスキップ ---
                        if len(text) < 100:
                            continue
                        
                        # ============================================================
                        # 【ステップ3】文に分割して形態素解析
                        # ============================================================
                        # 正規表現で句点（。！？）で文を分割
                        sentences = re.split(r'[。！？]', text)
                        
                        for sentence in sentences:
                            if len(sentence.strip()) > 0:  # 空白だけの文は無視
                                # --- 形態素解析：文を単語に分解 ---
                                words = list(tagger(sentence))
                                
                                # --- 文長を記録（この文に含まれる単語数）---
                                sentence_lengths.append(len(words))
                                
                                # --- 各単語の情報を記録 ---
                                for word in words:
                                    # 品詞の大分類を取得（例：「名詞,固有名詞,人名,名」→「名詞」）
                                    pos_major = word.pos.split(',')[0]
                                    all_pos.append(pos_major)
                                    
                                    # 語彙の基本形を取得（例：「走った」→「走る」）
                                    all_lemmas.append(word.feature.lemma)
                                    
                    except:
                        # エラーが起きたファイルは無視して次へ
                        pass
                
                # ============================================================
                # 【ステップ4】品詞の出現回数を集計
                # ============================================================
                pos_counts = Counter(all_pos)           # 各品詞が何回出現したかカウント
                total_pos = sum(pos_counts.values())    # 品詞の総数
                
                # ============================================================
                # 【ステップ5】語彙多様性を計算（TTR・MTLD）
                # ============================================================
                # 形態素解析済みの語彙リストをスペース区切りの文字列に変換して
                # LexicalRichness に渡す
                lemma_text = " ".join(str(l) for l in all_lemmas if l)
                lex = LexicalRichness(lemma_text)
                
                # --- TTR の計算 ---
                # 計算式: 異なり語数（V）÷ 延べ語数（N）
                # ※ テキスト長が異なる作品間の比較には注意が必要（詳しくは前節を参照）
                ttr_value = round(lex.ttr, 3) if all_lemmas else 0
                
                # --- MTLD の計算 ---
                # 計算式: TTRが閾値(0.72)を維持できる連続語列の平均長
                # テキスト長への依存度が低く、サイズの異なるコーパス比較に適している
                # （McCarthy & Jarvis, 2010）
                try:
                    mtld_value = round(lex.mtld(threshold=0.72), 1)
                except Exception:
                    mtld_value = None  # テキストが極端に短い場合は計算不能
                
                # ============================================================
                # 【ステップ6】統計指標を計算して返す
                # ============================================================
                return {
                    # --- 語彙の規模 ---
                    '総形態素数': len(all_lemmas),                      # 全単語数（延べ語数）
                    '異なり語数': len(set(all_lemmas)),                # 異なる語彙の数
                    
                    # --- 語彙多様性 ---
                    'TTR': ttr_value,
                    # ↑ シンプルだが長いコーパスほど低くなる傾向に注意
                    
                    'MTLD': mtld_value,
                    # ↑ テキスト長の影響を抑えた補正指標（値が大きいほど語彙が多様）
                    
                    # --- 文の長さ ---
                    '平均文長': round(np.mean(sentence_lengths), 1) if sentence_lengths else 0,
                    # ↑ 1文あたりの平均単語数（文が長いか短いかの指標）
                    
                    # --- 品詞の使用傾向 ---
                    '名詞率': round(pos_counts.get('名詞', 0) / total_pos * 100, 1) if total_pos else 0,
                    '動詞率': round(pos_counts.get('動詞', 0) / total_pos * 100, 1) if total_pos else 0,
                    '形容詞率': round(pos_counts.get('形容詞', 0) / total_pos * 100, 1) if total_pos else 0,
                    # ↑ 各品詞が全体の何%を占めるか
                    #   作家ごとに品詞の使用比率が異なる → 文体の特徴
                }
            ```
        
    === "③ 比較分析を実行"
        定義した関数を実行してみましょう。TTRとMTLDの2つを並べて確認することで、
        どちらの指標がより信頼できる情報を与えてくれるか考えてみましょう。

        ??? abstract "コード（Claude Sonnet 4.6 拡張）"

            ```python
            # ============================================================
            # 2人の作家の文体を分析
            # ============================================================
            print("分析中...")
            
            # 夏目漱石の作品を分析（最大50作品）
            natsume_stats = analyze_author(txt_files, max_files=50)
            
            # 芥川龍之介の作品を分析（最大50作品）
            akutagawa_stats = analyze_author(akutagawa_files, max_files=50)
            
            # ============================================================
            # 結果を見やすく表示
            # ============================================================
            print("\n【文体比較】")
            print(f"{'指標':<15} {'夏目漱石':>12} {'芥川龍之介':>12}")
            print("-" * 40)
            
            # 各指標を1行ずつ表示
            for key in natsume_stats.keys():
                print(f"{key:<15} {natsume_stats[key]:>12} {akutagawa_stats[key]:>12}")
            
            # ============================================================
            # TTRとMTLDの比較メモを出力
            # ============================================================
            print("\n【語彙多様性の解釈メモ】")
            print("  TTRの差   :", round(natsume_stats['TTR'] - akutagawa_stats['TTR'], 3))
            print("  MTLDの差  :", round(natsume_stats['MTLD'] - akutagawa_stats['MTLD'], 1)
                  if natsume_stats['MTLD'] and akutagawa_stats['MTLD'] else "計算不能")
            print()
            print("  ※ TTRは総形態素数が多いほど低くなる傾向があります。")
            print("    2作家の総形態素数に大きな差がある場合は、")
            print("    MTLDの値をより重視して解釈することをお勧めします。")
            
            # ============================================================
            # 【解釈のヒント】
            # ============================================================
            # - MTLD が高い → 語彙が多様（同じ言葉を繰り返しにくい文体）
            # - TTRが高いのにMTLDが低い → テキストが短いため、TTRが過大評価されている可能性
            # - 平均文長が長い → 複雑な文構造を使う傾向
            # - 名詞率が高い → 描写的・客観的な文体
            # - 動詞率が高い → 動的・行動的な文体
            # - 形容詞率が高い → 修飾的・情緒的な文体
            # ============================================================
            ```
        
    === "④ 棒グラフで可視化"
        最後に、簡単な棒グラフを描いてみましょう。

        ??? abstract "コード（Claude Sonnet 4.6 拡張）"

            ```python
            import matplotlib.pyplot as plt
            import japanize_matplotlib  # 日本語表示のため
            import numpy as np
            
            # ============================================================
            # 【ステップ1】グラフに表示するデータを準備
            # ============================================================
            categories = ['名詞率', '動詞率', '形容詞率']  # 比較する品詞指標
            
            # 各作家の値を取得
            natsume_values = [
                natsume_stats['名詞率'], 
                natsume_stats['動詞率'], 
                natsume_stats['形容詞率']
            ]
            akutagawa_values = [
                akutagawa_stats['名詞率'], 
                akutagawa_stats['動詞率'], 
                akutagawa_stats['形容詞率']
            ]
            
            # ============================================================
            # 【ステップ2】棒グラフの位置を設定
            # ============================================================
            x = np.arange(len(categories))  # 0, 1, 2 の位置
            width = 0.35                     # 棒の幅
            
            # ============================================================
            # 【ステップ3】グラフを2枚並べて作成（品詞 + 語彙多様性）
            # ============================================================
            fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
            
            # --- 左側：品詞分布の棒グラフ ---
            bars1 = ax1.bar(x - width/2, natsume_values, width,
                            label='夏目漱石', color='steelblue')
            bars2 = ax1.bar(x + width/2, akutagawa_values, width,
                            label='芥川龍之介', color='coral')
            
            ax1.set_xlabel('品詞', fontsize=12)
            ax1.set_ylabel('割合（%）', fontsize=12)
            ax1.set_title('品詞分布の比較', fontsize=14)
            ax1.set_xticks(x)
            ax1.set_xticklabels(categories)
            ax1.legend()
            ax1.grid(axis='y', alpha=0.3)
            
            # --- 右側：語彙多様性（MTLD）の棒グラフ ---
            # TTRは長さ依存のため参考表示のみ、MTLDを主指標として前面に出す
            diversity_labels = ['TTR（参考）', 'MTLD（主指標）']
            n_vals = [natsume_stats['TTR'], natsume_stats['MTLD'] or 0]
            a_vals = [akutagawa_stats['TTR'], akutagawa_stats['MTLD'] or 0]
            
            x2 = np.arange(len(diversity_labels))
            ax2.bar(x2 - width/2, n_vals, width, label='夏目漱石', color='steelblue')
            ax2.bar(x2 + width/2, a_vals, width, label='芥川龍之介', color='coral')
            
            ax2.set_xlabel('指標', fontsize=12)
            ax2.set_ylabel('値', fontsize=12)
            ax2.set_title('語彙多様性の比較\n（TTRは参考値、MTLDを主に参照）', fontsize=13)
            ax2.set_xticks(x2)
            ax2.set_xticklabels(diversity_labels)
            ax2.legend()
            ax2.grid(axis='y', alpha=0.3)
            
            # ============================================================
            # 【ステップ4】グラフを保存・表示
            # ============================================================
            plt.tight_layout()
            plt.savefig('style_comparison.png', dpi=150)
            plt.show()
            
            print("\n✓ グラフを 'style_comparison.png' として保存しました")
            ```

    === "⑤ 考察"
        数値やグラフから読み取れることを文章でまとめましょう。

        以下の問いを参考に考察してみてください。

        - 品詞分布において、両作家の最も大きな違いはどこに現れましたか？
        - TTRとMTLDで、両作家の「順位」は同じでしたか、逆転しましたか？
        - 総形態素数に大きな差があった場合、どちらの指標をより重視すべきでしょうか？
        - 数値の差を「文学的な文体の特徴」として、あなたならどう言葉で説明しますか？

        !!! note "語彙多様性と文体の関係"
            MTLDが高い文体は「多彩な語彙を駆使して表現する」文体と言えます。
            しかし必ずしも「MTLDが高い = 優れた文学」ではありません。
            宮沢賢治のように独特のリズムと繰り返しで詩的効果を生む文体も存在します。
            数値はあくまで「特徴の記述」であり、価値判断ではないことを忘れないようにしましょう。

### 散布図で関係性を見る
散布図（散布プロット）は、2つの指標の関係性を見るための可視化手法です。各データポイント（作品や発言など）を平面上の点として配置することで、「この指標が高いとき、あの指標も高い」といった相関関係を視覚的に捉えることができます。

!!! example "文の長さと名詞との関係"
    「文が長い作品ほど、名詞が多く使われる傾向があるのか？」という仮説を、散布図で検証してみましょう。

    ??? abstract "コード"
        ```python { .text .copy}
        import matplotlib.pyplot as plt
        import japanize_matplotlib
        import numpy as np
        
        
        def collect_author_data(txt_files, max_files=50, min_length=3000, verbose=True):
            """
            指定したファイルリストから、各作品の平均文長と名詞率を収集
            
            Parameters:
            -----------
            txt_files : list
                分析対象のテキストファイルパス一覧
            max_files : int
                処理する最大ファイル数
            min_length : int
                有効なテキストの最小文字数（デフォルト3000文字）
            verbose : bool
                詳細ログを表示するか
            
            Returns:
            --------
            tuple : (平均文長のリスト, 名詞率のリスト, 処理した作品名のリスト)
            """
            avg_lengths = []
            noun_ratios = []
            valid_titles = []
            
            processed = 0  # 処理を試みたファイル数
            skipped_short = 0  # 短すぎてスキップしたファイル数
            skipped_error = 0  # エラーでスキップしたファイル数
            
            for txt_path in txt_files:
                # 目標数に達したら終了
                if len(avg_lengths) >= max_files:
                    break
                
                processed += 1
                
                try:
                    # --- ファイルを開いて読み込む ---
                    with open(txt_path, 'r', encoding='shift_jis', errors='ignore') as f:
                        text = clean_aozora_text(f.read())
                    
                    # 最低文字数チェック
                    if len(text) < min_length:
                        skipped_short += 1
                        if verbose and processed <= 10:
                            print(f"  スキップ（短い）: {os.path.basename(txt_path)} ({len(text)}文字)")
                        continue
                    
                    # ファイル名を取得
                    import os
                    filename = os.path.basename(txt_path).replace('.txt', '')
                    
                    # --- 形態素解析を実行 ---
                    words = list(tagger(text))
                    
                    # 単語数が少なすぎる場合もスキップ
                    if len(words) < 100:
                        skipped_short += 1
                        continue
                    
                    # --- 平均文長を計算 ---
                    sentences = re.split(r'[。！？]', text)
                    sentences = [s.strip() for s in sentences if len(s.strip()) > 0]
                    
                    if len(sentences) < 10:  # 文が少なすぎる場合もスキップ
                        skipped_short += 1
                        continue
                    
                    sentence_lengths = []
                    for sentence in sentences:
                        sent_words = list(tagger(sentence))
                        if len(sent_words) > 0:  # 空の文は除外
                            sentence_lengths.append(len(sent_words))
                    
                    if len(sentence_lengths) == 0:
                        skipped_short += 1
                        continue
                    
                    avg_length = sum(sentence_lengths) / len(sentence_lengths)
                    
                    # --- 名詞率を計算 ---
                    noun_count = sum(1 for w in words if w.pos.startswith('名詞'))
                    noun_ratio = (noun_count / len(words) * 100)
                    
                    # --- リストに追加 ---
                    avg_lengths.append(avg_length)
                    noun_ratios.append(noun_ratio)
                    valid_titles.append(filename[:30])  # 作品名（最大30文字）
                    
                    if verbose and len(avg_lengths) <= 5:
                        print(f"  収集: {filename[:40]} (文長:{avg_length:.1f}, 名詞率:{noun_ratio:.1f}%)")
                    
                except Exception as e:
                    skipped_error += 1
                    if verbose and processed <= 10:
                        print(f"  エラー: {os.path.basename(txt_path)} - {str(e)[:50]}")
            
            # サマリーを表示
            if verbose:
                print(f"\n  処理結果:")
                print(f"    有効作品: {len(avg_lengths)}")
                print(f"    短すぎてスキップ: {skipped_short}")
                print(f"    エラーでスキップ: {skipped_error}")
                print(f"    処理を試みたファイル総数: {processed}")
            
            return avg_lengths, noun_ratios, valid_titles
        
        # ============================================================
        # 【ステップ2】外れ値除去関数（複数の方法を提供）
        # ============================================================
        def remove_outliers_iqr(x_data, y_data, titles=None, factor=1.5, verbose=True):
            """
            IQR（四分位範囲）法で外れ値を除外する関数
            この方法は標準偏差法より厳格で、視覚的に目立つ外れ値を除去しやすい
            
            Parameters:
            -----------
            x_data, y_data : list
                元のデータ
            titles : list
                作品名リスト（除外された作品を確認するため）
            factor : float
                IQRの何倍を外れ値とするか（デフォルト1.5、厳しくするなら1.2など）
            verbose : bool
                除外された作品を表示するか
            
            Returns:
            --------
            tuple : 外れ値を除外した(x_data, y_data, titles)
            """
            x_arr = np.array(x_data)
            y_arr = np.array(y_data)
            
            # --- X軸（平均文長）の外れ値を検出 ---
            # 第1四分位数（Q1）と第3四分位数（Q3）を計算
            x_q1 = np.percentile(x_arr, 25)
            x_q3 = np.percentile(x_arr, 75)
            x_iqr = x_q3 - x_q1  # 四分位範囲
            
            # 外れ値の境界を設定
            x_lower = x_q1 - factor * x_iqr
            x_upper = x_q3 + factor * x_iqr
            
            # --- Y軸（名詞率）の外れ値を検出 ---
            y_q1 = np.percentile(y_arr, 25)
            y_q3 = np.percentile(y_arr, 75)
            y_iqr = y_q3 - y_q1
            
            y_lower = y_q1 - factor * y_iqr
            y_upper = y_q3 + factor * y_iqr
            
            # --- 正常範囲内のデータのみを残す ---
            x_mask = (x_arr >= x_lower) & (x_arr <= x_upper)
            y_mask = (y_arr >= y_lower) & (y_arr <= y_upper)
            mask = x_mask & y_mask
            
            # 除外されたデータを表示
            if verbose and titles is not None:
                outlier_indices = np.where(~mask)[0]
                if len(outlier_indices) > 0:
                    print(f"\n  除外された作品（{len(outlier_indices)}件）:")
                    for idx in outlier_indices:
                        print(f"    - {titles[idx][:40]} (文長:{x_arr[idx]:.1f}, 名詞率:{y_arr[idx]:.1f}%)")
                else:
                    print("\n  外れ値なし")
            
            if titles is not None:
                titles_clean = [titles[i] for i in range(len(titles)) if mask[i]]
                return x_arr[mask].tolist(), y_arr[mask].tolist(), titles_clean
            else:
                return x_arr[mask].tolist(), y_arr[mask].tolist(), None
        
        # ============================================================
        # 【ステップ3】各作家のデータを収集
        # ============================================================
        print("=" * 60)
        print("【夏目漱石のデータ収集】")
        print("=" * 60)
        natsume_x, natsume_y, natsume_titles = collect_author_data(
            txt_files, 
            max_files=50,
            min_length=3000,  # 3000文字以上
            verbose=True
        )
        
        print("\n" + "=" * 60)
        print("【芥川龍之介のデータ収集】")
        print("=" * 60)
        akutagawa_x, akutagawa_y, akutagawa_titles = collect_author_data(
            akutagawa_files, 
            max_files=50,
            min_length=3000,
            verbose=True
        )
        
        # ============================================================
        # 【ステップ4】外れ値を除外（IQR法を使用）
        # ============================================================
        print("\n" + "=" * 60)
        print("【夏目漱石の外れ値除去】")
        print("=" * 60)
        natsume_x_clean, natsume_y_clean, natsume_titles_clean = remove_outliers_iqr(
            natsume_x, natsume_y, natsume_titles,
            factor=1.5,  # 厳しくするなら1.2に変更
            verbose=True
        )
        
        print("\n" + "=" * 60)
        print("【芥川龍之介の外れ値除去】")
        print("=" * 60)
        akutagawa_x_clean, akutagawa_y_clean, akutagawa_titles_clean = remove_outliers_iqr(
            akutagawa_x, akutagawa_y, akutagawa_titles,
            factor=1.5,
            verbose=True
        )
        
        # ============================================================
        # 【ステップ5】散布図を作成
        # ============================================================
        fig, ax = plt.subplots(figsize=(12, 8))
        
        # 夏目漱石のプロット
        ax.scatter(natsume_x_clean, natsume_y_clean, s=100, alpha=0.6,
                  color='steelblue', edgecolors='black', 
                  linewidth=0.5, label='夏目漱石')
        
        # 芥川龍之介のプロット
        ax.scatter(akutagawa_x_clean, akutagawa_y_clean, s=100, alpha=0.6,
                  color='coral', edgecolors='black',
                  linewidth=0.5, label='芥川龍之介')
        
        # 各作家の平均値を×印で表示
        natsume_mean_x = np.mean(natsume_x_clean)
        natsume_mean_y = np.mean(natsume_y_clean)
        ax.scatter(natsume_mean_x, natsume_mean_y, 
                  marker='X', s=400, color='darkblue', 
                  edgecolors='white', linewidth=2, zorder=5,
                  label='夏目漱石（平均）')
        
        akutagawa_mean_x = np.mean(akutagawa_x_clean)
        akutagawa_mean_y = np.mean(akutagawa_y_clean)
        ax.scatter(akutagawa_mean_x, akutagawa_mean_y,
                  marker='X', s=400, color='darkred',
                  edgecolors='white', linewidth=2, zorder=5,
                  label='芥川龍之介（平均）')
        
        # グラフの装飾
        ax.set_xlabel('平均文長（形態素数）', fontsize=13)
        ax.set_ylabel('名詞率（%）', fontsize=13)
        ax.set_title('作家別：文長と名詞率の関係', fontsize=15, pad=15)
        ax.legend(fontsize=11, loc='best')
        ax.grid(True, alpha=0.3)
        
        # 軸の範囲を設定
        all_x = natsume_x_clean + akutagawa_x_clean
        all_y = natsume_y_clean + akutagawa_y_clean
        
        x_margin = (max(all_x) - min(all_x)) * 0.1
        y_margin = (max(all_y) - min(all_y)) * 0.1
        
        ax.set_xlim(min(all_x) - x_margin, max(all_x) + x_margin)
        ax.set_ylim(min(all_y) - y_margin, max(all_y) + y_margin)
        
        plt.tight_layout()
        plt.savefig('scatter_authors_comparison_improved.png', dpi=150)
        plt.show()
        
        # ============================================================
        # 【ステップ6】統計情報を表示
        # ============================================================
        print("\n" + "=" * 60)
        print("【最終統計情報】")
        print("=" * 60)
        print(f"夏目漱石:")
        print(f"  有効作品数: {len(natsume_x_clean)}")
        print(f"  平均文長: {natsume_mean_x:.1f} 形態素")
        print(f"  平均名詞率: {natsume_mean_y:.1f}%")
        print(f"\n芥川龍之介:")
        print(f"  有効作品数: {len(akutagawa_x_clean)}")
        print(f"  平均文長: {akutagawa_mean_x:.1f} 形態素")
        print(f"  平均名詞率: {akutagawa_mean_y:.1f}%")
        print("=" * 60)
        ```

## 💻 やってみよう！

!!! example "国会会議録APIを使ってみよう"
    
    1. 国会会議録APIを使って、興味のあるキーワード（例：「少子化」「環境」「教育」）を検索
    2. 検索結果から発言を10件取得し、形態素解析
    3. 頻出する名詞を棒グラフで可視化
    4. どのような議論がされているか、考察をまとめる

!!! example "好きな作家の全作品を分析しよう"
    
    1. [青空文庫の作家リスト](https://www.aozora.gr.jp/index_pages/person_all.html)から好きな作家を選び、作家番号を確認
    2. GitHubからその作家の全作品をダウンロード
    3. 以下の項目を分析：
        - 頻出する名詞（上位20語）
        - 平均文長
        - 品詞分布
    4. ワードクラウドを作成し、その作家の特徴を考察

!!! example "2人の作家を比較しよう"
    
    1. [青空文庫の作家リスト](https://www.aozora.gr.jp/index_pages/person_all.html)から2人の作家を選ぶ
    2. 両者の作品をダウンロードし、文体を比較分析
    3. 以下の観点から違いを考察：
        - 使用する語彙の傾向
        - 文の長さの分布
        - 品詞の使い方
    4. 結果をグラフにまとめて考察

!!! example "旅行記の視覚化"
    [__Colabの活用—基礎編__](10a-colab-basics.md)で課題として配布した`blogRawData_ja.json`を利用すると、どのような可視化ができるのか考えてみましょう。AIと相談しながらコードを作成して図を描き、そこからどのような情報が読み取れるのか、考えてみましょう。

<!-- ## おわりに：探偵から研究者へ

全10章を通じて、私たちは「言葉のアンテナ」を立てる探偵見習いから、コーパスという「証拠保管庫」を自在に操る研究者へと成長してきました。

振り返ってみましょう。

```mermaid
graph LR
    A[1章] --> B[2章] --> C[3章] --> D[4章] --> E[5章]
    E --> F[6章] --> G[7章] --> H[8章] --> I[9章] --> J[10章]
    
    A --> A1["内省の限界を知る"]
    B --> B1["コーパスの種類を学ぶ"]
    C --> C1["AIという相棒を得る"]
    D --> D1["形態素解析を理解する"]
    E --> E1["NLBとNLTを使う"]
    F --> F1["中納言を使いこなす"]
    G --> G1["正規表現を習得する"]
    H --> H1["資料を収集する"]
    I --> I1["コーパスを構築する"]
    J --> J1["プログラムで分析する"]
    
    style A fill:#e1f5ff
    style J fill:#c8e6c9
```

- [__1章__](01-language-research.md)で「内省」の限界を知り、「データに基づく研究」の重要性を学びました。
- [__2章__](02-corpus.md)で様々なコーパスの特徴を理解し、目的に合った「地図」を選べるようになりました。
- [__3章__](03-ai.md)でAIという「新人アシスタント」との付き合い方を学びました。
- [__4章__](04-pos.md)で形態素解析という「鑑識技術」の仕組みを理解しました。
- [__5章__](05-nlb-nlt.md)と[__6章__](06-chunagon.md)で既存のコーパス検索システムを使いこなせるようになりました。
- [__7章__](07a-regex-basics.md)で正規表現という「魔法の呪文」を習得しました。
- [__8章__](08-data-collection.md)と[__9章__](09-corpus-building.md)で自らデータを収集し、コーパスを構築する技術を身につけました。
- そして[__10章__](10a-colab-basics.md)で、プログラミングとAIの協力によるデータ分析の世界に足を踏み入れました。

しかし、これは終わりではなく、始まりです。

コーパス言語学の世界は日々進化しています。新しいコーパスが公開され、新しい分析手法が開発され、AIの能力も日々向上しています。大切なのは、「なぜ？」という問いを持ち続けること。そして、その問いに答えるために、最適なツールと方法を選び、データと向き合い続けること。

あなたの「言葉のアンテナ」が捉えた疑問を、ぜひコーパスで解き明かしてみてください。この本で学んだ技術が、あなたの知的な冒険の一助となれば幸いです。

言葉の謎は、まだまだたくさんあります。さあ、探偵事務所を開設して、あなただけの捜査を始めましょう。 -->