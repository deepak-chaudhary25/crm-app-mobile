import React, { memo } from 'react';
import { LeadCard } from './LeadCard';

interface LeadListItemProps {
    item: any;
    isSelectionMode: boolean;
    selectedLeads: string[];
    onToggleSelection: (id: string) => void;
    onWhatsApp: (phone: string, item: any) => void;
    onCall: (phone: string, item: any) => void;
    onLogCall: (item: any) => void;
    onDetail: (item: any) => void;
    onHistory: (item: any) => void;
    getInitials: (name: string) => string;
    getInitialsColor: (name: string) => string;
}

const LeadListItemComponent = ({
    item,
    isSelectionMode,
    selectedLeads,
    onToggleSelection,
    onWhatsApp,
    onCall,
    onLogCall,
    onDetail,
    onHistory,
    getInitials,
    getInitialsColor
}: LeadListItemProps) => {

    const isSelected = selectedLeads.includes(item._id);

    return (
        <LeadCard
            name={item.name}
            leadId={`#${item.leadId}`}
            assignedTo={item.assignedTo?.name || 'Unassigned'}
            status={item.stageId?.name || 'New'}
            initials={getInitials(item.name)}
            initialsColor={getInitialsColor(item.name)}
            phoneNumber={item.phone}
            email={item.email}
            selectable={isSelectionMode}
            isSelected={isSelected}
            onToggleSelection={() => onToggleSelection(item._id)}
            onPressWhatsApp={() => onWhatsApp(item.phone, item)}
            onPressCall={() => onCall(item.phone, item)}
            onPressLogCall={() => onLogCall(item)}
            onPressDetail={() => onDetail(item)}
            onPressHistory={() => onHistory(item)}
            updatedAt={item.updatedAt}
            createdAt={item.createdAt}
            poolName={item.poolId?.name}
        />
    );
};

export const LeadListItem = memo(LeadListItemComponent, (prevProps, nextProps) => {
    // Only re-render if selection mode changes, OR if this specific item's selection status changes
    // OR if the item data itself changes heavily
    if (prevProps.isSelectionMode !== nextProps.isSelectionMode) return false;
    
    const wasSelected = prevProps.selectedLeads.includes(prevProps.item._id);
    const isSelected = nextProps.selectedLeads.includes(nextProps.item._id);
    if (wasSelected !== isSelected) return false;
    
    // We assume item._id and item properties don't mutate inline, 
    // but if needed we can compare specific fields.
    if (prevProps.item._id !== nextProps.item._id) return false;
    if (prevProps.item.stageId?._id !== nextProps.item.stageId?._id) return false;

    return true;
});
