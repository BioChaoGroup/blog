---
key: pcr-error-single-molecule
lang: en
title: 'What single-molecule sequencing says about PCR errors'
description: 'A PCR error rate is an average over at least three different mechanisms. Single-molecule consensus reads let us separate polymerase misincorporation, template damage and chimeric amplification, and only some of them are fixable by changing the cycling protocol.'
lede: 'The same one-in-a-thousand number can mean a sloppy polymerase, a damaged template, or a molecule that switched templates halfway through the reaction.'
date: 2025-12-02
authors: ['Fang Chao']
tags: ['sequencing', 'methods', 'long-read']
kind: article
related: ['pcr-fidelity']
---

Every amplification-based workflow eventually quotes a PCR error rate. It is
usually a single number per base, borrowed from a polymerase comparison table and
carried into a methods section where it explains everything and predicts nothing.
The trouble is that the number averages over mechanisms with completely different
behaviour: misincorporation by the polymerase, lesions that were already on the
template before the first cycle, and chimeras created by the amplification
itself.

Single-molecule sequencing is what made the separation possible. Instead of
reading a population average, it reads individual molecules — and with consensus
calling, individual strands — so an error can be attributed to the step that
produced it. This post summarises that logic and what it changes in practice. Our
runnable copy of the assay's analysis scripts lives in the
[pcr-fidelity project](/projects/pcr-fidelity/); the underlying study is
[Potapov & Ong (2017)](https://doi.org/10.1371/journal.pone.0169774).

## One number, at least three mechanisms

The measured error rate of a PCR product is the sum of contributions that scale
differently with cycle number, template quality and polymerase choice.

- **Polymerase misincorporation** happens during extension, at a rate that
  depends on the enzyme (proofreading or not, error spectrum, ability to extend
  mismatches) and accumulates with the number of cycles.
- **Template damage** is present before the reaction starts, or is introduced by
  the reaction's own heat and buffer conditions. It is converted into sequence
  errors when a damaged base is copied, so its contribution depends on the DNA's
  history rather than on the number of cycles alone.
- **Chimeric amplification** produces molecules whose two halves come from
  different templates. The sequence is not wrong at a base; the molecule is a
  recombinant. No consensus caller can tell a chimera from a true recombinant
  unless the library keeps molecule-level information.

These are not academic distinctions. A rare-variant caller, a 16S diversity
estimate and a forensic sample care about different ones, and none is served by a
single averaged number.

## Polymerase misincorporation

Misincorporation is the mechanism people mean when they say "PCR error". The
polymerase inserts a nucleotide that is not complementary to the template;
proofreading (3′→5′ exonuclease) removes some of these before extension
continues; the ones that survive are copied into every descendant of that
molecule. The result is a substitution that is present in one strand lineage of
one original molecule, and in a fraction of the final product that depends on how
early it happened.

A simple model is enough to see the scaling. If a polymerase misincorporates with
probability $e$ per base per cycle, then after $c$ cycles of exponential
amplification the expected number of substitutions per base in a product is
roughly

$$
\mathbb{E}[\text{substitutions per base}] \approx c \, e,
$$

which is illustrative rather than exact — the real process has context effects,
mismatch repair-like proofreading, and a cycle-dependent product distribution —
but the linear dependence on cycle number is the important part. Halving the
cycles halves this contribution.

Misincorporation is also where the substitution spectrum carries a fingerprint:
different polymerases have different biases, and those biases are stable enough
that a strong excess of one substitution class is diagnostic of the enzyme rather
than of the sample.

## Damage that was already on the template

Template damage is the contribution that surprises people, because it does not
scale with cycle number in the same way. The DNA arrives damaged, or is damaged in
the first denaturation steps, and the damage is copied.

Three mechanisms account for most of it:

- **8-oxoG.** Oxidised guanine pairs with adenine instead of cytosine, so a
  damaged G template produces a G→T substitution in the product. Oxidation
  happens during extraction, storage and heating.
- **Cytosine deamination.** Deamination converts cytosine to uracil, which most
  polymerases read as thymine, giving C→T substitutions. It is accelerated by
  heat and by low pH, which is why old or degraded samples are full of them.
- **Abasic sites.** Depurination leaves a position with no base; polymerases
  stall or insert a default nucleotide opposite it, producing a substitution or a
  dropout depending on the enzyme.

Two properties matter for interpretation. First, the lesion sits on one strand of
one molecule, so the substitution appears only in the descendants of that strand.
Second, lesion chemistry is context- and strand-specific: C→T excess on one strand
is a damage signature, not a polymerase signature. Potapov and Ong found that for
very accurate polymerases, damage introduced during temperature cycling — not
polymerase substitution error — appeared to be the major contributor to mutations
in the amplification product. If that is the floor you are working against,
optimising the polymerase further buys nothing.

## Chimeras are made by the amplification, not by the polymerase

A chimera is a single molecule whose sequence switches template partway through.
The classical route is **jumping PCR**: a polymerase falls off before finishing
extension, and the incomplete product — a single-stranded 3′ end — anneals to a
related template in a later cycle and is extended there. The result is a
recombinant with a breakpoint at a region of partial homology. The phenomenon was
described early in the PCR era, together with the observation that damaged
templates promote it ([Pääbo et al., 1990](https://doi.org/10.1016/S0021-9258(19)39621-8)).

Two practical consequences follow, and both are easy to underestimate:

1. **It is not a base error.** A chimeric molecule is a perfectly good molecule
   with a perfectly good sequence, except that its two halves come from different
   templates. Comparing it with a reference gives a string of apparently correct
   bases and a false structural variant.
2. **It scales with template complexity.** In a mixed sample — a microbiome
   amplicon pool, a multiplex panel, a damaged ancient extract — there are many
   related templates for a partial product to anneal to. Potapov and Ong observed
   PCR-mediated recombination at the single-molecule level and reported it as
   occurring as frequently as polymerase substitution errors in their assay — a
   reminder that the "base error rate" table is not the whole error budget.

The assay also documented a second route, structure-induced template switching:
inverted repeats allow the polymerase to switch between the top and bottom
strands of the same molecule during replication, producing a product that is
internally consistent but rearranged. That one is a property of the template's
secondary structure and of the polymerase's processivity, and it varies by
enzyme.

## What consensus reads can and cannot separate

This is where single-molecule sequencing earns its place. Because it reads
individual molecules, the error classes leave different fingerprints.

**Circular consensus (CCS)** of one molecule collapses its sequencing errors but
not its amplification errors: if the polymerase misincorporated in the very first
cycle, every copy carries the mistake, and the consensus agrees with it
confidently. CCS improves the accuracy of reading a molecule; it does not tell
you whether the molecule was right.

**Duplex consensus** sequences both strands of the same original molecule and
compares them ([Schmitt et al., 2012](https://doi.org/10.1073/pnas.1208715109)).
A true variant is present in both strands. A lesion is present in one physical
strand, so it appears in one strand's consensus; the same is true of a
misincorporation that happened in the first round of copying. Requiring agreement
between the two strands removes both. In the simple independent model, if a base
has damage probability $p_d$ on a strand, the chance that both strands are
damaged at the same position is $p_d^2$, so the false-positive contribution falls
from order $p_d$ to order $p_d^2$ — for an illustrative $p_d = 10^{-3}$, from one
in a thousand to one in a million. Real damage is not always independent (lesions
cluster, and some polymerases stall at them), so the quadratic suppression is a
best case, not a guarantee.

Chimeras are the exception. A chimera is one molecule with one sequence; duplex
consensus will confirm it, because both strands of the chimeric molecule agree.
The only defences are library-level (fewer cycles, longer extension, lower
template complexity, damage repair) and bioinformatic (split-read alignment,
chimera detection, discarding reads that map in two pieces).

## Reading the evidence out of a pileup

You do not need a special pipeline to start attributing errors; you need a pileup
that keeps the molecule and strand information, and the discipline not to count
amplification products as independent observations. The following script
tabulates the substitution spectrum separately per read strand, which is the
cheapest damage-versus-polymerase diagnostic available.

```python
# Substitution spectrum by strand, from a pileup. Collapse reads by molecule
# (UMI or barcode) before this step, otherwise amplification, not error, is counted.
import collections
import pysam

bam = pysam.AlignmentFile("consensus.bam", "rb")
fa = pysam.FastaFile("ref.fa")
spectrum = collections.Counter()

for col in bam.pileup("amplicon", 0, 4000, truncate=True,
                      min_base_quality=20, stepper="nofilter"):
    ref = fa.fetch(col.reference_name, col.reference_pos, col.reference_pos + 1).upper()
    if ref not in "ACGT":
        continue
    for read in col.pileups:
        if read.is_del or read.is_refskip:
            continue
        base = read.alignment.query_sequence[read.query_position].upper()
        if base in "ACGT" and base != ref:
            strand = "-" if read.alignment.is_reverse else "+"
            spectrum[(f"{ref}>{base}", strand)] += 1

for (substitution, strand), count in spectrum.most_common(12):
    print(f"{substitution}\t{strand}\t{count}")
```

The interpretation is deliberately simple. Substitutions that appear at similar
rates on both strands, with the spectrum the polymerase is known for, point at
misincorporation. A substitution class strongly biased to one strand points at
damage, with the class suggesting the lesion: G→T excess suggests oxidised
guanine, C→T excess suggests deamination. A cluster of high-quality mismatches in
an otherwise perfectly mapping read is a chimera candidate, not an error hotspot.
None of these inferences is proof on its own; together with the sample's history
they usually decide which experiment to change next.

**What this changes in practice.** The summary is short, and it is mostly about
not over-optimising the wrong term:

- **Fewer cycles and longer extension** reduce misincorporation and jumping PCR
  at the same time, and cost nothing except input DNA.
- **Damage repair and appropriate extraction** target the term that dominates for
  high-fidelity enzymes. If the sample is old, degraded or heat-treated, this is
  the term to attack first.
- **Duplex consensus is worth its cost** when the question is "does this variant
  exist in the original molecule"; it is wasted effort when the dominant error is
  chimeric, because both strands of a chimera agree.
- **Report the assay, not just the rate.** A number measured on a clean plasmid
  amplicon with a proofreading enzyme does not transfer to a degraded
  metagenomic extract, and citing it as if it does is how error budgets become
  fiction.

What remains genuinely open, in our reading of the literature, is a clean
separation of structure-induced switching from jumping PCR in complex templates:
both produce chimeras, they respond to different protocol changes, and the
single-molecule assays that would distinguish them at scale are still
specialised. Our own scripts keep that analysis reproducible while the question
is worked out (see [pcr-fidelity](/projects/pcr-fidelity/)).
