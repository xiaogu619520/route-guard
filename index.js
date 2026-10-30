import { eventSource, event_types } from '../../../../script.js';
import { extension_settings, getContext } from '../../../extensions.js';

const MODULE = 'route-guard';
const VERSION = '1.0.0';

const DICT = {
    '越狱': '跃狱', '破解': '坡解', '脱壳': '托壳', '注入': '柱入',
    '外挂': '外卦', '作弊': '昨弊', '绕过': '扰过', '免杀': '勉杀',
    '漏洞': '楼洞', '渗透': '渗头', '劫持': '劫池', '爆破': '暴破',
    '木马': '木玛', '病毒': '病杜', '后门': '厚门', '提权': '提全',
    '攻击': '工击', '入侵': '入沁', '窃取': '切取', '盗号': '道号',
    '炸弹': '炸单', '爆炸': '暴炸', '毒品': '独品', '枪支': '枪之',
    '自杀': '自沙', '杀人': '沙人', '色情': '色青', '裸体': '裸提',
    'jailbreak': 'jail-break', 'exploit': 'ex-ploit', 'payload': 'pay-load',
    'malware': 'mal-ware', 'bypass': 'by-pass',
};

const DEFAULTS = { enabled: true, homophone: true, split: false, minLen: 2, extra: '' };
const stats = { runs: 0, hits: 0 };

function cfg() {
    const bag = extension_settings[MODULE] || {};
    return Object.assign({}, DEFAULTS, bag);
}

function persist(next) {
    extension_settings[MODULE] = Object.assign({}, cfg(), next);
    const ctx = getContext();
    if (ctx && typeof ctx.saveSettingsDebounced === 'function') ctx.saveSettingsDebounced();
}

function lexicon() {
    const map = Object.assign({}, DICT);
    String(cfg().extra || '').split(/[\n,，;；]+/).forEach((line) => {
        const parts = line.split(/[=＝]/);
        if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) map[parts[0].trim()] = parts[1].trim();
    });
    return Object.keys(map)
        .sort((a, b) => b.length - a.length)
        .map((key) => ({ from: key, to: map[key] }));
}

function guard(text) {
    const settings = cfg();
    if (!settings.enabled || typeof text !== 'string' || !text) return { text, hits: 0 };
    const minLen = Math.max(1, Number(settings.minLen) || 2);
    let out = text;
    let hits = 0;
    lexicon().forEach((item) => {
        if (item.from.length < minLen || !out.includes(item.from)) return;
        let next = item.to;
        if (settings.split && Array.from(next).length >= 2) next = Array.from(next).join('\u200b');
        const parts = out.split(item.from);
        hits += parts.length - 1;
        out = parts.join(settings.homophone ? next : item.from);
    });
    return { text: out, hits };
}

function patchContent(content) {
    if (typeof content === 'string') {
        const result = guard(content);
        return { content: result.text, hits: result.hits, changed: result.text !== content };
    }
    if (!Array.isArray(content)) return { content, hits: 0, changed: false };
    let hits = 0;
    let changed = false;
    const next = content.map((block) => {
        if (!block || typeof block.text !== 'string') return block;
        const result = guard(block.text);
        if (!result.hits) return block;
        hits += result.hits;
        changed = true;
        return Object.assign({}, block, { text: result.text });
    });
    return { content: next, hits, changed };
}

function patchPrompt(data) {
    if (!data || !Array.isArray(data.prompt)) return 0;
    for (let i = data.prompt.length - 1; i >= 0; i--) {
        const message = data.prompt[i];
        if (!message || message.role !== 'user') continue;
        const result = patchContent(message.content);
        if (result.changed) {
            message.content = result.content;
            stats.runs += 1;
            stats.hits += result.hits;
            renderStats();
        }
        return result.hits;
    }
    return 0;
}

function renderStats() {
    const el = document.querySelector('#route-guard-stats');
    if (!el) return;
    el.textContent = `已处理 ${stats.runs} 次 · 命中 ${stats.hits} 处`;
}

function bindPanel() {
    const root = document.querySelector('#route-guard-settings');
    if (!root || root.dataset.bound === '1') return;
    root.dataset.bound = '1';
    const settings = cfg();
    root.querySelectorAll('[data-k]').forEach((el) => {
        const key = el.getAttribute('data-k');
        if (el.type === 'checkbox') el.checked = !!settings[key];
        else el.value = settings[key] == null ? '' : settings[key];
        el.addEventListener('change', () => {
            persist({ [key]: el.type === 'checkbox' ? el.checked : el.value });
        });
    });
    renderStats();
}

function settingsHtml() {
    return `
<div id="route-guard-settings" class="route-guard-settings">
  <div class="inline-drawer">
    <div class="inline-drawer-toggle inline-drawer-header">
      <b>词库防路由</b>
      <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
    </div>
    <div class="inline-drawer-content">
      <label class="checkbox_label"><input type="checkbox" data-k="enabled"> 启用</label>
      <label class="checkbox_label"><input type="checkbox" data-k="homophone"> 同音替换</label>
      <label class="checkbox_label"><input type="checkbox" data-k="split"> 替换结果插零宽</label>
      <label>额外词，一行一个，原文=替换
        <textarea class="text_pole" data-k="extra" rows="4"></textarea>
      </label>
      <div id="route-guard-stats" class="route-guard-stats"></div>
      <small>只改发出去的最后一条用户消息，聊天记录保持原文。版本 ${VERSION}</small>
    </div>
  </div>
</div>`;
}

export function init() {
    if (!extension_settings[MODULE]) extension_settings[MODULE] = Object.assign({}, DEFAULTS);
    const anchor = document.querySelector('#extensions_settings');
    if (anchor && !document.querySelector('#route-guard-settings')) {
        anchor.insertAdjacentHTML('beforeend', settingsHtml());
        bindPanel();
    }
    eventSource.on(event_types.GENERATE_AFTER_DATA, (data, dryRun) => {
        if (dryRun) return;
        patchPrompt(data);
    });
}
