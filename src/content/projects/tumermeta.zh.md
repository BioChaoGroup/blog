---
key: tumermeta
lang: zh
title: 'TUMERMETA：肠道菌群与肿瘤治疗'
summary: '两项临床微生物组关联研究——免疫检查点联合治疗下的晚期黑色素瘤，以及鼻咽癌疗效——以鸟枪法宏基因组为主，并配合肿瘤侧的测量。'
status: active
year: 2023
period: '2021—2023'
paper: 'https://doi.org/10.1016/j.annonc.2022.07.967'
tags: ['microbiome', 'metagenomics', 'methods']
members: ['Fang Chao']
order: 50
links:
  - label: 'TUMERMETA-Melanoma'
    href: 'https://github.com/BioChaoGroup/TUMERMETA-Melanoma'
    kind: code
  - label: 'TUMERMETA-NPC'
    href: 'https://github.com/BioChaoGroup/TUMERMETA-NPC'
    kind: code
  - label: '会议摘要 841P'
    href: 'https://doi.org/10.1016/j.annonc.2022.07.967'
    kind: paper
---

## 两个队列，同一类问题

两项 TUMERMETA 研究在不同疾病里问的是同一类问题：肠道菌群是否携带"谁会从治疗中获益"的
信息？在晚期黑色素瘤中，暴露因素是免疫检查点抑制剂为基础的联合治疗；在鼻咽癌（NPC）中，
结局变量是治疗疗效，菌群数据与肿瘤侧的测量放在一起分析。

## 代码覆盖了什么

`TUMERMETA-NPC` 是两者中更完整的一个。它的 `Assay/` 目录按分析阶段组织——相关性、表型、
全局视图、比较、报告评分，以及一个随机森林步骤，外加共享的 `common.R`——这大致就是微
生物组关联分析的形状：先拼出特征表，再检验特征与表型的关联，最后看在交叉验证下基于这
些特征构建的分类器是否优于随机。NPC 的 README 明确说明该研究以宏基因组为主，其他组学
层还包括肿瘤突变负荷（TMB）、HLA 分型与外周 T 细胞；正因为有这些层，菌群结果不能孤立
地解读。

`TUMERMETA-Melanoma` 目前只保留项目描述与标题层面的说明；该队列的分析代码不在这个仓库里。

## 现状与本页不说什么

这是关联研究，而关联不是机制。本页不报告效应量、不点名菌属、也不给分类器性能：黑色素瘤
工作以会议摘要形式发表（Annals of Oncology，841P，2022），NPC 的分析在成文之前仍属内部结果。复用这些
代码的人需要自备特征表与表型定义——仓库里是分析代码，不是数据。

如果你在做类似队列，这两个仓库真正值得借鉴的是分析纪律：一个共享的 `common.R`、一个
目录对应一个阶段、报告由脚本生成而不是手工拼装。
