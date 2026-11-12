<template>
  <div>
    <!-- Floating action button — draggable -->
    <button
      v-show="showFab && !open"
      class="ss-chat-fab"
      :style="fabStyle"
      @mousedown.prevent="onDragStart"
      @touchstart.prevent="onDragStart"
      @click="onFabClick"
      :aria-label="$t('ai_assistant') || 'ssMOOD Assistant'"
    >
      <!-- ssMOOD Logo Mark — brain cell network -->
      <svg viewBox="0 0 56 56" width="28" height="28">
        <path d="M10 30 C8 20,12 10,20 7 C26 4,34 4,40 8 C47 13,50 20,48 28 C46 35,42 40,38 43 C34 46,30 47,28 47 C26 47,22 46,18 43 C13 39,11 36,10 30Z" fill="none" stroke="rgba(255,255,255,0.20)" stroke-width="1.2"/>
        <path d="M20 22 C24 18,30 19,34 16" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="0.9"/>
        <path d="M16 32 C20 28,26 30,32 27" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="0.9"/>
        <circle cx="19" cy="19" r="3.2" fill="#6aa3e8"/><circle cx="19" cy="19" r="5.5" fill="rgba(106,163,232,0.20)"/>
        <circle cx="36" cy="16" r="2.6" fill="#9ec4e8"/>
        <circle cx="41" cy="30" r="2.8" fill="#f0a07a"/><circle cx="41" cy="30" r="4.8" fill="rgba(240,160,122,0.16)"/>
        <circle cx="28" cy="42" r="2.4" fill="#7acbaa"/>
        <circle cx="16" cy="35" r="2.0" fill="#5a9a82"/>
        <circle cx="30" cy="26" r="2.2" fill="#d87c7c"/>
        <line x1="19" y1="19" x2="36" y2="16" stroke="rgba(255,255,255,0.22)" stroke-width="0.9"/>
        <line x1="36" y1="16" x2="41" y2="30" stroke="rgba(255,255,255,0.18)" stroke-width="0.9"/>
        <line x1="19" y1="19" x2="16" y2="35" stroke="rgba(255,255,255,0.18)" stroke-width="0.9"/>
        <line x1="16" y1="35" x2="28" y2="42" stroke="rgba(255,255,255,0.18)" stroke-width="0.9"/>
        <line x1="41" y1="30" x2="28" y2="42" stroke="rgba(255,255,255,0.15)" stroke-width="0.9"/>
        <line x1="30" y1="26" x2="19" y2="19" stroke="rgba(255,255,255,0.14)" stroke-width="0.9"/>
        <line x1="30" y1="26" x2="41" y2="30" stroke="rgba(255,255,255,0.14)" stroke-width="0.9"/>
      </svg>
      <span class="ss-chat-fab-pulse"></span>
    </button>

    <!-- Chat panel -->
    <transition name="ss-chat-slide">
      <div
        v-show="open || inline"
        class="ss-chat-panel"
        :class="{ 'ss-chat-panel--page': isPage, 'ss-chat-panel--inline': inline }"
        :style="isPage || inline ? null : panelStyle"
      >
        <!-- 八向尺寸调节：仅气泡版可拖拽；页面版是固定布局 -->
        <template v-if="!isPage">
          <div class="ss-chat-resize ss-chat-resize--l" @mousedown.prevent="startResize($event, 'w')" @touchstart.prevent="startResize($event, 'w')" :title="resizeLabel" aria-label="Resize width"></div>
          <div class="ss-chat-resize ss-chat-resize--r" @mousedown.prevent="startResize($event, 'e')" @touchstart.prevent="startResize($event, 'e')" :title="resizeLabel" aria-label="Resize width"></div>
          <div class="ss-chat-resize ss-chat-resize--t" @mousedown.prevent="startResize($event, 'n')" @touchstart.prevent="startResize($event, 'n')" :title="resizeLabel" aria-label="Resize height"></div>
          <div class="ss-chat-resize ss-chat-resize--b" @mousedown.prevent="startResize($event, 's')" @touchstart.prevent="startResize($event, 's')" :title="resizeLabel" aria-label="Resize height"></div>
          <div class="ss-chat-resize ss-chat-resize--tl" @mousedown.prevent="startResize($event, 'nw')" @touchstart.prevent="startResize($event, 'nw')" :title="resizeCornerLabel" aria-label="Resize"></div>
          <div class="ss-chat-resize ss-chat-resize--tr" @mousedown.prevent="startResize($event, 'ne')" @touchstart.prevent="startResize($event, 'ne')" :title="resizeCornerLabel" aria-label="Resize"></div>
          <div class="ss-chat-resize ss-chat-resize--bl" @mousedown.prevent="startResize($event, 'sw')" @touchstart.prevent="startResize($event, 'sw')" :title="resizeCornerLabel" aria-label="Resize"></div>
          <div class="ss-chat-resize ss-chat-resize--br" @mousedown.prevent="startResize($event, 'se')" @touchstart.prevent="startResize($event, 'se')" :title="resizeCornerLabel" aria-label="Resize"></div>
        </template>
        <!-- 内嵌到 /ai 页面时不显示标题栏：那块只剩一条空栏，占高度且没有信息价值 -->
        <header v-if="!inline" class="ss-chat-head" @mousedown.prevent="onPanelDragStart" @touchstart.prevent="onPanelDragStart">
          <div class="ss-chat-head-l">
            <span class="ss-chat-avatar">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v6m0 10v6m11-11h-6m-10 0H1"/>
              </svg>
            </span>
            <div>
              <div class="ss-chat-title">{{ assistantTitle }}</div>
              <div class="ss-chat-status">
                <span class="ss-chat-dot"></span>
                {{ statusText }}
              </div>
            </div>
          </div>
          <div class="ss-chat-head-actions">
            <!-- 历史会话：下拉切换/删除；之前的实现只有"当前这一条" -->
            <div class="ss-chat-history">
              <button
                class="ss-chat-icon-btn"
                @click.stop="historyOpen = !historyOpen"
                :aria-label="isZh ? '历史对话' : 'Chat history'"
                :title="isZh ? '历史对话' : 'Chat history'"
                :aria-expanded="historyOpen ? 'true' : 'false'"
              >
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="8" cy="8" r="6"/><path d="M8 4.6V8l2.4 1.6"/>
                </svg>
              </button>
              <div v-if="historyOpen" class="ss-chat-history-menu" @mousedown.stop>
                <div class="ss-chat-history-head">{{ isZh ? '历史对话' : 'Chat history' }}</div>
                <button
                  v-for="item in historyItems"
                  :key="item.id"
                  type="button"
                  class="ss-chat-history-item"
                  :class="{ 'is-active': item.active }"
                  @click="switchSession(item.id)"
                >
                  <span class="ss-chat-history-title">{{ item.title }}</span>
                  <span class="ss-chat-history-time">{{ relativeTime(item.at) }}</span>
                  <span
                    class="ss-chat-history-del"
                    role="button"
                    :aria-label="isZh ? '删除这条对话' : 'Delete this chat'"
                    @click.stop="deleteSession(item.id)"
                  >×</span>
                </button>
                <div v-if="!historyItems.length" class="ss-chat-history-empty">
                  {{ isZh ? '还没有历史对话' : 'No saved chats yet' }}
                </div>
              </div>
            </div>
            <!-- 转到数据助手：把当前对话一并带过去（仅使用助手显示） -->
            <button
              v-if="canHandoff"
              class="ss-chat-icon-btn"
              @click="handoffToData"
              :aria-label="isZh ? '转到数据助手' : 'Switch to data assistant'"
              :title="isZh ? '转到数据助手（带上当前对话）' : 'Switch to data assistant (carry this chat)'"
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 8h9"/><path d="M8 4.5 11.5 8 8 11.5"/>
              </svg>
            </button>
            <!-- 诊断日志：导出最近若干轮的结构化记录（不含提问原文），便于排查"为什么答不上来" -->
            <button
              class="ss-chat-icon-btn"
              @click="exportTurnLog"
              :aria-label="isZh ? '导出诊断日志' : 'Export diagnostics'"
              :title="isZh ? '导出诊断日志（意图/工具/耗时/失败原因，不含提问原文）' : 'Export diagnostics (intent / tools / latency / failures; no raw questions)'"
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                <circle cx="8" cy="8" r="6"/><path d="M8 7.2v4"/><path d="M8 4.8v.2"/>
              </svg>
            </button>
            <button class="ss-chat-icon-btn" @click="deleteCurrentSession" :aria-label="deleteLabel" :title="deleteLabel">
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 4h10"/><path d="M6 4V2.8h4V4"/><path d="M5 6v6m3-6v6m3-6v6"/><path d="M4 4l.5 10h7L12 4"/>
              </svg>
            </button>
            <button v-if="!inline" class="ss-chat-close" @click="open = false" aria-label="Close">
              <svg viewBox="0 0 16 16" width="14" height="14"><path d="M3 3 L13 13 M13 3 L3 13" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
            </button>
          </div>
        </header>

        <div class="ss-chat-main">
          <div class="ss-chat-content">
        <!-- 页面版：提示词常驻在消息区上方，不随滚轮滚走；问答记录放在它下面。
             注意：不要按 messages.length 加任何"紧凑"样式，否则一问就缩小/上移，观感很跳 -->
        <div v-if="isPage" class="ss-chat-prompts-panel">
          <div class="ss-chat-prompts-head">
            <div class="ss-chat-empty-title">{{ emptyTitle }}</div>
            <div class="ss-chat-prompts-actions">
              <!-- 页面版没有头部（inline 模式），历史入口只能放在这里 -->
              <div class="ss-chat-history">
                <button
                  type="button"
                  class="ss-chat-new-btn ss-chat-history-btn"
                  @click.stop="historyOpen = !historyOpen"
                  :aria-label="isZh ? '历史对话' : 'Chat history'"
                  :title="isZh ? '历史对话' : 'Chat history'"
                  :aria-expanded="historyOpen ? 'true' : 'false'"
                >
                  <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="8" cy="8" r="6"/><path d="M8 4.6V8l2.4 1.6"/>
                  </svg>
                  <span class="ss-chat-new-btn-text">{{ isZh ? '历史' : 'History' }}</span>
                </button>
                <div v-if="historyOpen" class="ss-chat-history-menu ss-chat-history-menu--inline" @mousedown.stop>
                  <div class="ss-chat-history-head">{{ isZh ? '历史对话' : 'Chat history' }}</div>
                  <button
                    v-for="item in historyItems"
                    :key="item.id"
                    type="button"
                    class="ss-chat-history-item"
                    :class="{ 'is-active': item.active }"
                    @click="switchSession(item.id)"
                  >
                    <span class="ss-chat-history-title">{{ item.title }}</span>
                    <span class="ss-chat-history-time">{{ relativeTime(item.at) }}</span>
                    <span
                      class="ss-chat-history-del"
                      role="button"
                      :aria-label="isZh ? '删除这条对话' : 'Delete this chat'"
                      @click.stop="deleteSession(item.id)"
                    >×</span>
                  </button>
                  <div v-if="!historyItems.length" class="ss-chat-history-empty">
                    {{ isZh ? '还没有历史对话' : 'No saved chats yet' }}
                  </div>
                </div>
              </div>
              <!-- 开启新对话：旧的留在历史里，新开一条空会话 -->
              <button
                v-if="messages.length"
                type="button"
                class="ss-chat-new-btn"
                :title="isZh ? '开始一条新对话（旧的会留在历史里）' : 'Start a new chat (this one stays in history)'"
                @click="startNewChat"
              >
                <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                  <path d="M8 3.2v9.6M3.2 8h9.6"/>
                </svg>
                <span class="ss-chat-new-btn-text">{{ isZh ? '开启新对话' : 'New chat' }}</span>
              </button>
            </div>
          </div>
          <div class="ss-chat-prompts">
            <button v-for="p in suggestedPrompts" :key="p" class="ss-chat-prompt-chip" @click="ask(p)">
              {{ p }}
            </button>
          </div>
        </div>

        <div class="ss-chat-body" ref="bodyEl">
          <!-- 气泡版保持原样：没有对话时才显示提示词 -->
          <div v-if="!isPage && messages.length === 0" class="ss-chat-empty">
            <div class="ss-chat-empty-title">{{ emptyTitle }}</div>
            <div class="ss-chat-prompts">
              <button v-for="p in suggestedPrompts" :key="p" class="ss-chat-prompt-chip" @click="ask(p)">
                {{ p }}
              </button>
            </div>
          </div>

          <div v-for="(m, i) in messages" :key="i" :class="['ss-chat-msg', `ss-chat-msg--${m.role}`]">
            <div>
              <!-- 用户引用的样本以气泡形式呈现，与输入区保持一致；正文只显示提问 -->
              <div v-if="m.role === 'user' && m.samples && m.samples.length" class="ss-chat-user-samples">
                <span
                  v-for="(s, si) in m.samples"
                  :key="si"
                  class="ss-ref-bubble ss-ref-bubble--readonly"
                  :title="s.label + (s.meta ? ' · ' + s.meta : '')"
                >
                  <span class="ss-ref-kind">样本</span>
                  <span class="ss-ref-label">{{ s.label }}</span>
                </span>
              </div>
              <div v-if="bubbleText(m)" class="ss-chat-bubble" v-html="formatMessage(bubbleText(m))"></div>
              <!-- 停止/中断的痕迹：没有这条，用户会以为按钮没生效 -->
              <div v-if="m.notice" class="ss-chat-notice">{{ m.notice }}</div>
              <!-- 恢复的会话里图不会回来（坐标太大），如实说明 -->
              <div v-if="m.plotOmitted && !inlinePlotActions(m.actions).length" class="ss-chat-notice">
                {{ isZh ? '图表不随对话保存，重新提问可以再生成一张。' : 'Plots are not saved with the chat; ask again to regenerate.' }}
              </div>
              <!-- 每条回复都留一个「复制」出口：科研场景里复制答案去记笔记是高频动作 -->
              <div v-if="m.role === 'assistant' && bubbleText(m) && !m.retryable" class="ss-chat-msg-tools">
                <button type="button" class="ss-chat-tool-btn" @click.stop="copyMessage(i, m)">
                  {{ copiedIndex === i ? (isZh ? '已复制' : 'Copied') : (isZh ? '复制' : 'Copy') }}
                </button>
              </div>
              <div v-if="visibleWarnings(m.warnings).length" class="ss-chat-warnings">
                <div v-for="(warning, warningIndex) in visibleWarnings(m.warnings)" :key="warningIndex" class="ss-chat-warning">
                  {{ warningText(warning) }}
                </div>
              </div>
              <!-- 失败/停止：给一个能继续的动作，而不是让用户把问题重新打一遍 -->
              <div v-if="m.retryable" class="ss-chat-retry-row">
                <button type="button" class="ss-chat-retry-btn" :disabled="loading" @click.stop="retryMessage(i)">
                  {{ isZh ? '重试这一问' : 'Retry this question' }}
                </button>
                <button type="button" class="ss-chat-tool-btn" @click.stop="copyMessage(i, m)">
                  {{ copiedIndex === i ? (isZh ? '已复制' : 'Copied') : (isZh ? '复制' : 'Copy') }}
                </button>
              </div>
              <!-- AI 页面：图直接嵌在回答里。给一个"可点击的气泡"等于让用户多操作一步，
                   而他们问"画一下"想要的就是图本身。气泡面板空间小，仍走卡片。 -->
              <div v-if="inlinePlotActions(m.actions).length" class="ss-chat-inline-plots">
                <AgentPlotModal
                  v-for="(plot, plotIndex) in inlinePlotActions(m.actions)"
                  :key="`plot-${plotIndex}`"
                  embedded
                  :action="plot"
                  @expand="openPlotWindow(plot)"
                />
              </div>

              <div v-if="chipActions(m.actions).length" class="ss-chat-actions">
                <button
                  v-for="(action, actionIndex) in chipActions(m.actions)"
                  :key="actionIndex"
                  :class="['ss-chat-action-card', `ss-chat-action-card--${actionCardKind(action)}`]"
                  :disabled="!isExecutableAction(action)"
                  @click="runAction(action)"
                >
                  <span class="ss-chat-action-icon">{{ actionCardIcon(action) }}</span>
                  <span class="ss-chat-action-main">
                    <strong>{{ actionCardTitle(action) }}</strong>
                    <em v-if="actionCardMeta(action)">{{ actionCardMeta(action) }}</em>
                    <span v-if="actionCardDetail(action)" class="ss-chat-action-detail">{{ actionCardDetail(action) }}</span>
                  </span>
                </button>
              </div>

              <!-- 表格 / 知识 / 筛选建议 / 数据导读：四类富卡片 -->
              <div v-if="richActions(m.actions).length" class="ss-chat-richcards">
                <div
                  v-for="(card, cardIndex) in richActions(m.actions)"
                  :key="cardIndex"
                  :class="['ss-chat-rich', `ss-chat-rich--${actionCardKind(card)}`]"
                >
                  <!-- 表格卡：可排序 + CSV 下载 -->
                  <template v-if="card.type === 'table_card'">
                    <div class="ss-chat-rich-head">
                      <strong>{{ actionCardTitle(card) }}</strong>
                      <button class="ss-chat-rich-btn" @click.stop="downloadTableCsv(card)">CSV</button>
                    </div>
                    <div class="ss-chat-rich-meta">{{ actionCardMeta(card) }}</div>
                    <div class="ss-chat-table-wrap">
                      <table class="ss-chat-table">
                        <thead>
                          <tr>
                            <th
                              v-for="column in card.columns"
                              :key="column"
                              @click.stop="toggleTableSort(cardKey(i, cardIndex), column)"
                            >
                              {{ column }}<span class="ss-chat-sort" v-if="tableSortColumn(cardKey(i, cardIndex)) === column">{{ tableSortDirection(cardKey(i, cardIndex)) === 'asc' ? '↑' : '↓' }}</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="(row, rowIndex) in sortedTableRows(cardKey(i, cardIndex), card)" :key="rowIndex">
                            <td v-for="column in card.columns" :key="column">{{ row[column] }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </template>

                  <!-- 知识卡：术语 / 字段 / 阈值，命中多条可折叠 -->
                  <template v-else-if="card.type === 'knowledge_card'">
                    <div class="ss-chat-rich-head" @click.stop="toggleCard(i, cardIndex)">
                      <strong>{{ actionCardTitle(card) }}</strong>
                      <span class="ss-chat-rich-toggle">{{ isCardExpanded(i, cardIndex) ? '收起' : '展开' }}</span>
                    </div>
                    <div class="ss-chat-rich-meta">{{ actionCardMeta(card) }}</div>
                    <div v-if="isCardExpanded(i, cardIndex)" class="ss-chat-rich-body">
                      <div v-if="card.description" class="ss-chat-rich-line">{{ card.description }}</div>
                      <div v-if="card.howToRead" class="ss-chat-rich-line">怎么读：{{ card.howToRead }}</div>
                      <table v-if="card.thresholds && card.thresholds.length" class="ss-chat-thresholds">
                        <tbody>
                          <tr v-for="(threshold, thresholdIndex) in card.thresholds" :key="thresholdIndex">
                            <td class="ss-chat-thr-level">{{ thresholdLevelText(threshold.level) }}</td>
                            <td class="ss-chat-thr-cond">{{ threshold.condition }}</td>
                            <td class="ss-chat-thr-mean">{{ threshold.meaning }}</td>
                          </tr>
                        </tbody>
                      </table>
                      <div v-if="card.source" class="ss-chat-rich-source">出处：{{ card.source }}</div>
                    </div>
                  </template>

                  <!-- 筛选建议卡：可点击 chip，跳转列表页 -->
                  <template v-else-if="card.type === 'filter_card'">
                    <div class="ss-chat-rich-head"><strong>{{ actionCardTitle(card) }}</strong></div>
                    <div class="ss-chat-chips">
                      <button
                        v-for="(chip, chipIndex) in card.chips"
                        :key="chipIndex"
                        class="ss-chat-chip"
                        @click.stop="runFilterChip(chip)"
                      >{{ chip.label }}</button>
                    </div>
                    <div v-if="card.note" class="ss-chat-rich-meta">{{ card.note }}</div>
                  </template>

                  <!-- 澄清卡：把「你指的是哪种」做成可点选项，点一下就继续 -->
                  <template v-else-if="card.type === 'clarify_card'">
                    <div class="ss-chat-rich-head">
                      <strong>{{ actionCardTitle(card) }}</strong>
                    </div>
                    <div class="ss-chat-clarify-chips">
                      <button
                        v-for="(option, optionIndex) in card.options"
                        :key="optionIndex"
                        type="button"
                        class="ss-chat-clarify-chip"
                        @click.stop="ask(option)"
                      >{{ option }}</button>
                    </div>
                  </template>

                  <!-- 数据解释卡：当前所在模块 + 各模块 + 当前实体 + 当前选择 + 页面能力 -->
                  <template v-else-if="card.type === 'data_guide_card'">
                    <div class="ss-chat-rich-head"><strong>{{ actionCardTitle(card) }}</strong></div>
                    <div v-if="card.activeModule" class="ss-chat-rich-line ss-chat-rich-line--module">
                      当前所在模块：{{ card.activeModule }}
                    </div>
                    <div v-if="moduleLines(card.modules).length" class="ss-chat-rich-line">
                      本页模块：
                      <span v-for="(line, idx) in moduleLines(card.modules)" :key="idx" class="ss-chat-mod">
                        {{ line }}<span v-if="idx < moduleLines(card.modules).length - 1"> ｜ </span>
                      </span>
                    </div>
                    <div v-if="entityLine(card.entity)" class="ss-chat-rich-line">当前实体：{{ entityLine(card.entity) }}</div>
                    <div v-if="entityLine(card.selection)" class="ss-chat-rich-line">当前选择：{{ entityLine(card.selection) }}</div>
                    <!-- 页面自描述（P4）：本页可按什么筛、表里有哪些列，全部来自页面自己的上报 -->
                    <div v-if="card.filters && card.filters.length" class="ss-chat-rich-line">
                      {{ isZh ? '可筛选' : 'Filterable' }}：{{ card.filters.join(' / ') }}
                    </div>
                    <div v-if="card.columns && card.columns.length" class="ss-chat-rich-line">
                      {{ isZh ? '表格列' : 'Columns' }}：{{ card.columns.slice(0, 8).join(isZh ? '、' : ', ') }}
                    </div>
                    <div class="ss-chat-rich-meta">{{ actionCardMeta(card) }}</div>
                  </template>
                </div>
              </div>

              <!-- 回答依据 · 可核验：把 AI 这一答的来源与未能核实的表述摊开给用户核对 -->
              <div v-if="hasEvidence(m)" class="ss-chat-evidence">
                <div class="ss-chat-evidence-head" @click.stop="toggleEvidence(i)">
                  <strong>回答依据 · 可核验</strong>
                  <span class="ss-chat-rich-toggle">{{ isEvidenceOpen(i) ? '收起' : '展开' }}</span>
                </div>
                <div v-if="isEvidenceOpen(i)" class="ss-chat-evidence-body">
                  <div v-for="(group, groupIndex) in m.evidence.sources" :key="groupIndex" class="ss-chat-ev-group">
                    <div class="ss-chat-ev-label">
                      {{ group.label }}<em v-if="group.note"> · {{ group.note }}</em>
                    </div>
                    <div v-for="(item, itemIndex) in group.items" :key="itemIndex" class="ss-chat-ev-item">
                      <span class="ss-chat-ev-key">{{ item.key }}</span>
                      <span class="ss-chat-ev-val">{{ item.value }}</span>
                    </div>
                  </div>
                  <div v-if="m.evidence.unverified.length" class="ss-chat-ev-unverified">
                    未能核实的表述：{{ m.evidence.unverified.join('、') }}
                  </div>
                  <div v-else class="ss-chat-ev-ok">回答中的标识符均可在上述依据中核对到。</div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="loading" class="ss-chat-msg ss-chat-msg--assistant">
            <div>
              <div class="ss-chat-bubble ss-chat-typing">
                <span></span><span></span><span></span>
                <!-- 真实阶段：判断意图 / 查数据 / 组织回答 -->
                <em v-if="stageText" class="ss-chat-stage">{{ stageText }}</em>
              </div>
            </div>
          </div>
        </div>


        <footer class="ss-chat-foot">
          <!-- 引用样本：整块放在输入框上方（原左侧栏已取消）。
               左侧按钮展开候选列表，已选样本是「约束气泡」 -->
          <div v-if="isPage" ref="samplePickerEl" class="ss-sample-bar">
            <div class="ss-sample-bar-head">
              <span class="ss-sample-bar-actions">
                <button
                  type="button"
                  class="ss-sample-bar-add"
                  :class="{ 'is-open': pickerOpen }"
                  @click="toggleSamplePicker"
                >{{ pickerOpen ? '收起' : (selectedSamples.length ? '继续选择' : '选择样本') }}</button>
                <span v-if="selectedSamples.length" class="ss-sample-bar-count">{{ selectedSamples.length }}</span>
              </span>
              <button
                v-if="selectedSamples.length"
                type="button"
                class="ss-sample-bar-link"
                @click="clearSelectedSamples"
              >清空</button>
            </div>

            <!-- 约束气泡：可删除、可拖拽排序（气泡顺序即引用顺序） -->
            <div v-if="selectedSamples.length" class="ss-ref-bubbles">
              <span
                v-for="(sample, index) in selectedSamples"
                :key="sample.id"
                class="ss-ref-bubble"
                :class="{ 'is-dragging': dragIndex === index, 'is-over': overIndex === index }"
                draggable="true"
                tabindex="0"
                :title="sample.label + (sample.meta ? ' · ' + sample.meta : '')"
                @dragstart="onBubbleDragStart(index, $event)"
                @dragover.prevent="onBubbleDragOver(index)"
                @dragend="onBubbleDragEnd"
                @drop.prevent="onBubbleDrop(index)"
                @keydown="onBubbleKey(index, $event)"
              >
                <span class="ss-ref-kind">样本</span>
                <span class="ss-ref-label">{{ sample.label }}</span>
                <button
                  type="button"
                  class="ss-ref-del"
                  :aria-label="'移除 ' + sample.label"
                  @click.stop="removeSample(index)"
                >×</button>
              </span>
            </div>

            <!-- 候选列表：向上弹出、内部自己滚，不改变对话区高度 -->
            <div v-if="pickerOpen" class="ss-sample-picker" @keydown.esc="pickerOpen = false">
              <input
                v-model="sampleKeyword"
                class="ss-side-search"
                type="text"
                placeholder="搜索样本名 / 脑区 / 条件…"
                @keydown.stop
              />

              <!-- 筛选条：类型 / 物种 / 性别 / 脑区。选项从当前目录现算，某个维度只有一个值时不显示该行 -->
              <div v-if="sampleCatalog.length" class="ss-filter-bar">
                <div v-if="filterOptions.omics.length > 1" class="ss-filter-row">
                  <span class="ss-filter-label">类型</span>
                  <div class="ss-filter-chips">
                    <button type="button" class="ss-filter-chip" :class="{ 'is-on': !sampleFilters.omics }" @click="setSampleFilter('omics', '')">全部</button>
                    <button
                      v-for="opt in filterOptions.omics"
                      :key="opt"
                      type="button"
                      class="ss-filter-chip"
                      :class="{ 'is-on': sampleFilters.omics === opt }"
                      @click="toggleSampleFilter('omics', opt)"
                    >{{ SAMPLE_TYPE_LABEL[opt] || opt }}</button>
                  </div>
                </div>

                <div v-if="filterOptions.species.length > 1" class="ss-filter-row">
                  <span class="ss-filter-label">物种</span>
                  <div class="ss-filter-chips">
                    <button type="button" class="ss-filter-chip" :class="{ 'is-on': !sampleFilters.species }" @click="setSampleFilter('species', '')">全部</button>
                    <button
                      v-for="opt in filterOptions.species"
                      :key="opt"
                      type="button"
                      class="ss-filter-chip"
                      :class="{ 'is-on': sampleFilters.species === opt }"
                      @click="toggleSampleFilter('species', opt)"
                    >{{ speciesLabel(opt) }}</button>
                  </div>
                </div>

                <div v-if="filterOptions.sexes.length > 1" class="ss-filter-row">
                  <span class="ss-filter-label">性别</span>
                  <div class="ss-filter-chips">
                    <button type="button" class="ss-filter-chip" :class="{ 'is-on': !sampleFilters.sex }" @click="setSampleFilter('sex', '')">全部</button>
                    <button
                      v-for="opt in filterOptions.sexes"
                      :key="opt"
                      type="button"
                      class="ss-filter-chip"
                      :class="{ 'is-on': sampleFilters.sex === opt }"
                      @click="toggleSampleFilter('sex', opt)"
                    >{{ SEX_SYMBOL[opt] || opt }}</button>
                  </div>
                </div>

                <div v-if="filterOptions.regions.length > 1" class="ss-filter-row">
                  <span class="ss-filter-label">脑区</span>
                  <div class="ss-filter-chips">
                    <button type="button" class="ss-filter-chip" :class="{ 'is-on': !sampleFilters.region }" @click="setSampleFilter('region', '')">全部</button>
                    <button
                      v-for="opt in filterOptions.regions"
                      :key="opt"
                      type="button"
                      class="ss-filter-chip"
                      :class="{ 'is-on': sampleFilters.region === opt }"
                      @click="toggleSampleFilter('region', opt)"
                    >{{ opt }}</button>
                  </div>
                </div>
              </div>

              <div class="ss-side-list">
                <span v-if="catalogLoading" class="ss-side-empty">加载中…</span>
                <button
                  v-for="sample in visibleSamples"
                  :key="sample.id"
                  type="button"
                  class="ss-side-item"
                  :class="{ 'is-on': isSampleSelected(sample.id) }"
                  :title="sample.meta"
                  @click="toggleSample(sample)"
                >
                  <span class="ss-side-check">{{ isSampleSelected(sample.id) ? '✓' : '' }}</span>
                  <span class="ss-side-main">
                    <span class="ss-side-label">{{ sample.label }}</span>
                    <!-- 第二行：物种 / 脑区 / 条件 / 性别 / 真实样本号 / 规模，解决"名字对不上样本" -->
                    <span class="ss-side-meta-line">{{ sampleMetaLine(sample) }}</span>
                  </span>
                  <span class="ss-side-tag">{{ sampleTypeLabel(sample) }}</span>
                </button>
                <span v-if="!visibleSamples.length && !catalogLoading" class="ss-side-empty">
                  {{ activeFilterCount ? '当前筛选下没有样本，试试放宽条件' : '没有匹配的样本' }}
                </span>
              </div>
              <div class="ss-side-foot">
                <span class="ss-side-count">共 {{ filteredSamples.length }} / {{ sampleCatalog.length }}</span>
                <button v-if="activeFilterCount" type="button" @click="resetSampleFilters">清除筛选</button>
                <button v-if="hasContextScope" type="button" @click="showAllSamples = !showAllSamples">
                  {{ showAllSamples ? '仅当前语境' : '显示全部' }}
                </button>
                <button type="button" @click="loadSampleCatalogOnce({ force: true })">刷新</button>
                <button type="button" class="ss-picker-done" @click="pickerOpen = false">完成</button>
              </div>
              <div v-if="hiddenSampleCount" class="ss-side-hint">还有 {{ hiddenSampleCount }} 个未显示，输入关键词可缩小范围。</div>
            </div>
          </div>

          <!-- 需要数据/出图时提示一键交给数据助手；不点则两个模块完全独立 -->
          <div v-if="dataNeeded" class="ss-chat-handoff">
            <span>{{ isZh ? '这个问题需要数据助手（查询 / 出图）' : 'This needs the data assistant (query / plots)' }}</span>
            <button type="button" @click="handoffToData">{{ isZh ? '带上对话过去' : 'Carry chat over' }}</button>
          </div>

          <div class="ss-chat-input-row">
            <textarea
              v-model="input"
              class="ss-chat-input"
              :placeholder="$t('ai_placeholder') || 'Ask about ssMOOD or MDD omics…'"
              rows="1"
              @keydown.enter.exact.prevent="send"
              @input="autoResize"
              ref="inputEl"
            ></textarea>
            <!-- 生成中把「发送」换成「停止」：等待 50 秒期间用户至少能自救一次 -->
            <button
              v-if="loading"
              class="ss-chat-send ss-chat-send--stop"
              @click="stopTurn"
              :aria-label="stopLabel"
              :title="stopLabel"
            >
              <span class="ss-chat-stop-square"></span>
            </button>
            <button
              v-else
              class="ss-chat-send"
              :disabled="!input.trim() && !selectedSamples.length"
              @click="send"
              aria-label="Send"
            >
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 14V2 M2 8 L8 2 L14 8"/>
            </svg>
          </button>
          </div>
        </footer>
          </div>
        </div>
      </div>
    </transition>
    <AgentPlotModal :visible="plotModalOpen" :action="activePlotAction" @close="closePlotModal" />
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { buildAgentContext, describeCapabilities } from '@/utils/agentContext';
import { downloadTurnLog, getTurnRecords, summarizeTurns } from '@/utils/agentTelemetry';
import { loadSampleCatalog, normalizeSpeciesKey } from '@/utils/agentSampleCatalog';
import { runAgentTurn } from '@/utils/agentOrchestrator';
import { renderMarkdown } from '@/utils/markdownLite';
import * as ChatStore from '@/utils/agentChatStore';
import {
  isPanelOpen, openPanel, closePanel,
  handoffAvailable, handoffConversation, consumeHandoff, handoffState,
} from '@/utils/aiPanel';
import { profileHints, profileTitle, getAgentProfile } from '@/utils/agentProfiles';
import AgentPlotModal from './AgentPlotModal.vue';

const props = defineProps({
  // 'guide' = 使用助手（右下角气泡）；'data' = 数据助手（顶部导航栏「AI」）。
  // 两者共用同一套编排引擎，仅按 profile 裁剪可见的工具与意图（见 utils/agentProfiles.js）。
  profile: { type: String, default: 'data' },
  // 'bubble' = 可拖动/缩放的悬浮面板；'page' = 页面式布局。
  variant: { type: String, default: 'bubble' },
  // 为 true 时面板作为「页面内容」嵌入（/ai 页）：始终可见、不可拖动、不显示关闭按钮。
  inline: { type: Boolean, default: false },
  // 是否显示右下角悬浮按钮（使用助手用；数据助手从导航栏打开）。
  showFab: { type: Boolean, default: true },
});

const isPage = computed(() => props.variant === 'page');

const { locale } = useI18n();
const route = useRoute();
const router = useRouter();

// 面板开关走共享状态，这样顶部导航栏也能打开面板（见 utils/aiPanel.js）。
// 用可写 computed：模板里的 v-show="open" / open = false 与脚本里的 open.value = true 都照常可用。
const open = computed({
  get: () => isPanelOpen(props.profile),
  set: value => { if (value) openPanel(props.profile); else closePanel(props.profile); },
});
const input = ref('');
const messages = ref([]);
const loading = ref(false);
const bodyEl = ref(null);
const inputEl = ref(null);
const plotModalOpen = ref(false);
const activePlotAction = ref(null);

// ── 会话交接（气泡「使用助手」⇄ 导航栏「AI」数据助手）──
// 默认两边对话完全独立；只有「用户点转交」时才把气泡这几轮的消息并过去。
const canHandoff = computed(() => handoffAvailable(props.profile));

// 粗粒度关键词判定：宁可漏判（用户还能点标题栏的转交按钮），也不要误判导致成天弹提示。
const DATA_REQUEST_PATTERN = /(画|绘|作图|plot|图表|表达量|表达|差异|DEG|富集|enrich|GWAS|scDRS|ATAC|peak|组成|占比|UMAP|空间图|细胞数|统计)/i;
function looksLikeDataRequest(text) {
  return DATA_REQUEST_PATTERN.test(String(text || ''));
}

// 最近一轮提问看起来需要数据/出图 → 在输入框上方给一个「带上对话过去」的提示。
// 只提示、不自动切面板（自动切走会让用户以为自己点错了）。
const dataNeeded = computed(() => {
  if (!canHandoff.value) return false;
  const lastUser = [...messages.value].reverse().find(m => m.role === 'user');
  return Boolean(lastUser && looksLikeDataRequest(lastUser.content || ''));
});

// 引用样本列表的展示：一行「名称」+ 一行「它到底是什么」。
// 只显示 display_name（如 M_I_3D_rep1）时用户无法判断对应哪个样本，所以补上
// 物种 / 脑区 / 条件 / 性别 / 真实样本号 / 规模，并标出模态。
const SAMPLE_TYPE_LABEL = { SC: '单细胞', ST: '空转', ATAC: 'ATAC' };
const SEX_SYMBOL = { male: '♂', female: '♀' };

// 筛选条上的物种文案（只在渲染期调用，可安全引用 isZh）
function speciesLabel(key) {
  if (key === 'mouse') return isZh.value ? '小鼠' : 'Mouse';
  if (key === 'human') return isZh.value ? '人' : 'Human';
  return key || '—';
}

function sampleTypeLabel(sample) {
  return SAMPLE_TYPE_LABEL[sample?.omicsType] || sample?.omicsType || '';
}

function sampleMetaLine(sample) {
  if (!sample) return '';
  const species = sample.speciesKey === 'mouse' ? '小鼠' : (sample.speciesKey === 'human' ? '人' : sample.species);
  const unit = sample.omicsType === 'ST' ? 'spots' : '细胞';
  const cells = sample.cells ? `${Number(sample.cells).toLocaleString()} ${unit}` : '';
  // 展示名与真实样本号不同时两个都给出来（如 M_I_3D_rep1 · ST0041_3D_mPFC）
  const raw = sample.rawName && sample.rawName !== sample.label ? sample.rawName : '';
  return [
    species,
    sample.brainRegion,
    sample.condition,
    SEX_SYMBOL[String(sample.sex || '').toLowerCase()] || sample.sex,
    raw,
    cells,
  ].filter(Boolean).join(' · ');
}

function handoffToData() {
  if (!canHandoff.value) return;
  handoffConversation({ from: props.profile, messages: messages.value.slice() });
  // 数据助手已经是独立页面：把用户带过去，消息通过 handoffState 传递。
  const target = getAgentProfile(props.profile)?.handoff?.route;
  if (target && route.path !== target) router.push(target);
}

// 作为接收方：被转交过来时把消息并进来，只注入一次。
// immediate 是必须的：页面版由路由挂载，挂载时可能已经有待接收的交接。
watch(() => handoffState.at, () => {
  const payload = consumeHandoff(props.profile);
  if (!payload || !payload.messages.length) return;
  messages.value = messages.value.length
    ? [...messages.value, ...payload.messages]
    : payload.messages;
  nextTick(() => scrollToEnd());
}, { immediate: true });

// 浮层形态在跳转时自动收起；页面内嵌形态由路由负责显示与隐藏，这里不干预。
watch(() => route.fullPath, () => {
  if (isPage.value && !props.inline) closePanel(props.profile);
});

// 面板尺寸与位置：宽度/高度可拖拽调节，整面板可在页面内拖动。
// 移动端由媒体查询强制全屏，忽略这里的 left/top/尺寸值。
const panelWidth = ref(380);
const panelHeight = ref(560);
const RESIZE_MIN_W = 320;
const RESIZE_MAX_W = 680;
const RESIZE_MIN_H = 320;
const RESIZE_MAX_H = 820;
const resizeLabel = '拖拽调整对话框宽度';
const resizeCornerLabel = '拖拽调整对话框大小';

// 面板位置（视口内 left/top，px）。桌面端生效；null 时由 onOpen 初始化到右下角。
const panelPos = ref({ x: null, y: null });
const isMobileView = ref(typeof window !== 'undefined' && window.innerWidth <= 480);
if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    isMobileView.value = window.innerWidth <= 480;
    if (!isMobileView.value) ensurePanelPos();
  });
}

