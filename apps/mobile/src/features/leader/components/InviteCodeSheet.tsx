import {
  AppText,
  Card,
  CriticalText,
  GhostButton,
  GradientButton,
  Sheet,
  tokens,
} from '@choirhub/ui';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { inviteJoinUri, isCodeLive } from '../invites';
import { type InviteCode, useGenerateInviteCode, useInviteCodes, useRevokeInviteCode } from '../useInviteCodes';

export type InviteCodeSheetProps = {
  visible: boolean;
  onClose: () => void;
  locationId: string | undefined;
};

/**
 * Invite-code generator (§5 onboarding): mints a location-scoped, expiring,
 * revocable code and renders it as a QR (react-native-qrcode-svg) plus the typed
 * code, with copy-to-clipboard. Existing live codes are listed with a revoke
 * action. Every write is RLS-gated to a location the leader actually leads.
 */
export function InviteCodeSheet({ visible, onClose, locationId }: InviteCodeSheetProps) {
  const codes = useInviteCodes(locationId);
  const generate = useGenerateInviteCode(locationId);
  const revoke = useRevokeInviteCode(locationId);
  const [fresh, setFresh] = useState<InviteCode | null>(null);
  const [copied, setCopied] = useState(false);

  function onGenerate() {
    if (!locationId) return;
    generate.mutate(
      { locationId },
      {
        onSuccess: (code) => {
          setFresh(code);
          setCopied(false);
        },
      }
    );
  }

  async function onCopy() {
    if (!fresh) return;
    await Clipboard.setStringAsync(fresh.code);
    setCopied(true);
  }

  const liveCodes = (codes.data ?? []).filter((c) => isCodeLive(c));

  return (
    <Sheet visible={visible} onClose={onClose} scrollable snapPoints={['80%']} accessibilityLabel="Invite code">
      <View style={styles.container}>
        <AppText variant="heading2">Invite members</AppText>

        {fresh ? (
          <Card>
            <View style={styles.qrBlock}>
              <View style={styles.qr}>
                <QRCode
                  value={inviteJoinUri(fresh.code)}
                  size={tokens.size.avatarLg * 3}
                  color={tokens.color.inkPrimary}
                  backgroundColor={tokens.color.canvasElevated}
                />
              </View>
              <CriticalText variant="displayLg">{fresh.code}</CriticalText>
              <AppText variant="caption" color={tokens.color.inkTertiary}>
                {`Expires ${new Date(fresh.expiresAt).toLocaleDateString()} · up to ${fresh.maxUses} members`}
              </AppText>
              <GhostButton label={copied ? 'Copied' : 'Copy code'} onPress={onCopy} />
            </View>
          </Card>
        ) : (
          <AppText variant="bodyMd" color={tokens.color.inkSecondary}>
            Generate a code for new members to join your location. Share the QR or the code.
          </AppText>
        )}

        <GradientButton
          label={generate.isPending ? 'Generating…' : 'Generate new code'}
          onPress={onGenerate}
          disabled={generate.isPending || !locationId}
        />

        {liveCodes.length > 0 ? (
          <View style={styles.list}>
            <AppText variant="bodySm" color={tokens.color.inkSecondary}>
              Live codes
            </AppText>
            {liveCodes.map((code) => (
              <View key={code.id} style={styles.codeRow}>
                <View style={styles.codeText}>
                  <CriticalText variant="bodyLg">{code.code}</CriticalText>
                  <AppText variant="caption" color={tokens.color.inkTertiary}>
                    {`${code.uses}/${code.maxUses} used`}
                  </AppText>
                </View>
                <GhostButton
                  label="Revoke"
                  accessibilityLabel={`Revoke code ${code.code}`}
                  onPress={() => revoke.mutate(code.id)}
                />
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: tokens.spacing.s4,
  },
  qrBlock: {
    alignItems: 'center',
    gap: tokens.spacing.s3,
  },
  qr: {
    padding: tokens.spacing.s4,
    backgroundColor: tokens.color.canvasElevated,
    borderRadius: tokens.radii.md,
  },
  list: {
    gap: tokens.spacing.s3,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.s3,
  },
  codeText: {
    flex: 1,
    gap: tokens.spacing.s1,
  },
});
