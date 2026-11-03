---
key: dcs-harness
lang: zh
name: 'dcs-harness'
tagline: '把 DCS Cloud 账号变成"先规划、再审计、后执行"的分析会话的 DeepSeek Harness 插件'
summary: '封装面向 DCS Cloud 的 dcs 命令行客户端：让 agent 检索数据、复用已有流程、写出待确认的计划、审计脚本、在线或离线执行，并交付报告。'
category: infrastructure
repo: 'https://github.com/BioChaoGroup/DCS-Harness'
language: 'JavaScript'
license: 'MIT'
status: beta
featured: false
order: 20
install: |
  # from GitHub (the source the plugin README points at)
  dsh plugin --profile web add github:xuxun-oss/DCS-Harness
  # or from a local clone
  dsh plugin --profile web add /path/to/DCS-Harness
links:
  - label: '实验室基础设施项目'
    href: '/zh/projects/lab-infrastructure/'
    kind: docs
---

## 它做什么

`dcs-harness`（包名 `dsh-dcs-cloud`）通过 `dcs` 二进制把 DeepSeek Harness 接到 **DCS
Cloud**——BGI Research 的基因组与时空组学分析平台。这个插件的贡献是一套流程，而不是一层
命令包装：agent 先规划再执行，且每一步都登记在人能看到的地方。

它强制走的闭环大致是：建立项目 → 读取平台原生技能与专家定义 → 主动询问用户是否提供自有
数据 → 检索公共库与已有流程 → 写出分析计划并把状态置为"待确认" → 确认之后才把计划拆成
模块并执行。执行可以是在线容器、离线任务或分片并行投递，费用与资源消耗回到同一个面板。
在真正开跑之前，`dcs_audit_script` 会做一次静态审计：危险命令、硬编码密钥、资源与镜像
配置。

围绕这条主线的是日常可用的部分：带版本时间线与文件清单的项目窗口、把多模态图表下载到
本地（离线也能看）的交付窗口，以及配置个人 access token 的设置页。

## 设计说明

- **复用优先**：先查已有 WDL 流程与平台公共数据，再考虑写新脚本——既便宜，也可复现。
- **agent 监督，平台计算**：长任务或重任务投递出去而不是在会话里跑，掉线不至于丢作业。
- **两个模型要分清**：对话用的 Genpilot 模型与 Genos 预测模型（VCF→RNA 信号）在界面上
  明确区分，因为混淆它们是一个很容易犯且代价高的错误。
- **密钥留在本地**：token 由 `dcs` 客户端保存，插件自己的缓存在 `~/.dsh/` 下，权限 `0600`。

## 现状

Beta，版本 2.6.x，由少数人持续开发，因此一直在动：工具名与面板布局在小版本之间变过。我们
的仓库是 `BGIResearch/DCS-Harness` 的 fork，以跟随上游为主、不额外加功能；插件只有配合
DCS Cloud 账号与 PAT 才有意义。这里没有任何关于分析质量的断言——它只是让计划可见的管道。
