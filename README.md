# 词库防路由

SillyTavern 第三方扩展。只替换最后一条用户消息里的触发词，不改聊天记录，也不把整段正文切碎。

## 安装

1. 打开 SillyTavern → 扩展 → 安装扩展。
2. 粘贴本仓库地址：

```
https://github.com/xiaogu619520/route-guard
```

3. 安装完成后刷新页面。扩展列表里会出现「词库防路由」。
4. 打开扩展面板，拉到「词库防路由」，确认「启用」已勾上。

也可以手动克隆到用户扩展目录：

```
git clone https://github.com/xiaogu619520/route-guard.git data/<用户名>/extensions/route-guard
```

仓库根目录必须直接有 `manifest.json`。不要套一层子目录，否则酒馆安装器找不到清单。

## 行为

- 监听 `GENERATE_AFTER_DATA`。预览提示词（dry run）不改。
- 从 `prompt` 末尾往前找第一条 `role === "user"` 的消息，只改这一条。
- 命中内置词表或你追加的 `原文=替换` 时，默认换成同音词。
- 「替换结果插零宽」默认关闭。

设置保存在 `extension_settings.route-guard`。

## 文件

- `manifest.json`：酒馆扩展清单
- `index.js`：替换逻辑
- `style.css`：扩展面板样式
