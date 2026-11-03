---
key: dna-language-models
lang: zh
title: '在 Apple Silicon 上跑 DNA 语言模型'
summary: '在 Mac 上运行 Caduceus 与 Mamba：当训练栈默认假设有 CUDA 时需要改什么，以及我们刻意不宣称什么。'
status: active
year: 2025
period: '2025—'
repo: 'https://github.com/BioChaoGroup/caduceus-osx'
tags: ['machine-learning', 'dna-language-models', 'reproducibility', 'software']
members: ['Fang Chao']
tools: ['caduceus-osx', 'mamba-ssm-macos']
order: 40
links:
  - label: 'Caduceus 论文（arXiv）'
    href: 'https://arxiv.org/abs/2403.03234'
    kind: paper
  - label: '我们的 Caduceus fork'
    href: 'https://github.com/BioChaoGroup/caduceus-osx'
    kind: code
---

## 为什么要在笔记本上跑 DNA 语言模型

多数 DNA 语言模型在集群上训练，参考实现默认有 CUDA：状态空间模块用 Triton kernel、
norm 层做 fused、DataLoader 开 `pin_memory`。这对跑基准没问题，但对小课题组有点别扭：
我们常问的不是"能不能训最大的模型"，而是"这个模型在我们关心的区段上有没有用"。
Apple Silicon 适合回答第二个问题：统一内存让 131 kb 上下文（context）的模型能塞进一台
笔记本，Metal Performance Shaders（MPS）让你有一块不用排队的 GPU。

## fork 具体改了什么

我们的 Caduceus fork（Apache-2.0，上游 `kuleshov-group/caduceus`）加的是一条 Apple
Silicon 通路，而不是一个新模型。提交信息写得很直白——*transplant to work on apple
silicon*、*try osx compatible coding*——承担改动的文件是：`caduceus_osx.yml`（锁定
PyTorch 2.2 与 MLX 的环境文件）、单 worker 的 MPS DataLoader（在统一内存上多进程加载
得不偿失）、更小的 micro-batch（64）配梯度累积以维持等效批大小，以及一份记录 MPS 环境
变量的指南，其中包含让不支持算子回落到 CPU 的开关。`verify_mps_optimizations.py` 的
用处是：新机器在开跑之前就能自检，而不是跑完才发现问题。

Caduceus 使用 Mamba 状态空间模块，而它的 CUDA kernel 在 macOS 上不可用。因此这套栈的
另一半是我们镜像的 Mamba 1 / Mamba 2 的 macOS MPS 实现，它提供了不依赖 Triton 的模块。
那个仓库是严格意义上的镜像：我们跟随它，不与它分叉。

## 我们不宣称什么

本页没有速度或精度数字。今天诚实的说法是"它能跑，在小规模微调集上 loss 会下降"。
MPS 微调在相同等效批大小下能否达到 CUDA 的质量，是一个我们尚未回答的开放问题，而单
随机种子的对比不足以下结论。

想看实现细节，[Caduceus fork](/zh/tools/caduceus-osx/) 与
[Mamba 镜像](/zh/tools/mamba-ssm-macos/) 各有单独说明；架构本身应当读上游的
[Caduceus 论文](https://arxiv.org/abs/2403.03234)。
