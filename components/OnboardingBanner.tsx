import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, radius, space } from '@/constants/theme';

type Props = {
  needsIdentity: boolean;
  needsFarm: boolean;
};

/**
 * Soft prompt for farmers who tapped “Skip for now” (or never finished onboarding).
 * They can use the app, but identity/farm are still required for full predictions.
 */
export default function OnboardingBanner({ needsIdentity, needsFarm }: Props) {
  const router = useRouter();
  if (!needsIdentity && !needsFarm) return null;

  const title = needsIdentity
    ? 'Finish your farmer profile'
    : 'Register your farm';
  const body = needsIdentity
    ? 'You skipped National ID verification. Add it anytime so we can unlock full farm onboarding and keep your account secure.'
    : 'Add a farm to run soil predictions and get crop recommendations.';

  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons
          name={needsIdentity ? 'card-outline' : 'leaf-outline'}
          size={20}
          color={colors.brand}
        />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>{body}</Text>
        <TouchableOpacity
          style={styles.cta}
          onPress={() => router.push('/RegisterFarm')}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>
            {needsIdentity ? 'Verify National ID' : 'Register farm'}
          </Text>
          <Ionicons name="arrow-forward" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: space.md,
    backgroundColor: colors.brandWash,
    borderWidth: 1,
    borderColor: colors.brandMuted,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  text: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  cta: {
    alignSelf: 'flex-start',
    marginTop: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brand,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.full,
    minHeight: 40,
  },
  ctaText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
});
