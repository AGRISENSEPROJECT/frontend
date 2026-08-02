import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
    label: string;
    value?: string | null;
    fallback?: string;
    children?: React.ReactNode;
    tone?: 'default' | 'warning' | 'muted';
};

const DEFAULT_FALLBACK = 'Not available from this scan yet';

/** Figma-style white result card: green label + bold value */
export default function ResultFieldCard({
    label,
    value,
    fallback = DEFAULT_FALLBACK,
    children,
    tone = 'default',
}: Props) {
    const hasValue = value != null && String(value).trim() !== '';
    const display = hasValue ? String(value) : fallback;
    const muted = !hasValue || tone === 'muted';

    return (
        <View style={styles.card}>
            <Text style={[styles.label, tone === 'warning' && styles.labelWarning]}>{label}</Text>
            <Text style={[styles.value, muted && styles.valueMuted]}>{display}</Text>
            {children}
        </View>
    );
}

export function GrowthScoreBar({ score, label }: { score: number | null | undefined; label?: string }) {
    if (score == null || Number.isNaN(Number(score))) {
        return (
            <View style={styles.card}>
                <Text style={styles.label}>Growth Score</Text>
                <Text style={[styles.value, styles.valueMuted]}>Yield estimate pending</Text>
                <View style={styles.barTrack}>
                    <View style={[styles.barFillMuted, { width: '18%' }]} />
                </View>
                <Text style={styles.hint}>Run a fresh soil analysis to unlock a confidence score.</Text>
            </View>
        );
    }

    const pct = score <= 1 ? Math.round(score * 100) : Math.min(100, Math.round(score));
    const tier = pct >= 70 ? 'High Yield' : pct >= 45 ? 'Moderate Yield' : 'Low Yield';
    return (
        <View style={styles.card}>
            <Text style={styles.label}>Growth Score</Text>
            <Text style={styles.value}>{label || tier}</Text>
            <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.max(pct, 4)}%` }]} />
            </View>
            <Text style={styles.hint}>{pct}% model confidence for this crop</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E8E8E0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
    },
    label: {
        color: '#34643F',
        fontWeight: '700',
        fontSize: 14,
        marginBottom: 6,
    },
    labelWarning: {
        color: '#B45309',
    },
    value: {
        color: '#111827',
        fontWeight: '700',
        fontSize: 15,
        lineHeight: 22,
    },
    valueMuted: {
        color: '#6B7280',
        fontWeight: '600',
        fontStyle: 'italic',
    },
    hint: {
        marginTop: 8,
        color: '#6B7280',
        fontSize: 12,
        fontWeight: '500',
    },
    barTrack: {
        marginTop: 10,
        height: 8,
        borderRadius: 999,
        backgroundColor: '#E5E7EB',
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: 999,
        backgroundColor: '#34643F',
    },
    barFillMuted: {
        height: '100%',
        borderRadius: 999,
        backgroundColor: '#C9CFC5',
    },
});
