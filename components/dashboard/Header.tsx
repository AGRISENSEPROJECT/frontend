import { View, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type HeaderProps = {
    onMenuPress: () => void;
};

export default function Header({ onMenuPress }: HeaderProps) {
    return (
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200 bg-white">
            <TouchableOpacity onPress={onMenuPress}>
                <Ionicons name="menu" size={24} color="#000" />
            </TouchableOpacity>

            <View className="flex-1 mx-4">
                <View className="flex-row items-center bg-gray-100 rounded-lg px-4 py-2">
                    <Ionicons name="search" size={20} color="#666" />
                    <TextInput
                        placeholder="Search..."
                        className="flex-1 ml-2"
                    />
                </View>
            </View>

            <TouchableOpacity>
                <Ionicons name="notifications-outline" size={24} color="#000" />
            </TouchableOpacity>
        </View>
    );
}
