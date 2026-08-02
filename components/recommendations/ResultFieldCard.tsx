import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
    const rows = hasValue && display.includes('\n')
        ? display.split('\n').map(row => row.trim()).filter(Boolean)
        : [];

    return (
        <View style={[styles.card, muted && styles.cardMuted]}>
            <Text style={[styles.label, tone === 'warning' && styles.labelWarning]}>{label}</Text>
            {muted ? (
                <View style={styles.unavailableRow}>
                    <View style={[styles.unavailableIcon, tone === 'warning' && styles.unavailableIconWarning]}>
                        <Ionicons
                            name={tone === 'warning' ? 'alert-circle-outline' : 'information-circle-outline'}
                            size={18}
                            color={tone === 'warning' ? '#B45309' : '#34643F'}
                        />
                    </View>
                    <Text style={[styles.value, styles.valueMuted]}>{display}</Text>
                </View>
            ) : rows.length > 0 ? (
                <View style={styles.metricRows}>
                    {rows.map((row) => {
                        const [name, ...rest] = row.split(':');
                        const detail = rest.join(':').trim();
                        return (
                            <View key={row} style={styles.metricRow}>
                                <Text style={styles.metricLabel}>{name}</Text>
                                <Text style={styles.metricValue}>{detail || row}</Text>
                            </View>
                        );
                    })}
                </View>
            ) : (
                <Text style={styles.value}>{display}</Text>
            )}
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
    cardMuted: {
        backgroundColor: '#FFFDF4',
        borderColor: '#EADFB8',
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
    metricRows: {
        gap: 7,
    },
    metricRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    metricLabel: {
        color: '#4B5563',
        fontSize: 14,
        fontWeight: '700',
    },
    metricValue: {
        color: '#111827',
        fontSize: 14,
        fontWeight: '800',
        flexShrink: 1,
        textAlign: 'right',
    },
    valueMuted: {
        color: '#6B5E38',
        fontWeight: '600',
        flex: 1,
    },
    unavailableRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    unavailableIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#E8F5E9',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1,
    },
    unavailableIconWarning: {
        backgroundColor: '#FEF3C7',
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
