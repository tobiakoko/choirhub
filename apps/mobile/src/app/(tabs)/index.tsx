import { FeedScreen } from '@/features/feed';

/**
 * The Home tab — the announcement feed. All logic lives in the feed feature; this
 * route just mounts the screen.
 */
export default function Home() {
  return <FeedScreen />;
}
