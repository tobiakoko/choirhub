import {
  AppText,
  Avatar,
  Badge,
  Card,
  CriticalText,
  FAB,
  GhostButton,
  GradientButton,
  OfflinePill,
  SectionLabel,
  Sheet,
  VocalPartBadge,
  tokens,
  type BadgeTone,
  type Category,
  type TypographyVariant,
  type VocalPart,
} from '@choirhub/ui';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TEXT_VARIANTS: TypographyVariant[] = [
  'displayLg',
  'heading1',
  'heading2',
  'bodyLg',
  'bodyMd',
  'bodySm',
  'caption',
  'badge',
];

const BADGE_TONES: BadgeTone[] = ['neutral', 'brand', 'info', 'success', 'warning', 'critical'];
const VOCAL_PARTS: VocalPart[] = ['soprano', 'alto', 'tenor', 'bass'];
const CATEGORIES: Category[] = [
  'rehearsal',
  'payment',
  'uniform',
  'forms',
  'logistics',
  'devotional',
  'critical',
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <SectionLabel>{title}</SectionLabel>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export default function Playground() {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="heading1">Design system playground</AppText>

        <Section title="Typography">
          {TEXT_VARIANTS.map((variant) => (
            <AppText key={variant} variant={variant}>
              {variant} — Explosive Manifestation
            </AppText>
          ))}
          <AppText variant="bodyMd" color={tokens.color.inkSecondary}>
            bodyMd / inkSecondary
          </AppText>
          <AppText variant="bodyMd" color={tokens.color.inkTertiary}>
            bodyMd / inkTertiary
          </AppText>
        </Section>

        <Section title="Critical text (never truncates)">
          <CriticalText variant="bodyLg">
            Sunday 8:00 AM · Regional Rehearsal · Uniform: white top, navy skirt/trousers
          </CriticalText>
        </Section>

        <Section title="Badges">
          <View style={styles.row}>
            {BADGE_TONES.map((tone) => (
              <Badge key={tone} label={tone} tone={tone} />
            ))}
          </View>
        </Section>

        <Section title="Vocal part badges">
          <View style={styles.row}>
            {VOCAL_PARTS.map((part) => (
              <VocalPartBadge key={part} part={part} />
            ))}
          </View>
        </Section>

        <Section title="Offline pill">
          <View style={styles.row}>
            <OfflinePill />
            <OfflinePill label="Lyrics cached" />
          </View>
        </Section>

        <Section title="Avatars">
          <View style={styles.rowCentered}>
            <Avatar name="Grace Adeyemi" size="sm" />
            <Avatar name="Grace Adeyemi" size="md" />
            <Avatar name="Grace Adeyemi" size="lg" />
            <Avatar name="Tenor" size="md" />
          </View>
        </Section>

        <Section title="Cards (plain + category stripes)">
          <Card>
            <AppText variant="heading2">Plain card</AppText>
            <AppText variant="bodyMd" color={tokens.color.inkSecondary}>
              Level-2 elevation, no stripe.
            </AppText>
          </Card>
          {CATEGORIES.map((category) => (
            <Card key={category} category={category}>
              <AppText variant="heading2">{category}</AppText>
              <AppText variant="bodyMd" color={tokens.color.inkSecondary}>
                4px {category} stripe
              </AppText>
            </Card>
          ))}
        </Section>

        <Section title="Gradient buttons">
          <GradientButton label="Acknowledge" variant="primary" />
          <GradientButton label="Download audio" variant="secondary" />
          <GradientButton label="Disabled" variant="primary" disabled />
        </Section>

        <Section title="Ghost buttons">
          <GhostButton label="Maybe later" />
          <GhostButton label="Disabled" disabled />
        </Section>

        <Section title="FAB">
          <View style={styles.rowCentered}>
            <FAB accessibilityLabel="Compose announcement" />
            <FAB
              accessibilityLabel="Sync now"
              icon={<AppText variant="heading2" color={tokens.color.onColor}>↻</AppText>}
            />
            <FAB accessibilityLabel="Disabled action" disabled />
          </View>
        </Section>

        <Section title="Bottom sheet">
          <GradientButton label="Open sheet" onPress={() => setSheetOpen(true)} />
        </Section>
      </ScrollView>

      {/* Real-placement FAB, anchored bottom-right per the fab-compose recipe. */}
      <View style={styles.fabAnchor} pointerEvents="box-none">
        <FAB accessibilityLabel="Compose announcement" onPress={() => setSheetOpen(true)} />
      </View>

      <Sheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        accessibilityLabel="Example bottom sheet"
      >
        <AppText variant="heading2">Lyrics sheet</AppText>
        <AppText variant="bodyLg" color={tokens.color.inkSecondary} style={styles.sheetBody}>
          This is where lyrics, solfa, or a form would render — a bottom sheet, not a new screen,
          so spatial context is preserved.
        </AppText>
        <GhostButton label="Close" onPress={() => setSheetOpen(false)} />
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.color.canvasBase,
  },
  content: {
    paddingHorizontal: tokens.spacing.s4,
    paddingTop: tokens.spacing.s4,
    paddingBottom: tokens.spacing.s12,
    gap: tokens.spacing.s6,
  },
  section: {
    gap: tokens.spacing.s3,
  },
  sectionBody: {
    gap: tokens.spacing.s3,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.spacing.s2,
  },
  rowCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.s4,
  },
  fabAnchor: {
    position: 'absolute',
    right: tokens.spacing.s4,
    bottom: tokens.spacing.s6,
  },
  sheetBody: {
    marginVertical: tokens.spacing.s4,
  },
});
