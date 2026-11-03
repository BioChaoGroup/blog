---
key: genos-m-microbial-genomes
lang: zh
title: 'Genos-m 开源！面向人源微生物基因组的基座大模型'
description: '华大与之江 Genos 团队推出 Genos-m——4.7B 参数的稀疏 MoE 微生物基因组大模型，仅激活 330M 参数即对标 Evo2-40B。模型与代码已完全开源。'
lede: '它并不是在通用 DNA 模型上“微调”一个生物信息学工具，而是从语料、架构到评测，完整地围绕人源微生物进行了重新设计。'
date: 2026-05-23
updated: 2026-11-03
authors: ['Fang Chao']
tags: ['dna-language-models', 'microbiome', 'machine-learning', 'methods']
kind: article
related: ['dna-language-models']
cover: '/images/blog/genos-m-microbial-genomes/cover.svg'
---

> **华大与之江 Genos 团队推出 Genos-m——4.7B 参数的稀疏 MoE 微生物基因组大模型，仅激活 330M 参数即对标 Evo2-40B。模型与代码已完全开源。**

2026年5月，华大 Genos 团队发布并开源了 **Genos-m**，一个专为人源相关微生物基因组打造的开源基座大模型。

这是 Genos 系列在微生物领域的延续之作 —— 但它并不是在通用 DNA 模型上“微调”一个生物信息学工具，而是从语料、架构到评测，**完整地围绕人源微生物**进行了重新设计。

![Genos-m 概念图：从人源微生物基因组、DNA 序列到模型表征。](/images/blog/genos-m-microbial-genomes/concept.webp)

![预印本首页：标题、作者与摘要（作者按名字首字母排序）。](/images/blog/genos-m-microbial-genomes/paper-title.webp)

## 为什么需要一个“微生物专用”的基因组基座大模型？

现有的基因组基座大模型大多面向“全DNA”，训练语料覆盖真核、原核、病毒等跨生命域序列。

但对于研究人体微生物组的研究者来说，真正头疼的问题是：

- 菌株级多样性 —— 例如大肠杆菌有海量的菌株，但每株的基因组都有细微差异
- 水平基因转移 —— 如耐药基因在不同细菌物种之间“击鼓传花”
- MAG 和未培养微生物 —— 大量新的基因组最初其实是从宏基因组数据中组装出来的，无法保证完整性，污染度高
- 人体微环境特异性 —— 肠道、口腔、皮肤、呼吸道，每个生态位的微生物群落结构都有显著差异

通用DNA模型见过“所有物种”，但不一定“懂”这些微生物在人共生微环境中的“生存模式”。

**Genos-m 就是要解决这个问题。**

## 模型架构：够大，但够省

![Genos-m 架构：Token embedding、GQA 与 RMSNorm，32 个专家中选 2 个的 MoE，以及 1M bp 上下文。](/images/blog/genos-m-microbial-genomes/architecture.webp)

Genos-m 基于 Genos 架构，采用 **稀疏混合专家（MoE）Transformer**：

| 指标 | 数值 |
| --- | --- |
| 总参数量 | 4.7B |
| 激活参数量 | ~330M |
| 专家数 | 32（Top-2 路由） |
| 上下文长度 | 1M bp |
| 注意力机制 | GQA + FlashAttention |
| 位置编码 | RoPE（base=50M） |

关键设计亮点：

1. 32 个专家 + Top-2 路由：路由会从32个专家中动态挑选最合适的2个去处理。每次推理仅激活3.3/47亿参数——效率是同等稠密模型的 10 倍以上。
2. 百万碱基级上下文：支持最长1M bp的单序列推理。在消费级24GB显存GPU上也能跑约200Kbp，足够覆盖绝大多数微生物基因、基因簇及其邻域序列。
3. 单碱基分辨率：精确到每个碱基，N和特殊字符不计入loss。

值得一提的是，Genos-m **仅用 330M 激活参数** 就在多数评测任务上比肩甚至超过了 **Evo2-40B**（400 亿参数）。参数效率拉满。

## 训练数据：1.2 万亿 token 的微生物宇宙

![预训练语料构成表：GTDB R220、公开人源相关原核基因组、自建人肠道高质量 MAGs 与 UHGV 噬菌体。](/images/blog/genos-m-microbial-genomes/table-corpus.webp)

Genos-m 的预训练语料是一个分层构建的体系：

| 数据来源 | Token 量（B） | 占比 |
| --- | --- | --- |
| GTDB R220 代表基因组 | 379 | 31.3% |
| 公开人源相关原核基因组（UHGG、AWI-Gen2、gcMeta、IMGG、CGR、HROM、PMDB*） | 446 | 36.8% |
| 华大自建人肠道高质量 MAGs | 382 | 31.5% |
| UHGV 人源噬菌体基因组 | 3.8 | 0.3% |

**\* PMDB为华大人工标注的病原特征数据集，涵盖全部已知病原物种。**

**总规模：约 1.2 万亿 token，覆盖 186 个门、近7万物种**

### 质量控制有多严格？

