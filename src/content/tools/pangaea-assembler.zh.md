---
key: pangaea-assembler
lang: zh
name: 'Pangaea'
tagline: '把 barcode 连锁当作聚类信号的 ensemble 宏基因组组装器'
summary: '面向 linked-read 与"长读长 + 短读长"数据的宏基因组组装器：先学习 reads 的低维表示，再在多个 barcode 特异性阈值下重组装，最后把结果整合。'
category: assembly
repo: 'https://github.com/BioChaoGroup/Pangaea'
language: 'Python, C++'
license: 'MIT'
status: beta
featured: false
order: 40
install: |
  git clone https://github.com/BioChaoGroup/Pangaea.git
  cd Pangaea
  ./build.sh
  # optional: MetaPhlAn4 database, ~20 GB, used to choose the cluster number
  ./build_db.sh
links:
  - label: 'linked-read 宏基因组项目'
    href: '/zh/projects/pangaea-metagenome/'
    kind: docs
---

## 它做什么

Pangaea 组装的是"连锁已知"的短读长——linked reads 的物理 barcode，或由长读长加短读长
构造的虚拟 barcode。它不是"在 de Bruijn 组装器上加一个 barcode 选项"，而是在组装之前
就用 barcode 把 reads 分开：

1. **分箱**：用变分自编码器学习 barcode 连锁特征的低维表示，并在该空间里对 reads 聚类。
2. **多阈值重组装**：在不同 barcode 特异性阈值下重复组装，因为能分开高丰度物种的阈值
   往往会把低丰度物种合并，反之亦然。
3. **ensemble 整合**：把多套组装归并成一份输出。

输入可以是成对的 linked-read 文件（`-1`/`-2`）、交错的长读长文件（`-i`），或两者兼有，
再加上预组装的 contigs；`-c` 指定聚类数。项目文档建议复杂宏基因组取 `-c 35`（大致指
物种数超过 200、Shannon 多样性 3.5 左右），而 mock 或模拟群落则取不超过真实物种数的值。

## 设计说明

聚类数是关键参数。下游的一切都继承这个划分，而 Pangaea 给了两条选择路径：用 MetaPhlAn4
图谱估计（这也是安装脚本要下 20 GB 数据库的原因），或者自己定一个数并跳过该依赖。安装
包之所以重，与方法本身同因：它拉入 PyTorch、`bwa`、`samtools`、MEGAHIT、SPAdes、Flye、
`quickmerge` 与 Jellyfish。上游为此专门提供了 Docker 镜像。

## 现状

上游以 MIT 许可发布并持续维护文档；我们的 fork 只跟随、不做本地修改，用作自己运行时
锁定的版本。真正该信的是上游 README，包括其中的硬件说明——开发者跑实验用的是 1 TB 内存
的机器，这也就说明了这里的"复杂宏基因组"是什么量级。
