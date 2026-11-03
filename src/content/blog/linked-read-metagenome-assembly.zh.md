---
key: linked-read-metagenome-assembly
lang: zh
title: '把 barcode 当作物理先验：用 linked reads 组装宏基因组'
description: 'linked-read 文库给每条短读带上其来源长分子的标签。诚实地使用时，这个标签就是一个似然——而这正是宏基因组组装最缺的东西。'
lede: 'barcode 不是染色体，但比染色体更有用：它是几小时前两段序列确实属于同一个分子的直接证据。'
date: 2026-02-18
authors: ['Fang Chao']
tags: ['linked-read', 'metagenomics', 'assembly', 'methods']
kind: article
related: ['stclfr', 'pangaea']
featured: true
cover: '/images/blog/linked-read-metagenome-assembly/cover.svg'
---

鸟枪法宏基因组学有一个结构性难题：一个群落里是数百个基因组，丰度跨越四个数量级，
而打断之后每条 read 看起来都差不多。组装算法要从一堆没有任何"来源记录"的 reads
里重建它从未见过的基因组。短读长给你序列，但不给你**归属**。

linked-read 测序把归属还了回来。几十 kb 的长 DNA 分子被分隔开，每个分子拿到一个
barcode，由它产生的所有短读都继承这个 barcode。两条 read 共享 barcode，几乎可以
认为来自同一个分子，因而来自同一个细胞、同一个菌株、同一个基因组。这是一个物理
陈述，而不是统计推断——恰好是宏基因组组装最缺的先验。

这篇笔记讲我们如何看待这个信号：它到底测了什么、在哪里失效，以及如何把它变成
组装器可以优化的目标函数。

## linked-read 文库到底测了什么

建库方式就是假设本身，后续分析只是检验它。常见化学有两类：

- **液滴共 barcode**（10x Genomics linked reads 及后续微流控方案）：长分子被
  包进油包水凝胶珠（GEM），在液滴内扩增，同一液滴的产物共享源自大容量白名单
  的一个 barcode。[^1]
- **单管共 barcode**（stLFR，以及我们的 stcLFR 变体）：转座酶预载在 barcode
  磁珠上，反应在一个管子里完成，无需乳化步骤——这去掉了分子丢失和无 barcode
  读段的一个主要来源。[^2]

![长分子被打断并扩增，其短读共享同一个 barcode；因此 barcode 共享就意味着已知尺度分子上的物理连锁。](/images/blog/linked-read-metagenome-assembly/barcode-molecules.svg)

最关键的量是**每个分子的读段数**。若文库含 $M$ 个分子、测了 $N$ 条 read，则某个
分子上的 read 数近似服从参数为

$$
\lambda = \frac{N}{M}
$$

的泊松分布。一个分子完全没有被测到的概率是 $e^{-\lambda}$；长度 $L$ 的分子上，
某一位点 $x$ 未被长度 $\ell$ 的 read 覆盖的概率近似为

$$
P(\text{位点 } x \text{ 未覆盖}) \approx \exp\!\left(-\frac{\lambda \ell}{L}\right),
$$

其中 $\lambda\ell/L$ 是该分子贡献的碱基深度。由此立刻有两个推论，而且都比看起来
更重要：

1. **$\lambda$ 低不只是覆盖度低，而是连锁信息消失。** 只被测到一次的分子没有任何
   内部证据。连锁只存在于共享同一分子的 reads 之间，所以稀疏分子对组装毫无价值，
   尽管它们仍然贡献碱基覆盖。
2. **"每个分子完整覆盖"和"整体高覆盖"是两回事。** 前者要求 $\lambda \gg L/\ell$
   ——需要比"平均分子长度"直觉多得多的每分子读段数。这正是我们 stcLFR 工作瞄准的
   设计点；也说明决定 barcode 是否有用的，是建库化学而不是组装器调参。

动手组装之前值得先做一次体检：画"每个 barcode 的读数"分布。健康的文库呈现近似
泊松的单峰加一条高拷贝长尾；塌缩或污染的文库则出现大量零膨胀尖峰，通常意味着
barcode 提取失败或白名单不对。

```python
# 每分子读数体检：把观测到的 barcode 多重度与同均值的泊松期望对照。
# 出现明显零膨胀，说明连锁信号已经缺失，先别急着组装。
import numpy as np

def reads_per_barcode(barcodes):
    _, counts = np.unique(barcodes, return_counts=True)
    return counts

def poisson_reference(lam, size=100_000, seed=0):
    rng = np.random.default_rng(seed)
    return rng.poisson(lam, size=size)

counts = reads_per_barcode(barcodes)
print(f"molecules: {counts.size}, mean reads/molecule: {counts.mean():.2f}")
print(f"singletons: {(counts == 1).mean():.1%} of barcodes")
```

## 为什么宏基因组组装需要它

短读长宏基因组组装的三大失效模式，本质都是连锁问题：

- **重复序列塌缩。** 保守基因、插入序列和 rRNA 操纵子在许多基因组中都存在。
  没有连锁信息，组装器无法判断两份拷贝属于一个基因组还是十个，于是要么合并
  （产生 chimera），要么停在那里。
- **菌株纠缠。** 近缘菌株只在少数位点不同，覆盖度与序列组成几乎一致，组装图里
  两条路径都活着，组装器只能随机选择。而 linking 到某个分子的 barcode 能直接
  解决这个选择。
- **丰度偏斜。** 优势菌主导组装图，低丰度基因组只有在 reads 恰好可连时才被组装。
  barcode 连锁是少数与丰度无关的信号之一。

长读长用"长度"解决这些问题，linked reads 用**共属关系**解决。一个 60 kb 分子
拿到 20 条 read，就在几十 kb 尺度上形成一团证据，而每碱基成本只有长读长的一小部分。
代价是证据有非常特定的噪声：barcode 会碰撞。

