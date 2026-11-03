---
key: pcr-error-single-molecule
lang: zh
title: '单分子测序如何拆解 PCR 的错误来源'
description: 'PCR 错误不是一种错误：聚合酶错配、模板损伤和跳跃扩增各有不同的物理来源与序列签名。单分子一致性序列（duplex consensus）的价值，在于把它们按链分离，而不是笼统地"纠错"。'
lede: '把错误率压下去不难；难的是说清楚每一个错配到底是酶抄错了，还是模板本来就坏了。'
date: 2025-12-02
authors: ['Fang Chao']
tags: ['sequencing', 'methods', 'long-read']
kind: article
related: ['stclfr', 'biciao']
---

只要建库过程中有一步 PCR，最终测到的分子就不再是原始 DNA 分子，而是它的扩增产物。扩增会引入错误，这一点所有人都知道；但在单分子测序的语境里，"错误率"这个单一数字几乎没有信息量。一个错配可能来自聚合酶在第三轮循环抄错了一个碱基，也可能来自原始模板上早已存在的 8-oxoG（8-氧代鸟嘌呤），还可能来自一条没延伸完的产物跳到另一个模板上继续延伸。

这三种事件的物理来源完全不同，可纠正性也完全不同。一致性序列（consensus sequence）之所以有用，不是因为它"把错误平均掉"，而是因为**它保留了错误的链来源**。这篇笔记按这个思路展开：先分清三类错误，再看它们各自在数据里留下什么签名，最后用一段 pileup 代码演示怎么开始做归因。

## PCR 错误不是一种错误

**聚合酶错配。** DNA 聚合酶以一定的概率掺入错误碱基。高保真酶的每碱基每循环错配率通常远低于 $10^{-5}$，Taq 类酶则要高出一到两个数量级（具体数值取决于酶、缓冲液和循环条件，公开的酶学数据差异很大）。经过 $n$ 轮循环，单条扩增谱系在某个位点上至少出现一次错配的概率约为

$$
1-(1-\epsilon)^n \approx n\epsilon ,
$$

所以"错误率"会随循环数线性增长。错配是**随机**的，没有序列上下文偏好，也主要落在一条链的谱系里。

**模板损伤。** 原始 DNA 在提取、保存和加热变性过程中会受损，常见的有三类：8-oxoG、胞嘧啶脱氨（deamination）和无碱基位点（abasic site，AP site）。它们的问题在于，聚合酶面对损伤碱基时并不是"停住"，而是按自己的偏好掺入一个碱基：8-oxoG 常被读成 T，脱氨产生的尿嘧啶被读成 T，无碱基位点则常常被填入 A。于是损伤被固化成一条看起来很像真实变异的替换。损伤是**化学的、位点特异的**，而且只发生在双链中的一条上。

**跳跃 PCR（jump PCR）。** 当聚合酶在某处停住（损伤、二级结构、缺口），未完成延伸的产物可能在下一轮退火到另一个模板上继续延伸，形成两个不同来源序列拼接而成的嵌合（chimeric）分子。它的签名与替换完全不同：断点通常伴随微同源（microhomology），断点两侧没有真实的长程连锁支持，而且同一个"变异"会以嵌合而非点突变的形式出现。

把三者都叫"PCR 错误"，就会得到一幅错误的图景：以为提高酶保真度能解决全部问题。它对错配有效，对模板损伤基本无效，对跳跃 PCR 只在损伤是诱因时间接有效。

## 三种来源留下的序列签名

| 来源 | 物理机制 | 序列签名 | 链偏好 |
| --- | --- | --- | --- |
| 聚合酶错配 | 错误碱基掺入 | 随机替换、少量 indel，无上下文偏好 | 单链谱系 |
| 8-oxoG | G 被氧化，聚合酶对侧掺 A | G>T（互补链上 C>A） | 单链 |
| 胞嘧啶脱氨 | C→U，被读成 T | C>T（互补链 G>A），CpG 处更常见 | 单链 |
| 无碱基位点 | 碱基脱落，聚合酶常掺 A | 表现为主流替换，常伴停步 | 单链 |
| 跳跃 PCR | 不完全延伸产物换模板 | 嵌合断点、微同源、无跨断点证据 | 跨分子 |

表里最重要的是最后一列。**真实变异在双链上同时存在，损伤和早期错配只存在于一条链上。** 一致性序列如果只按"同一分子来源的读段投票"，消掉的是随机错误；只有把原始双链的两条链分开建一致性，才能把"链特异"的事件识别出来。这就是 duplex consensus（双链一致性序列）的立足点：原始 top 链和 bottom 链分别建共识，要求一个位点在两边都被支持。

