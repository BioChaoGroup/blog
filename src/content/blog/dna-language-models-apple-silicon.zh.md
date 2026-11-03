---
key: dna-language-models-apple-silicon
lang: zh
title: '在 Apple Silicon 上跑 DNA 语言模型：MPS、统一内存与基准测试'
description: 'Caduceus 与 Mamba 系列在 Apple Silicon 上的真实瓶颈不是算力，而是算子覆盖、dtype 支持和内存压力。这篇笔记讲 MPS 后端怎么工作、缺失 kernel 怎么回退，以及怎样做一次不骗人的基准测试。'
lede: '统一内存让"把模型放进显存"这句话失去了意义；也正因如此，基准测试更容易骗人。'
date: 2026-01-20
authors: ['Fang Chao']
tags: ['machine-learning', 'dna-language-models', 'benchmark', 'methods']
kind: article
related: ['dna-language-models']
---

DNA 语言模型（DNA language model）的推理和微调，过去默认发生在数据中心 GPU 上。但对一个以方法开发为主的实验室来说，真正的瓶颈常常是迭代速度：改一行 tokenization、换一个 context 长度、试一种 pooling，如果每次都要排队等集群，实验的密度就上不去。Apple Silicon 的统一内存（unified memory）让"在一台笔记本上加载十亿参数级模型"在物理上成为可能，这也是我们开始认真对待 MPS 后端的原因。

但"能跑"和"跑得对、跑得可比较"是两件事。这篇笔记是我们踩过一圈之后的理解：MPS 到底做了什么、Caduceus 与 Mamba 这类模型在它上面会卡在哪里、dtype 怎么选，以及一套我们认为诚实的基准测试协议。

## 为什么值得在本地跑，以及不该期待什么

本地跑模型买到的是**迭代密度**，不是吞吐。把一次前向从"提交作业—排队—等结果"的几分钟，压缩成几秒钟，改变的是一天能做多少次实验，而不是单个实验的绝对速度。对于 DNA 语言模型这种需要反复试序列长度、池化方式和微调策略的工作，这个差别很大。

不该期待的东西也要说清楚：MPS 不是 CUDA 的等价替代。它的算子（operator）覆盖滞后，缺少大量自定义融合 kernel，遇到未实现的算子会回退（fallback）到 CPU；回退不是零成本，它会把异步的 GPU 队列切开，强制同步并搬运数据。一个"能跑通"的模型，可能有一半时间花在回退路径上，而日志里什么都不会说。

## MPS 后端：算子覆盖与回退

MPS（Metal Performance Shaders）是 Apple 的 GPU 计算框架，PyTorch 的 `mps` 后端把张量操作编译到 Metal。基本用法很直接：

```python
import torch

assert torch.backends.mps.is_available(), "需要 macOS 上的 MPS 后端"
device = torch.device("mps")

x = torch.randn(4, 1024, 64, device=device, dtype=torch.float32)
# MPS 是异步执行的：计时和读回结果前必须显式同步。
torch.mps.synchronize()
print(x.mean().item())
```

成败主要取决于模型用了哪些算子。稠密矩阵乘、卷积、LayerNorm、逐元素运算通常都有 MPS 实现；问题出在**自定义核函数（kernel）**上。Mamba 的选择性扫描（selective scan）在 CUDA 上是一个手写的高效 kernel，Caduceus 正是建立在 Mamba 块之上的双向模型。据我们所知，Mamba/Mamba2 的高性能实现主要面向 CUDA（以及部分 Triton 路径），MPS 上没有等价的融合实现。

现实中有三条路：

1. **让 `mamba-ssm` 之类带 CUDA kernel 的包在 macOS 上构建**——通常不可行，或者构建成功但运行时找不到 kernel。
2. **走纯 PyTorch 参考实现**：把选择性扫描展开成普通的张量运算。能跑，正确性也容易验证，但速度明显更慢，中间张量占用的内存也更多。
3. **设置回退开关**，让未实现的算子落到 CPU：

```bash
# 未实现的 MPS 算子回退到 CPU。方便跑通，但会引入同步与数据搬运，
# 基准测试时必须确认没有悄悄走这条路。
export PYTORCH_ENABLE_MPS_FALLBACK=1
```

回退是调试工具，不是性能方案。我们会在小输入上分别记录"允许回退"和"禁止回退"两次运行：如果禁止回退直接报错，说明这个模型在当前环境里没有真正的 MPS 路径；如果允许回退后还能跑完，那测出来的时间也不能当作 MPS 的性能。

## 统一内存改变了什么

在独立显卡上，"模型放不进显存"是一个硬边界。Apple Silicon 的 CPU 与 GPU 共享同一块物理内存，模型参数、激活值和输入数据不需要显式拷贝，`to("mps")` 在语义上仍然存在，但物理搬运少得多。副作用是：**内存上限变成了系统内存，而不是某个固定的显存容量**。

这带来两个陷阱。第一，系统不会因为"GPU 需要"就自动让出内存；当模型、激活值和操作系统争抢同一块内存时，压力会以内存交换（swap）的形式出现，速度断崖式下降，而 profiler 里看起来只是"变慢了"。第二，PyTorch 的 MPS 分配器有自己的高水位策略，缓存下来的内存不一定立刻还给系统；在反复加载不同尺寸模型时，`torch.mps.empty_cache()` 和合理设置高水位比例比在 CUDA 上更重要。

实践上最有效的调节手段不是换模型，而是**控制 batch size 与序列长度的乘积**。DNA 语言模型的注意力或扫描结构对序列长度敏感，显存/内存占用往往随长度超线性增长；先把单条序列的最长长度定下来，再决定 batch，比反过来可靠。

