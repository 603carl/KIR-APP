export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type IncidentStatus =
  | 'submitted'
  | 'pending'
  | 'under_review'
  | 'verified'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'closed'
  | 'rejected'
  | 'Submitted'
  | 'Pending'
  | 'Under Review'
  | 'Verified'
  | 'Assigned'
  | 'In Progress'
  | 'Resolved'
  | 'Closed'
  | 'Rejected';

export type IncidentCategory =
  | 'water'
  | 'roads'
  | 'power'
  | 'health'
  | 'security'
  | 'corruption'
  | 'environment'
  | 'other';

export interface Incident {
  id: string;
  title: string;
  description: string;
  category: IncidentCategory;
  displayCategory?: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  location: {
    county: string;
    subcounty?: string;
    address: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  reporter: {
    id: string;
    name: string;
    type: 'citizen' | 'community_leader' | 'government_official' | 'anonymous';
    verified: boolean;
  };
  assignedTeamId?: string;
  assignedTeam?: {
    id: string;
    name: string;
    type: string;
  };
  media?: {
    photos: string[];
    videos: string[];
    audio: string[];
  };
  createdAt: string;
  updatedAt: string;
  views: number;
  updates: number;
}

export interface IncidentStats {
  total: number;
  active: number;
  resolvedToday: number;
  critical: number;
  avgResponseTime: number; // in minutes
  resolutionRate: number;
  users: number;
  trend: {
    total: number;
    active: number;
    resolved: number;
    critical: number;
    users: number;
  };
  sparklines: {
    total: number[];
    active: number[];
    resolved: number[];
    critical: number[];
    response: number[];
    resolutionRate: number[];
  };
}

export interface CountyStats {
  county: string;
  totalReports: number;
  activeReports: number;
  resolvedReports: number;
  avgResponseTime: number;
  resolutionRate: number;
  trend: number;
}

export interface CategoryBreakdown {
  category: IncidentCategory;
  count: number;
  percentage: number;
  trend: number;
}

export interface ActivityItem {
  id: string;
  type: 'new_incident' | 'status_change' | 'assignment' | 'resolution' | 'escalation';
  incident: {
    id: string;
    title: string;
    severity: IncidentSeverity;
    category: IncidentCategory;
  };
  actor?: {
    name: string;
    role: string;
  };
  details: string;
  timestamp: string;
}

export interface SystemHealth {
  api: 'healthy' | 'degraded' | 'down';
  database: 'healthy' | 'degraded' | 'down';
  websocket: 'connected' | 'reconnecting' | 'disconnected';
  avgResponseTime: number;
  errorRate: number;
  uptime: number;
}
