/* 设置页逻辑 */
const DEFAULTS = {
  enabled: true,
  domains: ['csdn.net'],
  showCounter: true
};

const PRESETS = [
  { label: 'CSDN', domain: 'csdn.net' },
  { label: '知乎', domain: 'zhihu.com' },
  { label: '简书', domain: 'jianshu.com' },
  { label: '博客园', domain: 'cnblogs.com' },
  { label: '51CTO', domain: '51cto.com' },
  { label: '腾讯云社区', domain: 'cloud.tencent.com' },
  { label: '阿里云社区', domain: 'developer.aliyun.com' }
];

const $ = (id) => document.getElementById(id);

function normalize(d) {
  return String(d || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .replace(/^\*?\./, '')
    .replace(/\.$/, '');
}

function parseDomains(text) {
  return [...new Set(
    text.split(/[\n,;，；\s]+/).map(normalize).filter((d) => d && d.includes('.'))
  )];
}

function renderCount() {
  const list = parseDomains($('domains').value);
  $('count').textContent = list.length
    ? '共 ' + list.length + ' 个域名：' + list.join('、')
    : '列表为空，当前不会屏蔽任何内容';
}

function load(cb) {
  chrome.storage.sync.get(DEFAULTS, (v) => {
    $('domains').value = (v.domains || DEFAULTS.domains).join('\n');
    $('enabled').checked = v.enabled !== false;
    $('showCounter').checked = v.showCounter !== false;
    renderCount();
    cb && cb();
  });
}

function toast(msg) {
  const s = $('status');
  s.textContent = msg;
  s.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => s.classList.remove('show'), 1800);
}

function save() {
  const domains = parseDomains($('domains').value);
  chrome.storage.sync.set(
    {
      enabled: $('enabled').checked,
      domains: domains,
      showCounter: $('showCounter').checked
    },
    () => {
      $('domains').value = domains.join('\n');
      renderCount();
      toast('已保存 · ' + domains.length + ' 个域名');
    }
  );
}

function buildPresets() {
  const box = $('presets');
  PRESETS.forEach((p) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = '+ ' + p.label;
    b.addEventListener('click', () => {
      const list = parseDomains($('domains').value);
      if (list.includes(p.domain)) return;
      list.push(p.domain);
      $('domains').value = list.join('\n');
      renderCount();
    });
    box.appendChild(b);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  buildPresets();
  load();
  $('save').addEventListener('click', save);
  $('domains').addEventListener('input', renderCount);
  $('enabled').addEventListener('change', save);
  $('showCounter').addEventListener('change', save);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      save();
    }
  });
});