// 直接写 width/height/left/top（不依赖 CSS 变量，保证一定生效）。
// 移动端返回空对象，完全交给媒体查询的全屏样式。
const panelStyle = computed(() => {
  if (isMobileView.value) return {};
  const s = {
    width: panelWidth.value + 'px',
    height: panelHeight.value + 'px',
  };
  if (panelPos.value.x !== null) {
    s.left = panelPos.value.x + 'px';
    s.top = panelPos.value.y + 'px';
  }
  return s;
});

function clampPanelPos(x, y) {
  const maxX = window.innerWidth - 40;
  const maxY = window.innerHeight - 40;
  const minX = -(panelWidth.value - 120); // 允许部分移出右侧
  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(0, Math.min(maxY, y)),
  };
}

function ensurePanelPos() {
  if (panelPos.value.x !== null) return;
  panelPos.value = clampPanelPos(
    window.innerWidth - panelWidth.value - 24,
    window.innerHeight - panelHeight.value - 24
  );
}

// 八向尺寸调节：edges 为 'n'/'s'/'e'/'w' 的组合（如 'nw' 表示左上角）。
// 拖左缘(w)/上缘(n) 时同步移动 left/top，使被拖的那条边真正跟随光标，
// 而不是只把右/下边缘外扩（之前左缘手柄的 bug 就源于此）。
function startResize(e, edges) {
  if (isMobileView.value) return;
  ensurePanelPos();
  const point = e.touches ? e.touches[0] : e;
  const startX = point.clientX;
  const startY = point.clientY;
  const startW = panelWidth.value;
  const startH = panelHeight.value;
  const startPos = { ...panelPos.value };
  const hasW = edges.includes('w');
  const hasE = edges.includes('e');
  const hasN = edges.includes('n');
  const hasS = edges.includes('s');

  function onMove(ev) {
    const cur = ev.touches ? ev.touches[0] : ev;
    const dx = cur.clientX - startX;
    const dy = cur.clientY - startY;
    let w = startW;
    let h = startH;
    if (hasE) w = startW + dx;
    else if (hasW) w = startW - dx;
    if (hasS) h = startH + dy;
    else if (hasN) h = startH - dy;

    const maxH = Math.min(RESIZE_MAX_H, window.innerHeight - 48);
    w = Math.max(RESIZE_MIN_W, Math.min(RESIZE_MAX_W, w));
    h = Math.max(RESIZE_MIN_H, Math.min(maxH, h));

    // 让锚定边（右/下固定，左/上随光标移动）停留，反推 left/top
    let l = startPos.x;
    let t = startPos.y;
    if (hasW) l = startPos.x + (startW - w);
    if (hasN) t = startPos.y + (startH - h);
    l = Math.max(0, Math.min(window.innerWidth - w, l));
    t = Math.max(0, Math.min(window.innerHeight - 48, t));

    panelWidth.value = Math.round(w);
    panelHeight.value = Math.round(h);
    panelPos.value = { x: Math.round(l), y: Math.round(t) };
  }
  function onUp() {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    window.removeEventListener('touchmove', onMove);
    window.removeEventListener('touchend', onUp);
    document.body.style.userSelect = '';
  }
  document.body.style.userSelect = 'none';
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  window.addEventListener('touchmove', onMove, { passive: true });
  window.addEventListener('touchend', onUp);
}

