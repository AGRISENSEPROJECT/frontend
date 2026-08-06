import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle, DimensionValue } from 'react-native';
import { colors, radius } from '@/constants/theme';

type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
};

/** Soft pulsing placeholder block — use instead of bare ActivityIndicators. */
export function Skeleton({
  width = '100%',
  height = 14,
  borderRadius = radius.sm,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#D6DED8',
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonCircle({ size = 40, style }: { size?: number; style?: ViewStyle }) {
  return <Skeleton width={size} height={size} borderRadius={size / 2} style={style} />;
}

export function FeedPostSkeleton() {
  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <SkeletonCircle size={40} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width="42%" height={13} />
          <Skeleton width="28%" height={10} />
        </View>
      </View>
      <Skeleton width="100%" height={220} borderRadius={0} />
      <View style={styles.postFooter}>
        <Skeleton width={64} height={12} />
        <Skeleton width={64} height={12} />
        <Skeleton width={72} height={12} />
      </View>
      <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 6 }}>
        <Skeleton width="88%" height={12} />
        <Skeleton width="70%" height={12} />
      </View>
    </View>
  );
}

export function ConversationSkeleton() {
  return (
    <View style={styles.convoRow}>
      <SkeletonCircle size={54} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={styles.rowBetween}>
          <Skeleton width="45%" height={14} />
          <Skeleton width={36} height={10} />
        </View>
        <Skeleton width="78%" height={12} />
      </View>
    </View>
  );
}

export function ChatBubbleSkeleton({ mine = false }: { mine?: boolean }) {
  return (
    <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
      {!mine && <SkeletonCircle size={28} />}
      <Skeleton
        width={mine ? '58%' : '64%'}
        height={44}
        borderRadius={16}
        style={mine ? { alignSelf: 'flex-end' } : undefined}
      />
    </View>
  );
}

export function DashboardSkeleton() {
  return (
    <View style={styles.dashWrap}>
      <View style={styles.dashHeader}>
        <SkeletonCircle size={36} style={{ backgroundColor: 'rgba(255,255,255,0.35)' }} />
        <Skeleton width="46%" height={16} style={{ backgroundColor: 'rgba(255,255,255,0.35)' }} />
        <SkeletonCircle size={36} style={{ backgroundColor: 'rgba(255,255,255,0.35)' }} />
      </View>
      <View style={{ padding: 16, gap: 14 }}>
        <Skeleton width="100%" height={110} borderRadius={radius.lg} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Skeleton width="48%" height={88} borderRadius={radius.lg} />
          <Skeleton width="48%" height={88} borderRadius={radius.lg} />
        </View>
        <Skeleton width="40%" height={14} />
        <Skeleton width="100%" height={140} borderRadius={radius.lg} />
        <Skeleton width="100%" height={140} borderRadius={radius.lg} />
      </View>
    </View>
  );
}

export function WeatherSkeleton() {
  return (
    <View style={{ padding: 16, gap: 14 }}>
      <Skeleton width="55%" height={18} />
      <Skeleton width="100%" height={160} borderRadius={radius.lg} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width={72} height={96} borderRadius={radius.md} />
        ))}
      </View>
      <Skeleton width="100%" height={120} borderRadius={radius.lg} />
    </View>
  );
}

export function RecommendListSkeleton() {
  return (
    <View style={{ padding: 20, gap: 12 }}>
      <Skeleton width="50%" height={16} />
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} width="100%" height={92} borderRadius={radius.lg} />
      ))}
    </View>
  );
}

export function ProfileSkeleton() {
  return (
    <View style={{ alignItems: 'center', paddingTop: 32, gap: 12 }}>
      <SkeletonCircle size={112} />
      <Skeleton width="40%" height={20} />
      <Skeleton width="55%" height={12} />
      <Skeleton width="70%" height={48} borderRadius={radius.full} style={{ marginTop: 12 }} />
      <Skeleton width="100%" height={100} borderRadius={radius.lg} style={{ marginTop: 8 }} />
    </View>
  );
}

export function SettingsSkeleton() {
  return (
    <View style={{ padding: 20, alignItems: 'center', gap: 16 }}>
      <SkeletonCircle size={96} />
      <Skeleton width="50%" height={12} />
      <View style={{ width: '100%', gap: 12, marginTop: 12 }}>
        <Skeleton width="100%" height={48} borderRadius={radius.md} />
        <Skeleton width="100%" height={48} borderRadius={radius.md} />
        <Skeleton width="100%" height={48} borderRadius={radius.md} />
        <Skeleton width="100%" height={48} borderRadius={radius.lg} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  postFooter: {
    flexDirection: 'row',
    gap: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  convoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  bubbleRowMine: {
    justifyContent: 'flex-end',
  },
  dashWrap: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  dashHeader: {
    backgroundColor: colors.brand,
    paddingHorizontal: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
});
