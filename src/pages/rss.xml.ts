import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getPosts } from '@/lib/content';
import { absoluteUrl } from '@/lib/url';

export const GET: APIRoute = async (context) => {
  const posts = await getPosts('en');
  return rss({
    title: 'BioChaoGroup — Posts',
    description:
      'Methods, engineering notes and essays from BioChaoGroup: long-read and linked-read sequencing, pangenomes, metagenomes and DNA language models.',
    site: new URL(absoluteUrl('/')).toString(),
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.description,
      link: absoluteUrl(`/posts/${post.data.key}/`),
      categories: post.data.tags,
      author: post.data.authors.join(', '),
    })),
    customData: '<language>en</language>',
  });
};