// 头部拖拽：移动整个面板（按钮点击不触发）
function onPanelDragStart(e) {
  if (isMobileView.value) return;
  // 页面式布局由导航栏定位，不允许拖动。
  if (isPage.value) return;
  if (e.target.closest && e.target.closest('button')) return;
  ensurePanelPos();
  const point = e.touches ? e.touches[0] : e;
  const startX = point.clientX;
  const startY = point.clientY;
  const startPos = { ...panelPos.value };

  function onMove(ev) {
    const current = ev.touches ? ev.touches[0] : ev;
    panelPos.value = clampPanelPos(
      startPos.x + (current.clientX - startX),
      startPos.y + (current.clientY - startY)
    );
  }
  function onUp() {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    window.removeEventListener('touchmove', onMove);
    window.removeEventListener('touchend', onUp);
    document.body.style.userSelect = '';
  }
  document.body.style.userSelect = 'none';
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  window.addEventListener('touchmove', onMove, { passive: true });
  window.addEventListener('touchend', onUp);
}
const conversationSummary = ref('');

const MAX_HISTORY_MESSAGES = 12;
const MAX_SUMMARY_LENGTH = 900;
const WARNING_TEXT = {
  model_unavailable: { zh: '模型服务暂时不可用。', en: 'The model service is temporarily unavailable.' },
  plan_json_invalid: { zh: 'AI 规划结果无效，未执行工具。', en: 'The AI plan was invalid, so no tool was executed.' },
  skill_rejected: { zh: '该工具调用未通过安全校验。', en: 'The tool call did not pass validation.' },
  tool_unavailable: { zh: '所需工具暂时不可用。', en: 'The requested tool is unavailable.' },
  external_timeout: { zh: '当前未完成外部检索。', en: 'External search did not finish.' },
  external_unavailable: { zh: '外部检索服务暂时不可用。', en: 'External search is unavailable.' },
  external_no_results: { zh: '当前未检索到外部结果。', en: 'No external results were found.' },
  payload_truncated: { zh: '当前仅展示部分结果。', en: 'Only part of the result is shown.' },
  // ── 可核验相关：这些码原先没有中文文案，用户看到的是裸 code ──
  unverified_reference: { zh: '回答中存在未能核实的标识符，请展开「回答依据」核对。', en: 'Some identifiers could not be verified; expand the evidence panel to check.' },
  gene_not_found: { zh: '回答中提到的基因在当前数据中未找到，请以「回答依据」为准。', en: 'A gene mentioned in the reply was not found in the current data.' },
  // ── 跨分组基因比较相关 ──
  gene_not_in_any_group: { zh: '该基因在这些分组的数据中均未检到，可能不在该物种的基因注释里。', en: 'This gene was not detected in any of the compared groups.' },
  gene_symbol_normalized: { zh: '基因符号已按物种写法归一化（例如 MALAT1 → Malat1）。', en: 'The gene symbol was normalized to the species convention.' },
  missing_species: { zh: '需要指定物种（human / mouse）才能做分组比较。', en: 'A species (human/mouse) is required for group comparison.' },
  unsupported_species: { zh: '暂不支持该物种的分组比较。', en: 'Group comparison is not supported for this species.' },
  unsupported_group_by: { zh: '该分组维度暂不支持。', en: 'This grouping dimension is not supported.' },
  unsupported_reference_removed: { zh: '已移除回答中缺乏依据的引用。', en: 'Unsupported references were removed from the reply.' },
  knowledge_no_match: { zh: '知识库中暂无该术语/字段的条目，未作解释。', en: 'No knowledge entry matched this term or field.' },
  glossary_no_match: { zh: '术语表中暂无该缩写，未作解释。', en: 'No glossary entry matched this abbreviation.' },
  enrichment_empty: { zh: '该基因集未算出富集结果。', en: 'No enrichment result was computed for this gene set.' },
  plan_self_check_failed: { zh: '意图判断未通过自检，未执行任何工具。', en: 'Intent detection failed self-check; no tool was executed.' },
  route_not_in_catalog: { zh: '已剔除不在路由清单内的跳转链接。', en: 'Navigation links outside the route catalog were removed.' },
  final_call_failed: { zh: '最终回答生成失败。', en: 'The final answer could not be generated.' },
  // ── 失败类：这些码以前会以裸 code 的形式直接展示给用户 ──
  plan_rate_limited: { zh: '模型服务当前在限流，这一轮没有完成。等几秒点「重试这一问」即可。', en: 'The model service is rate-limiting requests. Retry in a few seconds.' },
  plan_call_failed: { zh: '这次没能连上模型服务，本轮没有查询任何数据。', en: 'The model service could not be reached, so nothing was queried.' },
  skill_http_failed: { zh: '查询接口没有返回结果，可能是后端暂时不可用。', en: 'The query endpoint returned nothing; the backend may be unavailable.' },
  tool_exception: { zh: '该工具执行时出现异常，这部分结果可能缺失。', en: 'A tool raised an exception; part of the result may be missing.' },
  tool_catalog_unavailable: { zh: '工具清单没有加载成功，本轮只能用离线能力回答。', en: 'The tool catalog failed to load; only offline capabilities were used.' },
  turn_aborted: { zh: '这次回答已被你停止。', en: 'You stopped this response.' },
  reply_replaced_by_glossary: { zh: '定义已按站内术语表校正。', en: 'The definition was replaced with the site glossary entry.' },
  reply_downgraded_to_verified_scope: { zh: '回答已收窄到可核实的内容。', en: 'The reply was narrowed to verified content only.' },
};

// ── Draggable FAB ──
const fabPos = ref({ x: 0, y: 0 }); // offset from default (bottom-right)
const dragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });
const posStart = ref({ x: 0, y: 0 });
const wasDragged = ref(false);

const fabStyle = computed(() => {
  if (fabPos.value.x === 0 && fabPos.value.y === 0) return {};
  return { transform: `translate(${fabPos.value.x}px, ${fabPos.value.y}px)` };
});

function onDragStart(e) {
  if (e.touches) e = e.touches[0];
  dragging.value = true;
  wasDragged.value = false;
  dragStart.value = { x: e.clientX, y: e.clientY };
  posStart.value = { x: fabPos.value.x, y: fabPos.value.y };
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd);
  document.addEventListener('touchmove', onDragMove, { passive: false });
  document.addEventListener('touchend', onDragEnd);
}

function onDragMove(e) {
  if (!dragging.value) return;
  if (e.touches) e = e.touches[0];
  const dx = e.clientX - dragStart.value.x;
  const dy = e.clientY - dragStart.value.y;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) wasDragged.value = true;
  // Clamp so FAB stays within viewport
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxX = vw - 76;  // 24 margin + 52 size
  const maxY = vh - 76;
  const minX = -vw + 76;
  const minY = -vh + 76;
  fabPos.value = {
    x: Math.max(minX, Math.min(maxX, posStart.value.x + dx)),
    y: Math.max(minY, Math.min(maxY, posStart.value.y + dy)),
  };
}

function onDragEnd() {
  dragging.value = false;
  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup', onDragEnd);
  document.removeEventListener('touchmove', onDragMove);
  document.removeEventListener('touchend', onDragEnd);
}

function onFabClick() {
  if (wasDragged.value) return;
  ensurePanelPos();
  open.value = true;
}

const isZh = computed(() => (locale.value || '').startsWith('zh'));

// ── P3：真实阶段提示 ──
// 编排层会回调 planning / tools / answering，这里只负责翻译成一句人话，
// 让"等待"变成"看得到进展"，而不是一个转圈到底。
const stage = ref('');
const STAGE_LABELS = {
  zh: { planning: '正在判断你的问题…', tools: '正在查询数据…', answering: '正在组织回答…' },
  en: { planning: 'Reading your question…', tools: 'Querying data…', answering: 'Writing the answer…' },
};
const stageText = computed(() => {
  const dict = STAGE_LABELS[isZh.value ? 'zh' : 'en'];
  return dict[stage.value] || '';
});

// ── P5：对话闭环（停止 / 重试 / 复制 / 不丢历史）──
// 这一层的共同点：都不需要模型配合，全是"用起来像没做完"的地方。
const stopLabel = computed(() => (isZh.value ? '停止生成' : 'Stop generating'));

// 每轮一个序号：停止后把序号 +1，在途请求的结果回来时对不上号就丢弃，
// 避免"明明点了停止，两秒后又冒出一条回答"。
const turnSeq = ref(0);
const abortRef = ref(null);
const copiedIndex = ref(-1);
let copiedTimer = null;

// 失败后可以一键重试的告警码：这些是"外部服务抖动/超时"，重试有意义；
// 而 gene_not_found 这类是数据事实，重试只会得到同样结果。
const RETRYABLE_WARNINGS = new Set([
  'plan_rate_limited',
  'plan_call_failed',
  'plan_json_invalid',
  'plan_self_check_failed',
  'final_call_failed',
  'skill_http_failed',
  'tool_exception',
  'tool_catalog_unavailable',
]);
function isRetryableWarnings(list = []) {
  return (Array.isArray(list) ? list : []).some(item => {
    const code = typeof item === 'string' ? item : (item?.code || item?.type || '');
    return RETRYABLE_WARNINGS.has(code);
  });
}

// 面板名字由 profile 决定（使用助手 / 数据助手）：名字只在一处维护，不再硬编码在这里。
const assistantTitle = computed(() => profileTitle(props.profile, locale.value));
const emptyTitle = computed(() => (isZh.value ? '我可以帮助你' : 'I can help with'));
const deleteLabel = computed(() => (isZh.value ? '删除这条对话' : 'Delete this chat'));
const hasRegisteredContext = computed(() => {
  const business = agentContext.value?.businessState || {};
  const plot = agentContext.value?.plotState || {};
  return Boolean(business.selectedGene || business.selectedCellType || business.selectedCluster || business.selectedRegion || business.selectedPeak || business.selectedMotif || Object.keys(plot).length);
});
const statusText = computed(() => {
  if (hasRegisteredContext.value) return isZh.value ? '在线 · 已读取页面状态' : 'Online · page state ready';
  return isZh.value ? '在线 · ssMOOD 范围内' : 'Online · ssMOOD scope';
});

const agentContext = computed(() => buildAgentContext(route, locale.value));


const suggestedPrompts = computed(() => {
  // 使用助手给「怎么用 / 名词解释」类示例；数据助手保留按页面类型的推荐。
  if (props.profile !== 'data') return profileHints(props.profile, locale.value);
  const type = agentContext.value?.businessState?.omicsType;

  // 每条提示词都必须"点了就有结果"，所以只写有工具支撑的说法：
  //   有打开的数据集 → describe_current_page / get_celltype_composition
  //                    / get_gene_expression_summary / get_deg_summary
  //   没有数据集（/ai 首页）→ summarize_gene_across_datasets（自带跨数据集检索）
  //                    / search 意图（search_datasets）/ explain.threshold
  //                    / explain_domain_knowledge
  // 因此删掉了没有对应实现的「推荐一个分析流程」这类空话。
  if (isZh.value) {
    return type
      ? [
        '解释当前页面',
        '这个样本的细胞类型组成是什么？',
        'MALAT1 在这个样本里表达吗？',
        '这个样本有哪些差异表达基因？'
      ]
      : [
        'MALAT1 在小鼠各脑区的表达',
        '小鼠空间转录组有哪些样本？',
        'padj 0.03 算显著吗？',
        '空间转录组和单细胞有什么区别？'
      ];
  }
  return type
    ? [
      'Explain this page',
      'What is the cell-type composition of this sample?',
      'Is MALAT1 expressed in this sample?',
      'Which genes are differentially expressed here?'
    ]
    : [
      'How is MALAT1 expressed across mouse brain regions?',
      'Which spatial samples are available for mouse?',
      'Is a padj of 0.03 significant?',
      'Spatial vs single-cell: what is the difference?'
    ];
});

// ── 引用样本 ──
// 候选走 agentSampleCatalog：与前端列表页同一个接口、同一套展示口径，
// 因此样本名和页面完全一致，也不再有「最多 10 条」的限制（全部样本都在列表里）。
// 选中的样本以气泡挂到输入区，可删除、可拖动排序，发送时并入问题让 AI 精确定位。
const MAX_REF_RENDER = 300;
const sampleCatalog = ref([]);
const catalogLoading = ref(false);
const sampleKeyword = ref('');
const showAllSamples = ref(false);
const selectedSamples = ref([]);
const dragIndex = ref(-1);
const overIndex = ref(-1);

// 当前页语境：优先展示与本页面相关的样本。
const contextScope = computed(() => {
  const context = agentContext.value || {};
  const entity = context.entity || {};
  const business = context.businessState || {};
  return {
    omicsType: String(entity.omicsType || business.omicsType || '').trim().toUpperCase(),
    // 页面上报的物种可能是 Human / human / 人类，统一成 key 再比对。
    species: normalizeSpeciesKey(entity.species || business.species || ''),
    brainRegion: String(entity.brainRegion || entity.tissue || business.brainRegion || '').trim(),
    condition: String(entity.condition || business.condition || '').trim(),
  };
});

const hasContextScope = computed(() => {
  const scope = contextScope.value;
  return Boolean(scope.omicsType || scope.species || scope.brainRegion || scope.condition);
});

// 命中的语境维度越多越靠前：切到「全部」时，本页相关的样本仍排在前面。
function scopeScore(item) {
  const scope = contextScope.value;
  let score = 0;
  if (scope.omicsType && item.omicsType === scope.omicsType) score += 4;
  if (scope.species && item.speciesKey === scope.species) score += 2;
  if (scope.brainRegion && item.brainRegion === scope.brainRegion) score += 1;
  if (scope.condition && item.condition === scope.condition) score += 1;
  return score;
}

const matchedSamples = computed(() => {
  if (showAllSamples.value || !hasContextScope.value) return sampleCatalog.value;
  const scope = contextScope.value;
  return sampleCatalog.value.filter(item => (
    (!scope.omicsType || item.omicsType === scope.omicsType)
    && (!scope.species || item.speciesKey === scope.species)
    && (!scope.brainRegion || item.brainRegion === scope.brainRegion)
    && (!scope.condition || item.condition === scope.condition)
  ));
});

const keywordSamples = computed(() => {
  const keyword = sampleKeyword.value.trim().toLowerCase();
  if (!keyword) return matchedSamples.value;
  return matchedSamples.value.filter(item => item.searchIndex.includes(keyword));
});

// ── 筛选（类型 / 物种 / 性别 / 脑区）──
// 空字符串表示"不限"。可选值全部从目录现算，不写死，新增数据集后按钮会自动出现。
const sampleFilters = ref({ omics: '', species: '', sex: '', region: '' });
const activeFilterCount = computed(() => Object.values(sampleFilters.value).filter(Boolean).length);

const filterOptions = computed(() => {
  const omics = new Set();
  const species = new Set();
  const sexes = new Set();
  const regions = new Set();
  for (const item of sampleCatalog.value) {
    if (item.omicsType) omics.add(item.omicsType);
    if (item.speciesKey) species.add(item.speciesKey);
    if (item.sex) sexes.add(String(item.sex).toLowerCase());
    if (item.brainRegion) regions.add(item.brainRegion);
  }
  return {
    omics: [...omics].sort(),
    species: [...species].sort(),
    sexes: [...sexes].sort(),
    regions: [...regions].sort(),
  };
});

function setSampleFilter(key, value) {
  sampleFilters.value[key] = value;
}

// 同一个值再点一次＝取消，省得每次都回上面点"全部"
function toggleSampleFilter(key, value) {
  sampleFilters.value[key] = sampleFilters.value[key] === value ? '' : value;
}

function resetSampleFilters() {
  sampleFilters.value = { omics: '', species: '', sex: '', region: '' };
}

