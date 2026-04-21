
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking, Alert } from 'react-native';
import { useAppTheme } from '../theme';
import { Icon } from './Icon';
import { scale, verticalScale, moderateScale } from '../utils/responsive';

interface LeadProps {
    name: string;
    leadId: string;
    assignedTo: string;
    status: 'New' | 'In Progress' | 'Contacted' | 'Pending' | 'Cold';

    image?: any;
    initials?: string;
    initialsColor?: string;
    phoneNumber?: string;
    selectable?: boolean;
    isSelected?: boolean;
    onToggleSelection?: () => void;
    email?: string;
    onPressWhatsApp?: () => void;
    onPressCall?: () => void;
    onPressLogCall?: () => void;
    updatedAt?: string;
    createdAt?: string;
    onPressDetail?: () => void;
    onPressHistory?: () => void;
    poolName?: string;
}

export const LeadCard = ({
    name,
    leadId,
    assignedTo,
    status,

    image,
    initials,
    initialsColor,
    phoneNumber,
    email,
    updatedAt,
    createdAt,
    poolName,
    selectable = false,
    isSelected = false,
    onPressWhatsApp,
    onPressCall,
    onPressLogCall,
    onPressDetail,
    onPressHistory,
    onToggleSelection
}: LeadProps) => {
    const { colors } = useAppTheme();

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'New': return { bg: '#FEF3C7', text: '#D97706' }; // Yellow/Orange tint
            case 'In Progress': return { bg: '#DBEAFE', text: '#2563EB' }; // Blue
            case 'Pending': return { bg: '#F3F4F6', text: '#4B5563' }; // Gray
            case 'Cold': return { bg: '#FEE2E2', text: '#DC2626' }; // Red
            default: return { bg: '#F3F4F6', text: '#4B5563' };
        }
    };

    const statusStyle = getStatusStyles(status);

    const handleCall = () => {
        if (onPressCall) {
            onPressCall();
            return;
        }

        if (!phoneNumber) {
            Alert.alert('No Number', 'This lead does not have a phone number.');
            return;
        }
        Linking.openURL(`tel:${phoneNumber}`).catch(() =>
            Alert.alert('Error', 'Unable to open dialer')
        );
    };

    const ActionButton = ({ icon, label, onPress }: { icon: string, label: string, onPress?: () => void }) => (
        <TouchableOpacity style={styles.actionItem} onPress={onPress}>
            <Icon name={icon} size={18} color={colors.textSecondary} />
            <Text style={[styles.actionText, { color: colors.textSecondary }]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={selectable ? onToggleSelection : onPressDetail}
            style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.textPrimary }]}
        >
            {/* Selection Overlay */}
            {selectable && (
                <View style={[
                    styles.selectionOverlay,
                    isSelected && {
                        backgroundColor: 'rgba(79, 70, 229, 0.05)',
                        borderColor: '#4F46E5',
                        borderWidth: 2
                    }
                ]} />
            )}

            {/* ROW 1: Header (Avatar + Name + Status) - Full Width */}
            <View style={styles.headerRow}>


                {/* Main Content */}
                <View style={styles.mainInfo}>
                    {/* Top Line: Name and Badge */}
                    <View style={styles.nameRow}>
                        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>{name}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                            <Text style={[styles.statusText, { color: statusStyle.text }]}>{status.toUpperCase()}</Text>
                        </View>
                    </View>

                    {/* Second Line: Split Details and Score */}
                    <View style={styles.secondaryRow}>
                        {/* Details Column */}
                        <View style={styles.detailsColumn}>
                            <Text style={[styles.subText, { color: colors.textSecondary }]}>Lead ID: {leadId}</Text>
                            <Text style={[styles.subText, { color: colors.textSecondary }]}>
                                Assigned: <Text style={{ color: colors.textPrimary, fontWeight: '500' }}>{assignedTo}</Text>
                            </Text>
                            {(updatedAt || createdAt) && (
                                <Text style={[styles.subText, { color: colors.textSecondary }]}>
                                    {updatedAt && (
                                        <>Updated: <Text style={{ color: colors.textPrimary, fontWeight: '500' }}>
                                            {new Date(updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </Text></>
                                    )}
                                    {updatedAt && createdAt && '  •  '}
                                    {createdAt && (
                                        <>Created: <Text style={{ color: colors.textPrimary, fontWeight: '500' }}>
                                            {new Date(createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </Text></>
                                    )}
                                </Text>
                            )}
                            {poolName && (
                                <Text style={[styles.subText, { color: colors.textPrimary, fontWeight: '500' }]}>
                                    {poolName}
                                </Text>
                            )}
                        </View>


                    </View>
                </View>
            </View>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* ROW 3: Actions */}
            <View style={styles.actionRow} >
                <ActionButton icon="call-outline" label="Call" onPress={handleCall} />
                <ActionButton icon="logo-whatsapp" label="WhatsApp" onPress={onPressWhatsApp} />
                <ActionButton icon="document-text-outline" label="Log" onPress={onPressLogCall} />
                <ActionButton icon="time-outline" label="History" onPress={onPressHistory} />
            </View >

        </TouchableOpacity >
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: moderateScale(20),
        paddingVertical: verticalScale(12),
        paddingHorizontal: scale(16),
        marginBottom: verticalScale(16),
        shadowOffset: { width: 0, height: verticalScale(2) },
        shadowOpacity: 0.08,
        shadowRadius: moderateScale(10),
        elevation: 3,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    avatarContainer: {
        marginRight: scale(12),
        paddingTop: verticalScale(4), // visual alignment with name
    },
    avatar: {
        width: moderateScale(48),
        height: moderateScale(48),
        borderRadius: moderateScale(24),
    },
    avatarPlaceholder: {
        width: moderateScale(48),
        height: moderateScale(48),
        borderRadius: moderateScale(24),
        alignItems: 'center',
        justifyContent: 'center',
    },
    initials: {
        fontSize: moderateScale(18),
        fontWeight: '700',
    },
    mainInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: verticalScale(4),
    },
    name: {
        fontSize: moderateScale(16),
        fontWeight: '700',
        marginRight: scale(8),
        flexShrink: 1, // Allow text to shrink if needed but wrap is handled
    },
    statusBadge: {
        paddingHorizontal: scale(6),
        paddingVertical: verticalScale(2),
        borderRadius: moderateScale(4),
    },
    statusText: {
        fontSize: moderateScale(10),
        fontWeight: '700',
    },
    secondaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    detailsColumn: {
        flex: 1,
        marginRight: scale(8),
    },
    subText: {
        fontSize: moderateScale(12),
        marginBottom: verticalScale(2),
    },
    divider: {
        height: 1,
        marginTop: verticalScale(8),
        marginBottom: verticalScale(8),
        opacity: 0.5,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: scale(8),
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionText: {
        marginLeft: scale(6),
        fontSize: moderateScale(13),
        fontWeight: '500',
    },
    selectionOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: moderateScale(20),
        zIndex: 10,
    }
});
