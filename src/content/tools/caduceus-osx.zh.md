---
key: caduceus-osx
lang: zh
name: 'Caduceus（Apple Silicon fork）'
tagline: '在 Metal 而不是 CUDA 上跑的双向 DNA 语言模型'
summary: 'Caduceus DNA 语言模型的 fork：架构与权重不变，多出一条 MPS 训练与微调通路、一份 macOS 环境文件，以及一组"验证优化确实生效"的脚本。'
category: machine-learning
repo: 'https://github.com/BioChaoGroup/caduceus-osx'
language: 'Python'
license: 'Apache-2.0'
status: experimental
featured: false
order: 45
install: |
  conda env create -f caduceus_env.yml
  conda activate caduceus_env
  # our fork also ships caduceus_osx.yml for the MPS path
links:
  - label: 'Caduceus 论文（arXiv）'
    href: 'https://arxiv.org/abs/2403.03234'
    kind: paper
  - label: 'DNA 语言模型项目'
    href: '/zh/projects/dna-language-models/'
    kind: docs
---

## 它做什么

Caduceus 是一个由 Mamba 状态空间模块构成的双向 DNA 语言模型，其中一个变体具备反向互补
等变性（reverse-complement equivariant），因此训练时不需要做反向互补数据增广。它是基因
组语言模型而不是通用序列模型：仓库在人类参考基因组上训练与微调，然后在基因组基准以及
变异效应预测（variant effect prediction）任务上评估——后者把嵌入抽出来喂给下游分类器。

这个 fork 保留原有架构与已发布权重（Hugging Face 上的预训练模型上下文 131 kb、
`d_model` 256、16 层），增加的是能在 Apple Silicon 上跑的通路。让它成为"真的能跑"而不是
"声称能跑"的有三件事：

- `caduceus_osx.yml`：锁定 PyTorch 2.2 与 MLX 的环境文件；
- 面向 MPS 的训练入口 `finetune_mps_optimized_v2.sh`：单 worker 的 DataLoader、更小的
  micro-batch 与梯度累积，以维持等效批大小；
- `verify_mps_optimizations.py`：在开跑之前检查环境，而不是等一次很慢的失败。

fork 里还有一个不依赖 Weights and Biases 的基准驱动脚本
（`run_genomic_benchmark_no_wandb.sh`），因为实验室机器往往没有地方上报遥测。

## 设计说明

有意思的正是那些不兼容之处。MPS 使用统一内存，`pin_memory` 没有收益，两个 DataLoader
worker 的开销大于收益；fused kernel 与部分 RMSNorm 变体可能不可用，所以文档里的配置导出
`PYTORCH_ENABLE_MPS_FALLBACK=1`，让不支持的算子回落到 CPU。这些都不改变模型本身——它们
改变的是模型能不能跑起来。

## 现状

实验性。fork 采用 Apache-2.0，基于 `kuleshov-group/caduceus`；该仓库的 README 与论文
仍然是权威描述。我们不发布 MPS 通路的速度或精度数字，原因见
[项目页](/zh/projects/dna-language-models/)。
