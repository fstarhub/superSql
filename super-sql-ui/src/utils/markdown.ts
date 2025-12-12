import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import katex from "markdown-it-katex";

// 创建markdown-it实例
const markdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return `<pre><code class="hljs">${hljs.highlight(code, { language: lang }).value}</code></pre>`;
    }
    return `<pre><code>${markdownIt.utils.escapeHtml(code)}</code></pre>`;
  },
})
  .use(katex);

export { markdownIt };