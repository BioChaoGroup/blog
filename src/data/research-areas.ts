export interface ResearchArea {
  key: string;
  index: string;
  title: { en: string; zh: string };
  text: { en: string; zh: string };
  tags: string[];
}

export const researchAreas: ResearchArea[] = [
  {
    key: 'chemistry',
    index: '01',
    title: {
      en: 'Long-read & linked-read chemistry',
      zh: '长读长与 linked-read 建库化学',
    },
    text: {
      en: 'Co-barcoding long DNA molecules so that barcode linkage survives library prep, sequencing and base calling. Method engineering, not just protocol tweaks.',
      zh: '让长 DNA 分子的共 barcode 标记在文库构建、测序与碱基识别之后依然可用。属于方法学工程，而不只是改改实验流程。',
    },
    tags: ['linked-read', 'sequencing', 'methods'],
  },
  {
    key: 'assembly',
    index: '02',
    title: { en: 'Assembly & graph algorithms', zh: '组装与图算法' },
    text: {
      en: 'Assemblers, scaffolders and linkage likelihoods that turn noisy reads into genomes — with repeat structure and strain variation treated as first-class problems.',
      zh: '把噪声 reads 变成基因组的组装器、scaffolder 与连锁似然模型——把重复结构与菌株差异当作一等公民处理。',
    },
    tags: ['assembly', 'long-read', 'benchmark'],
  },
  {
    key: 'pangenomes',
    index: '03',
    title: { en: 'Pangenomes, strains & microbiomes', zh: '泛基因组、菌株与微生物组' },
    text: {
      en: 'Graph pangenomes for non-model organisms, strain-level resolution in metagenomes, and association analyses that respect how messy community data really is.',
      zh: '面向非模式生物的图泛基因组、宏基因组中的菌株级分辨率，以及正视群落数据"脏乱"本质的关联分析。',
    },
    tags: ['pangenome', 'metagenomics', 'microbiome'],
  },
  {
    key: 'models',
    index: '04',
    title: { en: 'Sequence models & analysis systems', zh: '序列模型与分析系统' },
    text: {
      en: 'DNA language models on hardware we actually have, and the unglamorous infrastructure — containers, provenance, tooling — that keeps the analyses re-runnable.',
      zh: '在真正到手的硬件上跑 DNA 语言模型，以及那些不起眼却让分析可复跑的基础设施：容器、溯源与工具链。',
    },
    tags: ['dna-language-models', 'machine-learning', 'reproducibility'],
  },
];
