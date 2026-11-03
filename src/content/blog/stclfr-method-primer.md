---
key: stclfr-method-primer
lang: en
title: 'Why one tube, and why complete coverage'
description: 'Droplet co-barcoding is an emulsion experiment as much as a sequencing one. Moving the chemistry into a single tube changes which molecules survive, and complete per-molecule coverage is the specification that decides whether a barcode still links anything.'
lede: 'A barcode only links something if the molecule behind it was still there, still long, and still covered by reads when the library was made.'
date: 2025-10-14
authors: ['Fang Chao']
tags: ['linked-read', 'sequencing', 'methods', 'long-read']
kind: article
related: ['stclfr', 'biciao']
---

Linked-read sequencing buys long-range information with a short-read instrument:
long DNA molecules are labelled with a barcode, then sheared, and every short read
that came from a labelled molecule inherits its label. Assembly, phasing and
binning all rest on one physical claim — the label was applied while the molecule
was intact, and the reads carrying it are still spread along that molecule.

The claim is easy to state and surprisingly easy to lose. This post is about the
two common ways to apply the label, why the difference between them is larger
than it looks, and what "complete coverage" should mean as a specification rather
than a slogan. It is the method-side companion to our
[barcode linkage post](/posts/linked-read-metagenome-assembly/); the projects
themselves are described at [/projects/stclfr/](/projects/stclfr/).

## Two ways to barcode one molecule

