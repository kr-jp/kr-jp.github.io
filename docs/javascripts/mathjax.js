// MathJax 設定（CDNライブラリ読み込み前に定義が必要）
window.MathJax = {
  tex: {
    inlineMath: [["\\(", "\\)"]],
    displayMath: [["\\[", "\\]"]],
    processEscapes: true,
    processEnvironments: true
  },
  options: {
    ignoreHtmlClass: ".*|",
    processHtmlClass: "arithmatex"
  }
};

// instant navigation でのページ遷移時に数式を再レンダリング
document$.subscribe(() => {
  MathJax.typesetPromise();
});

// 脚注アンカー遷移時、instant navigation が article 要素ごと DOM を差し替えるが、
// hashchange や MutationObserver では検知できないため、
// 未処理の数式要素を定期的にチェックして再レンダリングする
setInterval(() => {
  var pending = document.querySelectorAll(".arithmatex:not(:has(mjx-container))");
  if (pending.length > 0) {
    MathJax.typesetPromise(Array.from(pending));
  }
}, 500);
