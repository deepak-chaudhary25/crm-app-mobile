
export interface Stage {
    _id: string;
    name: string;
    order: number;
}

export interface AssignedTo {
    _id: string;
    name: string;
    email: string;
}

export interface Lead {
    _id: string;
    leadId: number;
    name: string;
    phone: string;
    email: string;
    source: string;
    stageId: Stage;
    status: string;
    healthScore: number;
    isActive: boolean;
    assignedTo: AssignedTo;
    createdAt: string;
    updatedAt: string;
}

export interface LeadResponse {
    data: Lead[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
export interface AssignableUser {
    _id: string;
    name: string;
    email: string;
    role?: {
        name: string;
    };
}
