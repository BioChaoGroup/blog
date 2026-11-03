import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getPosts } from '@/lib/content';
import { absoluteUrl } from '@/lib/url';

export const GET: APIRoute = async () => {
  const posts = await getPosts('zh');
  return rss({
    title: 'BioChaoGroup — 文章',
    description:
      'BioChaoGroup 的方法、工程笔记与随笔：长读长与 linked-read 测序、泛基因组、宏基因组与 DNA 语言模型。',
    site: new URL(absoluteUrl('/')).toString(),
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.description,
      link: absoluteUrl(`/zh/posts/${post.data.key}/`),
      categories: post.data.tags,
      author: post.data.authors.join(', '),
    })),
    customData: '<language>zh-CN</language>',
  });
};
