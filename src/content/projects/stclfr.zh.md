---
key: stclfr
lang: zh
title: '单管全覆盖长片段测序（stcLFR）'
summary: '一种在单管内完成长 DNA 分子共 barcode 标记的建库化学，目标是每个原始分子都被完整覆盖，从而让 barcode 连锁信息在分析中真正存活下来。'
status: active
year: 2025
period: '2022—'
repo: 'https://github.com/BioChaoGroup/biciao'
tags: ['long-read', 'linked-read', 'sequencing', 'methods']
members: ['Fang Chao']
tools: ['biciao', 'metabbq']
featured: true
order: 10
links:
  - label: '分析工具集（biciao）'
    href: 'https://github.com/BioChaoGroup/biciao'
    kind: code
  - label: 'Barcode 定量（metabbq）'
    href: 'https://github.com/BioChaoGroup/metabbq'
    kind: tool
---

## 问题

linked reads 只有在 barcode 真的把东西连起来时才有用。在液滴法文库中，分子要竞争
微珠：大量分子丢失、部分被重复捕获、还有一部分 reads 拿不到可用的 barcode。结果是
文库的"平均覆盖度"看起来正常，而真正携带长程信息的分子却很稀疏。

stcLFR（single-tube complete-coverage Long Fragment Read）是我们试图在**化学层面**
而不是组装器层面解决这个问题的尝试。长 DNA 在单管内用载有转座酶的 barcode 磁珠完成
共标记，没有乳化步骤，也就没有随之而来的分子丢失。设计目标是**每个原始分子的完整
覆盖**：每个 barcode 上的 reads 足够多，使分子沿全长都被观测到，而不只是一两个位置。

## 为什么"完整覆盖"才是正确的指标

连锁信号的质量取决于背后的分子。长度 $L$ 的分子拿到 $k$ 条长度 $\ell$ 的 read，
其每碱基覆盖度为 $k\ell/L$，某位点未被覆盖的概率约为 $e^{-k\ell/L}$。对 50 kb 的
分子和 150 bp 的 reads 来说，即使 $k=20$，仍有约 $5\%$ 的分子区域未被观测——这些
缺口恰好出现在连锁最需要的地方。提高 $k$ 不是免费的（那是测序深度），所以文库必须
"高效"而不只是"深"。

实际评估 stcLFR 文库时，我们关心三个量：

| 指标 | 说明 |
| --- | --- |
| 每 barcode 读数 | 分子是否具有信息量 |
| 分子内跨度 | 连锁是局部的还是长程的 |
| 无 barcode 读段比例 | 有多少测序量损失在提取失败上 |

## 仓库里有什么

[`biciao`](https://github.com/BioChaoGroup/biciao) 收集分析工具：barcode 提取与纠错、
每分子统计，以及把带 barcode 标签的比对结果送入下游组装器与 scaffolder 的胶水代码。
[`metabbq`](https://github.com/BioChaoGroup/metabbq) 负责 barcode 层面的定量，包括
让"每分子读数"真正成立（而不是"每个扩增片段读数"）所需的去重处理。

代码刻意保持小而专注、以命令行为先。贡献在化学，软件最好"无聊"到可以信任。

## 现状与下一步

方法与分析工具集都在持续开发中。目前的工作集中在实践中的两类失效模式：barcode 标记
之前的分子缺口或断裂（会悄悄缩短有效分子长度），以及高起始量文库中的 barcode 碰撞
（会虚增表观连锁）。两者都在分子长度已知的对照 DNA 上刻画清楚之后，我们才会对真实
样本下结论。

想在自己的数据上试用，可以先看[工具页](/zh/tools/biciao/)和关于
[barcode 连锁](/zh/posts/linked-read-metagenome-assembly/)的文章。
