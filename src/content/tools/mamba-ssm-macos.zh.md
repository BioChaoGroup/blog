---
key: mamba-ssm-macos
lang: zh
name: 'mamba-ssm-macos'
tagline: '在 Apple Silicon 上做 Mamba 1 / Mamba 2 推理，不需要 CUDA，也不需要 Triton'
summary: 'Mamba 状态空间模型的 macOS 移植版，跑在 Metal Performance Shaders 上，自带官方预训练权重与一个很小的 Python API；我们把它当作 Mac 上跑 DNA 语言模型所需的那块积木。'
category: machine-learning
repo: 'https://github.com/BioChaoGroup/mamba-ssm-macos'
language: 'Python'
license: 'Apache-2.0'
status: beta
featured: false
order: 50
install: |
  pip install -r requirements.txt
  python -m scripts.download_models mamba1   # 493 MB checkpoint
  python -m scripts.download_models mamba2
  make run-mamba1
links:
  - label: 'DNA 语言模型项目'
    href: '/zh/projects/dna-language-models/'
    kind: docs
  - label: 'CADUCEUS fork'
    href: 'https://github.com/BioChaoGroup/caduceus-osx'
    kind: code
---

## 它做什么

Mamba 是一种选择性状态空间（selective state space）架构：它不对整个序列做注意力，而是
维护一个小型循环状态，状态更新依赖输入——这正是长序列能够被处理的原因。原始实现假设有
CUDA，较新版本还依赖 Triton kernel。在 macOS 上这两者都不存在。

`mamba-ssm-macos` 是面向 Apple Silicon 的 Mamba 1 / Mamba 2 实现，为 M1 到 M4 提供
MPS 加速，且不依赖 CUDA 或 Triton。它附带官方预训练权重、生成用的命令行
（`python -m scripts.run_models mamba1 --prompt ...`）、一个很小的 Python API
（`get_device`、`load_and_prepare_model`、`generate_text_with_model`）以及一组测试。
两代架构都支持：Mamba 1 用它的选择性 SSM 扫描，Mamba 2 用 state-space-dual 形式与更大
的状态维度。

## 设计说明

这是一套**推理**栈，不是训练栈。这决定了我们怎么用它：在 Mac 上跑的 DNA 语言模型需要
一个能在 MPS 上执行的 Mamba 模块，而这个项目填的正好是那个空缺。采样参数、设备选择与
错误处理都是显式暴露的——`get_device()` 在 MPS 不可用时回落到 CPU，这正是"笔记本是备选
方案"时想要的行为。

代价是与参考实现的一致性：MPS 重实现不可能承诺 kernel 级完全一致，因此任何在 CUDA 与
MPS 之间比较输出的人，都应当预期到微小的数值差异；在没有核对同一随机种子的情况下，不要
把差异直接当成 bug。

## 现状

我们的仓库是上游 macOS 项目的镜像：没有本地提交，且目前落后于上游，需要修复时才更新。
请把它当作采用宽松许可（Apache-2.0）的第三方组件，而不是课题组自研代码。