const filteredSamples = computed(() => {
  const f = sampleFilters.value;
  if (!activeFilterCount.value) return keywordSamples.value;
  return keywordSamples.value.filter(item => (
    (!f.omics || item.omicsType === f.omics)
    && (!f.species || item.speciesKey === f.species)
    && (!f.sex || String(item.sex || '').toLowerCase() === f.sex)
    && (!f.region || item.brainRegion === f.region)
  ));
});

// 渲染上限只是防止一次塞进上千个 DOM 节点；超出部分提示继续输入关键词缩小范围。
const visibleSamples = computed(() => (
  [...filteredSamples.value]
    .sort((a, b) => (scopeScore(b) - scopeScore(a)) || a.label.localeCompare(b.label))
    .slice(0, MAX_REF_RENDER)
));
const hiddenSampleCount = computed(() => Math.max(filteredSamples.value.length - visibleSamples.value.length, 0));

async function loadSampleCatalogOnce({ force = false } = {}) {
  catalogLoading.value = true;
  try {
    sampleCatalog.value = await loadSampleCatalog({ force });
  } catch (e) {
    sampleCatalog.value = [];
  } finally {
    catalogLoading.value = false;
  }
}

// 面板打开时按需加载（目录在进程内缓存，重复开关只拉一次）；面板关闭时不请求。
watch(open, isOpen => {
  if (isOpen) loadSampleCatalogOnce();
});

function isSampleSelected(id) {
  return selectedSamples.value.some(item => item.id === id);
}

function toggleSample(sample) {
  const index = selectedSamples.value.findIndex(item => item.id === sample.id);
  if (index >= 0) selectedSamples.value.splice(index, 1);
  else selectedSamples.value.push({ ...sample });
}

function removeSample(index) {
  selectedSamples.value.splice(index, 1);
}

function clearSelectedSamples() {
  selectedSamples.value = [];
}

// 样本选择面板：从输入框上方展开（原左侧栏已取消，功能整体搬到这里）
const pickerOpen = ref(false);
const samplePickerEl = ref(null);

function toggleSamplePicker() {
  pickerOpen.value = !pickerOpen.value;
  // 首次展开时按需拉一次目录；已有缓存则不重复请求
  if (pickerOpen.value && !sampleCatalog.value.length && !catalogLoading.value) {
    loadSampleCatalogOnce();
  }
}

// 点在选择器 / 历史下拉之外（对话区、输入框等）时收起
function onSamplePickerOutside(event) {
  if (pickerOpen.value) {
    const el = samplePickerEl.value;
    if (el && !el.contains(event.target)) pickerOpen.value = false;
  }
  if (historyOpen.value && !event.target?.closest?.('.ss-chat-history')) {
    historyOpen.value = false;
  }
}
onMounted(() => {
  document.addEventListener('mousedown', onSamplePickerOutside);
  // 刷新/切页回来时接回本轮对话（只存轻量内容，见 persistChat）
  restoreChat();
});
onBeforeUnmount(() => document.removeEventListener('mousedown', onSamplePickerOutside));

function moveSample(from, to) {
  if (from < 0 || to < 0 || from === to) return;
  const list = selectedSamples.value.slice();
  if (from >= list.length || to >= list.length) return;
  list.splice(to, 0, ...list.splice(from, 1));
  selectedSamples.value = list;
}

function onBubbleDragStart(index, event) {
  dragIndex.value = index;
  if (event?.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    try { event.dataTransfer.setData('text/plain', String(index)); } catch (e) { /* 部分浏览器限制写剪贴板，忽略 */ }
  }
}

function onBubbleDragOver(index) {
  if (dragIndex.value >= 0 && index !== dragIndex.value) overIndex.value = index;
}

function onBubbleDragEnd() {
  dragIndex.value = -1;
  overIndex.value = -1;
}

function onBubbleDrop(index) {
  moveSample(dragIndex.value, index);
  onBubbleDragEnd();
}

// 触屏拖不动的场景用键盘兜底：Alt + ←/→ 移动气泡。
function onBubbleKey(index, event) {
  if (!event?.altKey) return;
  const last = selectedSamples.value.length - 1;
  if (event.key === 'ArrowLeft' && index > 0) {
    event.preventDefault();
    moveSample(index, index - 1);
    focusBubble(index - 1);
  } else if (event.key === 'ArrowRight' && index < last) {
    event.preventDefault();
    moveSample(index, index + 1);
    focusBubble(index + 1);
  }
}

async function focusBubble(index) {
  await nextTick();
  const nodes = document.querySelectorAll('.ss-ref-bubble');
  if (nodes[index]) nodes[index].focus();
}

// 引用的样本随问题一起发出：模型拿到的是真实样本名，用户也看得懂自己引用了什么。
function buildUserMessage(text = '') {
  if (!selectedSamples.value.length) return text;
  const head = isZh.value ? '引用样本（用户已勾选）：' : 'Referenced samples (selected by user):';
  const lines = selectedSamples.value.map((item, index) => (
    `${index + 1}. ${item.label}${item.meta ? `（${item.meta}）` : ''}`
  ));
  const body = [head, ...lines].join('\n');
  return text ? `${text}\n\n${body}` : body;
}

// 勾选的样本结构化交给模型：这些都是确认过的真实字段，模型不必靠样本名去猜，
// 也不能自己把缩写展开成没出现过的词。
function referencedSamplesPayload() {
  return selectedSamples.value.map(item => ({
    datasetId: item.id,
    label: item.label,
    species: item.species,
    brainRegion: item.brainRegion,
    condition: item.condition,
    sex: item.sex,
    age: item.age,
    technology: item.technology,
    cells: item.cells,
    omicsType: item.omicsType,
    // 详情页链接带进来，回答里就能给可点的具体入口，而不是让用户去列表页自己找。
    route: item.route,
  }));
}

// 用户消息气泡文案：优先显示纯提问文本（引用样本已单独以气泡呈现），
// 避免正文与气泡重复。m.content 仍保留完整「引用样本」文本，供多轮对话的模型历史使用，不影响回答。
function bubbleText(m) {
  if (!m) return '';
  if (m.role === 'user') {
    // 已发送的消息都带 text 字段：即使问题为空（只勾选了样本）也用 ''，
    // 绝不能回退到含「引用样本」整段文本的 content，否则气泡上方又会冒出那段文字。
    if (m.text != null) return m.text;
    return m.content || '';
  }
  return m.content || '';
}

async function send() {
  if ((!input.value.trim() && !selectedSamples.value.length) || loading.value) return;
  const question = input.value.trim();
  const samples = selectedSamples.value.map(item => ({ label: item.label, meta: item.meta }));
  // 必须在清空 selectedSamples 之前取快照：
  // 之前把 referencedSamplesPayload() 写在清空之后，工具收到的永远是空数组，
  // 导致「引用样本」只体现在文字里、结构化数据没传下去（多选样本出图也因此退化）。
  const referencedSamples = referencedSamplesPayload();
  const userMsg = buildUserMessage(question);
  input.value = '';
  selectedSamples.value = [];
  if (inputEl.value) inputEl.value.style.height = 'auto';

  messages.value.push({
    role: 'user',
    content: userMsg,
    text: question,
    samples,
    // 存进消息本身：重试时不用再问用户"你刚才勾了哪几个样本"
    referenced: referencedSamples,
  });
  await scrollToEnd();
  await runTurn({ userMsg });
}

// 一轮完整请求：发送 → 渲染 → 失败处理。
// 抽出来是为了让「重试」复用同一条路径，而不是把 send 的逻辑抄一遍。
async function runTurn({ userMsg }) {
  const myTurn = ++turnSeq.value;
  const controller = new AbortController();
  abortRef.value = controller;
  loading.value = true;
  stage.value = 'planning';
  persistChat();

  try {
    // 编排全部在本机前端完成：Plan → 工具执行 → Final(后端含后置校验)。
    updateConversationSummary();
    const lastUser = [...messages.value].reverse().find(item => item.role === 'user');
    const data = await runAgentTurn({
      locale: locale.value,
      // 把勾选的样本结构化进 pageContext，工具可直接按这些 id 精确统计，
      // 不必依赖模型从自然语言中猜样本名。
      context: { ...agentContext.value, referencedSamples: lastUser?.referenced || [] },
      history: messages.value.slice(0, -1),
      userMessage: userMsg,
      conversationSummary: conversationSummary.value,
      // profile 决定本轮可见的工具与意图（使用助手不带数据工具）。
      profile: props.profile,
      // 真实阶段：判断意图 → 查数据 → 组织回答
      onStage: next => {
        if (myTurn !== turnSeq.value) return;
        stage.value = next;
        scrollToEnd();
      },
      // 用户点「停止」时真的中断在途请求，而不只是让界面看起来停了
      signal: controller.signal,
    });

    // 已停止 / 已被新一轮取代：这一轮的迟到结果直接丢弃
    if (myTurn !== turnSeq.value) return;
    if (data?.stopped) return;

    const fullText = data.reply || (isZh.value ? '暂时没有可用回答。' : 'No usable response was returned.');

    // 内容开始出现前先撤掉 typing 气泡，避免和逐行出现的内容叠在一起
    loading.value = false;
    stage.value = '';

    messages.value.push({
      role: 'assistant',
      content: fullText,
      text: '',
      actions: [],
      warnings: [],
      evidence: null,
    });
    // push 进去的是原始对象，后续修改必须走数组里的响应式代理，否则视图不会更新
    const liveMsg = messages.value[messages.value.length - 1];
    await scrollToEnd();

    // 先让文字逐行出现，再把卡片/依据补上：顺序更像"先说结论，再给入口"
    await revealByBlocks(liveMsg, fullText);
    // 逐行呈现期间用户可能已经点了停止：别再往这条消息上挂卡片
    if (myTurn !== turnSeq.value) return;

    liveMsg.actions = Array.isArray(data.actions) ? data.actions : [];
    liveMsg.warnings = Array.isArray(data.warnings) ? data.warnings : [];
    liveMsg.evidence = data.evidence || null;
    // 有失败告警才给「重试」：成功时多一个按钮只会让人犹豫点哪个
    liveMsg.retryable = isRetryableWarnings(liveMsg.warnings);
    persistChat();
    // 图内嵌进来后高度会突然涨一大截：不追一次滚动，用户只能看到图的上半截
    if (inlinePlotActions(liveMsg.actions).length) {
      await nextTick();
      await scrollToEnd();
    }
  } catch (e) {
    if (myTurn !== turnSeq.value) return;
    const devDetail = process.env.NODE_ENV !== 'production' && e?.message ? `\n\n${e.message}` : '';
    messages.value.push({
      role: 'assistant',
      content: (isZh.value ? '抱歉，智能助手暂时无法响应，请稍后再试。' : 'Sorry, I had trouble responding. Please try again later.') + devDetail,
      text: '',
      actions: [],
      warnings: [],
      // 抛异常基本都是瞬时问题（断网/后端 5xx），重试是最合理的下一步
      retryable: true,
    });
    persistChat();
  } finally {
    if (myTurn === turnSeq.value) {
      loading.value = false;
      stage.value = '';
      abortRef.value = null;
      await scrollToEnd();
    }
  }
}

// 停止生成：中断请求 + 让在途结果作废 + 留一条"已停止"的痕迹。
// 不写这条痕迹的话，用户会怀疑按钮没生效（对话区毫无变化）。
function stopTurn() {
  if (!loading.value) return;
  turnSeq.value += 1;
  try { abortRef.value?.abort(); } catch (e) { /* 已结束的请求再 abort 是安全的 */ }
  abortRef.value = null;
  loading.value = false;
  stage.value = '';

  messages.value.push({
    role: 'assistant',
    content: '',
    text: '',
    notice: isZh.value ? '已停止这次回答。' : 'Stopped this response.',
    actions: [],
    warnings: [],
  });
  persistChat();
  scrollToEnd();
}

// 重试：把失败那条撤掉，用同一问题同一批引用样本再跑一轮。
// 先撤再跑，避免重试成功后对话里并排出现两条回答。
async function retryMessage(index) {
  if (loading.value) return;
  const prevUser = [...messages.value.slice(0, index)].reverse().find(item => item.role === 'user');
  if (!prevUser) return;
  messages.value.splice(index, 1);
  await runTurn({ userMsg: prevUser.content });
}

async function copyMessage(index, msg) {
  const text = String(msg?.content || '').trim();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    // 非 HTTPS 或旧浏览器没有 clipboard API：用一次性 textarea 兜底
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    try { document.execCommand('copy'); } catch (err) { /* 复制失败不打断对话 */ }
    document.body.removeChild(el);
  }
  copiedIndex.value = index;
  if (copiedTimer) clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => { copiedIndex.value = -1; }, 1600);
}

// ── 多轮会话（sessionStorage）──
// 之前只存"当前这一条"：关掉标签页就没了，也没法回看上周那轮。
// 现在存「会话列表 + 当前 id」，并保留旧格式（纯消息数组）的迁移路径。
//
// 不无脑存的原因不变：绘图卡带几千个坐标点，塞进 sessionStorage 会吃满配额；
// 表格卡只有 20 行 × 8 列（约 3KB），保留下来——否则刷新后回答里写着"见下表"，表却没了。
const PERSIST_MAX_MESSAGES = 20;
const PERSIST_MAX_BYTES = 512 * 1024;
const HEAVY_ACTION_TYPES = new Set(['plot', 'plot_card']);
const chatStoreKey = computed(() => ChatStore.chatStoreKey(props.profile, isPage.value ? 'page' : 'bubble'));
const legacyChatKey = computed(() => ChatStore.legacyStoreKey(props.profile, isPage.value ? 'page' : 'bubble'));

const sessionList = ref([]);
const activeSessionId = ref('');
const historyOpen = ref(false);

const sessionTitle = computed(() => ChatStore.titleFromQuestion(ChatStore.firstUserText(messages.value)));
const historyItems = computed(() => sessionList.value.map(item => ({
  id: item.id,
  title: item.title || ChatStore.titleFromQuestion(ChatStore.firstUserText(item.messages)) || (isZh.value ? '未命名对话' : 'Untitled chat'),
  at: item.at,
  active: item.id === activeSessionId.value,
  count: Array.isArray(item.messages) ? item.messages.length : 0,
})));

function relativeTime(at) {
  return ChatStore.relativeTime(at, { locale: locale.value });
}

function persistableActions(list, { dropTables = false } = {}) {
  return (Array.isArray(list) ? list : [])
    .filter(action => action && !HEAVY_ACTION_TYPES.has(action.type))
    .filter(action => !(dropTables && action.type === 'table_card'))
    .map(action => {
      if (action.type === 'table_card') {
        return { ...action, rows: (action.rows || []).slice(0, 20) };
      }
      return JSON.parse(JSON.stringify(action));
    });
}

function buildChatPayload({ maxMessages, dropTables }) {
  return messages.value.slice(-maxMessages).map(m => ({
    role: m.role,
    content: m.content || '',
    text: m.text ?? '',
    samples: Array.isArray(m.samples) ? m.samples : [],
    referenced: Array.isArray(m.referenced) ? m.referenced : [],
    actions: persistableActions(m.actions, { dropTables }),
    warnings: Array.isArray(m.warnings) ? m.warnings : [],
    notice: m.notice || '',
    retryable: Boolean(m.retryable),
    // 绘图卡存不下（坐标上千点），但正文还写着"见下方图表"。
    // 恢复时标记一下，界面上明说"图没保存"，比留一句无图可看的文字诚实。
    plotOmitted: (Array.isArray(m.actions) ? m.actions : []).some(isPlotActionType),
  }));
}

// 三级降级：正常 → 去掉表格卡 → 只留最近 8 条。
// sessionStorage 一般 5MB，但同一域下还有别的键，不能假设全归我们。
function buildPersistableMessages() {
  const attempts = [
    { maxMessages: PERSIST_MAX_MESSAGES, dropTables: false },
    { maxMessages: PERSIST_MAX_MESSAGES, dropTables: true },
    { maxMessages: 8, dropTables: true },
  ];
  for (const options of attempts) {
    const list = buildChatPayload(options);
    if (JSON.stringify(list).length <= PERSIST_MAX_BYTES / 2) return list;
  }
  return buildChatPayload({ maxMessages: 8, dropTables: true });
}

function persistChat() {
  try {
    const list = buildPersistableMessages();
    if (!list.length) return;
    const id = activeSessionId.value || ChatStore.createSessionId();
    activeSessionId.value = id;
    const store = ChatStore.upsertSession(
      { activeId: id, sessions: sessionList.value },
      { id, title: sessionTitle.value, at: Date.now(), messages: list }
    );
    sessionList.value = store.sessions;
    window.sessionStorage.setItem(chatStoreKey.value, ChatStore.serializeStore(store));
  } catch (e) {
    // 配额满 / 隐私模式：宁可不存，也不能让对话本身报错
  }
}

function restoreChat() {
  try {
    const raw = window.sessionStorage.getItem(chatStoreKey.value)
      || window.sessionStorage.getItem(legacyChatKey.value);
    const store = ChatStore.parseStore(raw);
    if (!store.sessions.length) return;
    sessionList.value = store.sessions;
    activeSessionId.value = store.activeId;
    // activeId 为空 = 上次处于「新对话」状态，不自动接回旧会话
    const active = store.activeId ? store.sessions.find(item => item.id === store.activeId) : null;
    if (active) messages.value = active.messages;
  } catch (e) {
    // 存的内容坏了就当作没有历史
  }
}

function ask(prompt) {
  input.value = prompt;
  send();
}


// 开启新对话：旧的留在历史里，不删（这是它和垃圾桶的区别）
function startNewChat() {
  persistChat();
  activeSessionId.value = '';
  messages.value = [];
  conversationSummary.value = '';
  input.value = '';
  selectedSamples.value = [];
  historyOpen.value = false;
  if (inputEl.value) inputEl.value.style.height = 'auto';
  // 显式把 activeId 写成空：刷新后回到"空对话"，而不是又跳回上一条
  try {
    window.sessionStorage.setItem(chatStoreKey.value, ChatStore.serializeStore({ activeId: '', sessions: sessionList.value }));
  } catch (e) { /* 忽略 */ }
}

// 删除当前这条：从历史里也一并移除
function deleteCurrentSession() {
  const id = activeSessionId.value;
  messages.value = [];
  conversationSummary.value = '';
  input.value = '';
  selectedSamples.value = [];
  activeSessionId.value = '';
  historyOpen.value = false;
  if (inputEl.value) inputEl.value.style.height = 'auto';
  try {
    const store = ChatStore.removeSession({ activeId: id, sessions: sessionList.value }, id);
    sessionList.value = store.sessions;
    if (!store.sessions.length) window.sessionStorage.removeItem(chatStoreKey.value);
    else window.sessionStorage.setItem(chatStoreKey.value, ChatStore.serializeStore(store));
  } catch (e) { /* 忽略 */ }
}

function switchSession(id) {
  if (!id || id === activeSessionId.value) { historyOpen.value = false; return; }
  persistChat();
  const target = sessionList.value.find(item => item.id === id);
  if (!target) return;
  activeSessionId.value = id;
  messages.value = target.messages.map(item => ({ ...item }));
  conversationSummary.value = '';
  historyOpen.value = false;
  persistChat();
  scrollToEnd();
}

function deleteSession(id) {
  if (!id) return;
  const store = ChatStore.removeSession({ activeId: activeSessionId.value, sessions: sessionList.value }, id);
  sessionList.value = store.sessions;
  if (!store.sessions.length) {
    activeSessionId.value = '';
    messages.value = [];
    try { window.sessionStorage.removeItem(chatStoreKey.value); } catch (e) { /* 忽略 */ }
    return;
  }
  try {
    window.sessionStorage.setItem(chatStoreKey.value, ChatStore.serializeStore(store));
  } catch (e) { /* 忽略 */ }
  if (id === activeSessionId.value) {
    // 删掉的是当前这条：接着打开最近的一条，别让对话区空着但历史里还有内容
    activeSessionId.value = store.activeId;
    const next = store.sessions.find(item => item.id === store.activeId);
    messages.value = next ? next.messages.map(item => ({ ...item })) : [];
  }
}

