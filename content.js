/* 搜索结果过滤器 — content script
 *
 * 判断单位是「一条搜索结果」，不是单个链接。原因：百度的外链全部走
 * baidu.com/link?url= 跳转，Google 走 /url?q=，中间层把目标域名藏了起来。
 * 所以来源判定要综合：容器 mu 属性 → 链接真实地址 → cite/来源元素文本。
 */
(() => {
  'use strict';

  if (window.__sfInjected__) return;
  window.__sfInjected__ = true;

  const DEFAULTS = {
    enabled: true,
    domains: ['csdn.net'],
    showCounter: true
  };

  // 结果列表容器：只在里面动手，避开摘要卡、侧栏、导航
  const SCOPE_SELECTORS = [
    '#b_results',      // Bing
    '#content_left',   // 百度
    '#rso',            // Google
    '#search',         // Google / 通用
    '#links',          // DuckDuckGo
    '#main',           // DuckDuckGo 新版
    '#res',            // 搜狗
    '.result-list',    // 360 / 通用
    'main', '[role="main"]',
    'div[class*="source-list"]'  // 夸克
  ];

  // 单条结果的容器（相对选择器，由 scope 限定范围）
  const ITEM_SELECTORS = [
    'li.b_algo',                    // Bing
    'div.result',                   // 百度
    'div.c-container',              // 百度
    'div.g',                        // Google
    'div.MjjYud',                   // Google 新版
    'div.vrwrap', 'div.rb',         // 搜狗
    'li.res-list',                  // 360
    'article[data-testid="result"]', // DuckDuckGo
    'section.sc_structure_template_normal', // 夸克
    'div.sgs_every_view'            // 夸克
  ];

  const TOO_SMALL = new Set(['A', 'P', 'SPAN', 'B', 'I', 'EM', 'STRONG', 'TD', 'TH', 'LABEL']);

  // 结果块里显示「来源」的元素
  const CITE_SELECTORS = [
    'cite', '.c-showurl', '.mu', '.b_attribution cite',
    '.cosc-source-text', '[class*="showurl"]', '[class*="source-text"]',
    '[class*="source-link"]', '[class*="cite"]'
  ];

  const DOMAIN_RE = /([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}/i;

  let cfg = Object.assign({}, DEFAULTS);
  let blockedBlocks = 0;
  let lastUrl = location.href;

  const hidden = new WeakSet();
  let seenBlocks = new WeakSet();

  /* ---------- 配置 ---------- */

  function normalizeDomain(d) {
    return String(d || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .split('/')[0]
      .replace(/^\*?\./, '')
      .replace(/\.$/, '');
  }

  function loadConfig(cb) {
    try {
      chrome.storage.sync.get(DEFAULTS, (v) => {
        if (chrome.runtime.lastError) {
          chrome.storage.local.get(DEFAULTS, (v2) => {
            apply(v2 || {});
          });
          return;
        }
        apply(v || {});
      });
    } catch (e) {
      apply({});
    }
    function apply(v) {
      cfg = Object.assign({}, DEFAULTS, v);
      cfg.domains = (cfg.domains || []).map(normalizeDomain).filter(Boolean);
      cb && cb();
    }
  }

  /* ---------- 来源判定 ---------- */

  function hostBlocked(host) {
    if (!host) return false;
    host = host.toLowerCase();
    return cfg.domains.some((d) => host === d || host.endsWith('.' + d));
  }

  function addHost(set, raw) {
    if (!raw) return;
    let s = String(raw).trim();
    if (!s) return;
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = 'http://' + s;
    try {
      set.add(new URL(s).hostname.toLowerCase());
    } catch (e) { /* ignore */ }
  }

  // 一条结果的来源域名集合
  function sourceHosts(block) {
    const hosts = new Set();

    // 1) 容器链上的 mu 属性（百度把真实 URL 放在这里）
    let el = block;
    for (let i = 0; i < 4 && el && el !== document.body; i++) {
      if (el.getAttribute) {
        const mu = el.getAttribute('mu') || el.getAttribute('data-url') ||
                   el.getAttribute('data-mu');
        if (mu) addHost(hosts, mu);
      }
      el = el.parentElement;
    }

    // 2) 链接真实地址（含 Google /url?q= 这类中转解析）
    block.querySelectorAll('a[href]').forEach((a) => {
      let u;
      try {
        u = new URL(a.getAttribute('href'), location.href);
      } catch (e) {
        return;
      }
      const path = u.pathname + u.search;
      if (/^\/(url|link|ck\/a|goto)/.test(path) || /\/url\?/.test(path)) {
        const q = u.searchParams.get('q') || u.searchParams.get('url') || u.searchParams.get('u');
        if (q) {
          addHost(hosts, q);
          return;
        }
      }
      hosts.add(u.hostname.toLowerCase());
    });

    // 3) cite / 来源元素文本里露出的域名
    for (const sel of CITE_SELECTORS) {
      let nodes = [];
      try {
        nodes = block.querySelectorAll(sel);
      } catch (e) {
        continue;
      }
      for (const n of nodes) {
        const t = (n.textContent || '').trim();
        if (!t || t.length > 80) continue;
        const m = t.match(DOMAIN_RE);
        if (m) addHost(hosts, m[0]);
      }
    }

    return hosts;
  }

  function isBlockedBlock(block) {
    for (const h of sourceHosts(block)) {
      if (hostBlocked(h)) return true;
    }
    return false;
  }

  /* ---------- 块定位 ---------- */

  function sig(el) {
    const cls = typeof el.className === 'string'
      ? el.className.trim().split(/\s+/).sort().join('.')
      : '';
    return el.tagName + '|' + cls;
  }

  function hasClass(el) {
    return typeof el.className === 'string' && el.className.trim().length > 0;
  }

  function plausible(el) {
    if (!el || el === document.body || el === document.documentElement) return false;
    if (TOO_SMALL.has(el.tagName)) return false;
    if (!hasClass(el)) return false;
    const txt = (el.innerText || '').trim();
    if (txt.length < 20 || txt.length > 2200) return false;
    const links = el.querySelectorAll('a[href]').length;
    if (links === 0 || links > 12) return false;
    return true;
  }

  function climbToBlock(a) {
    let el = a;
    for (let i = 0; i < 12 && el && el !== document.body; i++) {
      const p = el.parentElement;
      if (p) {
        const s = sig(el);
        const same = Array.prototype.filter.call(p.children, (c) => sig(c) === s).length;
        if (same >= 2 && plausible(el)) return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  function collectBlocks(root) {
    const set = new Set();
    for (const sel of ITEM_SELECTORS) {
      let nodes = [];
      try {
        nodes = root.querySelectorAll(sel);
      } catch (e) {
        continue;
      }
      nodes.forEach((b) => set.add(b));
    }
    return set;
  }

  /* ---------- 扫描 ---------- */

  function scopes() {
    const roots = [];
    for (const sel of SCOPE_SELECTORS) {
      try {
        document.querySelectorAll(sel).forEach((el) => roots.push(el));
      } catch (e) { /* ignore */ }
    }
    return roots;
  }

  function hide(el) {
    if (!el || hidden.has(el)) return false;
    hidden.add(el);
    el.setAttribute('data-sf-hidden', '1');
    el.style.setProperty('display', 'none', 'important');
    return true;
  }

  function scan() {
    if (!cfg.enabled || !cfg.domains.length) return 0;

    const found = scopes();
    const roots = found.length ? found : [document.body];
    let added = 0;

    for (const root of roots) {
      // A. 已知引擎的条目容器
      for (const block of collectBlocks(root)) {
        if (hidden.has(block) || seenBlocks.has(block)) continue;
        if (!plausible(block)) continue;
        seenBlocks.add(block);
        if (isBlockedBlock(block) && hide(block)) {
          blockedBlocks += 1;
          added += 1;
        }
      }

      // B. 兜底：直连黑名单域名的链接，向上找它所属的结果块
      const links = root.querySelectorAll('a[href]');
      for (let i = 0; i < links.length; i++) {
        const a = links[i];
        let host = '';
        try {
          host = new URL(a.getAttribute('href'), location.href).hostname.toLowerCase();
        } catch (e) {
          continue;
        }
        if (!hostBlocked(host)) continue;
        const block = climbToBlock(a);
        if (!block || hidden.has(block)) continue;
        if (hide(block)) {
          blockedBlocks += 1;
          added += 1;
        }
      }
    }

    if (added > 0) renderCounter();
    return added;
  }

  /* ---------- 计数角标 ---------- */

  let counterEl = null;

  function renderCounter() {
    if (!cfg.showCounter || !blockedBlocks) {
      if (counterEl) {
        counterEl.remove();
        counterEl = null;
      }
      return;
    }
    if (!counterEl) {
      counterEl = document.createElement('div');
      counterEl.id = '__sf_counter__';
      counterEl.style.cssText = [
        'position:fixed', 'right:16px', 'bottom:16px', 'z-index:2147483647',
        'padding:6px 12px', 'border-radius:999px',
        'background:rgba(24,24,27,.88)', 'color:#e4e4e7',
        'font:12px/1.6 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif',
        'box-shadow:0 4px 14px rgba(0,0,0,.18)', 'pointer-events:none',
        'letter-spacing:.2px'
      ].join(';');
      (document.body || document.documentElement).appendChild(counterEl);
    }
    counterEl.textContent = '已屏蔽 ' + blockedBlocks + ' 条';
  }

  /* ---------- 监听 ---------- */

  let timer = null;
  function scheduleScan(delay) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      scan();
    }, delay == null ? 300 : delay);
  }

  const observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.addedNodes && r.addedNodes.length) {
        scheduleScan();
        return;
      }
    }
  });

  function watchRoute() {
    setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        blockedBlocks = 0;
        seenBlocks = new WeakSet();
        if (counterEl) {
          counterEl.remove();
          counterEl = null;
        }
        scheduleScan(700);
      }
    }, 800);
  }

  /* ---------- 消息 ---------- */

  chrome.runtime.onMessage.addListener((msg, sender, reply) => {
    if (!msg) return false;
    if (msg.type === 'sf:query') {
      reply({ supported: true, count: blockedBlocks, enabled: cfg.enabled, domains: cfg.domains });
      return true;
    }
    if (msg.type === 'sf:rescan') {
      seenBlocks = new WeakSet();
      blockedBlocks = 0;
      document.querySelectorAll('[data-sf-hidden]').forEach((el) => {
        el.style.removeProperty('display');
        el.removeAttribute('data-sf-hidden');
      });
      scan();
      reply({ count: blockedBlocks });
      return true;
    }
    return false;
  });

  /* ---------- 启动 ---------- */

  loadConfig(() => {
    if (!cfg.enabled) return;
    scan();
    observer.observe(document.documentElement, { childList: true, subtree: true });
    watchRoute();
    setTimeout(scan, 800);
    setTimeout(scan, 2200);
    setTimeout(scan, 4200);
  });

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync' && area !== 'local') return;
      if (!changes.domains && !changes.enabled && !changes.showCounter) return;
      loadConfig(() => {
        blockedBlocks = 0;
        seenBlocks = new WeakSet();
        document.querySelectorAll('[data-sf-hidden]').forEach((el) => {
          el.style.removeProperty('display');
          el.removeAttribute('data-sf-hidden');
        });
        scan();
      });
    });
  } catch (e) { /* ignore */ }
})();
