# Lulu 的个人网站 · 使用说明

网站地址：https://luyue-ye.github.io

网站有太阳（学术）和月亮（生活）两面，点导航中间的 Lulu 切换。
**所有文字内容都在 `content` 文件夹里**，改内容只需要改这些文件，不用碰其他代码。

---

## 一、在 GitHub 网页上改内容（最简单）

1. 打开仓库页面，点进 `content` 文件夹，再点你要改的文件
2. 点右上角的 ✏️ 铅笔图标（Edit this file）
3. 修改文字
4. 点右上角绿色的 **Commit changes…**，再点一次 **Commit changes**
5. 等 1～2 分钟，刷新网站就能看到变化

> 如果改完网站上某个栏目出现红框“内容文件读取失败”，说明格式出了问题，最常见的是**缩进（每行开头的空格）对不齐**或者**引号没配对**。照着红框里提示的文件，对比旁边没改过的条目检查一下。实在找不到，可以在仓库里点 **History** 恢复到上一个版本。

## 二、内容文件对照表

| 文件 | 管哪里 |
|---|---|
| `content/site.yaml` | 两面首页的文字、首页照片、首页链接（CV、邮箱）、留言板设置 |
| `content/focus.yaml` | ☀️ Focus 研究 |
| `content/conferences.yaml` | ☀️ Conferences 会议 |
| `content/publications.yaml` | ☀️ Publications 发表 |
| `content/teaching.yaml` | ☀️ Teaching & Service 教学与服务 |
| `content/ideas.yaml` | 🌙 Ideas 想法（塔罗牌，背面显示日期） |
| `content/creations.yaml` | 🌙 Creations 创作（处女座星座：每颗亮星是一个分类，最多 13 个） |
| `content/footprints.yaml` | 🌙 Footprints 足迹星盘的地区和城市 |
| `content/writing/` | Ideas 和 Creations 的全文（每篇一个 `.md` 文件） |

每个文件开头都有中文说明，写了每一项是什么意思。

## 三、格式小规则（YAML）

- 只改引号 `"..."` 里面的文字，引号本身保留
- 每行开头的空格（缩进）不要动；新加一条时，复制旁边一整段再改，缩进自然就对了
- 以 `#` 开头的行是说明，不会显示在网站上
- 文字里可以用 `*斜体*`，以及 `[链接文字](网址)`

**例子：在 Conferences 里加一场报告**，在对应年份下面复制一段：

```yaml
      - when: "Mar 2027"
        title: "论文题目"
        text: "会议名称 · 城市"
```

## 四、换照片、放 CV

1. 进入 `images` 文件夹 → 右上角 **Add file → Upload files** → 拖入照片 → **Commit changes**
2. 打开 `content/site.yaml`，把 `photo_sun: ""` 改成 `photo_sun: "images/你的照片名.jpg"`
   （月亮面的照片改 `photo_moon`）
3. CV 同理：PDF 上传到 `files` 文件夹，在 `site.yaml` 的 links 里把 CV 的 `url` 改成 `"files/cv.pdf"`

照片建议竖版，宽度 800～1200 像素就够，太大的照片会让网站变慢。文件名尽量用英文和数字。

## 五、写随笔、放小说

1. 进入 `content/writing/ideas`（小说放 `content/writing/creations`）
2. **Add file → Create new file**，文件名用英文，例如 `moon-notes.md`
3. 第一行写 `# 标题`，下面空一行开始写正文；空一行就是新的一段
4. 打开 `content/ideas.yaml`，在最上面加一张牌，`file` 写 `"content/writing/ideas/moon-notes.md"`
5. 小说、散文等：打开 `content/creations.yaml`，在对应分类（fiction 小说 / essays 散文 / misc 未分类）的 `items` 下面加一篇，`file` 写 `"content/writing/creations/文件名.md"`。想加新分类，就复制一个分类改名字，它会自动点亮处女座里的下一颗星

长文章会自动分成几页，正文底部有页码。

每篇文章都有自己的网址，例如 `https://luyue-ye.github.io/#ideas/moon-notes`、`https://luyue-ye.github.io/#creations/fiction/文件名`，可以直接分享。

## 六、在星盘上加一个地方

打开 `content/footprints.yaml`，在同一地区的城市后面复制一段：

```yaml
  - name: "冰岛"
    en: "Reykjavík"
    region: "北欧与波罗的海"
    coords: "64.15, -21.94"
```

- 坐标：在 Google 地图上**右键**点那个地方，菜单第一行就是坐标，点一下就复制了，粘贴到 `coords` 的引号里
- `region` 写一个新名字，就会自动多出一个新星座
- 可选：`photo`（照片）、`text`（一两句话）、`note`（小标注）、`home: true`（变成大星星）

## 七、网址小技巧

可以直接分享某个栏目：在网址后面加 `#focus`、`#conferences`、`#publications`、`#teaching`、`#ideas`、`#footprints`、`#creations`、`#echoes`，或者 `#moon` 直接打开月亮面首页。

## 八、文件夹结构

```
index.html        网页骨架（一般不用改）
assets/           样式和动效代码（一般不用改）
  style.css       颜色、字体、大小。颜色在文件最上面
content/          ← 你主要改这里
images/           照片
files/            CV 等文件
```