顺带一个与模型结构有关的算术。对注意力模型，键值缓存（KV cache）的大小随序列长度线性增长：

$$
M_{\text{cache}} \approx 2 \times n_{\text{layer}} \times n_{\text{head}} \times d_{\text{head}} \times B \times L \times b,
$$

其中 $B$ 是 batch，$L$ 是序列长度，$b$ 是每个元素的字节数。Mamba 这类状态空间模型的循环状态大小与 $L$ 无关，所以长上下文下两条内存曲线的形状完全不同：注意力模型先撞内存墙，Mamba 模型则更早撞上"扫描太慢"的墙。换句话说，**内存友好不等于算得快**，两件事要分开测。

## dtype 怎么选：fp32、fp16 与 bf16

MPS 上 `float32` 是最稳的选择，`float16` 通常可用，`bfloat16` 的支持则随 PyTorch 与 macOS 版本变化——不能假定它一定可用。我们的做法是先跑一个极小的 dtype 探测，再决定训练/推理精度：

```python
import torch

def mps_dtype_probe():
    ok = {}
    for name, dtype in [("float32", torch.float32),
                        ("float16", torch.float16),
                        ("bfloat16", torch.bfloat16)]:
        try:
            a = torch.randn(64, 64, device="mps", dtype=dtype)
            b = a @ a.T
            torch.mps.synchronize()
            ok[name] = bool(torch.isfinite(b).all().item())
        except (RuntimeError, TypeError):
            ok[name] = False
    return ok

print(mps_dtype_probe())
```

选型逻辑与 CUDA 上类似，但更保守：推理优先 `float16`（若探测通过），训练时混合精度要额外小心——MPS 上的自动混合精度（autocast）支持并不完整，损失缩放（loss scaling）行为也和 CUDA 不同。对 Caduceus 这类含长程扫描的模型，我们倾向于把归一化和累加留在 `float32`，只把矩阵乘降精度，宁可慢一点，也不要为了一个跑不通的 kernel 调半天。

## 什么快，什么慢

把观察到的现象按机制归类，比记一堆数字有用：

| 操作 | 在 MPS 上的表现 | 原因 |
| --- | --- | --- |
| 大矩阵乘、卷积 | 通常较快 | 有成熟的 Metal kernel |
| LayerNorm、逐元素 | 中等 | 逐元素 kernel 启动开销占比高 |
| 自定义扫描/融合算子 | 慢，或直接回退 | 缺少对应 kernel |
| 极短序列、小 batch | 不划算 | Python 与调度开销主导 |
| 极长序列的注意力 | 内存压力大 | 复杂度随长度平方增长 |
| 动态 shape 频繁变化 | 慢 | 图与分配器反复重算 |

一个反直觉的结论是：**小模型在小输入上，MPS 不一定比 CPU 快**。kernel 启动和 Python 调度是固定成本，模型越小，固定成本占比越高。真正能从 MPS 获益的是"足够大的矩阵乘 + 足够长的序列"，而这恰好也是内存最容易爆的组合。

## 一套不骗人的基准测试协议

我们在本地比较模型或配置时，强制遵守下面几条。它们不复杂，但每一条都有人违反过：

先定义在测什么。对语言模型，最常用的是吞吐

$$
\text{tokens/s} = \frac{B \times L}{t},
$$

它把 batch、序列长度和墙钟时间压成一个数，也因此最容易掩盖差异：两个配置的 tokens/s 相同，延迟和内存占用可能完全不同。所以我们同时记录单次前向时间与峰值内存。

1. **预热。** 第一次调用包含分配器初始化、kernel 编译/缓存等一次性成本，必须丢弃。
2. **同步后再计时。** MPS 是异步的，`time.perf_counter()` 前后都要有 `torch.mps.synchronize()`，否则测到的是入队时间。
3. **取中位数，不取平均。** 偶尔的系统调度抖动会污染均值；同时报告最小值与四分位距。
4. **固定输入形状与 batch。** 不同序列长度不可直接比较；DNA 模型尤其如此。
5. **记录环境。** 芯片型号、统一内存大小、macOS 版本、PyTorch 版本、是否插电、是否开着其他负载。
6. **区分冷启动与稳态。** 第一次推理和第一百次推理回答的是不同问题。
7. **报告峰值内存。** 用 `torch.mps.driver_allocated_memory()` 记录，而不是凭感觉。

```python
import statistics, time, torch

def benchmark(fn, warmup=5, iters=20):
    for _ in range(warmup):
        fn()
    torch.mps.synchronize()          # 清空预热阶段排队的任务
    times = []
    for _ in range(iters):
        t0 = time.perf_counter()
        fn()
        torch.mps.synchronize()      # 等到 GPU 真正完成再停表
        times.append(time.perf_counter() - t0)
    return {
        "median_s": statistics.median(times),
        "min_s": min(times),
        "p95_s": statistics.quantiles(times, n=20)[18],
        "peak_mem_gb": torch.mps.driver_allocated_memory() / 1e9,
    }

model = model.to("mps").eval()
ids = torch.randint(0, 4096, (1, 8192), device="mps")
with torch.inference_mode():
    print(benchmark(lambda: model(ids)))
```

最后一条经验：**不要跨机器比较绝对数字**。同一段代码在 M1、M2 Ultra 和一张数据中心 GPU 上的排序可能完全不同，而在同一台机器上比较两个配置的相对差异，才是本地基准真正能回答的问题。模型与方法的背景见 [DNA 语言模型项目页](/zh/projects/dna-language-models/)。
