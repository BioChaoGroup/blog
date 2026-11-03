---
key: metabbq
lang: zh
name: 'metabbq'
tagline: '面向单管长片段数据的工作流启动器与 Snakemake 模块'
summary: '针对 stcLFR 文库的质量控制、barcode 预聚类组装与分离微珠组装；用配置文件和样本清单驱动，而不是每个项目重写一套脚本。'
category: metagenomics
repo: 'https://github.com/BioChaoGroup/metabbq'
language: 'Perl'
license: 'GPL-3.0'
status: experimental
featured: false
order: 30
install: |
  # the launcher lives in the upstream metaSeq repository
  git clone https://github.com/ZeweiSong/metaSeq.git
  export PATH="/path/to/metaSeq:$PATH"

  metabbq cfg                       # write default.cfg
  metabbq -i input.list -c default.cfg -V
links:
  - label: 'stcLFR 项目'
    href: '/zh/projects/stclfr/'
    kind: docs
  - label: 'Benchmark 仓库'
    href: 'https://github.com/BioChaoGroup/benchmark4stcLFR'
    kind: other
---

## 它做什么

`metabbq` 是我们 stcLFR（single-tube complete-coverage Long Fragment Read）数据的流程
启动器。它按样本清单建立项目目录，然后把 Snakemake 模块分派到一组约定好的目标上：

| 目标 | 模块 |
| --- | --- |
| `{sample}/clean/BB.stat` | 读段质控与 barcode 统计 |
| `{sample}/summary.BC.*.contig.fasta` | barcode 预聚类组装 |
| `{sample}/summary.BI.*.contig.fasta` | 分离微珠（isolate-bead）组装 |

两种组装策略回答的不是同一个问题。预聚类组装先把 reads 按 barcode 邻域分组再组装，
在多个物种共享 barcode 时更有帮助；分离微珠组装把每个微珠当作一个小样本，更贴近文库的
物理事实，也能避免低丰度物种被"平均"掉。组装器本身可选——目标名里能看到 MEGAHIT、
SPAdes 与 IDBA 几种变体；`-j` 并行执行，`-n` 只打印 DAG 而不真正运行。

## 设计说明

启动器刻意做得很薄：它只负责约定（目录布局、目标名、配置项），其余交给 Snakemake，
因此一次运行可以在真正执行前用 `-n` 检查。安装前有两点值得知道。其一，README 要求使用
改造过的 `fastp` 与 `Mash` 开发版本来处理拆分 barcode，这是可复现性上的隐患：如果你希望
项目日后能重跑，请把这两个 commit 记下来。其二，启动器本身在上游（`metaSeq`）；我们的
fork 加的是预印本引用与代码笔记，不是新模块。

## 现状

早期阶段。README 写得很直白：目前没有校验前置条件的测试模块，所以新机器只能靠跑一个小
样本来验证。使用前请做好"读 Snakemake 文件弄清一个目标到底做了什么"的准备；整体上它更适合已经熟悉 Snakemake 的人。