**Droplet co-barcoding** partitions long molecules into emulsion droplets, one
molecule (ideally) per droplet, and gives each droplet a barcode from a large
whitelist. The reaction happens inside the droplet: amplification, sometimes
fragmentation, and the barcode is copied onto the products. The published
linked-read chemistry of this shape is described by
[Zheng et al. (2016)](https://doi.org/10.1038/nbt.3432).

Droplet loading is a Poisson process. With a mean of $\mu$ molecules per droplet,
the fraction of empty droplets is $e^{-\mu}$, and the fraction carrying two or
more molecules is

$$
P(\text{multiplet}) = 1 - e^{-\mu}(1 + \mu).
$$

Empty droplets waste barcodes; multiplets make one barcode cover several
molecules, which collapses the linkage resolution exactly where you need it.
Both facts are properties of the partition step, not of the sequencing run, and
no amount of downstream cleverness recovers molecules that were never
encapsulated.

**Single-tube co-barcoding** removes the partition. In stLFR, transposase is
loaded onto barcoded beads and the tagging reaction happens in one tube, so
molecules are labelled in bulk rather than inside droplets; the chemistry is
described by [Wang et al. (2019)](https://doi.org/10.1101/gr.245126.118). Our
stcLFR variant is an attempt to push the same idea towards a stricter design
target: not merely "most molecules get a barcode", but "every captured molecule
is observed along its whole length" ([/projects/stclfr/](/projects/stclfr/)).

The single-tube design trades one failure mode for another. There is no emulsion
to lose molecules in, no droplet-merging step and no demulsification loss. In
exchange, the reaction is a bulk competition: bead-to-DNA ratio, transposition
efficiency and the chance that a molecule picks up two different bead barcodes
all become the things that decide library quality. Neither chemistry is
automatically better; they fail differently, and the QC has to look for
different symptoms.

## The failure modes are not the same

It helps to be explicit about what can go wrong, because the library QC metrics
are just proxies for these physical events.

- **Molecule loss before tagging.** A molecule that is nicked, fragmented or
  adsorbed during extraction is no longer a long molecule, even if its sequence
  still ends up in the library. Coverage looks fine; linkage does not.
- **Partition loss.** In droplet libraries, long molecules encapsulate less
  efficiently than short ones, and the emulsion is a physical object that can
  break, merge or fail to release its contents. This is the class of failure that
  single-tube chemistry is designed to remove.
- **Barcode misassignment.** A molecule tagged by two beads, a barcode with a
  sequencing error, or a whitelist mismatch all produce reads that look linked
  but are not. These are the errors that inflate apparent linkage.
- **Amplification bias.** Uneven copying of fragments within a barcoded group
  distorts "reads per molecule" unless duplicates are handled first.

The practical consequence is that library quality cannot be summarised by total
output. A library can produce a perfect run report and still be useless for
assembly, because the reads are not distributed the way linkage needs.

## Complete coverage is a coverage equation

Suppose the library contains $K$ barcoded groups and we sequence $N$ reads
assigned to barcodes. If reads are distributed without preference, the number of
reads on a group is approximately Poisson with rate

$$
\lambda = \frac{N}{K}.
$$

The fraction of barcoded groups with no read at all is then $e^{-\lambda}$, and
those groups contribute nothing to linkage. That is the first diagnostic: a
large zero spike is not a curiosity, it is the fraction of your library that the
sequencer never saw.

Now go inside one group. If the tagged DNA behind a barcode has total length
$L$ and reads have length $\ell$, the per-base depth within that group is

$$
d = \frac{\lambda \ell}{L},
$$

and the probability that a particular base of that group is never covered is
approximately $e^{-d}$. Requiring the whole group to be covered — no gap at all —
is much stronger than requiring high average depth. Treating bases as roughly
independent, the chance of a gap-free group is

$$
P(\text{no gap}) \approx \left(1 - e^{-d}\right)^{L} \approx \exp\!\left(-L e^{-d}\right),
$$

so gap-free coverage at confidence $1-\varepsilon$ needs $L e^{-d} \le \varepsilon$,
that is

$$
d \ge \ln\!\left(\frac{L}{\varepsilon}\right)
\quad\Longrightarrow\quad
\lambda \ge \frac{L}{\ell}\ln\!\left(\frac{L}{\varepsilon}\right).
$$

For concreteness — and these are illustrative numbers, not a measurement — take
$L = 50\,\text{kb}$, $\ell = 150\,\text{bp}$ and $\varepsilon = 0.05$. Then
$L/\ell \approx 333$ and $\ln(L/\varepsilon) \approx 14$, so a barcode behaving as
a single 50 kb molecule would need around $4{,}600$ reads to be gap-free. That is
a lot of reads for one barcode, and it is the quantitative version of the
complaint that average coverage looks healthy while molecules are full of holes.

There is a second, less obvious consequence. Let the library hold $\rho$ tagged
groups per locus on average, so that $K L \approx \rho G$ for a genome of size
$G$. Sequencing to genome-wide depth $C$ gives

$$
d = \frac{C}{\rho}.
$$

Per-group completeness is therefore not a matter of sequencing deeper; it is a
matter of **how redundant the library is**. If every locus is represented by many
molecules, most of the sequencing budget is spent re-reading the same positions
on different molecules, and each individual molecule stays sparse. Reducing
redundancy — controlling bead-to-DNA ratio, avoiding over-tagging, keeping
molecules long — is what makes deep per-molecule coverage affordable at all. This
is why we treat the chemistry as the contribution and the software as plumbing:
the equation above is fixed, and only the library changes its inputs.

For a real library, $\rho$ is not a single number. It varies with molecule
length, GC content and abundance, which is exactly why the next section is about
measurement rather than modelling.

## What we measure before assembling

Library QC here is a set of proxies for the quantities above. The
[biciao](/tools/biciao/) toolkit exposes the per-barcode statistics; the table is
the interpretation we apply to them.

| Metric | What it stands for | What worries us |
| --- | --- | --- |
| reads per barcode | whether groups are informative at all | a zero-inflated spike, or a mean dominated by a few huge groups |
| within-barcode span | whether linkage is long-range or local | span close to read length, meaning molecules were short before tagging |
| barcode-free read rate | how much of the run was lost in extraction | a large fraction: those reads carry no linkage |
| duplicate multiplicity | amplification bias inside a group | a few fragments holding most of a group's reads |
| shared barcodes across distant loci | misassignment and collisions | any systematic sharing between loci that cannot be one molecule |

The number you cannot get directly from the run report is $K$, the number of
barcoded groups that actually existed — including the ones that received no
reads. But it is estimable from two numbers you do have, total reads $N$ and
distinct barcodes observed $B$, because under Poisson sampling

$$
B = K\left(1 - e^{-N/K}\right).
$$

That equation is monotone in $K$, so a bisection solves it, and the gap between
the estimate and the observed count is the estimated number of silent groups.

```python
# Estimate the number of barcoded groups (K) and reads per group (lambda) from
# total reads N and distinct barcodes observed B. Assumes uniform sampling and
# already-corrected barcodes; barcode-free reads must be excluded.
from math import exp

def barcodes_seen(K, N):
    return K * (1.0 - exp(-N / K))

def estimate_groups(N, B):
    lo, hi = float(B), float(N)      # K >= B, and K <= N when lambda >= 1
    for _ in range(200):
        mid = 0.5 * (lo + hi)
        if barcodes_seen(mid, N) < B:
            lo = mid
        else:
            hi = mid
    return 0.5 * (lo + hi)

N, B = 12_000_000, 4_000_000          # illustrative placeholders: use your counts
K = estimate_groups(N, B)
lam = N / K
print(f"estimated groups: {K:,.0f}")
print(f"reads per group:  {lam:.2f}")
print(f"groups with no reads: {K * exp(-lam):,.0f}")
```

Run this on a good library and on a bad one and the failure is usually visible
without any assembly. One caveat: when $\lambda$ is close to one, the observed
count and the true count are close enough that any non-uniformity dominates the
solution, and the estimate should be read as an upper bound on the number of
groups. The method is most useful on decent libraries, as a check that they
stayed decent.

## Where this breaks

Three things sit outside the model above, and we are honest about all of them.

1. **Nicked molecules.** A molecule broken before tagging is two shorter groups.
   The coverage maths still holds for each half, but the linkage range silently
   halves, and nothing in the run report says so. Control DNA of known length is
   the only way we know to measure this directly.
2. **Barcodes covering several molecules.** Treating one barcode as one molecule
   is an idealisation. When a group contains several molecules, $d$ in the
   equation above is the group's depth, not any single molecule's, and
   within-group completeness has to be reconstructed from overlapping reads. How
   well that reconstruction works is empirical, which is why the stcLFR work
   keeps coming back to control experiments rather than simulations.
3. **Collisions.** A shared barcode between distant loci can mean a genuine long
   molecule or a collision. The likelihood treatment in the
   [linkage post](/posts/linked-read-metagenome-assembly/) is what separates them,
   and it needs the molecule counts this QC produces.

The short version: a barcode is a physical prior, and the library decides how
strong that prior is. Sequencing depth cannot manufacture a molecule that was
lost, a linkage that was never captured, or a coverage profile that only exists
in the average.
