import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Internal/bookkeeping fields that should never be shown to the user
export const HIDDEN_KEYS = [
    'id', 'predictionId', 'predictionRunId', 'farmId', 'userId', 'user_id',
    'rank', 'isPrimary', 'createdAt', 'updatedAt', 'imageUrl', 'image_url',
];

// Model metadata that adds noise without value (e.g. disease placeholder info)
export const NOISY_KEYS = [
    'placeholder_info', 'satellite_status', 'available_diseases',
    'raw_response', 'rawResponse', 'current_capability',
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

export function humanize(key: string) {
    return key
        .replace(/[_-]/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/^\w/, c => c.toUpperCase());
}

export function formatDate(value: string | Date) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

export function formatValue(value: any): string {
    if (value == null) return '-';
    if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
    if (Array.isArray(value)) return value.map(v => (typeof v === 'object' ? JSON.stringify(v) : formatValue(v))).join(', ');
    if (typeof value === 'string') {
        if (ISO_DATE.test(value)) return formatDate(value);
        // Clean up machine-style strings like "satellite_integration_pending"
        return value.includes('_') && !value.includes(' ') ? humanize(value) : value;
    }
    return String(value);
}

// Formats a value with knowledge of its key (e.g. confidence -> percentage)
export function formatEntry(key: string, value: any): string {
    if (/confidence|score/i.test(key) && typeof value === 'number') {
        return value <= 1 ? `${Math.round(value * 100)}%` : `${value}%`;
    }
    if (/scanned|executed|created|updated|timestamp|at$/i.test(key) && (typeof value === 'string' || value instanceof Date)) {
        return formatDate(value);
    }
    return formatValue(value);
}

// Returns the payload entries worth showing, with errors separated out
export function cleanPayload(payload: Record<string, any>, excludeValues: string[] = []) {
    if (!payload || typeof payload !== 'object') return { entries: [] as [string, any][], error: null as string | null };
    const excluded = excludeValues.map(v => v.toLowerCase().trim());
    const entries = Object.entries(payload).filter(([key, value]) => {
        if (HIDDEN_KEYS.includes(key) || NOISY_KEYS.includes(key)) return false;
        if (key === 'error') return false;
        if (value == null || value === '') return false;
        // Drop entries that just repeat the recommendation title
        if (typeof value === 'string' && excluded.includes(value.toLowerCase().trim())) return false;
        // Drop generic self-labels like recommendation: "Irrigation Recommendation"
        if (key === 'recommendation' && typeof value === 'string' && /recommendation|analysis|forecast/i.test(value)) return false;
        return true;
    });
    const error = typeof payload.error === 'string' ? payload.error : null;
    return { entries, error };
}

export function ErrorNote({ message }: { message: string }) {
    return (
        <View className="flex-row items-start bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 gap-2">
            <Ionicons name="alert-circle-outline" size={18} color="#B45309" style={{ marginTop: 1 }} />
            <Text className="text-amber-900 text-sm font-semibold flex-1">{formatValue(message)}</Text>
        </View>
    );
}

// Renders an arbitrary recommendation payload as label/value rows (one nesting level deep)
export default function PayloadRows({ payload }: { payload: Record<string, any> }) {
    const { entries, error } = cleanPayload(payload);
    if (entries.length === 0 && !error) return null;
    return (
        <View className="gap-1.5">
            {error && <ErrorNote message={error} />}
            {entries.map(([key, value]) => {
                if (value != null && typeof value === 'object' && !Array.isArray(value)) {
                    return (
                        <View key={key} className="mt-1">
                            <Text className="text-[#34643F] text-xs font-bold uppercase mb-1">{humanize(key)}</Text>
                            {Object.entries(value).map(([subKey, subValue]) => (
                                <View key={subKey} className="flex-row justify-between py-1 pl-2">
                                    <Text className="text-gray-700 text-sm font-semibold">{humanize(subKey)}</Text>
                                    <Text className="text-gray-900 text-sm font-bold flex-shrink ml-2 text-right">{formatEntry(subKey, subValue)}</Text>
                                </View>
                            ))}
                        </View>
                    );
                }
                return (
                    <View key={key} className="flex-row justify-between py-1">
                        <Text className="text-gray-700 text-sm font-semibold">{humanize(key)}</Text>
                        <Text className="text-gray-900 text-sm font-bold flex-shrink ml-2 text-right">{formatEntry(key, value)}</Text>
                    </View>
                );
            })}
        </View>
    );
}
