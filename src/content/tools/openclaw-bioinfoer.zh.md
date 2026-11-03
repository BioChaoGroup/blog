---
key: openclaw-bioinfoer
lang: zh
name: 'bioinfoer'
tagline: '把资深生信工程师的工作标准写成 agent 可执行的规范'
summary: '一个 OpenClaw skill：让 agent 先检查环境、只用相对路径、先产出 TSV 再谈结论，并坚持用参数化脚本生成报告，而不是把数字粘进文档。'
category: infrastructure
repo: 'https://github.com/BioChaoGroup/openclaw-skill-bioinfoer'
language: 'Markdown, Shell'
license: 'Internal use only; not for redistribution'
version: '1.0.3'
status: beta
featured: false
order: 60
install: |
  cd ~/.openclaw/workspace/skills/
  git clone https://github.com/BioChaoGroup/openclaw-skill-bioinfoer.git bioinfoer
links:
  - label: '实验室基础设施项目'
    href: '/zh/projects/lab-infrastructure/'
    kind: docs
---

## 它做什么

`bioinfoer` 是给做生信工作的 OpenClaw agent 用的 skill。它不是工具包装，也不含分析代码；
它是一份成文的标准加一张路由表，让 agent 在动手时采取和严谨分析者一样的纪律。

真正起作用的是五条：先读 skill 再碰原始文件；把请求拆成输入、流程步骤、技术栈、运行环境
与输出；检查 conda 环境与可执行文件是否存在；保持版本控制干净（只用相对路径、在阶段边界
提交、数据用 DVC）；以及构建可复现的流水线——结构化 TSV 是数据契约，分析脚本是唯一事实
来源，"更新进度"意味着重跑脚本，而不是修改报告。

最后一条在实践中最为关键。手工敲进报告里的数字，是没人能重新生成的数字；而一个读取
`params$input_tsv` 的参数化 R Markdown 文档，一分钟就能重跑，还能和上一版做 diff。

## 设计说明

这个 skill 刻意采用渐进披露（progressive disclosure）：76 行的 `SKILL.md` 陈述理念与
路由表，之后是十份聚焦的 reference——环境、工具、版本管理、路径、数据抽取、工具复用、
报告、流水线组装、模板、决策——只在任务需要时才加载。`assets/` 里放的是可直接复制的起
点：参数化 R Markdown 模板、报告骨架、Python CLI 脚本、项目初始化脚本。禁止事项清单写得
很直白，因为 agent 对显式禁令的遵循度高于隐含偏好：禁止硬编码绝对路径、禁止阶段内部提交、
禁止没有脚本的"口头结论"。

## 现状

版本 1.0.3，内部使用、不对外分发，因为 skill 里记录了专属于我们环境的路径与配置。它是为
OpenClaw 写的，但标准本身与工具无关；如果你用的是别的 agent 运行时，可以把 `SKILL.md`
当作清单来读。
