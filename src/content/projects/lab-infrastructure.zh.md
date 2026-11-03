---
key: lab-infrastructure
lang: zh
title: '实验室基础设施：编排、规范与沟通'
summary: '课题组里不显眼的那一半：DCS Cloud 编排插件、成文的可复现生信分析规范，以及我们日常沟通用的 Matrix 客户端。'
status: active
year: 2026
period: '2026—'
tags: ['infrastructure', 'workflow', 'reproducibility', 'software']
members: ['Fang Chao']
tools: ['dcs-harness', 'openclaw-bioinfoer']
featured: false
order: 80
links:
  - label: 'DCS-Harness'
    href: 'https://github.com/BioChaoGroup/DCS-Harness'
    kind: code
  - label: 'bioinfoer skill'
    href: 'https://github.com/BioChaoGroup/openclaw-skill-bioinfoer'
    kind: docs
---

## 三块东西，一个问题

本组的分析会横跨笔记本、开发服务器与云平台。基础设施项目要解决的，就是让这种跨越变得
无聊。它有三部分，各自对付一种失效方式。

**DCS-Harness** 是 DeepSeek Harness 的插件，封装面向 DCS Cloud 的 `dcs` 命令行客户端。
它最重要的设计是流程性的而不是技术性的：先规划、再执行。一次运行从建立项目、检索已有
数据与可复用流程、写出一份需要人确认的计划开始，确认之后才真正开始计算。插件还会在执行
前审计脚本，并能回交一份自包含的 HTML 报告（含图表）。

**bioinfoer skill** 把同一套纪律写给不在我们插件里运行的 agent：先读技能再动手、conda
环境有固定优先级、Git 与 DVC 且只用相对路径，以及那条关键的规矩——先产出结构化 TSV 再
谈结论，最终数字只能由参数化的 R Markdown 报告生成。它刻意写得短：76 行的 `SKILL.md`
加按主题拆分的 reference，让 agent 只加载任务真正需要的那部分。

**bioelement-web** 是 Element（Matrix 网页客户端）的 fork。它属于"被排除在外的基础设施"：
我们不改它，只部署它——分析讨论与文件交换不该发生在一个无法归档、无法检索的聊天工具里。

## 本页不是什么

这些都不是研究成果，也不是产品：插件绑定一个云平台和一个个人的 access token，技能是为
我们的环境写的，聊天客户端是别人的软件。之所以写出来，是因为反面情形——一个有集群权限、
却没有规范的 agent——正是不可复现分析的来源。

诚实的现状是"日常在用，仍在变化"。接口会改。