- MAGs 要求 **完整度 > 90%、污染度 < 1%**（常规标准是 < 5%）
- 噬菌体要求 CheckV 评估完整度 > 90%
- 50% 概率反义链扩增
- 渐进式上下文长度扩展：8K → 32K → 128K → 1M

华大自建的中国人群肠道微生物数据贡献了约 1/3 的预训练 token，这一点对东亚人群微生物组研究的覆盖尤为重要。

此外，模型覆盖的生态位包括肠道（~89%）、口腔、皮肤、呼吸道和女性生殖道，地理分布涵盖亚洲（~61%）、欧洲、北美、非洲等。

## 评测表现：330M 打出了 40B 的气势

Genos 团队搭建了完整的**多尺度评测体系（Genos-m Benchmarks）**，涵盖短序列、基因级、区域级长上下文、全基因组和零样本 RNA fitness 五大维度。

总结一些关键结果：

### 局部序列与基因级任务

| 任务 | Genos-m | Evo2-40B | DNABERT-2 | 排名 |
| --- | --- | --- | --- | --- |
| 抗生素抗性基因识别 | 0.9896 | 0.9884 | 0.9176 | 🥇 |
| 毒力因子识别 | 0.9548 | 0.9617 | 0.7840 | 🥈 |
| 细菌基因六分类 | 0.9932 | 0.9937 | 0.9637 | 🥈 |
| 必需基因识别 | 0.8534 | 0.8619 | 0.6658 | 🥈 |
| 启动子识别 | 0.8460 | 0.8504 | 0.6820 | 🥈 |

### 基因适应性回归（8 个子任务中 5 项 SOTA）

![各评测任务上的得分对比：DNABERT-2、Nucleotide Transformer、Evo、Genos-m 等。](/images/blog/genos-m-microbial-genomes/benchmark-scores.webp)

在预测不同环境条件下基因适应性分数的回归任务中，Genos-m 在其中 **5 项子任务达到最高 Pearson 相关**，其余 3 项仅次于 Evo2-40B。

一个值得强调的细节策略：**冻结 backbone + 轻量 MLP 分类头**。也就是说，这些能力不是靠微调得到的，而是 **预训练表征本身就蕴含了理解这些任务信号的泛化能力。**

### BGC 区域级长上下文

BGC（生物合成基因簇）是多基因区域任务，考验模型的长上下文整合能力：

- BGC / non-BGC二分类：AUROC = 0.9907（与 Evo2-40B 的 0.9911 几乎持平）
- BGC 多标签分类：AUROC = 0.9216（超过 Evo2-40B 的 0.8951）🥇

### 零样本 RNA fitness

![零样本 RNA fitness 评测：13 个原核相关检测子集的平均 Spearman、AUC 与 MCC。](/images/blog/genos-m-microbial-genomes/table-rnafitness.webp)

将 DNA 模型直接用于 RNA 功能预测（U→T 转换），**不进行任何训练**，仅用 next-token log-likelihood 排序突变体。

在 13 个原核相关 RNA 检测子集中，Genos-m 平均 Spearman 相关系数 **0.313**，在公开模型中排名第 2。

这一结果表明，即使只在 DNA 上训练，模型已经隐式捕获了 RNA 的功能边界。

### 全基因组表型预测

这个测评把每个细菌基因组按 1M bp 切块，对 chunk embedding 取平均得到 genome-level embedding，然后预测菌株表型（如革兰氏染色、需氧性、运动性、孢子形成等）：

| 表型 | Genos-m | Bacformer |
| --- | --- | --- |
| 革兰氏阳性 | 98.41 | 97.61 |
| 厌氧性 | 98.14 | 98.92 |
| 运动性 | 83.22 | 87.01 |
| 孢子形成 | 90.24 | 90.85 |

Genos-m 用序列级 embedding 简单聚合就逼近了 Bacformer 这类全基因组专用模型的表现，验证了**跨尺度组合能力**。

## 模型可解释性：SAE 找到了基因组中的“语义单元”

利用 **稀疏自编码器（SAE）** 对模型内部激活值进行分解，识别出与已知基因组结构高度对齐的稀疏特征：

- ORF 相关特征：能区分正链和负链方向
- Intergenic 区域特征
- tRNA 和 rRNA 特征

SAE 方法最早在 NLP 中被用于解析大模型内部表示，Genos-m 将其引入微生物基因组领域，为“模型到底学到了什么”提供了初步的力学解释性证据。

## 下游应用：不只是个序列编码器

### 案例 1：微生物组自监督学习 + Genos-m 表征

将 Genos-m 的 genome-level embedding 作为物种特征，接入微生物组群落自监督学习模型，在 **跨队列结直肠癌（CRC）分类**任务中：

> Genos-m 表征 + SSL 模型 **超越** 传统物种丰度随机森林模型

这个结果很有意义——传统微生物组分析只用了“谁在”（物种丰度），而 Genos-m 还带来了“基因组长什么样”的信息，这对于功能相关的表型区分至关重要。

### 案例 2：低深度宏基因组样本表征

