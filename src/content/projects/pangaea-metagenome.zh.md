---
key: pangaea-metagenome
lang: zh
title: '用 Pangaea 做 linked-read 宏基因组组装'
summary: 'barcode 让短读长保留了一段物理记忆。我们用 Pangaea 利用这种连锁信息处理复杂宏基因组，并维护一个锁定版本的 fork 让不同批次的结果可比。'
status: active
year: 2024
period: '2022—'
repo: 'https://github.com/BioChaoGroup/Pangaea'
tags: ['metagenomics', 'assembly', 'linked-read', 'benchmark']
members: ['Fang Chao']
tools: ['pangaea-assembler']
order: 30
links:
  - label: 'Pangaea 组装器'
    href: '/zh/tools/pangaea-assembler/'
    kind: docs
  - label: 'stcLFR 项目'
    href: '/zh/projects/stclfr/'
    kind: code
---

## 短读长在宏基因组里缺什么

一条短读长只告诉你"片段上哪些碱基相邻"，却不告诉你这个片段来自哪个物种。组装只能
靠覆盖度与序列组成把归属反推出来，而在菌株水平上这个信号很弱：两个丰度相近、GC 相近
的基因组，恰好是 de Bruijn 图最容易把它们塌成一个的那种情况。

linked reads 补上的正是这一维信息。每条短读长都带着 barcode，而 barcode 继承自它被
扩增时所在的长分子或微珠，因此共享 barcode 的 reads 几乎一定来自同一段 DNA。这是一个
物理层面的陈述，它不会像组成分 binning 那样在近缘基因组之间失效。

## Pangaea 如何利用 barcode

我们使用的组装器 Pangaea 把三件事串起来：先用变分自编码器（variational autoencoder）
学习 barcode 连锁特征的低维表示并据此对短读长做分箱；然后在多个 barcode 特异性阈值下
分别重组装，因为没有一个阈值对高丰度和低丰度物种同时最优；最后把几套组装整合成
ensemble。聚类数是必须认真对待的超参数：项目文档建议复杂宏基因组取 35 左右，也给出了
用 MetaPhlAn4 从数据估计的做法。仅这一步就需要约 20 GB 的数据库，算是对"这不是笔记本
流水线"的一个提醒。

## 我们的 fork 用来做什么

我们维护的 Pangaea fork 以跟随上游为主，不做分歧式修改。它的作用是溯源：每一批
linked-read 数据都对应一个确定的 commit，于是两批结果之间的差异来自数据，而不是来自
组装器版本。我们没有改动组装算法本身；本页也不构成 Pangaea 与其他组装器的基准比较——
那个实验我们还没有以足以发表的方式做过。
