import MarkdownIt from "markdown-it";
import mila from "markdown-it-link-attributes";
import hljs from "highlight.js";
import katex from "markdown-it-katex";

const md = new MarkdownIt({
  html: true,
  linkify: true,
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return `<pre><code class="hljs">${hljs.highlight(code, { language: lang }).value}</code></pre>`;
    }
    return `<pre><code>${md.utils.escapeHtml(code)}</code></pre>`;
  },
})
  .use(katex)
  .use(mila, { attrs: { target: "_blank", rel: "noopener" } });

export default function useMarkdownRender() {
  const renderMarkdown = (text: string) => md.render(text || "");
  return { renderMarkdown };
}