**仅需 1万条宏基因组 reads**，Genos-m 就能生成稳定的样本级嵌入，保留肠型结构和地理起源区分度。

这意味着什么？很多公共数据集或临床样本的测序深度是不足以支撑组装工作的，而Genos-m 的低输入表征能力，为这些“浅数据”打开了二次分析的大门。

## 多说两句：关于病原检测与多组学研究

Genos-m 的训练数据里有一块叫 **PMDB（Pathogenic Microorganism Database）**。这是华大自己标注的病原特征数据库。这意味着Genos-m 不是像 Evo2 那样“看过几万种生物的 DNA 序列，其中包含了一些病原体”。它是**专门学习过大量病原特征数据的（但是，这个版本还未整合真菌和RNA病毒）**。

这一点在临床应用上可能更具有实践意义：病原微生物和普通环境微生物的区别不亚于熊猫和竹鼠——病原体的基因组有独特的“生存策略”（如黏附素、分泌系统、毒力岛、耐药岛等），这些在通用 DNA 语料里反而是低频信号，但在 Genos-m中可能有专门的“专家”在处理。

基因组学研究正在经历从“单一组学分类”走向“多组学整合”的范式转变。为了卷出新高度，你得尽可能同时理解它的基因组（它是什么物种）、它的耐药组（它有什么抗性）、它的毒力组（它有多危险）、它的转录调控（它在什么条件下激活这些基因）、甚至它的代谢组（它如何在宿主微环境里生存）。

这需要一种**跨尺度、跨层级的信息表征能力**。

而现有的做法往往是每个组学各自跑自己的分析，最后在“讨论”部分强行缝合。

Genos-m 展示了一种可能性：用基因组序列 embedding 作为统一底座，让下游各种组学任务都在同一个表征空间里“对话”。

论文里那个 CRC（结直肠癌）跨队列分析的案例就是一个很好的案例——Genos-m 的 genome-level embedding 被喂给微生物组自监督模型，结果超过了传统物种丰度方法。这意味着除了“谁在”之外，“基因组长什么样”这个信息维度确实为表型区分提供了额外价值。

Genos-m 不直接解决所有问题，但它可能成为那个**连接不同组学任务的基础层**。在它之上，你可以叠加诸如耐药预测头、毒力预测头、宿主-病原互作预测头、甚至 CRISPR 靶向预测头等。

## 开源与使用

Genos-m 已完全开源：

- 模型权重：Hugging Face → [BGI-HangzhouAI/Genos-m](https://huggingface.co/BGI-HangzhouAI/Genos-m)
- 推理代码 & 文档：GitHub → [BGI-HangzhouAI/Genos-m](https://github.com/BGI-HangzhouAI/Genos-m)
- Megatron 训练框架权重：Hugging Face → Genos-m-Megatron
- 附赠 SAE 模型权重和特征搜索代码（后续开放）

### 硬件需求参考

| 硬件 | 支持能力 |
| --- | --- |
| A800 80GB × 1 | 1M bp 完整推理 |
| 消费级 24GB GPU | ~200K bp 推理 |

模型权重仅占用约 **9GB** 显存，配合 FlashAttention 优化，绝大多数生物信息学计算的硬件都能跑。

支持 embedding 提取和序列续生成两种推理模式。

## 总结一下

| 维度 | 要点 |
| --- | --- |
| 定位 | 人源微生物基因组专用，而非通用 DNA |
| 架构 | 4.7B MoE / 330M 激活 / 1M 上下文 |
| 数据 | 1.2T tokens，覆盖 69K 物种，严格质控 |
| 性能 | 与 Evo2-40B 比肩，多数评测前列或 SOTA |
| 可解释 | SAE 揭示 ORF/tRNA/rRNA 语义特征 |
| 硬件 | 单卡 A800 全量运行，24GB 消费级可用 |
| 开源 | 权重 + 代码 + 文档 + 评测基准全部开放 |

Genos-m 的贡献还不止在于模型本身——它附带了一整套**标准的评测基准（Benchmarks）**和**多尺度评测框架**，这在不同基因组基座大模型之间的公平对比中是一大痛点，Genos 团队做了这件费力但重要的事。

## 关联阅读

- 预印本：Genos-m: a foundation model for human-associated microbial genomes（[bioRxiv](https://www.biorxiv.org/content/10.64898/2026.05.21.726868v1)）
- 模型仓库：https://github.com/BGI-HangzhouAI/Genos-m
- Hugging Face：https://huggingface.co/BGI-HangzhouAI/Genos-m
- Genos 原始工作：[全球首个百亿级人类基因组基础模型Genos发布！](https://mp.weixin.qq.com/s?__biz=MjM5MDIxNTQ4MA==&mid=2651442233&idx=1&sn=8eb8d34a55ae78adf640da7b5faf359b&scene=21#wechat_redirect)
- 本文原文：[微信公众号长文](https://mp.weixin.qq.com/s/7Qi_vZuwKjdjzSU-bXHtnQ)（2026 年 5 月 23 日，本站版本保留了原文文字，仅去掉标题与列表中的装饰性图标）
