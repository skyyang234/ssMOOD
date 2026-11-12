// 极简 Markdown → HTML：只覆盖模型实际会写的语法。
//
// 为什么自己写而不再加一个依赖：
//   · 需求就五种（标题 / 列表 / 表格 / 粗体 / 行内代码），marked 一类库会顺带支持
//     raw HTML、链接、图片——这些在聊天里既用不上，又扩大 XSS 面；
//   · 组件里用 v-html 渲染，先把整段文本转义再解析，模型输出里的 <script> 只会变成字面量。
//
// 支持：
//   ### 标题                - / * / 1. 列表（缩进 2 空格算下一层）
//   | 表头 | 表头 |          **粗体**   `行内代码`
//   | --- | --- |             > 引用      --- 分隔线
//   ``` 代码块 ```
// 不支持（刻意）：链接、图片、斜体、脚注。

function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 行内元素：粗体与行内代码。文本此时已转义，可以安全插入标签。
function inline(text = '') {
  return String(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

// 表格行的判定要宽松：模型经常省略行尾的 "|"（"| a | b" 而不是 "| a | b |"），
// 也常整段不写分隔行。早期只认"首尾都有竖线"，结果整张表被当成一段文字，
// 用户看到的就是几百个竖线糊在一起。
const countPipes = line => (String(line).match(/\|/g) || []).length;
const isTableRow = line => {
  const text = String(line).trim();
  return text.startsWith('|') && countPipes(text) >= 2;
};
const isTableSep = line => {
  const text = String(line).trim();
  if (!text.includes('|') || !text.includes('-')) return false;
  return /^\|?[\s:|-]+\|?$/.test(text);
};

function splitRow(line = '') {
  return String(line).trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
}

function alignmentsOf(sepLine = '') {
  return splitRow(sepLine).map(cell => {
    const left = cell.startsWith(':');
    const right = cell.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    if (left) return 'left';
    return '';
  });
}

function renderTable(headerLine, sepLine, bodyLines) {
  const align = alignmentsOf(sepLine);
  const th = splitRow(headerLine)
    .map((cell, index) => `<th${align[index] ? ` style="text-align:${align[index]}"` : ''}>${inline(cell)}</th>`)
    .join('');
  const rows = bodyLines.map(line => {
    const tds = splitRow(line)
      .map((cell, index) => `<td${align[index] ? ` style="text-align:${align[index]}"` : ''}>${inline(cell)}</td>`)
      .join('');
    return `<tr>${tds}</tr>`;
  }).join('');
  // 外层包一层可横向滚动的容器：气泡很窄，宽表直接溢出会顶破布局
  return `<div class="md-table-wrap"><table><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

const LIST_ITEM = /^(\s*)([-*+]|\d+\.)\s+(.*)$/;

function parseListItems(lines) {
  return lines.map(line => {
    const matched = line.match(LIST_ITEM);
    const indent = matched[1].replace(/\t/g, '  ').length;
    return { indent, ordered: /^\d+\./.test(matched[2]), text: matched[3] };
  });
}

// 递归构建嵌套列表：同缩进且同类型才算同一层，遇到更深缩进就开新一层。
function buildList(items) {
  let cursor = 0;
  const renderLevel = (indent) => {
    const ordered = items[cursor].ordered;
    const tag = ordered ? 'ol' : 'ul';
    let html = `<${tag}>`;
    while (cursor < items.length && items[cursor].indent >= indent) {
      if (items[cursor].indent > indent) {
        html = html.replace(/<\/li>$/, `${renderLevel(items[cursor].indent)}</li>`);
        continue;
      }
      html += `<li>${inline(items[cursor].text)}`;
      cursor += 1;
      if (cursor < items.length && items[cursor].indent > indent) {
        html += renderLevel(items[cursor].indent);
      }
      html += '</li>';
    }
    return `${html}</${tag}>`;
  };
  return renderLevel(items[0].indent);
}

export function renderMarkdown(input = '') {
  const text = escapeHtml(String(input || '').replace(/\r\n?/g, '\n'));
  const lines = text.split('\n');
  const out = [];
  let paragraph = [];
  let i = 0;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    out.push(`<p>${paragraph.join('<br>')}</p>`);
    paragraph = [];
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 代码块：原样保留，内部的 ** 和 | 不再参与解析
    if (/^```/.test(trimmed)) {
      flushParagraph();
      const body = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1;
      out.push(`<pre><code>${body.join('\n')}</code></pre>`);
      continue;
    }

    // 表格：表头 + 可选分隔行 + 尽可能多的数据行
    // 分隔行缺失时也照样渲染（拿首行当表头），否则整张表会退化成一段竖线文字。
    if (isTableRow(line)) {
      const hasSep = i + 1 < lines.length && isTableSep(lines[i + 1]);
      const sep = hasSep ? lines[i + 1] : '';
      const body = [];
      let cursor = hasSep ? i + 2 : i + 1;
      while (cursor < lines.length && isTableRow(lines[cursor]) && !isTableSep(lines[cursor])) {
        body.push(lines[cursor]);
        cursor += 1;
      }
      // 只有表头没有数据行：不当表格，按普通段落处理
      if (body.length) {
        flushParagraph();
        out.push(renderTable(line, sep, body));
        i = cursor;
        continue;
      }
    }

    if (!trimmed) {
      flushParagraph();
      i += 1;
      continue;
    }

    const heading = line.match(/^\s*#{1,6}\s+(.*)$/);
    if (heading) {
      flushParagraph();
      out.push(`<p class="md-heading"><strong>${inline(heading[1])}</strong></p>`);
      i += 1;
      continue;
    }

    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      flushParagraph();
      out.push('<hr>');
      i += 1;
      continue;
    }

    // 整段文本在入口就转义了，因此 ">" 到这里是 "&gt;"
    if (/^\s*(&gt;|>)\s?/.test(line)) {
      flushParagraph();
      const body = [];
      while (i < lines.length && /^\s*(&gt;|>)\s?/.test(lines[i])) {
        body.push(lines[i].replace(/^\s*(&gt;|>)\s?/, ''));
        i += 1;
      }
      out.push(`<blockquote>${inline(body.join('<br>'))}</blockquote>`);
      continue;
    }

    if (LIST_ITEM.test(line)) {
      flushParagraph();
      const block = [];
      while (i < lines.length && LIST_ITEM.test(lines[i])) {
        block.push(lines[i]);
        i += 1;
      }
      out.push(buildList(parseListItems(block)));
      continue;
    }

    paragraph.push(inline(line));
    i += 1;
  }

  flushParagraph();
  return out.join('\n');
}