## Duplex 归因的数学与边界

设某个位点上，top 链出现某个非参考碱基的概率是 $p_t$，bottom 链是 $p_b$。若两条链上的事件独立，duplex 一致性地给出这个碱基的概率约为

$$
P_{\text{duplex}} \approx p_t \, p_b .
$$

于是随机错配被平方级压低，而真实变异在两条链上都有支持，不受影响。模板损伤恰好落在这个模型的甜区：8-oxoG 只出现在一条链上，互补链仍是正常的 C，所以 duplex 会把它判成链特异事件。

但别把这个式子当成保证。首先，损伤与错配并不独立：如果损伤发生在第一次复制之前，聚合酶把损伤位点抄成了"错"碱基，那么这条链的所有后代都会带这个错误，但另一条链仍然干净——duplex 依然能分辨。真正难的是**两条链在同一位置都受损**，或者损伤发生在单链扩增之后又恰好被另一条链的产物覆盖。其次，duplex 要求原始分子的两条链都被测到；分子断裂、一端丢失或覆盖不均，都会让一部分位点退化成单链一致性，归因能力随之下降。

还有一个常被忽略的点：单分子测序的原始读段本身也有测序错误（纳米孔尤其明显），所以"单分子"不等于"无错"。Duplex 的一致性是在**扩增产物内部**做的，它压的是 PCR 和测序错误；对原始模板损伤，它只能识别，不能修复。

## 用 pileup 做一次错误归因

下面这段脚本不做完整的 duplex 建模，只做归因的第一步：在 pileup 上按链统计每个位点的碱基构成，找出**明显链偏好**的候选位点。真实变异应当两链都有支持；只在一侧富集的替换，优先怀疑损伤或早期错配。

```python
# 依赖 pysam。按链统计 pileup 的碱基构成，输出链偏好候选。
# 真实变异应两链均有支持；单链富集更像模板损伤或早期错配。
import pysam

def strand_bias_candidates(bam_path, fa_path, min_depth=20, min_bias=0.8):
    bam = pysam.AlignmentFile(bam_path, "rb")
    fa = pysam.FastaFile(fa_path)
    out = []
    for col in bam.pileup(truncate=True, stepper="nofilter", min_base_quality=20):
        ref = fa.fetch(col.reference_name, col.reference_pos, col.reference_pos + 1).upper()
        fwd, rev = {}, {}
        for pile in col.pileups:
            if pile.is_del or pile.is_refskip:
                continue
            base = pile.alignment.query_sequence[pile.query_position].upper()
            if base == ref:
                continue
            bucket = rev if pile.alignment.is_reverse else fwd
            bucket[base] = bucket.get(base, 0) + 1
        for alt in set(fwd) | set(rev):
            n_f, n_r = fwd.get(alt, 0), rev.get(alt, 0)
            total = n_f + n_r
            if total < min_depth:
                continue
            bias = max(n_f, n_r) / total
            if bias >= min_bias:
                out.append((col.reference_name, col.reference_pos + 1, ref, alt,
                            n_f, n_r, round(bias, 3)))
    return out

for row in strand_bias_candidates("consensus.bam", "reference.fa"):
    print("\t".join(map(str, row)))
```

要把它变成真正的归因，还需要三样原始信息：读段属于哪个原始分子（读名或 UMI）、属于 top 还是 bottom 链、以及该分子的一致性序列。只有把 pileup 的观测聚合到"分子—链"这一层，上表里的签名才有意义；在 read 层做统计，只会把扩增偏好误当成生物学信号。

## 实践中的边界

据我们所知，目前没有一种纯计算的方法能可靠区分所有模板损伤类型。我们能做的是缩小假设空间：

- **用对照 DNA 标定。** 已知序列、无真实变异的对照，是唯一能估计损伤谱的地方；没有对照，任何"纠错"都可能是在拟合噪声。
- **保留未纠错的中间产物。** 一致性序列应当是派生产物，原始读段、分子分组和链标记都要留下，否则归因无法复核。
- **不要过度纠错。** 低覆盖位点上，duplex 一致性可能只有一两条读段支持；把这种位点标成"已校正"比标成"不确定"更危险。
- **把跳跃 PCR 当结构问题处理。** 嵌合读段不应该靠碱基替换模型修复，而应该在比对阶段识别断点并丢弃或单独建模。

这也是我们在 linked-read 流程里坚持保留 barcode 与分子分组的原因：分子边界一旦在早期被抹掉，后面所有的错误归因都失去了参照系。相关工具见 [biciao](/zh/tools/biciao/)，方法背景见 [stcLFR 项目](/zh/projects/stclfr/)。
