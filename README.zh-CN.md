<div align="center">

<img src="icons/icon128.png" width="96" height="96" alt="搜索结果过滤器">

# 搜索结果过滤器

**把不想要的站点从搜索结果里剔掉，默认屏蔽 CSDN。**

[![License: MIT](https://img.shields.io/badge/%E8%AE%B8%E5%8F%AF%E8%AF%81-MIT-blue.svg)](LICENSE)
[![Manifest](https://img.shields.io/badge/Manifest-V3-1f6feb)](manifest.json)
[![浏览器](https://img.shields.io/badge/%E6%B5%8F%E8%A7%88%E5%99%A8-Chrome%20%7C%20Edge%20%7C%20%E5%A4%B8%E5%85%8B-2ea44f)](#支持的引擎)
![零依赖](https://img.shields.io/badge/%E4%BE%9D%E8%B5%96-0-brightgreen)

[English](README.md) · **简体中文**

</div>

---

## 为什么做这个

用中文搜技术问题，第一屏常常清一色是 CSDN：搬运的文、截断的代码、遮住半屏的登录弹窗。改 hosts 屏蔽会连那些真正有用的文章一起封死；每次搜索手动加 `-site:csdn.net` 又太烦——而且在夸克搜索上这个写法是反的，它会把域名当成关键词，返回**清一色**的 CSDN。

这个扩展在更上一层解决问题：逐条看页面上的搜索结果，判断这一条到底来自哪个站点，然后把命中黑名单的整条隐藏。其他内容原样不动。

> 夸克搜索**不支持** `-site:` 排除语法。在原本只出 2 条 CSDN 的查询上加这个参数，返回了 40 条。这条路走不通，才有的这个扩展。

## 特性

- **按条过滤** —— 隐藏整条结果，不是只藏一个链接
- **域名规则** —— 一行一个域名；填 `csdn.net` 会同时命中 `blog.csdn.net`、`bbs.csdn.net` 等所有子域
- **即时生效** —— 改规则不用重启浏览器
- **计数角标** —— 可开关的右下角提示，显示本页过滤了几条
- **零联网** —— 不发请求、不上报、没有远程配置
- **零依赖** —— 约 20 KB 纯 ES2020，无需构建

## 支持的引擎

| 引擎 | 入口 | 结果容器 |
| --- | --- | --- |
| 夸克 | `quark.cn/s` | `section.sc_structure_template_normal` |
| 百度 | `baidu.com/s` | `div.result` |
| Bing | `bing.com/search` | `li.b_algo` |
| Google | `google.com/search` | `div.g` / `div.MjjYud` |
| 搜狗 | `sogou.com/web` | `div.vrwrap` |
| 360 | `so.com/s` | `li.res-list` |
| DuckDuckGo | `duckduckgo.com` | `article[data-testid="result"]` |

## 安装

只能手动加载，本扩展未上架任何商店。

### 夸克浏览器

1. 地址栏输入 `quark://extensions`
2. 左下角打开「开发者模式」
3. 右上角点「加载解压缩的插件」
4. 选中含 `manifest.json` 的目录

### Edge

1. 地址栏输入 `edge://extensions`
2. 左下角打开「开发人员模式」
3. 点「加载解压缩的扩展」，选同一个目录

### Chrome

与 Edge 相同，入口是 `chrome://extensions`。

装完刷新已打开的搜索页即可生效。

## 用法

- **工具栏图标** —— 查看本页过滤了几条，一键开关
- **管理黑名单** —— 增删域名，一行一个
- 改动即时作用到已打开的标签页

## 工作原理

### 只看 `href` 行不通

最直观的实现是扫 `a[href*="csdn.net"]` 然后隐藏最近的祖先。这个写法在多数中文引擎上直接失效：百度把每条结果的链接重写成 `baidu.com/link?url=<密文>`，按域名写的选择器匹配到的是**零个**元素。Google 用 `/url?q=` 做同样的事。

真实地址不在 `href` 里：

```html
<div class="result c-container" mu="https://blog.csdn.net/qq_73360961/article/details/145865040">
  <h3><a href="http://www.baidu.com/link?url=pMlQXZoJ...">...</a></h3>
</div>
```

它在容器的 `mu` 属性上。

### 三路判定来源

对每条候选结果，扩展从三个方向收集来源：

1. **容器属性** —— 结果元素及其最多三层祖先上的 `mu`、`data-url`、`data-mu`
2. **链接真实地址** —— 先解出 `/url?q=`、`/link?url=`、`/ck/a?u=` 这类中转参数，再比对域名
3. **可见来源** —— `cite`、`.c-showurl`、`[class*="source"]` 这些元素里印着的来源域名

任意一路命中黑名单，整条隐藏。

### 怎么定位“这一条”

先用各引擎既有的结果容器，匹配失败才退回结构启发式：从链接向上爬，直到某个祖先的同类兄弟 ≥ 2。

隐藏之前，每个候选都要过体检：

- 不是 `body` / `html`，不是行内标签（`a`、`p`、`span` …）
- 有 class
- 可见文本 20～2200 字符
- 链接数 1～12
- 至少有一个像标题的链接（文本 ≥ 6 字）

没有这些闸门，启发式会顺手把导航 `<li>` 和 AI 摘要里的引用一起藏掉——第一版原型就是这么干的，除了结果还带走了 8 个菜单项和 1 个段落。

限定范围同样重要：只在内置的结果列表容器（`#b_results`、`#content_left`、`#rso` …）里扫描，摘要卡、侧栏、顶部导航从一开始就不在候选范围。

## 隐私

扩展只在 `manifest.json` 里列出的搜索页运行，读 DOM 是为了决定藏哪一条。它不把页面内容写进存储、不发网络请求、没有远程配置接口。黑名单存在 `chrome.storage.sync`，除非你自己开了浏览器同步，否则不会离开本地。

## 开发

无构建步骤，无依赖。

```bash
git clone https://github.com/HectorJin/search-filter.git
```

1. 按[安装](#安装)一节把目录加载为未打包扩展
2. 改 `content.js` / `options.js` / `popup.js`
3. 在 `chrome://extensions` 的扩展卡片上点刷新

重新生成图标：

```bash
pip install pillow
python make_icons.py
```

### 测试时要知道的三件事

- **无头模式不注入 content script。** `--headless=new` 能加载扩展，但 `content.js` 不执行。必须开窗口测。
- **Chrome 137+ 移除了 `--load-extension`。** Edge 和夸克还认这个参数；Chrome 只能走界面加载，或用 CDP 的 `Extensions.loadUnpacked`。
- **结果渲染是不确定的。** Bing 和夸克每次加载的结果集都会变，所以“隐藏”和“检查”必须在同一次页面会话里做，否则数据对不上。

## 参与贡献

欢迎提 bug、补引擎支持。见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可

[MIT](LICENSE) © 2026 HectorJin
