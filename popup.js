/* 弹窗逻辑 */
const $ = (id) => document.getElementById(id);

const SUPPORTED = /(^|\.)(quark\.cn|baidu\.com|bing\.com|google\.com|google\.com\.hk|sogou\.com|so\.com|sm\.cn|duckduckgo\.com)$/i;

function renderDomains(list) {
  const box = $('domains');
  box.textContent = '';
  $('num').textContent = list.length + ' 个域名';
  if (!list.length) {
    box.innerHTML = '<span class="state">未设置，不会屏蔽任何内容</span>';
    return;
  }
  list.forEach((d) => {
    const s = document.createElement('span');
    s.className = 'tag';
    s.textContent = d;
    box.appendChild(s);
  });
}

function setState(text, count) {
  $('state').textContent = text;
  $('count').textContent = count == null ? '—' : String(count);
}

function load() {
  chrome.storage.sync.get({ enabled: true, domains: ['csdn.net'] }, (v) => {
    $('enabled').checked = v.enabled !== false;
    renderDomains(v.domains || []);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (!tab || !tab.id) {
        setState('无法读取当前标签页', null);
        return;
      }
      let host = '';
      try {
        host = new URL(tab.url || '').hostname;
      } catch (e) { host = ''; }

      if (!SUPPORTED.test(host)) {
        setState('当前页面不是支持的搜索页', null);
        return;
      }

      chrome.tabs.sendMessage(tab.id, { type: 'sf:query' }, (res) => {
        if (chrome.runtime.lastError || !res) {
          setState('页面尚未注入，请刷新后重试', null);
          return;
        }
        if (v.enabled === false) {
          setState('过滤已关闭', res.count);
          return;
        }
        setState(res.count > 0 ? '本页已过滤 ' + host : '本页未命中黑名单', res.count);
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  load();

  $('enabled').addEventListener('change', () => {
    chrome.storage.sync.set({ enabled: $('enabled').checked }, () => {
      setTimeout(load, 120);
    });
  });

  $('opts').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
