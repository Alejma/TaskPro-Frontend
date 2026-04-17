export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'ACTIVE' | 'PAUSED' | 'DONE';
  ownerId: string;
  membersCount: number;
  memberIds?: string[];
}

export interface ProjectPayload {
  name: string;
  description: string;
  status?: 'ACTIVE' | 'PAUSED' | 'DONE';
}
