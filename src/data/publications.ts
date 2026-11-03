/**
 * Selected publications.
 *
 * Every entry here was checked against a DOI record (Crossref) before it was
 * added; the Journal Citation Reports-style metrics are deliberately absent
 * because they age badly. Add only work that someone in the group authored,
 * and keep the author strings in the published order.
 */

export type Publication = {
  key: string;
  title: string;
  authors: string[];
  venue: string;
  year: number;
  type: 'journal' | 'conference' | 'preprint' | 'dataset';
  doi?: string;
  url?: string;
  code?: string;
  pdf?: string;
  selected?: boolean;
};

export const publications: Publication[] = [
  {
    key: 'long-fragment-rrna-amplicon',
    title:
      'High-resolution single-molecule long-fragment rRNA gene amplicon sequencing of bacterial and eukaryotic microbial communities',
    authors: [
      'Chao Fang',
      'Xiaohuan Sun',
      'Fei Fan',
      'Xiaowei Zhang',
      'Ou Wang',
      'Haotian Zheng',
      'Zhuobing Peng',
      'Xiaoqing Luo',
      'Ao Chen',
      'Wenwei Zhang',
      'Radoje Drmanac',
      'Brock A. Peters',
      'Zewei Song',
      'Karsten Kristiansen',
    ],
    venue: 'Cell Reports Methods',
    year: 2023,
    type: 'journal',
    doi: '10.1016/j.crmeth.2023.100437',
    url: 'https://doi.org/10.1016/j.crmeth.2023.100437',
    selected: true,
  },
  {
    key: 'melanoma-ici-microbiota',
    title:
      '841P Effects of immune checkpoint inhibitor-based combination therapies on the gut microbiota in advanced melanoma patients',
    authors: [
      'J. Li',
      'L. Xu',
      'Z. Peng',
      'H. Jiang',
      'F. Chao',
      'Y. Ding',
      'J.M. Moll',
      'D. Li',
      'X. Wen',
      'J. Wang',
      'Q. Ding',
      'L. Zhang',
      'K. Kristiansen',
      'S. Brix',
      'X. Zhang',
    ],
    venue: 'Annals of Oncology (ESMO 2022 abstract)',
    year: 2022,
    type: 'conference',
    doi: '10.1016/j.annonc.2022.07.967',
    url: 'https://doi.org/10.1016/j.annonc.2022.07.967',
    selected: true,
  },
  {
    key: 'black-yeast-clonality',
    title: 'Clonality, inbreeding, and hybridization in two extremotolerant black yeasts',
    authors: [
      'Cene Gostinčar',
      'Xiaohuan Sun',
      'Anja Černoša',
      'Chao Fang',
      'Nina Gunde-Cimerman',
      'Zewei Song',
    ],
    venue: 'GigaScience',
    year: 2022,
    type: 'journal',
    doi: '10.1093/gigascience/giac095',
    url: 'https://doi.org/10.1093/gigascience/giac095',
  },
  {
    key: 'aureobasidium-subglaciale-genomics',
    title:
      'From Glaciers to Refrigerators: the Population Genomics and Biocontrol Potential of the Black Yeast Aureobasidium subglaciale',
    authors: [
      'Janja Zajc',
      'Anja Černoša',
      'Xiaohuan Sun',
      'Chao Fang',
      'Nina Gunde-Cimerman',
      'Zewei Song',
      'Cene Gostinčar',
    ],
    venue: 'Microbiology Spectrum',
    year: 2022,
    type: 'journal',
    doi: '10.1128/spectrum.01455-22',
    url: 'https://doi.org/10.1128/spectrum.01455-22',
  },
  {
    key: 'wallemia-recombination',
    title: 'Genomic Evidence of Recombination in the Basidiomycete Wallemia mellicola',
    authors: [
      'Xiaohuan Sun',
      'Cene Gostinčar',
      'Chao Fang',
      'Janja Zajc',
      'Yong Hou',
      'Zewei Song',
      'Nina Gunde-Cimerman',
    ],
    venue: 'Genes',
    year: 2019,
    type: 'journal',
    doi: '10.3390/genes10060427',
    url: 'https://doi.org/10.3390/genes10060427',
  },
];
