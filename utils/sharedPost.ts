export const SHARED_POST_PREFIX = 'AGRISENSE_POST:';

export type SharedPostPayload = {
  postId: string;
  title?: string | null;
  snippet?: string | null;
  author?: string | null;
};

export function encodeSharedPost(payload: SharedPostPayload): string {
  return `${SHARED_POST_PREFIX}${JSON.stringify(payload)}`;
}

export function parseSharedPost(content?: string | null): SharedPostPayload | null {
  if (!content) return null;
  const trimmed = content.trim();

  if (trimmed.startsWith(SHARED_POST_PREFIX)) {
    try {
      const data = JSON.parse(trimmed.slice(SHARED_POST_PREFIX.length));
      if (data?.postId) {
        return {
          postId: String(data.postId),
          title: data.title || null,
          snippet: data.snippet || null,
          author: data.author || null,
        };
      }
    } catch {
      // fall through to legacy URL parsing
    }
  }

  const idMatch = content.match(/[?&]postId=([0-9a-f-]{8,})/i);
  if (!idMatch) return null;

  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const snippet =
    lines.find(
      (line) =>
        !/^📢/.test(line) &&
        !/^https?:\/\//i.test(line) &&
        !/shared a post/i.test(line),
    ) || null;

  return {
    postId: idMatch[1],
    snippet,
    author: /shared a post/i.test(content) ? 'Someone' : null,
  };
}

export function sharedPostPreview(content?: string | null): string | null {
  const shared = parseSharedPost(content);
  if (!shared) return null;
  if (shared.title) return `Shared a post · ${shared.title}`;
  if (shared.snippet) return `Shared a post · ${shared.snippet}`;
  return 'Shared a post';
}
