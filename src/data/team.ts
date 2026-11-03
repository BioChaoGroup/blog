/**
 * Lab members.
 *
 * `name` must match the `authors` strings used in `src/content/blog/*.md`
 * frontmatter exactly, and `key` is used as the anchor on /team/.
 * Chinese copy in `nameZh` / `role.zh` / `bio.zh` is written, not machine
 * translated. Keep entries in this file only for people who are actually in
 * the group — no honorary or former members without their consent.
 */

export type TeamLink = {
  github?: string;
  email?: string;
  scholar?: string;
  orcid?: string;
  site?: string;
};

export type TeamMember = {
  key: string;
  name: string;
  nameZh: string;
  role: { en: string; zh: string };
  bio: { en: string; zh: string };
  avatar?: string;
  links: TeamLink[];
  lead?: boolean;
};

export const team: TeamMember[] = [
  {
    key: 'fang-chao',
    name: 'Fang Chao',
    nameZh: '方超',
    role: { en: 'Principal investigator', zh: '课题组负责人' },
    bio: {
      en: 'Fang Chao leads BioChaoGroup at BGI Research. The group starts from sequencing chemistry — long-read and linked-read libraries, including the single-tube complete-coverage co-barcoding design we call stcLFR — and carries that data through pangenome and metagenome assembly, microbiome association studies, and DNA language models that we try to run on the machines we actually have.',
      zh: '方超在 BGI Research 带领 BioChaoGroup。课题组从测序化学出发——长读长与 linked-read 建库，包括我们称为 stcLFR 的单管全覆盖共 barcode 方案——再把这些数据带到泛基因组与宏基因组组装、微生物组关联研究，以及我们试图在手上真实可用的机器上运行的 DNA 语言模型。',
    },
    links: [
      { github: 'https://github.com/biociao' },
      { email: 'fangchao@genomics.cn' },
    ],
    lead: true,
  },
];
