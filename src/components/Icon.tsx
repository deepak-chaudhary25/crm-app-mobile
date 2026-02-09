
import React from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Simple wrapper to unify icon usage
// We can switch sets or mix and match here
export const Icon = ({ name, size = 24, color, type = 'Ionicons' }: { name: string, size?: number, color: string, type?: 'Ionicons' | 'Material' | 'Community' }) => {
    switch (type) {
        case 'Material':
            return <MaterialIcons name={name} size={size} color={color} />;
        case 'Community':
            return <MaterialCommunityIcons name={name} size={size} color={color} />;
        default:
            return <Ionicons name={name} size={size} color={color} />;
    }
};
