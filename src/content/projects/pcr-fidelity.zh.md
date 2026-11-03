---
key: pcr-fidelity
lang: zh
title: 'PCR 的错误究竟从哪里来'
summary: '一套单分子测序试验设计，把聚合酶错误、模板损伤与嵌合形成分开计量；以及我们维护的 fork，让流程能在今天的 PacBio 工具上跑起来。'
status: completed
year: 2024
period: '2024'
repo: 'https://github.com/BioChaoGroup/pcr-fidelity'
tags: ['sequencing', 'methods', 'benchmark']
members: ['Fang Chao']
order: 60
links:
  - label: 'Potapov & Ong 2016, PLOS ONE'
    href: 'https://doi.org/10.1371/journal.pone.0169774'
    kind: paper
---

## 问题

"PCR 错误率"通常只报一个数字，这会误导人，因为 PCR 至少引入三类不同的错误：聚合酶
的错配掺入、模板本身的损伤（脱氨、氧化、缺口），以及造成分子间嵌合的模板转换。三者
成因不同、速率不同、对文库的后果也不同；混在一起报，恰好会把对你这个应用最要紧的那一
类盖住。

## 单分子一致性序列如何把它们分开

这套试验用 PacBio 单分子一致性测序（CCS）读取 PCR 产物，于是每个原始分子会产出多条
同一产物的全长 reads。扩增后期引入的错误只出现在该分子少数 reads 中，而从早期循环
（或从模板本身）继承来的错误会出现在其中大多数 reads 里——因此分子内部的一致性序列
可以看作"扩增之前这个分子长什么样"的估计。随后流程按仓库文档给出的步骤推进：分链
一致性序列、比对到参考并提取突变、用 BWA 检测嵌合 reads、在 R 中汇总成表。`extra/`
下另有一组脚本专门分析模板转换与 PCR 介导的重组。

## 我们的 fork 改了什么

我们的 fork 是 Potapov 与 Ong 原代码（AGPL-3.0）的维护分支。我们把这套流程移植到当前
的 PacBio 工具链——用 `pbmm2` 与 `pbccs` 取代 `blasr` 和 `bax2bam`（上游 README 自己
就标注了它们已过时）——写了一个统一的 `workflow.sh` 驱动（按步骤给出子命令），并为
我们实际在用的环境补上了安装与使用说明。试验设计与分析逻辑没有改动，本地提交解决的是
"今天还能把方法重跑起来"。

本页不报告任何新的错误率数字。参考值属于原始论文；我们这边若重新测量，那会是一个需要
单独论证的结论。
