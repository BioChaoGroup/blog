---
key: biciao
lang: zh
name: 'biciao'
tagline: '单管长片段共 barcode 文库的分析工具'
summary: '面向 stcLFR 文库的 barcode 提取、纠错与每分子统计工具，以及把带 barcode 标签的比对结果送入组装器与 scaffolder 的胶水代码。'
category: sequencing
repo: 'https://github.com/BioChaoGroup/biciao'
language: 'Perl'
status: beta
featured: true
order: 10
install: |
  git clone https://github.com/BioChaoGroup/biciao.git
  cd biciao
  perl Makefile.PL && make && make test
links:
  - label: 'stcLFR 项目'
    href: '/zh/projects/stclfr/'
    kind: docs
---

## 做什么

`biciao` 是我们 stcLFR 工作的分析部分。它假定你手上有单管共 barcode 文库的原始 reads，
需要从"带磁珠信息的 reads"走到"带坐标的分子"，并在过程中不丢掉连锁。

工具集刻意拆成可以单独运行、单独检查的小命令：

| 命令 | 作用 |
| --- | --- |
| `bin/bx-extract` | 从 read 头部解析 barcode 与磁珠 ID，套用白名单 |
| `bin/bx-correct` | 利用观测邻域纠正 barcode 测序错误 |
| `bin/bx-stats` | 每 barcode 读数、分子跨度、无 barcode 比例 |
| `bin/bx-tag` | 把 `BX:Z` 标签写入 BAM，让下游工具看到连锁 |

因为贡献在化学，代码刻意不隐藏太多东西：每一步都只读写纯文本或 BAM，每个命令的
`--help` 都写明它依赖的假设。

## 设计取舍

- **数分子，不数片段。** 同一 barcode 磁珠上的 reads 在统计前先折叠，否则扩增重复
  会虚增覆盖度，进而污染所有下游连锁估计。
- **绝不悄悄丢掉 read。** 无法解析 barcode 的 reads 会连同原因写入单独文件，因为
  无 barcode 比例是文库 QC 指标，不是实现细节。
- **依赖要"无聊"。** Perl 核心加标准生信格式，目标是五年后还能编译通过。

## 现状

Beta：barcode 解析与统计已稳定并在内部使用；scaffolding 胶水代码仍在变动。1.0 之前
API 与输出列名可能调整。若今天就需要可复现，请固定 commit 并引用 hash。