// 导出诊断日志：记录只有「意图 / 工具 / 耗时 / 失败原因」，不含提问原文。
// 排查"为什么答不上来"时先看这个，再决定改提示词、改代码还是改数据口径。
function exportTurnLog() {
  const records = getTurnRecords();
  if (!records.length) {
    const note = isZh.value ? '还没有可导出的对话记录。' : 'No conversation records to export yet.';
    messages.value.push({ role: 'assistant', content: note, text: note, actions: [], warnings: [], evidence: null });
    scrollToEnd();
    return;
  }
  const summary = summarizeTurns();
  console.info('[agent] 诊断汇总', summary);
  downloadTurnLog();
}

function updateConversationSummary() {
  const oldMessages = messages.value.slice(0, -MAX_HISTORY_MESSAGES);
  if (!oldMessages.length) return;
  const contextText = summarizeContextForHistory();
  const historyText = oldMessages
    .slice(-8)
    .map(m => `${m.role}: ${truncateText(m.content, 180)}`)
    .join(' | ');
  conversationSummary.value = truncateText([conversationSummary.value, contextText, historyText].filter(Boolean).join(' | '), MAX_SUMMARY_LENGTH);
}

function summarizeContextForHistory() {
  const business = agentContext.value?.businessState || {};
  return [agentContext.value?.pageType, business.omicsType, business.datasetId, business.selectedGene, business.selectedCellType, business.selectedTrait, business.activeTab]
    .filter(Boolean)
    .join(' · ');
}

