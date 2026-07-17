// Publishes a composed announcement: inserts the announcement row, then its
// audience rows, straight to Postgres. This is a *heavy* write (it needs the
// network — a leader composes online), not an outbox light-write, so it is not
// offline-queued. RLS is the enforcement point (§5): the announcements INSERT
// policy rejects a non-author or an unauthorized Critical, and every audience row
// is re-checked by can_target — so an out-of-scope target the UI somehow offered
// is still refused by the server. On success we kick a sync pull so the new post
// lands in the author's own feed.

import { useMutation } from '@tanstack/react-query';

import { supabase } from '@/data/supabase';
import { getSyncEngine } from '@/data/sync';
import { useSession } from '@/features/onboarding/api';

import type { PublishInput } from './composeModel';

async function publishAnnouncement(input: PublishInput, authorId: string): Promise<string> {
  const { data: created, error: insertError } = await supabase
    .from('announcements')
    .insert({ ...input.announcement, author_id: authorId })
    .select('id')
    .single<{ id: string }>();
  if (insertError) throw insertError;

  const announcementId = created.id;
  if (input.audiences.length > 0) {
    const { error: audienceError } = await supabase
      .from('audiences')
      .insert(
        input.audiences.map((a) => ({
          announcement_id: announcementId,
          target_type: a.target_type,
          target_id: a.target_id,
        }))
      );
    // If a target was out of scope the server rejects it here — surface the error
    // so the sheet can show it. The announcement row itself remains (audience-less,
    // so it targets no one but the author) and can be retried or discarded.
    if (audienceError) throw audienceError;
  }

  // Kick the fan-out edge function so targeted members are notified by priority
  // tier (§6.3). Fire-and-forget: delivery must never block or fail the publish —
  // the announcement is already durably stored and RLS-scoped.
  void supabase.functions
    .invoke('notify', { body: { announcement_id: announcementId } })
    .catch(() => undefined);

  // Pull the fresh row into the local mirror so the author sees their own post.
  void getSyncEngine().sync('manual');
  return announcementId;
}

/** Publish the compose draft. Throws on any RLS rejection so the UI can report it. */
export function usePublishAnnouncement() {
  const { session } = useSession();
  const authorId = session?.user.id;

  return useMutation({
    mutationFn: (input: PublishInput) => {
      if (!authorId) throw new Error('NOT_AUTHENTICATED');
      return publishAnnouncement(input, authorId);
    },
  });
}
