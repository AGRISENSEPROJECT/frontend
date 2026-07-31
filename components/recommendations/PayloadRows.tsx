import React from 'react';
import { View, Text } from 'react-native';

export function humanize(key: string) {
    return key
        .replace(/[_-]/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/^\w/, c => c.toUpperCase());
}

export function formatValue(value: any): string {
    if (value == null) return '-';
    if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
    if (Array.isArray(value)) return value.map(v => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(', ');
    return String(value);
}

// Renders an arbitrary recommendation payload as label/value rows (one nesting level deep)
export default function PayloadRows({ payload }: { payload: Record<string, any> }) {
    if (!payload || typeof payload !== 'object') return null;
    return (
        <View className="gap-1">
            {Object.entries(payload).map(([key, value]) => {
                if (value != null && typeof value === 'object' && !Array.isArray(value)) {
                    return (
                        <View key={key} className="mt-1">
                            <Text className="text-[#34643F] text-xs font-bold uppercase mb-0.5">{humanize(key)}</Text>
                            {Object.entries(value).map(([subKey, subValue]) => (
                                <View key={subKey} className="flex-row justify-between py-0.5 pl-2">
                                    <Text className="text-gray-600 text-sm">{humanize(subKey)}</Text>
                                    <Text className="text-gray-900 text-sm font-medium flex-shrink ml-2 text-right">{formatValue(subValue)}</Text>
                                </View>
                            ))}
                        </View>
                    );
                }
                return (
                    <View key={key} className="flex-row justify-between py-0.5">
                        <Text className="text-gray-600 text-sm">{humanize(key)}</Text>
                        <Text className="text-gray-900 text-sm font-medium flex-shrink ml-2 text-right">{formatValue(value)}</Text>
                    </View>
                );
            })}
        </View>
    );
}
