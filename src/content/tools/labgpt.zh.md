---
key: labgpt
lang: zh
name: 'LabGPT'
tagline: '一个 metaGPT agent：读一周的生信文献，写出一篇博客草稿'
summary: '一个小原型：盯住 Nature 系列的 feed，概括近期生信论文并生成 Hexo 文章。它是文献初筛助手，不是分析工具。'
category: machine-learning
repo: 'https://github.com/BioChaoGroup/LabGPT'
language: 'Python'
status: experimental
featured: false
order: 70
install: |
  git clone https://github.com/BioChaoGroup/BIGPT.git
  # set HEXO_LOCAL_DIR to your local Hexo checkout in $HOME/.metagpt/config.yaml
  python main.py
links:
  - label: '示例生成文章'
    href: 'http://biochao.cc/2024/01/22/Top-Paper-weekly/'
    kind: demo
---

## 它做什么

LabGPT（README 里叫 BioinformaticsGPT）基于 metaGPT，只做一件很窄的事：读取 Nature 系列
近期的生信论文，做出概括，并把结果写成一篇文章发到 Hexo 博客。仓库里带着 agent 依赖的
feed 与页面素材（`nature.html`、`science.html`、`nbt.rss.xml` 以及同模板的精简版本）、
一个由角色与动作组成的 `bigpt/` 包，入口是 `main.py`。

配置刻意做得很朴素：把 `HEXO_LOCAL_DIR` 指向本地 Hexo 仓库，运行 `main.py`，文章就出现在
那个仓库里。需要 metaGPT 0.7 以上，以及可用的 Hexo 环境。

## 设计说明

真正有意思的设计问题不是"概括"，而是"选择"：一份周报只有在收录了那篇关键论文时才有用。
README 对这一点很诚实——待办里写着接下来支持 Science 与 Cell，并把"感兴趣的方向"做成输入
参数，让摘要贴合读者的需求。目前由 agent 自己判断相关性，而这恰恰是最需要人在环里的判断。

也需要说清它不是什么：它不批判性地读方法，不会拿论文自己的数据去核对某个论断，也从未被
评估过。生成的文章是草稿，应当由人来修改；README 里链接的示例是演示，不是结果。

## 现状

2024 年的原型，目前处于停更状态。有一个命名上的小坑：仓库叫 LabGPT，而 README 与其克隆
命令里写的仍是 BIGPT，所以两个名字都会出现。仓库没有声明许可，请按内部代码对待。若要继续维护，第一步是把「感兴趣的方向」做成参数（待办里已经写了），否则周报会越来越像泛读摘要。