function truncateText(text = '', max = 1200) {
  const value = String(text || '');
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function runAction(action) {
  if (!isValidAction(action)) return;
  const routeTarget = actionRoute(action);
  if ((action.type === 'navigate' || action.type === 'dataset_card' || action.type === 'gene_card' || action.type === 'glossary_card') && routeTarget) {
    router.push(routeTarget);
    open.value = false;
    return;
  }
  if (action.type === 'plot' || action.type === 'plot_card') {
    activePlotAction.value = action;
    plotModalOpen.value = true;
    return;
  }
  // 术语 → 表格列：在平台页面的表格里高亮对应列
  if (action.type === 'focus_column') {
    focusColumnInPage(action);
  }
}

// 表头文案归一化：去掉空白、统一小写，便于中/英/带单位（Pct.1 (%)）的匹配
function normalizeHeaderText(text = '') {
  return String(text || '').replace(/\s+/g, '').toLowerCase();
}

function pushAssistantNote(text) {
  messages.value.push({ role: 'assistant', content: text, text, actions: [], warnings: [], evidence: null });
  scrollToEnd();
}

// 术语 → 表格列（P4）：按页面自描述里的列名，在真实表格中高亮这一列。
// 找不到就明确告诉用户，而不是让按钮点了没反应。
function focusColumnInPage(action = {}) {
  const column = String(action.column || '');
  const names = [action.label, action.term, column].map(normalizeHeaderText).filter(Boolean);
  if (!names.length) return;

  let headerCell = null;
  let columnIndex = -1;
  let table = null;
  for (const candidate of document.querySelectorAll('table')) {
    const headers = [...candidate.querySelectorAll('thead th')];
    const index = headers.findIndex(th => {
      const text = normalizeHeaderText(th.innerText);
      return text && names.some(name => text === name || text.includes(name));
    });
    if (index >= 0) {
      headerCell = headers[index];
      columnIndex = index;
      table = candidate;
      break;
    }
  }

  if (!table) {
    pushAssistantNote(isZh.value
      ? `当前页面上没有「${action.label || column}」这一列，先打开包含它的表格再点一次即可。`
      : `No "${action.label || column}" column on this page. Open the table that contains it and try again.`);
    return;
  }

  headerCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
  // Element Plus 的表头与表体是两个独立的 <table>：只查 header 所在的 table 会拿不到数据行，
  // 因此往外找到整个表格容器再取同序号的单元格（普通 table 下 container 就是 table 本身）。
  const container = headerCell.closest('.el-table') || table;
  const cells = [...container.querySelectorAll(`tbody tr td:nth-child(${columnIndex + 1})`)];
  [headerCell, ...cells].forEach(cell => cell.classList.add('ss-col-focus'));
  setTimeout(() => {
    [headerCell, ...cells].forEach(cell => cell.classList.remove('ss-col-focus'));
  }, 2600);
}

// 筛选建议卡的 chip：跳到对应列表页。列表页会读取 URL 上的
// species / sex / area / tissue 参数并自动勾选，所以 chip 带了筛选条件时一并带上。
function runFilterChip(chip = {}) {
  const raw = String(chip.route || '').trim();
  if (!raw) return;
  // 后端若在 chip 上带了筛选参数（params / query / filters），拼进 URL，
  // 这样列表页落地就能把对应 chip 勾上；只保留列表页认识的键，其余忽略。
  const params = chip.params || chip.query || chip.filters;
  let target = raw;
  if (params && typeof params === 'object' && !raw.includes('?')) {
    const allowedKeys = ['species', 'sex', 'area', 'tissue'];
    const query = Object.entries(params)
      .filter(([key, value]) => allowedKeys.includes(key) && value)
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join('&');
    if (query) target = `${raw}?${query}`;
  }
  if (!isSafeRoute(target)) return;
  router.push(target);
  open.value = false;
}

function isExecutableAction(action = {}) {
  if (!isValidAction(action)) return false;
  // 新四类卡片自带交互（排序/下载/chip），不作为整卡按钮点击。
  if (isRichAction(action)) return false;
  if (action.type === 'navigate' || action.type === 'dataset_card' || action.type === 'gene_card') return Boolean(actionRoute(action));
  if (action.type === 'plot' || action.type === 'plot_card') return true;
  if (action.type === 'glossary_card') return Boolean(action.route);
  if (action.type === 'focus_column') return Boolean(action.column || action.term);
  return false;
}

function isValidAction(action = {}) {
  const allowedTypes = [
    'navigate', 'dataset_card', 'gene_card', 'plot', 'plot_card', 'warning_card', 'external_evidence_card', 'glossary_card',
    // 新增四类：表格 / 知识 / 筛选建议 / 数据导读，由前端本地组装。
    'table_card', 'knowledge_card', 'filter_card', 'data_guide_card',
    // P4：术语 → 表格列定位
    'focus_column',
    // P4：澄清选项（可点胶囊）
    'clarify_card',
  ];
  return Boolean(action && allowedTypes.includes(action.type));
}

// 新四类卡片走独立渲染区（可排序表格、可点 chip、可折叠知识卡），
// 不再挤在按钮列表里。数据不合法时不渲染，只保留文字回复。
const RICH_ACTION_TYPES = ['table_card', 'knowledge_card', 'filter_card', 'data_guide_card', 'clarify_card'];

function isRichAction(action = {}) {
  return RICH_ACTION_TYPES.includes(action?.type);
}

function isRichActionRenderable(action = {}) {
  if (!isRichAction(action)) return false;
  if (action.type === 'table_card') {
    return Array.isArray(action.columns) && action.columns.length > 0
      && Array.isArray(action.rows) && action.rows.length > 0;
  }
  if (action.type === 'knowledge_card') {
    if (!action.key) return false;
    return Boolean(action.fullName || action.chineseName || action.description || action.explanation);
  }
  if (action.type === 'filter_card') {
    return Array.isArray(action.chips) && action.chips.length > 0;
  }
  if (action.type === 'data_guide_card') {
    const entity = action.entity || {};
    const selection = action.selection || {};
    return Object.keys(entity).length > 0 || Object.keys(selection).length > 0;
  }
  if (action.type === 'clarify_card') {
    return Array.isArray(action.options) && action.options.length > 0;
  }
  return false;
}

function richActions(actions) {
  return (Array.isArray(actions) ? actions : []).filter(action => isValidAction(action) && isRichActionRenderable(action));
}

function cardKey(messageIndex, cardIndex) {
  return `${messageIndex}:${cardIndex}`;
}

// 表格排序状态按「消息序号:卡片序号」隔离，互不干扰。
const tableSort = ref({});

function toggleTableSort(key, column) {
  const current = tableSort.value[key];
  if (current && current.col === column) {
    tableSort.value[key] = { col: column, dir: current.dir === 'asc' ? 'desc' : 'asc' };
    return;
  }
  tableSort.value[key] = { col: column, dir: 'asc' };
}

function tableSortColumn(key) {
  return tableSort.value[key]?.col || '';
}

function tableSortDirection(key) {
  return tableSort.value[key]?.dir || 'asc';
}

function sortedTableRows(key, card = {}) {
  const rows = Array.isArray(card.rows) ? [...card.rows] : [];
  const state = tableSort.value[key];
  if (!state?.col) return rows;
  const direction = state.dir === 'asc' ? 1 : -1;
  return rows.sort((a, b) => {
    const left = a?.[state.col];
    const right = b?.[state.col];
    const leftNumber = Number(left);
    const rightNumber = Number(right);
    const bothNumeric = left !== '' && right !== '' && !Number.isNaN(leftNumber) && !Number.isNaN(rightNumber);
    if (bothNumeric) return (leftNumber - rightNumber) * direction;
    return String(left ?? '').localeCompare(String(right ?? '')) * direction;
  });
}

function downloadTableCsv(card = {}) {
  const columns = Array.isArray(card.columns) ? card.columns : [];
  const rows = Array.isArray(card.rows) ? card.rows : [];
  if (!columns.length) return;
  const escapeCell = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = [columns.map(escapeCell).join(',')];
  rows.forEach(row => lines.push(columns.map(column => escapeCell(row?.[column])).join(',')));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${String(card.label || 'table').replace(/[\\/:*?"<>|]/g, '_')}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

// 知识卡折叠：命中多条时默认只展开第一条。
const expandedCards = ref({});

function isCardExpanded(messageIndex, cardIndex) {
  const key = cardKey(messageIndex, cardIndex);
  if (expandedCards.value[key] === undefined) return cardIndex === 0;
  return expandedCards.value[key];
}

function toggleCard(messageIndex, cardIndex) {
  const key = cardKey(messageIndex, cardIndex);
  expandedCards.value[key] = !isCardExpanded(messageIndex, cardIndex);
}

// 「回答依据」折叠：默认收起，避免遮住正文；有未核实表述时默认展开提醒用户。
const evidenceOpen = ref({});

function hasEvidence(message = {}) {
  const evidence = message?.evidence;
  if (!evidence) return false;
  return (Array.isArray(evidence.sources) && evidence.sources.length > 0)
    || (Array.isArray(evidence.unverified) && evidence.unverified.length > 0);
}

function isEvidenceOpen(messageIndex) {
  if (evidenceOpen.value[messageIndex] === undefined) {
    return Array.isArray(messages.value[messageIndex]?.evidence?.unverified)
      && messages.value[messageIndex].evidence.unverified.length > 0;
  }
  return evidenceOpen.value[messageIndex];
}

function toggleEvidence(messageIndex) {
  evidenceOpen.value[messageIndex] = !isEvidenceOpen(messageIndex);
}

function thresholdLevelText(level = '') {
  const map = {
    very_strong: '极显著', strong: '很显著', significant: '显著', not_significant: '不显著',
    large: '幅度大', moderate: '中等', small: '幅度小',
    specific: '特异性强', weak: '特异性弱',
    notable: '较明显', enriched: '有富集', depleted: '未富集',
    high: '靠前', low: '靠后',
    strict: '严格档', medium: '中等档', loose: '宽松档',
    normal: '正常', inflated: '存在膨胀',
  };
  return map[level] || level;
}

function entityLine(entity = {}, max = 6) {
  return Object.entries(entity)
    .filter(([, value]) => value !== '' && value !== null && value !== undefined)
    .slice(0, max)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' · ');
}

// 模块导读行：每个模块一行「模块名（选中了什么 · 可见几行）」，
// 让「当前页数据导读」按模块分层，而不是把整页状态混成一串。
function moduleLines(modules = []) {
  if (!Array.isArray(modules)) return [];
  return modules.map(module => {
    const label = module.label || module.id || '';
    const parts = [];
    const selection = entityLine(module.selection || {}, 3);
    if (selection) parts.push(selection);
    if (module.note) parts.push(String(module.note));
    const suffix = parts.length ? `（${parts.join(' · ')}）` : '';
    return `${module.active ? '▸ ' : ''}${label}${suffix}`;
  }).filter(Boolean);
}

function actionRoute(action = {}) {
  let target = '';
  if (action.route) target = action.route;
  if (!target && action.type === 'dataset_card') {
    const id = encodeURIComponent(action.traitId || action.datasetId || '');
    const type = String(action.omicsType || '').toUpperCase();
    if (id && type === 'SC') target = `/browse/SingleCell/${id}`;
    if (id && type === 'ST') target = `/browse/SpatialTranscriptome/${id}`;
    if (id && type === 'ATAC') target = `/browse/atac/${id}`;
    if (id && type === 'GWAS') target = `/browse/gwas/${id}`;
  }
  if (!target && action.type === 'gene_card') {
    target = action.route || '';
  }
  if (!target && action.type === 'glossary_card') {
    target = action.route || '';
  }
  return isSafeRoute(target) ? target : '';
}

// 用 vue-router 自己判断目标能否打开：手写正则会随路由表漂移，
// router.resolve 匹配的才是真实存在的路由，拼错的路径直接判为不可用。
function isSafeRoute(routeTarget = '') {
  const target = String(routeTarget || '').trim();
  if (!target || target.includes('://') || target.startsWith('//') || /^javascript:/i.test(target)) return false;
  try {
    const resolved = router.resolve(target);
    return Boolean(resolved && resolved.matched && resolved.matched.length);
  } catch (e) {
    return false;
  }
}

function closePlotModal() {
  plotModalOpen.value = false;
  activePlotAction.value = null;
}

function actionCardKind(action = {}) {
  if (action.type === 'navigate') return 'route';
  if (action.type === 'plot' || action.type === 'plot_card') return 'plot';
  if (action.type === 'dataset_card') return 'dataset';
  if (action.type === 'gene_card') return 'gene';
  if (action.type === 'warning_card') return 'warning';
  if (action.type === 'external_evidence_card') return 'evidence';
  if (action.type === 'glossary_card') return 'glossary';
  if (action.type === 'table_card') return 'table';
  if (action.type === 'knowledge_card') return 'knowledge';
  if (action.type === 'filter_card') return 'filter';
  if (action.type === 'data_guide_card') return 'guide';
  if (action.type === 'focus_column') return 'focus';
  if (action.type === 'clarify_card') return 'clarify';
  return 'generic';
}

function actionCardIcon(action = {}) {
  const kind = actionCardKind(action);
  if (kind === 'glossary') return action.route ? 'GO' : 'TERM';
  if (kind === 'route') return 'GO';
  if (kind === 'plot') return 'PLOT';
  if (kind === 'dataset') return 'DATA';
  if (kind === 'gene') return 'GENE';
  if (kind === 'warning') return 'WARN';
  if (kind === 'evidence') return 'REF';
  if (kind === 'table') return 'TBL';
  if (kind === 'knowledge') return 'DOC';
  if (kind === 'filter') return 'FLT';
  if (kind === 'guide') return 'READ';
  if (kind === 'focus') return 'COL';
  if (kind === 'clarify') return 'ASK';
  return 'ACT';
}

function actionCardTitle(action = {}) {
  // 列定位卡的 label 是列名本身（用于匹配表头），标题要写成人话
  if (action.type === 'focus_column') {
    const column = action.label || action.column || action.term || '';
    return isZh.value ? `在表格中定位 ${column}` : `Locate ${column} in the table`;
  }
  if (action.label || action.title) return action.label || action.title;
  if (action.type === 'warning_card') return isZh.value ? '工具提示' : 'Tool notice';
  if (action.type === 'external_evidence_card') return isZh.value ? '外部证据' : 'External evidence';
  if (action.type === 'glossary_card') return action.term || (isZh.value ? '术语解释' : 'Glossary');
  if (!isValidAction(action)) return isZh.value ? '未知操作' : 'Unknown action';
  return action.type;
}

// 导航卡片上把 URL 里的筛选参数翻译成人话（?species=mouse&sex=female → 物种=小鼠 · 性别=雌性）
const ROUTE_FILTER_META = {
  species: { zh: '物种', en: 'Species', values: { mouse: { zh: '小鼠', en: 'Mouse' }, human: { zh: '人', en: 'Human' } } },
  sex: { zh: '性别', en: 'Sex', values: { male: { zh: '雄性', en: 'Male' }, female: { zh: '雌性', en: 'Female' } } },
  area: { zh: '脑区', en: 'Region' },
  // 后端 build_navigation_action 用的是 brainRegion，卡片上也要能显示出来
  brainRegion: { zh: '脑区', en: 'Region' },
  tissue: { zh: '组织', en: 'Tissue' },
};

function describeRouteFilters(routeTarget) {
  const raw = String(routeTarget || '');
  const queryIndex = raw.indexOf('?');
  if (queryIndex < 0) return '';
  const query = raw.slice(queryIndex + 1).split('#')[0];
  const lang = isZh.value ? 'zh' : 'en';
  const parts = [];
  for (const pair of query.split('&')) {
    const [key, value] = pair.split('=');
    if (!key || !value) continue;
    const conf = ROUTE_FILTER_META[key];
    if (!conf) continue;
    const decoded = decodeURIComponent(value);
    parts.push(`${conf[lang]}=${conf.values?.[decoded]?.[lang] || decoded}`);
  }
  return parts.join(' · ');
}

function actionCardMeta(action = {}) {
  if (action.type === 'navigate') {
    const target = String(actionRoute(action) || '');
    const filters = describeRouteFilters(target);
    if (filters) return filters;
    return isSafeRoute(target) ? target.split('?')[0] : (isZh.value ? '路由未通过安全校验' : 'Route failed validation');
  }
  if (action.type === 'table_card') {
    const shown = Array.isArray(action.rows) ? action.rows.length : 0;
    const total = Number(action.rowCount || shown);
    return total > shown ? `${shown}/${total} 行 · 点击表头排序` : `${shown} 行 · 点击表头排序`;
  }
  if (action.type === 'knowledge_card') {
    const typeText = { term: '术语', field: '字段', threshold: '阈值' }[action.knowledgeType] || action.knowledgeType || '';
    return [typeText, action.appliesTo].filter(Boolean).join(' · ');
  }
  if (action.type === 'filter_card') return action.note || '点击跳转后筛选';
  if (action.type === 'focus_column') {
    return isZh.value ? '点击高亮页面上这一列' : 'Click to highlight this column';
  }
  if (action.type === 'data_guide_card') {
    const parts = [];
    if (Array.isArray(action.capabilities) && action.capabilities.length) {
      // 用中文说明替换 select_cluster 之类的内部字段名。
      parts.push(describeCapabilities(action.capabilities, locale.value).join('、'));
    }
    if (action.visibleDataCount) parts.push(`可见 ${action.visibleDataCount} 行`);
    return parts.join(' · ');
  }
  if (action.type === 'glossary_card') {
    const base = [action.fullName, action.chineseName].filter(Boolean).join(' · ');
    if (action.route) return base ? `${base} · ${isZh.value ? '点击查看数据集' : 'Open dataset'}` : (isZh.value ? '点击查看数据集' : 'Open dataset');
    return base;
  }
  if (action.type === 'dataset_card') {
    const params = action.params || {};
    return [action.omicsType, params.species, params.condition, params.brainRegion || params.category, action.datasetId]
      .filter(Boolean)
      .slice(0, 4)
      .join(' · ');
  }
  if (action.type === 'warning_card') return warningText(action.warning || action);
  if (action.type === 'external_evidence_card') return externalEvidenceMeta(action);
  if (action.description) return action.description;
  if (action.route) return isSafeRoute(action.route) ? action.route : (isZh.value ? '路由未通过安全校验' : 'Route failed validation');
  if (action.plotType) return action.plotType;
  if (action.datasetId) return action.datasetId;
  if (action.gene) return action.gene;
  const params = action.params || action.payload?.params;
  if (params && typeof params === 'object') {
    return Object.entries(params).slice(0, 3).map(([key, value]) => `${key}: ${value}`).join(' · ');
  }
  return '';
}

// 术语卡片正文：全称/中文/解释中的解释段，仅 glossary_card 有内容。
function actionCardDetail(action = {}) {
  if (action?.type !== 'glossary_card') return '';
  const parts = [action.explanation || action.description || ''];
  if (action.source) parts.push(isZh.value ? `出处：${action.source}` : `Source: ${action.source}`);
  return parts.filter(Boolean).join(' ');
}

// 两类卡片不渲染：数据不合法的术语卡片（fallback 为纯文字），
// 以及路由打不开的导航卡片——否则用户会看到点了没反应的死链。
function renderableActions(actions) {
  return (Array.isArray(actions) ? actions : []).filter(action => {
    // 新四类走独立渲染区，不进按钮列表。
    if (isRichAction(action)) return false;
    if (action?.type === 'glossary_card') {
      if (!action.term) return false;
      return Boolean(action.fullName || action.chineseName || action.explanation);
    }
    if (action?.type === 'navigate' || action?.type === 'dataset_card' || action?.type === 'gene_card') {
      return Boolean(actionRoute(action));
    }
    return true;
  });
}

// 绘图动作在 AI 页面直接内嵌，其余场景（气泡面板）仍渲染成可点卡片。
// 只内嵌"真的有坐标"的动作：后端回显的那份 payload 常是空的，
// 内嵌出来会是一块空白画布，不如留成卡片（点开时还有明确的错误提示）。
function isPlotActionType(action) {
  return action?.type === 'plot' || action?.type === 'plot_card';
}

function inlinePlotActions(actions = []) {
  if (!isPage.value) return [];
  return (Array.isArray(actions) ? actions : []).filter(action => (
    isPlotActionType(action)
    && Array.isArray(action?.payload?.data)
    && action.payload.data.length > 0
  ));
}

// 卡片列表里要剔除已内嵌的图，否则同一张图会出现两次（图 + "PLOT …" 卡片）
function chipActions(actions = []) {
  const inline = new Set(inlinePlotActions(actions));
  return renderableActions(actions).filter(action => !inline.has(action));
}

function openPlotWindow(action) {
  activePlotAction.value = action;
  plotModalOpen.value = true;
}

// 内部质检类提示：记录进诊断日志就够了，不必占用用户注意力。
// 它们说明的是"我们做了哪些校验"（比如"词表没这条""移除了没依据的引用"），
// 而不是"你的数据或操作有问题"——放在回答下面只会让人以为出错了。
const SILENT_WARNING_CODES = new Set([
  'knowledge_no_match',
  'glossary_no_match',
  'unsupported_reference_removed',
  'unverified_reference',
  'reply_downgraded_to_verified_scope',
  'unsupported_offer_neutralized',
  'route_not_in_catalog',
  'gene_symbol_normalized',
  // 定义被词表校正：正文里已经给了带来源的定义，再挂一句"已校正"只是自证清白
  'reply_replaced_by_glossary',
  // 答案被数据库结果替换（原先声称"没有数据"）：正文已是真实数据，不必再提示
  'missing_data_recomputed',
]);

function visibleWarnings(list) {
  return (Array.isArray(list) ? list : []).filter(item => {
    const code = typeof item === 'string' ? item : (item?.code || item?.type || item?.errorType || '');
    return !SILENT_WARNING_CODES.has(code);
  });
}

function warningText(warning = {}) {
  const code = typeof warning === 'string' ? warning : (warning.code || warning.type || warning.errorType || '');
  const mapped = WARNING_TEXT[code];
  if (mapped) return isZh.value ? mapped.zh : mapped.en;
  const message = warning.message || warning.label || warning.description || code;
  if (!message) return isZh.value ? '工具返回了提示。' : 'The tool returned a notice.';
  return process.env.NODE_ENV === 'production' ? truncateText(message, 160) : truncateText(message, 260);
}

function externalEvidenceMeta(action = {}) {
  const payload = action.payload || action;
  const count = Array.isArray(payload.sources) ? payload.sources.length : Number(payload.sourceCount || 0);
  const status = payload.status || payload.errorType || '';
  if (status) return warningText({ errorType: status, message: payload.message });
  if (count) return isZh.value ? `${count} 条来源摘要` : `${count} source summaries`;
  return payload.summary || payload.description || '';
}

function autoResize(e) {
  const el = e.target;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

async function scrollToEnd() {
  await nextTick();
  if (bodyEl.value) bodyEl.value.scrollTop = bodyEl.value.scrollHeight;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// 逐行渐显：后端是一次性返回整段 JSON（没有 SSE），这里在"已拿到答案"之后
// 按行推进，做出"逐字在写"的观感。按行而不是按字符，避免出现半截 ** 或半行表格。
async function revealByBlocks(msg, fullText) {
  const text = String(fullText || '');
  // 短回复或单行回复不值得逐行出现，直接给结果
  if (text.length < 60 || !text.includes('\n')) {
    msg.text = text;
    await nextTick();
    return;
  }
  const lines = text.split('\n');
  let shown = '';
  for (let i = 0; i < lines.length; i++) {
    shown += (i ? '\n' : '') + lines[i];
    msg.text = shown;
    await nextTick();
    scrollToEnd();
    await sleep(lines[i].trim() ? 38 : 16);
  }
  msg.text = text;
  await nextTick();
}

function formatMessage(text) {
  // 模型稳定地写 Markdown（标题 / 列表 / 表格 / 粗体）。
  // 早期只把换行换成 <br>，于是表格变成一堆竖线、嵌套列表塌成一行；
  // 渲染与转义都在 markdownLite 里做（先转义再解析，v-html 不会执行模型给的标签）。
  return renderMarkdown(text);
}
</script>

<style scoped>
/* FAB — draggable */
.ss-chat-fab {
  position: fixed;
  bottom: 24px; right: 24px;
  width: 52px; height: 52px;
  border-radius: 50%;
  border: none;
  /* 浅一点的气泡：深海军蓝 → 中浅蓝渐变，阴影同步减淡 */
  background: linear-gradient(145deg, #7cabda, #5588c4);
  color: white;
  cursor: grab;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 18px rgba(74,127,193,0.26), 0 0 0 0 rgba(140,185,230,0.45);
  z-index: 999;
  transition: box-shadow 0.2s, background 0.2s;
  animation: chatFabPulse 3s ease-in-out infinite 5s;
  user-select: none;
}
.ss-chat-fab:hover { background: linear-gradient(145deg, #8cb8e4, #6398d2); }
.ss-chat-fab:active { cursor: grabbing; }
@keyframes chatFabPulse {
  0%,100% { box-shadow: 0 4px 18px rgba(74,127,193,0.26), 0 0 0 0 rgba(140,185,230,0.45); }
  50% { box-shadow: 0 4px 18px rgba(74,127,193,0.26), 0 0 0 10px rgba(140,185,230,0); }
}
.ss-chat-fab-pulse { display: none; }

/* Panel — dark theme matching design */
.ss-chat-panel {
  position: fixed;
  bottom: 24px; right: 24px;
  width: 380px; height: 560px; /* 默认尺寸，实际由 panelStyle 内联覆盖 */
  max-height: calc(100vh - 48px);
  background: #0d1829;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.45);
  border: 1px solid rgba(74,127,193,0.22);
  display: flex; flex-direction: column;
  z-index: 999;
  overflow: hidden;
  font-family: var(--ss-font);
}
.ss-chat-slide-enter-active, .ss-chat-slide-leave-active {
  transition: opacity 0.22s ease, transform 0.25s cubic-bezier(0.22,1,0.36,1);
}
.ss-chat-slide-enter-from, .ss-chat-slide-leave-to {
  opacity: 0; transform: translateY(20px) scale(0.97);
}

/* Header */
.ss-chat-head {
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  display: flex; justify-content: space-between; align-items: center;
  flex-shrink: 0;
}
.ss-chat-head-l { display: flex; align-items: center; gap: 10px; }
.ss-chat-avatar {
  width: 32px; height: 32px; border-radius: 8px;
  background: rgba(74,127,193,0.18);
  display: flex; align-items: center; justify-content: center;
  color: white;
}
.ss-chat-title { font-size: 14px; font-weight: 600; color: #fff; }
.ss-chat-status {
  font-size: 10.5px;
  color: rgba(145,190,235,0.85);
  display: flex; align-items: center; gap: 6px;
  margin-top: 1px;
}
.ss-chat-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #5dd6a0;
  box-shadow: 0 0 8px #5dd6a0;
}
.ss-chat-head-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
.ss-chat-close,
.ss-chat-icon-btn {
  width: 26px;
  height: 26px;
  background: none;
  border: none;
  color: rgba(255,255,255,0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  cursor: pointer;
  transition: 0.15s;
}
.ss-chat-close:hover,
.ss-chat-icon-btn:hover { color: rgba(255,255,255,0.8); }

/* ── 历史对话下拉 ── */
.ss-chat-history { position: relative; display: flex; }
.ss-chat-history-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 240px;
  max-height: 300px;
  overflow-y: auto;
  padding: 6px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.12);
  background: var(--ss-chat-panel-bg, rgba(18,24,33,0.98));
  box-shadow: 0 12px 30px rgba(0,0,0,0.45);
  z-index: 20;
}
.ss-chat-history-head {
  padding: 4px 8px 6px;
  font-size: 10.5px;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.38);
}
.ss-chat-history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 8px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: rgba(224,234,246,0.88);
  font-family: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}
.ss-chat-history-item:hover { background: rgba(255,255,255,0.07); }
.ss-chat-history-item.is-active { background: rgba(74,127,193,0.22); color: #fff; }
.ss-chat-history-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ss-chat-history-time { flex: none; font-size: 10.5px; color: rgba(255,255,255,0.38); }
.ss-chat-history-del {
  flex: none;
  width: 16px;
  height: 16px;
  line-height: 15px;
  text-align: center;
  border-radius: 4px;
  color: rgba(255,255,255,0.32);
}
.ss-chat-history-del:hover { background: rgba(226,96,76,0.28); color: #fff; }
.ss-chat-history-empty {
  padding: 10px 8px;
  font-size: 11.5px;
  color: rgba(255,255,255,0.38);
}



/* Body */
.ss-chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 18px;
  display: flex; flex-direction: column;
  gap: 12px;
}
.ss-chat-body::-webkit-scrollbar { width: 3px; }
.ss-chat-body::-webkit-scrollbar-thumb {
  background: rgba(74,127,193,0.30); border-radius: 2px;
}

.ss-chat-empty { padding: 12px 0; }
.ss-chat-empty-title {
  font-size: 12px;
  color: rgba(255,255,255,0.62);
  margin-bottom: 12px;
  text-align: center;
}
.ss-chat-prompts {
  display: flex; flex-wrap: wrap; gap: 6px;
  justify-content: center;
}
.ss-chat-prompt-chip {
  background: rgba(74,127,193,0.10);
  border: 1px solid rgba(74,127,193,0.36);
  color: rgba(150,190,235,0.95);
  font-size: 11px; padding: 4px 11px;
  border-radius: 100px;
  cursor: pointer;
  transition: 0.15s;
  font-family: var(--ss-font);
}
.ss-chat-prompt-chip:hover {
  background: rgba(74,127,193,0.20);
  color: rgba(196,220,246,1);
}

/* Messages */
.ss-chat-msg { display: flex; }
.ss-chat-msg > div {
  display: flex;
  flex-direction: column;
  max-width: 88%;
}
.ss-chat-msg--user { justify-content: flex-end; }
.ss-chat-msg--user > div { align-items: flex-end; }
.ss-chat-msg--assistant { justify-content: flex-start; }
.ss-chat-msg--assistant > div { align-items: flex-start; }
.ss-chat-bubble {
  display: inline-block;
  width: fit-content;
  max-width: 100%;
  padding: 10px 13px;
  font-size: 12.5px;
  line-height: 1.65;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}
.ss-chat-msg--user > div {
  max-width: 96%;
}
.ss-chat-msg--user .ss-chat-bubble {
  background: var(--ss-primary);
  color: #fff;
  border-radius: 10px 10px 0 10px;
}
.ss-chat-msg--assistant .ss-chat-bubble {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(215,230,250,0.90);
  border-radius: 0 10px 10px 10px;
}
.ss-chat-bubble :deep(code) {
  font-family: var(--ss-mono);
  font-size: 11px;
  background: rgba(0,0,0,0.35);
  color: #a8d8a8;
  padding: 1px 5px;
  border-radius: 3px;
}

/* ── Markdown 排版（模型回答里的标题 / 列表 / 表格）── */
.ss-chat-bubble :deep(p) { margin: 0 0 7px; }
.ss-chat-bubble :deep(p:last-child) { margin-bottom: 0; }
.ss-chat-bubble :deep(.md-heading) {
  margin: 10px 0 5px;
  font-size: 12px;
  letter-spacing: 0.2px;
}
.ss-chat-bubble :deep(.md-heading:first-child) { margin-top: 0; }
.ss-chat-bubble :deep(ul),
.ss-chat-bubble :deep(ol) {
  margin: 0 0 7px;
  padding-left: 18px;
}
.ss-chat-bubble :deep(li) { margin: 2px 0; }
.ss-chat-bubble :deep(li > ul),
.ss-chat-bubble :deep(li > ol) { margin: 3px 0 0; }
.ss-chat-bubble :deep(blockquote) {
  margin: 0 0 7px;
  padding: 4px 9px;
  border-left: 2px solid rgba(140, 185, 230, 0.45);
  opacity: 0.85;
}
.ss-chat-bubble :deep(pre) {
  margin: 0 0 7px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.3);
  overflow-x: auto;
}
.ss-chat-bubble :deep(pre code) { background: none; padding: 0; color: inherit; }
.ss-chat-bubble :deep(hr) {
  margin: 9px 0;
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.14);
}
/* 表格：气泡很窄，宽表横向滚动而不是顶破布局 */
.ss-chat-bubble :deep(.md-table-wrap) {
  margin: 0 0 8px;
  max-width: 100%;
  overflow-x: auto;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
}
.ss-chat-bubble :deep(table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  line-height: 1.5;
}
.ss-chat-bubble :deep(th),
.ss-chat-bubble :deep(td) {
  padding: 5px 9px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  white-space: nowrap;
  text-align: left;
}
.ss-chat-bubble :deep(th) {
  background: rgba(255, 255, 255, 0.07);
  font-weight: 600;
}
.ss-chat-bubble :deep(tr:last-child td) { border-bottom: none; }
.ss-chat-bubble :deep(th:last-child),
.ss-chat-bubble :deep(td:last-child) { border-right: none; }
.ss-chat-msg--user .ss-chat-bubble :deep(code) {
  background: rgba(255,255,255,0.18);
  color: #fff;
}
.ss-chat-warnings {
  display: grid;
  gap: 6px;
  margin-top: 7px;
  width: 100%;
}
.ss-chat-warning {
  border: 1px solid rgba(240,160,122,0.24);
  border-radius: 7px;
  background: rgba(240,160,122,0.08);
  color: rgba(244,207,190,0.92);
  padding: 7px 9px;
  font-size: 11px;
  line-height: 1.5;
}

/* ── 回复的轻量操作：复制（hover 出现，避免每条回复都挂一排按钮）── */
.ss-chat-msg-tools {
  display: flex;
  gap: 8px;
  margin-top: 6px;
  opacity: 0;
  transition: opacity 0.15s;
}
.ss-chat-msg:hover .ss-chat-msg-tools,
.ss-chat-msg-tools:focus-within { opacity: 1; }
.ss-chat-tool-btn {
  border: none;
  background: transparent;
  color: rgba(190,210,235,0.55);
  font-size: 11px;
  font-family: inherit;
  line-height: 1;
  padding: 4px 6px;
  border-radius: 5px;
  cursor: pointer;
}
.ss-chat-tool-btn:hover { color: rgba(215,230,250,0.95); background: rgba(255,255,255,0.07); }

/* 停止/中断的痕迹 */
.ss-chat-notice {
  margin-top: 6px;
  font-size: 11px;
  color: rgba(255,255,255,0.42);
}

/* 失败后的重试条：给一个"继续"的动作，而不是让用户重新打字 */
.ss-chat-retry-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}
.ss-chat-retry-btn {
  border: 1px solid rgba(74,127,193,0.45);
  background: rgba(74,127,193,0.16);
  color: rgba(215,230,250,0.92);
  font-size: 11.5px;
  font-family: inherit;
  padding: 5px 11px;
  border-radius: 999px;
  cursor: pointer;
}
.ss-chat-retry-btn:hover:not(:disabled) { background: rgba(74,127,193,0.28); }
.ss-chat-retry-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.ss-chat-actions {
  display: grid;
  gap: 7px;
  margin-top: 8px;
  width: 100%;
}

/* 内嵌图：必须显式占满这一列，否则在 flex 父级里会缩成内容宽度（实测只有 598px） */
.ss-chat-inline-plots {
  width: 100%;
  max-width: 760px;
}
.ss-chat-action-card {
  width: 100%;
  min-height: 46px;
  border: 1px solid rgba(122,203,170,0.30);
  border-radius: 8px;
  background: rgba(122,203,170,0.08);
  color: rgba(220,238,230,0.92);
  padding: 8px 9px;
  cursor: pointer;
  font-family: var(--ss-font);
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  text-align: left;
}
.ss-chat-action-card:hover:not(:disabled) {
  background: rgba(122,203,170,0.14);
}
.ss-chat-action-card:disabled {
  cursor: default;
  opacity: 0.78;
}
.ss-chat-action-card--route {
  border-color: rgba(100,155,205,0.38);
  background: rgba(74,127,193,0.10);
}
.ss-chat-action-card--route:hover { background: rgba(74,127,193,0.17); }
.ss-chat-action-card--plot {
  border-color: rgba(240,160,122,0.34);
  background: rgba(240,160,122,0.09);
}
.ss-chat-action-card--plot:hover:not(:disabled) { background: rgba(240,160,122,0.15); }
.ss-chat-action-card--warning {
  border-color: rgba(240,160,122,0.30);
  background: rgba(240,160,122,0.08);
}
.ss-chat-action-card--evidence {
  border-color: rgba(158,196,232,0.30);
  background: rgba(74,127,193,0.08);
}
/* 术语卡片：全称 + 中文名 + 解释 */
.ss-chat-action-card--glossary {
  border-color: rgba(158,196,232,0.34);
  background: rgba(74,127,193,0.10);
}
.ss-chat-action-card--glossary:hover:not(:disabled) { background: rgba(74,127,193,0.16); }
.ss-chat-action-detail {
  font-size: 10.5px;
  line-height: 1.55;
  white-space: normal;
  color: rgba(200,220,240,0.72);
  margin-top: 3px;
}
.ss-chat-action-icon {
  height: 24px;
  border-radius: 6px;
  background: rgba(255,255,255,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(230,240,250,0.78);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0;
}
.ss-chat-action-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ss-chat-action-main strong {
  color: rgba(240,247,255,0.94);
  font-size: 11.5px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ss-chat-action-main em {
  color: rgba(190,212,232,0.58);
  font-size: 10px;
  font-style: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── 富卡片：表格 / 知识 / 筛选建议 / 数据导读 ── */
.ss-chat-richcards {
  display: grid;
  gap: 7px;
  margin-top: 7px;
  width: 100%;
}
.ss-chat-rich {
  border: 1px solid rgba(122,203,170,0.30);
  border-radius: 8px;
  background: rgba(122,203,170,0.07);
  padding: 8px 9px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}
.ss-chat-rich--knowledge {
  border-color: rgba(158,196,232,0.34);
  background: rgba(74,127,193,0.09);
}
.ss-chat-rich--filter {
  border-color: rgba(240,160,122,0.32);
  background: rgba(240,160,122,0.08);
}
.ss-chat-rich--guide {
  border-color: rgba(158,196,232,0.30);
  background: rgba(74,127,193,0.08);
}
.ss-chat-rich-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  cursor: default;
}
.ss-chat-rich-head strong {
  color: rgba(240,247,255,0.94);
  font-size: 11.5px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ss-chat-rich-toggle {
  font-size: 10px;
  color: rgba(100,155,205,0.80);
  flex-shrink: 0;
}
.ss-chat-rich-btn {
  flex-shrink: 0;
  font-size: 9.5px;
  padding: 2px 7px;
  border-radius: 5px;
  border: 1px solid rgba(122,203,170,0.40);
  background: rgba(122,203,170,0.12);
  color: rgba(220,238,230,0.92);
  cursor: pointer;
  font-family: var(--ss-font);
}
.ss-chat-rich-btn:hover { background: rgba(122,203,170,0.22); }
.ss-chat-rich-meta {
  font-size: 10px;
  color: rgba(190,212,232,0.58);
  line-height: 1.45;
}
/* 澄清选项：一排可点胶囊，点一下直接作为下一轮提问发出 */
.ss-chat-clarify-chips {
  display: flex; flex-wrap: wrap; gap: 6px;
  margin-top: 2px;
}
.ss-chat-clarify-chip {
  border: 1px solid rgba(122,203,170,0.45);
  background: rgba(122,203,170,0.12);
  color: rgba(224,245,235,0.96);
  font-size: 11.5px; font-family: inherit; line-height: 1.3;
  padding: 5px 11px; border-radius: 999px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.ss-chat-clarify-chip:hover {
  background: rgba(122,203,170,0.22);
  border-color: rgba(122,203,170,0.80);
}
/* 页面版是浅色底：胶囊改成白底深字，否则浅字配浅底看不见 */
.ss-chat-panel--page .ss-chat-clarify-chip {
  background: #fff;
  border-color: rgba(74,127,193,0.35);
  color: #2f5f96;
}
.ss-chat-panel--page .ss-chat-clarify-chip:hover {
  background: #f2f7ff;
  border-color: rgba(74,127,193,0.70);
}
.ss-chat-rich-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ss-chat-rich-line {
  font-size: 10.5px;
  line-height: 1.55;
  color: rgba(200,220,240,0.80);
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  overflow-wrap: break-word;
}
/* 当前所在模块：单独一行高亮，让「我在哪个模块」一眼可见 */
.ss-chat-rich-line--module {
  color: #7acbaa;
  font-weight: 600;
}
.ss-chat-mod { white-space: normal; }
.ss-chat-rich-source {
  font-size: 9.5px;
  color: rgba(190,212,232,0.45);
}
/* 表格 */
.ss-chat-table-wrap {
  max-height: 220px;
  overflow: auto;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.07);
}
.ss-chat-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
}
.ss-chat-table th {
  position: sticky;
  top: 0;
  background: rgba(13,24,41,0.96);
  color: rgba(215,230,250,0.85);
  font-weight: 600;
  text-align: left;
  padding: 4px 6px;
  cursor: pointer;
  white-space: nowrap;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.ss-chat-table td {
  padding: 3px 6px;
  color: rgba(200,220,240,0.78);
  border-bottom: 1px solid rgba(255,255,255,0.05);
  white-space: nowrap;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ss-chat-sort { margin-left: 3px; color: #7acbaa; }
/* 回答依据 · 可核验 */
.ss-chat-evidence {
  width: 100%;
  margin-top: 8px;
  border: 1px solid rgba(122,203,170,0.22);
  border-radius: 8px;
  background: rgba(122,203,170,0.05);
  overflow: hidden;
}
.ss-chat-evidence-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 7px 10px;
  cursor: pointer;
  user-select: none;
}
.ss-chat-evidence-head strong {
  font-size: 11px; font-weight: 600;
  color: #7acbaa;
}
.ss-chat-evidence-body {
  padding: 0 10px 9px;
  display: flex; flex-direction: column; gap: 7px;
  max-height: 260px; overflow-y: auto;
}
.ss-chat-ev-group { display: flex; flex-direction: column; gap: 3px; }
.ss-chat-ev-label {
  font-size: 10px;
  color: rgba(190,212,232,0.62);
}
.ss-chat-ev-label em { font-style: normal; opacity: 0.75; }
.ss-chat-ev-item {
  display: flex; gap: 6px;
  font-size: 10px;
  line-height: 1.5;
}
.ss-chat-ev-key {
  flex: 0 0 auto;
  max-width: 38%;
  color: rgba(240,247,255,0.88);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ss-chat-ev-val {
  flex: 1 1 auto;
  min-width: 0;
  color: rgba(200,220,240,0.72);
  overflow-wrap: break-word;
}
.ss-chat-ev-unverified {
  font-size: 10px;
  color: #f0a76a;
  border-top: 1px solid rgba(255,255,255,0.06);
  padding-top: 6px;
}
.ss-chat-ev-ok {
  font-size: 10px;
  color: rgba(122,203,170,0.85);
  border-top: 1px solid rgba(255,255,255,0.06);
  padding-top: 6px;
}

/* 阈值表 */
.ss-chat-thresholds {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
}
.ss-chat-thresholds td {
  padding: 3px 5px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  vertical-align: top;
  color: rgba(200,220,240,0.80);
}
.ss-chat-thr-level { color: #7acbaa; white-space: nowrap; font-weight: 600; }
.ss-chat-thr-cond { font-family: var(--ss-mono); white-space: nowrap; }
.ss-chat-thr-mean { color: rgba(200,220,240,0.66); }
/* 筛选 chip */
.ss-chat-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.ss-chat-chip {
  font-size: 10px;
  padding: 3px 9px;
  border-radius: 100px;
  border: 1px solid rgba(240,160,122,0.40);
  background: rgba(240,160,122,0.10);
  color: rgba(244,207,190,0.92);
  cursor: pointer;
  font-family: var(--ss-font);
}
.ss-chat-chip:hover { background: rgba(240,160,122,0.20); }

/* Typing indicator：三点横向排列，沿水平方向做波浪移动（不再竖向跳动） */
.ss-chat-typing {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 12px 14px;
}
.ss-chat-typing span {
  width: 7px; height: 7px; border-radius: 50%;
  background: rgba(74,127,193,0.6);
  animation: ss-chat-typing 1.2s infinite ease-in-out both;
}
.ss-chat-typing span:nth-child(1) { animation-delay: 0s; }
.ss-chat-typing span:nth-child(2) { animation-delay: 0.18s; }
.ss-chat-typing span:nth-child(3) { animation-delay: 0.36s; }
@keyframes ss-chat-typing {
  0%, 100% { transform: translateX(0); opacity: 0.35; }
  50% { transform: translateX(6px); opacity: 1; }
}

/* 阶段文案：跟在三个点后面，说明当前在做什么 */
.ss-chat-stage {
  font-style: normal;
  margin-left: 4px;
  font-size: 12px;
  line-height: 1.2;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.58);
}
.ss-chat-panel--page .ss-chat-stage { color: #8b96a8; }

/* Footer */
.ss-chat-foot {
  padding: 12px 16px;
  border-top: 1px solid rgba(255,255,255,0.06);
  /* 纵向堆叠：引用气泡 / 候选区 / 转交提示 / 输入行，各占一行 */
  display: flex; flex-direction: column; align-items: stretch; gap: 10px;
  flex-shrink: 0;
}
/* 转交提示条：只在检测到「需要数据/出图」时出现 */
.ss-chat-handoff {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 8px 10px;
  border: 1px solid rgba(122,170,220,0.32);
  background: rgba(74,127,193,0.12);
  border-radius: 8px;
  font-size: 11.5px;
  line-height: 1.4;
  color: rgba(205,222,242,0.92);
}
.ss-chat-handoff button {
  flex-shrink: 0;
  border: 1px solid rgba(122,170,220,0.5);
  background: rgba(74,127,193,0.22);
  color: #dce9f8;
  font-size: 11.5px;
  font-family: inherit;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}
.ss-chat-handoff button:hover { background: rgba(74,127,193,0.38); }
.ss-chat-input-row { display: flex; align-items: flex-end; gap: 8px; }
.ss-chat-input {
  flex: 1;
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 8px;
  padding: 9px 13px;
  font-size: 12.5px;
  font-family: var(--ss-font);
  resize: none;
  max-height: 100px;
  background: rgba(255,255,255,0.06);
  color: rgba(215,230,250,0.90);
  outline: none;
  transition: border-color 0.2s;
}
.ss-chat-input::placeholder { color: rgba(255,255,255,0.40); }
.ss-chat-input:focus { border-color: rgba(74,127,193,0.50); }
.ss-chat-send {
  width: 34px; height: 34px;
  border-radius: 7px;
  border: none;
  background: var(--ss-primary);
  color: white;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: 0.15s;
  flex-shrink: 0;
}
.ss-chat-send:hover:not(:disabled) { background: var(--ss-primary-dark); }
.ss-chat-send:disabled { opacity: 0.4; cursor: not-allowed; }
/* 生成中：同一个位置换成「停止」，不给用户两个都能点的按钮 */
.ss-chat-send--stop { background: rgba(226,96,76,0.92); }
.ss-chat-send--stop:hover { background: rgba(206,76,58,1); }
.ss-chat-stop-square {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  background: #fff;
  display: block;
}

/* ── 引用样本：候选区 + 已选气泡 ── */
.ss-ref-summary {
  display: inline-flex; align-items: center; gap: 6px;
  cursor: pointer; user-select: none;
  font-size: 11.5px; color: rgba(190,210,235,0.72);
  letter-spacing: 0.2px;
}
.ss-ref-summary::-webkit-details-marker { color: rgba(190,210,235,0.45); }
.ss-ref-summary em { font-style: normal; color: #7fb3ea; }
.ss-ref-count, .ss-ref-loading { color: rgba(190,210,235,0.45); }
.ss-ref-tools { display: flex; align-items: center; gap: 6px; margin: 8px 0 6px; }
.ss-ref-search {
  flex: 1; min-width: 0;
  padding: 4px 8px;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 6px;
  background: rgba(255,255,255,0.05);
  color: rgba(215,230,250,0.90);
  font-size: 11px; font-family: var(--ss-font);
  outline: none;
}
.ss-ref-search::placeholder { color: rgba(255,255,255,0.42); }
.ss-ref-search:focus { border-color: rgba(74,127,193,0.55); }
.ss-ref-toggle {
  flex-shrink: 0;
  padding: 4px 8px;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 6px;
  background: transparent;
  color: rgba(190,210,235,0.75);
  font-size: 10.5px; font-family: var(--ss-font);
  cursor: pointer; white-space: nowrap;
  transition: 0.15s;
}
.ss-ref-toggle:hover { border-color: rgba(74,127,193,0.55); color: #fff; }
.ss-ref-opts {
  display: flex; flex-wrap: wrap; gap: 6px;
  margin: 0 0 2px;
  max-height: 152px; overflow-y: auto;
}
.ss-ref-empty, .ss-ref-hint {
  font-size: 10.5px; color: rgba(190,210,235,0.45); line-height: 1.6;
}
.ss-ref-opt {
  display: inline-flex; align-items: center; gap: 5px;
  max-width: 100%;
  padding: 4px 9px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.05);
  color: rgba(205,222,245,0.78);
  font-size: 11px; font-family: var(--ss-font); line-height: 1.4;
  cursor: pointer; transition: 0.15s;
}
.ss-ref-opt:hover { border-color: rgba(74,127,193,0.55); color: #fff; }
.ss-ref-opt.is-on {
  border-color: rgba(74,127,193,0.85);
  background: rgba(74,127,193,0.30);
  color: #fff;
}
.ss-ref-opt-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px; }
.ss-ref-opt-meta { opacity: 0.55; font-size: 10px; }

.ss-ref-bubbles { display: flex; flex-wrap: wrap; gap: 6px; }
.ss-ref-bubble {
  display: inline-flex; align-items: center; gap: 5px;
  max-width: 100%;
  padding: 3px 4px 3px 7px;
  border-radius: 8px;
  border: 1px solid rgba(74,127,193,0.45);
  background: rgba(74,127,193,0.20);
  color: rgba(230,240,255,0.95);
  font-size: 11px; line-height: 1.5;
  cursor: grab;
  transition: border-color 0.15s, opacity 0.15s;
}
.ss-ref-bubble:focus-visible { outline: 1px solid rgba(120,190,255,0.9); outline-offset: 1px; }
.ss-ref-bubble.is-dragging { opacity: 0.45; }
.ss-ref-bubble.is-over { border-color: rgba(120,190,255,0.95); }
/* 聊天消息内的样本气泡：只读，不可拖拽/删除 */
.ss-chat-user-samples { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
.ss-ref-bubble--readonly { cursor: default; }
.ss-ref-bubble--readonly:focus-visible { outline: none; }
.ss-ref-kind {
  flex-shrink: 0;
  padding: 0 4px;
  border-radius: 4px;
  background: rgba(74,127,193,0.55);
  color: #fff;
  font-size: 9.5px;
}
.ss-ref-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px; }
.ss-ref-del {
  flex-shrink: 0;
  width: 15px; height: 15px;
  display: inline-flex; align-items: center; justify-content: center;
  border: none; border-radius: 4px;
  background: transparent;
  color: rgba(230,240,255,0.55);
  font-size: 13px; line-height: 1; cursor: pointer;
}
.ss-ref-del:hover { background: rgba(255,255,255,0.18); color: #fff; }

/* 八向尺寸调节手柄：四边 + 四角。
   面板 border-radius:16px + overflow:hidden，角手柄需内缩到圆角之内才可见可点。 */
.ss-chat-resize { position: absolute; z-index: 6; }
.ss-chat-resize--l { left: 0; top: 10px; bottom: 10px; width: 8px; cursor: ew-resize; }
.ss-chat-resize--r { right: 0; top: 10px; bottom: 10px; width: 8px; cursor: ew-resize; }
.ss-chat-resize--t { top: 0; left: 10px; right: 10px; height: 8px; cursor: ns-resize; }
.ss-chat-resize--b { bottom: 0; left: 10px; right: 10px; height: 8px; cursor: ns-resize; }
.ss-chat-resize--tl { left: 0; top: 0; width: 20px; height: 20px; cursor: nwse-resize; }
.ss-chat-resize--tr { right: 0; top: 0; width: 20px; height: 20px; cursor: nesw-resize; }
.ss-chat-resize--bl { left: 0; bottom: 0; width: 20px; height: 20px; cursor: nesw-resize; }
.ss-chat-resize--br { right: 0; bottom: 0; width: 26px; height: 26px; cursor: nwse-resize; }

/* 四角对握把提示（落在圆角内可见） */
.ss-chat-resize--tl::after,
.ss-chat-resize--tr::after,
.ss-chat-resize--bl::after,
.ss-chat-resize--br::after {
  content: '';
  position: absolute;
  width: 8px; height: 8px;
  border-left: 2px solid rgba(200,220,240,0.45);
  border-top: 2px solid rgba(200,220,240,0.45);
  border-top-left-radius: 2px;
}
.ss-chat-resize--tl::after { left: 5px; top: 5px; }
.ss-chat-resize--tr::after { right: 5px; top: 5px; transform: scaleX(-1); }
.ss-chat-resize--bl::after { left: 5px; bottom: 5px; transform: scaleY(-1); }
.ss-chat-resize--br::after { right: 7px; bottom: 7px; transform: rotate(180deg); }
.ss-chat-resize:hover { background: rgba(122,203,170,0.16); }
.ss-chat-resize:hover::after { border-color: #7acbaa; }

/* 头部可拖动光标提示 */
.ss-chat-head { cursor: move; }

/* ══════════════ 页面式布局（导航栏「AI」= 数据助手） ══════════════
   贴住导航栏下沿、水平居中、占满剩余高度；单列对话，引用样本选择器在输入框上方。
   配色改为浅色（参考常见对话产品），与右下角气泡的深色面板区分开。 */
.ss-chat-panel--page {
  position: fixed;
  top: var(--ss-nav-h, 64px);
  bottom: 0;
  left: 0; right: 0;
  margin: 0 auto;
  width: 100%;
  max-width: 1240px;
  height: auto;
  max-height: none;
  border-radius: 0;
  border: none;
  border-top: 1px solid rgba(39, 54, 74, 0.08);
  background: #ffffff;
  box-shadow: 0 24px 60px rgba(15, 35, 65, 0.14);
  z-index: 900;
}
/* 页面版：对话列用浅灰底（气泡版保持深色面板本身的底色，不能在这里写死浅色） */
.ss-chat-panel--page .ss-chat-content { background: #f7f9fc; }
.ss-chat-panel--page .ss-chat-head {
  background: #ffffff;
  border-bottom: 1px solid rgba(39, 54, 74, 0.08);
  cursor: default;
  padding: 12px 20px;
}
.ss-chat-panel--page .ss-chat-title { color: #1b2a42; }
.ss-chat-panel--page .ss-chat-status { color: #7b879b; }
.ss-chat-panel--page .ss-chat-avatar { background: rgba(74, 127, 193, 0.12); color: #3f6ea8; }
.ss-chat-panel--page .ss-chat-icon-btn,
.ss-chat-panel--page .ss-chat-close { color: #6b7a90; }
.ss-chat-panel--page .ss-chat-icon-btn:hover,
.ss-chat-panel--page .ss-chat-close:hover { background: rgba(39, 54, 74, 0.06); color: #22334d; }

/* 引用样本：位于输入框上方（原左侧栏已取消） */
.ss-chat-main { display: flex; flex: 1; min-height: 0; }
.ss-sample-bar {
  position: relative;
  display: flex; flex-direction: column; gap: 7px;
}
.ss-sample-bar-head {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
}
.ss-sample-bar-count {
  min-width: 16px; padding: 0 5px;
  border-radius: 999px; background: rgba(74, 127, 193, 0.14); color: #2f5f96;
  font-size: 10.5px; font-weight: 600; line-height: 16px; text-align: center;
}
.ss-sample-bar-actions { display: inline-flex; align-items: center; gap: 4px; }
.ss-sample-bar-link {
  border: none; background: none; cursor: pointer; font-family: inherit;
  font-size: 11.5px; color: #8c9cb3; padding: 2px 6px; border-radius: 6px;
}
.ss-sample-bar-link:hover { color: #d1435b; background: rgba(209, 67, 91, 0.07); }
.ss-sample-bar-add {
  border: 1px solid rgba(74, 127, 193, 0.35); background: #fff; color: #2f5f96;
  font-size: 11.5px; font-family: inherit; padding: 3px 10px;
  border-radius: 999px; cursor: pointer;
}
.ss-sample-bar-add:hover { border-color: rgba(74, 127, 193, 0.7); background: #f2f7ff; }
.ss-sample-bar-add.is-open { border-color: rgba(74, 127, 193, 0.6); background: rgba(74, 127, 193, 0.12); }

/* 候选列表面板：向上弹出、内部滚，不改变对话区高度 */
.ss-sample-picker {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 0;
  width: 540px; max-width: 100%;
  max-height: min(64vh, 540px);
  display: flex; flex-direction: column; gap: 8px;
  padding: 12px;
  background: #fff;
  border: 1px solid rgba(39, 54, 74, 0.12);
  border-radius: 14px;
  box-shadow: 0 18px 44px rgba(24, 38, 60, 0.16);
  z-index: 40;
}
.ss-side-foot button.ss-picker-done {
  border-color: rgba(74, 127, 193, 0.55);
  background: rgba(74, 127, 193, 0.10);
  color: #2f5f96; font-weight: 600;
}
.ss-side-hint { margin: 0; font-size: 11.5px; line-height: 1.5; color: #8b96a8; }
.ss-side-search {
  width: 100%; box-sizing: border-box;
  border: 1px solid rgba(39, 54, 74, 0.14); border-radius: 7px;
  padding: 7px 10px; font-size: 12px; font-family: inherit;
  background: #fff; color: #22334d; outline: none;
}
.ss-side-search:focus { border-color: rgba(74, 127, 193, 0.55); }

/* 筛选条：一行一个维度，选项多时横向滚动，尽量把高度留给样本列表 */
.ss-filter-bar {
  flex-shrink: 0;
  display: flex; flex-direction: column; gap: 6px;
  padding-bottom: 2px;
}
.ss-filter-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
.ss-filter-label { flex-shrink: 0; width: 28px; font-size: 11px; color: #98a4b6; }
.ss-filter-chips {
  flex: 1; min-width: 0;
  display: flex; gap: 5px;
  overflow-x: auto; overflow-y: hidden;
  scrollbar-width: thin;
}
.ss-filter-chips::-webkit-scrollbar { height: 4px; }
.ss-filter-chips::-webkit-scrollbar-thumb { background: rgba(39, 54, 74, 0.16); border-radius: 2px; }
.ss-filter-chips::-webkit-scrollbar-track { background: transparent; }
.ss-filter-chip {
  flex-shrink: 0;
  border: 1px solid rgba(39, 54, 74, 0.12);
  background: #fff; color: #4a5a73;
  font-size: 11px; font-family: inherit; line-height: 1; white-space: nowrap;
  padding: 5px 9px; border-radius: 999px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.ss-filter-chip:hover { border-color: rgba(74, 127, 193, 0.45); color: #2f5f96; }
.ss-filter-chip.is-on {
  border-color: rgba(74, 127, 193, 0.75);
  background: rgba(74, 127, 193, 0.12);
  color: #1e4a7d; font-weight: 600;
}
.ss-side-list {
  flex: 1; min-height: 0; overflow-y: auto;
  display: flex; flex-direction: column; gap: 2px; padding-right: 2px;
}
.ss-side-item {
  display: flex; align-items: center; gap: 8px;
  border: 1px solid transparent; border-radius: 7px; background: none;
  padding: 6px 8px; cursor: pointer; text-align: left;
  font-size: 12px; font-family: inherit; color: #33445f;
}
.ss-side-item:hover { background: rgba(74, 127, 193, 0.08); }
.ss-side-item.is-on { background: rgba(74, 127, 193, 0.14); border-color: rgba(74, 127, 193, 0.35); color: #1e4a7d; }
.ss-side-check { width: 14px; flex-shrink: 0; color: #3f6ea8; font-size: 11px; }
.ss-side-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ss-side-meta { flex-shrink: 0; font-size: 10.5px; color: #93a0b3; }
.ss-side-empty { padding: 8px; font-size: 11.5px; color: #9aa6b8; }
.ss-side-foot {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  padding-top: 6px; border-top: 1px solid rgba(39, 54, 74, 0.07);
}
.ss-side-count { font-size: 11px; color: #93a0b3; margin-right: auto; }
.ss-side-foot button {
  border: 1px solid rgba(39, 54, 74, 0.14); background: #fff; color: #4a5a73;
  font-size: 11px; font-family: inherit; padding: 3px 8px;
  border-radius: 6px; cursor: pointer;
}
.ss-side-foot button:hover { border-color: rgba(74, 127, 193, 0.45); color: #2f5f96; }

/* 中间对话列 */
/* min-height:0 + overflow:hidden 是「输入框固定在底部」的关键：
   少了它，flex 子项会被内容撑开，body 不再滚动，输入区被推到屏幕外 */
.ss-chat-content {
  flex: 1; min-width: 0; min-height: 0;
  display: flex; flex-direction: column;
  overflow: hidden;
  /* 底色交给各自面板决定：气泡版是深色面板（#0d1829），页面版是浅灰（见 --page 覆盖）。
     这里写死浅色会让气泡版出现「浅字配浅底」看不清的问题。 */
  background: transparent;
}
.ss-chat-panel--page .ss-chat-body {
  flex: 1; min-height: 0; overflow-y: auto;
  width: 100%; max-width: 840px; margin: 0 auto;
  padding: 22px 20px 8px;
}
.ss-chat-panel--page .ss-chat-bubble { color: #24334a; }
.ss-chat-panel--page .ss-chat-msg--user { justify-content: flex-end; }
.ss-chat-panel--page .ss-chat-msg--user .ss-chat-bubble {
  background: #e8f1fe; color: #1b3a63;
  border-radius: 14px; padding: 9px 13px;
}
.ss-chat-panel--page .ss-chat-empty-title { color: #6b7a90; }
.ss-chat-panel--page .ss-chat-prompt-chip {
  background: #fff; border: 1px solid rgba(39, 54, 74, 0.12); color: #3f6ea8;
}
.ss-chat-panel--page .ss-chat-prompt-chip:hover { border-color: rgba(74, 127, 193, 0.5); background: #f2f7ff; }
/* 输入区与对话区同一底色：去掉白色块与分割线，层次交给输入框本身的阴影 */
.ss-chat-panel--page .ss-chat-foot {
  background: transparent;
  border-top: none;
  width: 100%; max-width: 840px; margin: 0 auto;
  padding: 12px 20px 18px;
}
/* 输入框做成一张浮起的白卡（阴影只加在这一层） */
.ss-chat-panel--page .ss-chat-input-row {
  background: #fff;
  border: 1px solid rgba(39, 54, 74, 0.10);
  border-radius: 16px;
  padding: 4px 4px 4px 6px;
  box-shadow: 0 4px 16px rgba(24, 38, 60, 0.08);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}
.ss-chat-panel--page .ss-chat-input-row:focus-within {
  border-color: rgba(74, 127, 193, 0.45);
  box-shadow: 0 8px 24px rgba(24, 38, 60, 0.12);
}
.ss-chat-panel--page .ss-chat-input {
  background: transparent; border: none; color: #1f2d43;
}
.ss-chat-panel--page .ss-chat-input::placeholder { color: #98a4b6; }
.ss-chat-panel--page .ss-chat-input:focus { border-color: transparent; outline: none; }
.ss-chat-panel--page .ss-ref-bubble {
  background: #eef4fc; border-color: rgba(74, 127, 193, 0.3); color: #2f5f96;
}

/* 内嵌进页面（/ai）时：不再是浮层，撑满父容器、由页面负责滚动 */
.ss-chat-panel--inline {
  position: static;
  top: auto; right: auto; bottom: auto; left: auto;
  width: 100%;
  max-width: none;
  /* 父容器（页面里的 wrap）是 flex 列，用 flex:1 撑满剩余高度 */
  flex: 1;
  min-height: 0;
  height: auto;
  max-height: none;
  margin: 0;
  /* 铺满整页：不要卡片外框，只留一条细分隔线 */
  border: none;
  border-top: 1px solid rgba(39, 54, 74, 0.07);
  border-radius: 0;
  box-shadow: none;
  z-index: auto;
}

/* ── 大气版：更大的字号与留白（AI 页面内嵌时覆盖上面的紧凑值） ── */
.ss-chat-panel--page .ss-chat-head { padding: 20px 32px; min-height: 78px; }
.ss-chat-panel--page .ss-chat-title {
  font-size: 17px; font-weight: 600; letter-spacing: 0.2px; color: #16263c;
}
.ss-chat-panel--page .ss-chat-status { margin-top: 3px; font-size: 12px; color: #8b96a8; }
.ss-chat-panel--page .ss-chat-avatar {
  width: 36px; height: 36px; border-radius: 11px;
  display: inline-flex; align-items: center; justify-content: center;
}
.ss-chat-panel--page .ss-chat-avatar svg { width: 17px; height: 17px; }

/* 候选列表（页面版更宽松） */
.ss-chat-panel--page .ss-side-hint { font-size: 12px; line-height: 1.6; }
.ss-chat-panel--page .ss-side-search { padding: 10px 13px; font-size: 13px; border-radius: 10px; }
.ss-chat-panel--page .ss-sample-bar-add { font-size: 12.5px; padding: 4px 12px; }
.ss-chat-panel--page .ss-sample-picker { width: 640px; padding: 14px; }
.ss-chat-panel--page .ss-side-item {
  padding: 9px 10px; border-radius: 10px; gap: 9px;
  align-items: flex-start;
}
.ss-chat-panel--page .ss-side-item.is-on { box-shadow: inset 0 0 0 1px rgba(74, 127, 193, 0.28); }
.ss-chat-panel--page .ss-side-foot button { padding: 5px 10px; font-size: 11.5px; }

/* 左栏每行：名称 + 元信息两段式（覆盖上面的单行省略号，避免名字被截断） */
.ss-chat-panel--page .ss-side-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ss-chat-panel--page .ss-side-label {
  flex: none; font-size: 13.5px; font-weight: 600; color: #22334d;
  overflow: visible; text-overflow: clip; white-space: normal; overflow-wrap: anywhere;
}
.ss-chat-panel--page .ss-side-meta-line {
  font-size: 11.5px; color: #8b96a8; line-height: 1.5; overflow-wrap: anywhere;
}
.ss-chat-panel--page .ss-side-tag {
  flex-shrink: 0; align-self: flex-start;
  font-size: 10.5px; padding: 2px 7px; border-radius: 6px;
  background: rgba(74, 127, 193, 0.12); color: #3f6ea8;
  white-space: nowrap;
}

/* 提示词条：常驻在消息区上方（不在滚动容器内），对话再多也不会被滚走 */
.ss-chat-panel--page .ss-chat-prompts-panel {
  flex-shrink: 0;
  width: 100%; max-width: 1360px; margin: 0 auto;
  padding: 26px 44px 12px;
}
/* 对话列：铺满式宽度 + 更大字号；顶部留白由提示词条承担 */
.ss-chat-panel--page .ss-chat-body {
  max-width: 1360px;
  padding: 22px 44px 18px;
  gap: 22px;
}
/* 第一个气泡与提示词条之间再留一点距离，避免贴顶 */
.ss-chat-panel--page .ss-chat-body > .ss-chat-msg:first-child { margin-top: 6px; }
.ss-chat-panel--page .ss-chat-msg { flex: 0 0 auto; }
.ss-chat-panel--page .ss-chat-msg > div { max-width: 92%; }
.ss-chat-panel--page .ss-chat-msg--user > div { max-width: 76%; }
.ss-chat-panel--page .ss-chat-bubble { font-size: 15px; line-height: 1.85; }
/* 浅色主题下的 Markdown 排版 */
.ss-chat-panel--page .ss-chat-bubble :deep(.md-heading) { font-size: 15px; }
.ss-chat-panel--page .ss-chat-bubble :deep(.md-table-wrap) { border-color: rgba(39, 54, 74, 0.12); }
.ss-chat-panel--page .ss-chat-bubble :deep(table) { font-size: 13px; }
.ss-chat-panel--page .ss-chat-bubble :deep(th),
.ss-chat-panel--page .ss-chat-bubble :deep(td) {
  border-color: rgba(39, 54, 74, 0.1);
}
.ss-chat-panel--page .ss-chat-bubble :deep(th) { background: #f3f6fb; }
.ss-chat-panel--page .ss-chat-bubble :deep(hr) { border-top-color: rgba(39, 54, 74, 0.12); }
.ss-chat-panel--page .ss-chat-bubble :deep(pre) { background: #f5f7fa; }
.ss-chat-panel--page .ss-chat-bubble :deep(blockquote) { border-left-color: rgba(74, 127, 193, 0.4); }
/* 浅色主题下的复制按钮 / 停止提示 */
.ss-chat-panel--page .ss-chat-tool-btn { color: #8b96a8; }
.ss-chat-panel--page .ss-chat-tool-btn:hover { color: #3f6ea8; background: #eef3fa; }
.ss-chat-panel--page .ss-chat-notice { color: #8b96a8; }
/* 浅色主题的历史下拉 */
.ss-chat-panel--page .ss-chat-history-menu {
  background: #fff;
  border-color: rgba(39, 54, 74, 0.12);
  box-shadow: 0 12px 30px rgba(20, 35, 60, 0.16);
}
.ss-chat-panel--page .ss-chat-history-head { color: #8b96a8; }
.ss-chat-panel--page .ss-chat-history-item { color: #27364a; }
.ss-chat-panel--page .ss-chat-history-item:hover { background: #eff4fb; }
.ss-chat-panel--page .ss-chat-history-item.is-active { background: #e2ecfd; color: #1f4c7d; }
.ss-chat-panel--page .ss-chat-history-time { color: #9aa5b5; }
.ss-chat-panel--page .ss-chat-history-empty { color: #8b96a8; }
.ss-chat-panel--page .ss-chat-retry-btn {
  background: #eef4ff; border-color: rgba(74,127,193,0.35); color: #2f5f96;
}
.ss-chat-panel--page .ss-chat-retry-btn:hover:not(:disabled) { background: #e2ecfd; }
.ss-chat-panel--page .ss-chat-msg--assistant .ss-chat-bubble {
  /* 助手消息改为纯文本块（更接近对话产品的排版），避免深色气泡在浅底上糊成一块 */
  background: transparent; border: none; padding: 0;
}
.ss-chat-panel--page .ss-chat-msg--user .ss-chat-bubble {
  padding: 12px 17px; border-radius: 16px; font-size: 15px;
}
.ss-chat-panel--page .ss-chat-empty { padding-top: 48px; }
.ss-chat-panel--page .ss-chat-empty-title {
  font-size: 24px; font-weight: 600; letter-spacing: 0.2px;
  color: #1f3352; margin-bottom: 10px;
}
.ss-chat-panel--page .ss-chat-prompt-chip { padding: 11px 17px; font-size: 13.5px; border-radius: 12px; }

/* 卡片 / 表格：深色面板里这些是 10~11px 且强制省略号，页面版放大并允许换行 */
.ss-chat-panel--page .ss-chat-action-main strong { font-size: 13.5px; white-space: normal; overflow: visible; text-overflow: clip; }
.ss-chat-panel--page .ss-chat-action-main em { font-size: 12px; white-space: normal; overflow: visible; text-overflow: clip; }
.ss-chat-panel--page .ss-chat-rich-head strong { font-size: 13.5px; white-space: normal; overflow: visible; text-overflow: clip; }
.ss-chat-panel--page .ss-chat-rich-line { font-size: 12.5px; line-height: 1.7; overflow: visible; text-overflow: clip; }
.ss-chat-panel--page .ss-chat-rich-meta { font-size: 12px; }
.ss-chat-panel--page .ss-chat-table { font-size: 12px; }
.ss-chat-panel--page .ss-chat-table th,
.ss-chat-panel--page .ss-chat-table td {
  padding: 6px 10px; white-space: normal;
  max-width: none; overflow: visible; text-overflow: clip;
}
.ss-chat-panel--page .ss-chat-warning { font-size: 12.5px; line-height: 1.7; }

/* 输入区：更大，且多行时不裁字 */
.ss-chat-panel--page .ss-chat-foot { max-width: 1360px; padding: 18px 44px 30px; }
.ss-chat-panel--page .ss-chat-input {
  padding: 14px 16px; font-size: 15px; line-height: 1.6;
  border-radius: 14px; min-height: 54px; max-height: 220px;
}
.ss-chat-panel--page .ss-chat-send { width: 46px; height: 46px; border-radius: 14px; }
.ss-chat-panel--page .ss-chat-send svg { width: 18px; height: 18px; }

/* 输入区永远贴底：不参与压缩；内容再多也只压缩上面的对话区 */
.ss-chat-panel--page .ss-chat-foot { flex-shrink: 0; }
/* 已选样本气泡最多占三行，超出在内部滚动，避免把输入框往下顶 */
.ss-chat-panel--page .ss-ref-bubbles { max-height: 96px; overflow-y: auto; }

/* 提示词区头部：标题居中，「开启新对话」固定在右上角 */
.ss-chat-panel--page .ss-chat-prompts-head {
  position: relative;
  display: flex; align-items: center; justify-content: center;
  /* 固定行高：有/无「开启新对话」按钮时高度一致，避免标题上下跳动 */
  min-height: 26px;
  margin-bottom: 12px;
}
.ss-chat-panel--page .ss-chat-prompts-head .ss-chat-empty-title { margin: 0; }
.ss-chat-new-btn {
  position: absolute; right: 0; top: 50%; transform: translateY(-50%);
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 13px 6px 11px;
  border-radius: 999px;
  border: 1px solid rgba(39, 54, 74, 0.14);
  background: #fff;
  color: #4a5a73;
  font-size: 12.5px; font-family: inherit; line-height: 1;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(24, 38, 60, 0.06);
  transition: color 0.16s, border-color 0.16s, background 0.16s, box-shadow 0.16s;
}
.ss-chat-new-btn:hover {
  color: #2f5f96;
  border-color: rgba(74, 127, 193, 0.50);
  background: #f4f8ff;
  box-shadow: 0 3px 10px rgba(24, 38, 60, 0.10);
}
.ss-chat-new-btn:active { transform: translateY(-50%) scale(0.97); }
.ss-chat-new-btn svg { flex-shrink: 0; }

/* 页面版：历史 + 新对话并排右上角（新对话原来是绝对定位，这里改成 flex 里的静态元素） */
.ss-chat-prompts-actions {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
}
.ss-chat-prompts-actions .ss-chat-new-btn {
  position: static;
  transform: none;
}
.ss-chat-prompts-actions .ss-chat-new-btn:active { transform: scale(0.97); }
.ss-chat-history-btn { padding: 6px 11px; }
.ss-chat-history-menu--inline { top: calc(100% + 8px); }
@media (max-width: 640px) {
  .ss-chat-prompts-actions .ss-chat-new-btn { padding: 6px; }
}
/* 窄屏只留图标，避免和居中的标题挤在一起 */
@media (max-width: 640px) {
  .ss-chat-new-btn { padding: 6px; }
  .ss-chat-new-btn-text { display: none; }
}

/* Mobile */
@media (max-width: 480px) {
  .ss-chat-panel {
    bottom: 0; right: 0; left: 0;
    width: auto; height: 100vh; max-height: 100vh;
    border-radius: 0;
  }
  .ss-chat-resize { display: none; }
  .ss-chat-head { cursor: default; }
  .ss-chat-fab { bottom: 16px; right: 16px; }
}
@media (max-width: 900px) {
  .ss-chat-panel--page { max-width: 100%; }
  .ss-chat-panel--page .ss-chat-body,
  .ss-chat-panel--page .ss-chat-foot { max-width: 100%; }
  /* 窄屏时候选面板铺满宽度，避免超出屏幕 */
  .ss-chat-panel--page .ss-sample-picker { width: 100%; }
}
</style>

<!-- 非 scoped：列高亮作用在平台页面自己的表格上（Element Plus 表格不在本组件内，
     scoped 会给选择器加属性前缀，导致类名生效不了） -->
<style>
.ss-col-focus > .cell,
.ss-col-focus .cell {
  background-color: rgba(74, 127, 193, 0.18) !important;
  border-radius: 4px;
  transition: background-color 0.25s ease;
}
.ss-col-focus {
  box-shadow: inset 0 0 0 1px rgba(74, 127, 193, 0.35);
}
</style>
