import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { scale, moderateScale } from '../utils/responsive';

interface HistoryListItemProps {
    item: any;
    isDark: boolean;
    colors: any;
    activeTab: 'calls' | 'interactions';
    onPressItem: (item: any) => void;
}

const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
};

const getIconForOutcome = (outcome: string, duration: number) => {
    const lowerOutcome = (outcome || '').toLowerCase();
    if (lowerOutcome.includes('missed') || lowerOutcome.includes('dint pick') || duration === 0) {
        return { name: 'call', color: '#EF4444' };
    }
    return { name: 'call', color: '#10B981' };
};

const HistoryListItemComponent = ({
    item,
    isDark,
    colors,
    activeTab,
    onPressItem
}: HistoryListItemProps) => {
    // const iconInfo = getIconForOutcome(item.outcome, item.duration);
    const date = new Date(item.createdAt);

    return (
        <TouchableOpacity
            activeOpacity={0.6}
            onPress={() => onPressItem(item)}
            style={[
                styles.listItem,
                {
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    shadowColor: isDark ? '#000' : '#64748B',
                }
            ]}
        >
            <View style={styles.itemContent}>
                <View style={styles.itemHeader}>
                    <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {item.leadName || `Lead #${item.leadId}`}
                    </Text>
                    <Text style={[styles.itemTime, { color: colors.textSecondary }]}>
                        {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>

                <View style={styles.itemSubHeader}>
                    <View style={styles.tagContainer}>
                        <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>#{item.leadId}</Text>
                    </View>
                    
                    {item.stageId?.name && (
                        <>
                            <Text style={[styles.dotSeparator, { color: colors.textSecondary }]}>•</Text>
                            <View style={[styles.tagContainer, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>{item.stageId.name}</Text>
                            </View>
                        </>
                    )}
                    
                    {activeTab === 'calls' && (
                        <>
                            <Text style={[styles.dotSeparator, { color: colors.textSecondary }]}>•</Text>
                            <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>{formatDuration(item.duration || 0)}</Text>
                        </>
                    )}

                    <Text style={[styles.dotSeparator, { color: colors.textSecondary }]}>•</Text>
                    <Text style={[styles.callerName, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.userId?.name?.split(' ')[0] || 'Unknown'}
                    </Text>
                </View>

                {item.remark && activeTab === 'calls' && (
                    <View style={[styles.remarkBubble, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
                        <View style={{ marginRight: scale(6) }}>
                            <Icon name="chatbubble-ellipses-outline" size={moderateScale(12)} color={colors.textSecondary} />
                        </View>
                        <Text style={[styles.itemRemark, { color: colors.textSecondary }]} numberOfLines={1}>
                            {item.remark}
                        </Text>
                    </View>
                )}
                
                {activeTab === 'interactions' && (
                    <View style={[styles.remarkBubble, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
                        <View style={{ marginRight: scale(6) }}>
                            <Icon name={item.source === 'whatsapp' ? 'logo-whatsapp' : 'flash-outline'} size={moderateScale(12)} color={item.source === 'whatsapp' ? '#25D366' : colors.textSecondary} />
                        </View>
                        <Text style={[styles.itemRemark, { color: colors.textSecondary }]} numberOfLines={1}>
                            {item.source ? item.source.charAt(0).toUpperCase() + item.source.slice(1) : 'Unknown'} • {item.outcome || 'No outcome recorded'}
                        </Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    listItem: {
        marginBottom: scale(12),
        borderRadius: moderateScale(16),
        padding: scale(16),
        elevation: 2,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    itemContent: {
        flex: 1,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: scale(8),
    },
    itemName: {
        fontSize: moderateScale(16),
        fontWeight: '700',
        flex: 1,
        marginRight: scale(12),
    },
    itemTime: {
        fontSize: moderateScale(12),
        fontWeight: '500',
    },
    itemSubHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: scale(4),
        marginBottom: scale(12),
    },
    tagContainer: {
        paddingHorizontal: scale(8),
        paddingVertical: scale(2),
        borderRadius: moderateScale(6),
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    itemDetail: {
        fontSize: moderateScale(12),
        fontWeight: '600',
    },
    dotSeparator: {
        fontSize: moderateScale(12),
        marginHorizontal: scale(4),
    },
    callerName: {
        fontSize: moderateScale(12),
        fontWeight: '500',
        flex: 1,
    },
    remarkBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: scale(8),
        paddingHorizontal: scale(12),
        borderRadius: moderateScale(8),
        marginTop: scale(4),
    },
    itemRemark: {
        fontSize: moderateScale(13),
        flex: 1,
        fontStyle: 'italic',
    },
});

export const HistoryListItem = memo(HistoryListItemComponent, (prevProps, nextProps) => {
    return prevProps.item._id === nextProps.item._id && prevProps.activeTab === nextProps.activeTab;
});