## 把共属关系变成似然

设有两个候选 contig $A$ 与 $B$，以及各自观测到的 barcode 集合。在同基因组假设下，
某个分子可能物理上跨越 $A$ 和 $B$，于是它的 barcode 同时出现在两边；在不同基因组
假设下，同一个 barcode 也可能同时出现——但只能靠碰撞。

设白名单中有 $B$ 个不同 barcode、文库有 $n$ 个分子，则期望碰撞对数量约为

$$
\mathbb{E}[\text{碰撞}] \approx \frac{n^2}{2B},
$$

这就是穿白大褂的生日悖论。白名单 $10^6$ 个 barcode、文库 $10^7$ 个分子时，这个
期望并不小，所以共享 barcode 本身永远不是证据。我们要的是似然比：

$$
S(A,B) = \sum_{b \in \text{共享 barcode}} \log \frac{P(b \text{ 同时出现在 } A,B \mid \text{同基因组})}{P(b \text{ 同时出现在 } A,B \mid \text{不同基因组})},
$$

分子主要由"长度相关的分子跨越概率"决定，分母主要由碰撞概率与该生物丰度决定。
由此有两个实践要点，也是多数实现出错的地方：

- **数分子，不要数 reads。** 某 barcode 在 $A$ 上有 40 条 read、在 $B$ 上有 3 条，
  这是**一个**观测，不是 43 个。把 reads 当作独立证据会让支持度平方级膨胀，
  制造出非常自信的 chimera。
- **按丰度归一化。** 优势菌的 barcode 更容易与一切碰撞，纯粹因为它有更多分子。
  似然比必须条件化到该 barcode 的总多重度上，否则低丰度基因组会被系统性地低估
  连锁。

实际使用时，这个分数出现在三个地方：作为组装图的边权、作为 scaffolding 的约束、
以及作为分箱的连锁证据（某 barcode 同时出现在两个候选 bin 的 contigs 上，要么是
真实的菌株级连接，要么是碰撞——上面的模型可以告诉你哪一个更可能）。

## 一条最小流水线

细节取决于化学体系，但形状总是一样：提取 barcode、在比对中携带它、让能理解它的
步骤消费它。

```bash
# 1. 提取并纠错 barcode。多数流程使用 10x 约定（BX:Z），
#    linked-read 组装器与 scaffolder 都能识别。
bx_extract --r1 R1.fq.gz --r2 R2.fq.gz \
           --whitelist barcodes.txt \
           --out reads.bx.fq.gz --stats barcode-stats.tsv

# 2. 带 barcode 的比对。
bwa mem -C -t 16 reference.fa reads.bx.fq.gz \
  | samtools sort -@ 8 -o aligned.bam -
samtools index aligned.bam

# 3. 组装前体检：每 barcode 读数、碰撞率、以及提取时丢失 barcode 的读段比例。
samtools view aligned.bam \
  | awk -F'\t' '{for(i=12;i<=NF;i++) if($i ~ /^BX:Z:/) print substr($i,6)}' \
  | sort | uniq -c | sort -rn > reads-per-barcode.tsv
```

再往后，选哪个组装器不如"信号怎么用"重要：用能识别 barcode 的组装器或 scaffolder，
在 BAM 里保留 barcode 标签，并确认工具数的是分子而不是 reads。悄悄忽略 `BX` 标签的
组装器很常见——一次看起来"用了连锁"的运行，可能根本没用上。

## 我们怎么评估

barcode 组装的结论很容易过度宣称，所以评估必须明确"barcode 应该修好流水线的哪一段"。
我们按这个顺序看四件事：

| 问题 | 指标 |
| --- | --- |
| 组装到底有没有变好？ | NGA50、contig 数、总组装长度 |
| 变好的原因对不对？ | 相对已知分子的连锁 precision/recall；chimera contig 比例 |
| 菌株分辨率有没有提高？ | 每个菌株的召回率、重建基因组的 ANI |
| 能不能用？ | 墙钟时间、峰值内存、低起始量文库上的失效模式 |

第二行最常被跳过。如果 NGA50 提高的同时 chimera 也增加，那 barcode 提供的不是连锁，
而是自信的错误。所以我们先在分子已知的模拟数据上直接评估连锁声明，再谈真实群落。

## 未解决的问题

按困扰程度从高到低，有三件事我们仍不确定：

1. **真实 DNA 损伤下的分子完整性。** 缺口或断裂的分子会破坏方法所依赖的连锁，
   而且基因组各处的断裂并不均匀。
2. **低丰度下的碰撞感知分箱。** 上面这套似然对"一对 contig"是直接的，但要把它
   变成对数百个基因组一致的分箱目标函数，还不直接。
3. **混合设计。** linked reads 便宜、长读长长。哪部分图交给哪种技术，目前仍是
   经验问题。

这个问题吸引人的地方在于：信号是物理的。我们不是在发明先验，而是在回收建库时
已经付过钱的那个先验。要做的是别把它浪费掉。

[^1]: Zheng, G. X. Y. *et al.* Haplotyping germline and cancer genomes with
    high-throughput linked-read sequencing. *Nature Biotechnology* 34, 303–311 (2016).
    [doi:10.1038/nbt.3432](https://doi.org/10.1038/nbt.3432)

[^2]: Wang, O. *et al.* Efficient and unique cobarcoding of second-generation
    sequencing reads from long DNA molecules enabling cost-effective and accurate
    sequencing, haplotyping, and de novo assembly. *Genome Research* 29, 798–808
    (2019). [doi:10.1101/gr.245126.118](https://doi.org/10.1101/gr.245126.118)
