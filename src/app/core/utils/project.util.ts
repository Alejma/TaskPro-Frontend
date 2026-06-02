import { Project } from '../models/project.model';
import { Role } from '../models/auth.model';

export function extractProjectsList(response: unknown): Project[] {
  const raw = unwrapProjectsArray(response);
  return raw
    .map((item) => normalizeProjectItem(item))
    .filter((project): project is Project => !!project);
}

function unwrapProjectsArray(response: unknown): unknown[] {
  if (Array.isArray(response)) return response;

  const root = (response ?? {}) as Record<string, unknown>;
  const candidates = [root['data'], root['projects'], root['items'], root['results']];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === 'object') {
      const nested = candidate as Record<string, unknown>;
      const nestedList = nested['projects'] ?? nested['items'] ?? nested['rows'];
      if (Array.isArray(nestedList)) return nestedList;
    }
  }

  return [];
}

export function normalizeProjectItem(raw: unknown): Project | null {
  if (!raw || typeof raw !== 'object') return null;

  let item = raw as Record<string, unknown>;
  const nested = item['project'] ?? item['Project'] ?? item['projectData'];
  if (nested && typeof nested === 'object') {
    const nestedRecord = nested as Record<string, unknown>;
    item = {
      ...nestedRecord,
      ...item,
      id: nestedRecord['id'] ?? item['projectId'] ?? item['id'],
      name: nestedRecord['name'] ?? item['name'] ?? item['projectName']
    };
  }

  const id = String(item['id'] ?? item['_id'] ?? item['projectId'] ?? '');
  const name = String(item['name'] ?? item['projectName'] ?? item['title'] ?? '');
  if (!id || !name || name === 'undefined') return null;

  const memberIds = extractMemberIds(item);
  const ownerId = extractOwnerId(item);

  return {
    id,
    name,
    description: String(item['description'] ?? item['details'] ?? ''),
    status: normalizeProjectStatus(item['status']),
    ownerId,
    membersCount:
      typeof item['membersCount'] === 'number'
        ? (item['membersCount'] as number)
        : memberIds.length,
    memberIds
  };
}

function extractMemberIds(item: Record<string, unknown>): string[] {
  const memberIdsRaw = item['memberIds'] ?? item['members'] ?? item['projectMembers'];
  if (!Array.isArray(memberIdsRaw)) return [];

  return memberIdsRaw
    .map((value) => {
      if (value == null) return '';
      if (typeof value === 'string' || typeof value === 'number') return String(value);
      const record = value as Record<string, unknown>;
      const user = record['user'] ?? record['User'];
      if (user && typeof user === 'object') {
        return String((user as Record<string, unknown>)['id'] ?? (user as Record<string, unknown>)['_id'] ?? '');
      }
      return String(record['userId'] ?? record['id'] ?? record['_id'] ?? '');
    })
    .filter(Boolean);
}

function extractOwnerId(item: Record<string, unknown>): string {
  const ownerRaw = item['ownerId'] ?? item['owner'] ?? item['ownerUserId'] ?? item['createdBy'];
  if (ownerRaw == null) return '';
  if (typeof ownerRaw === 'object') {
    const owner = ownerRaw as Record<string, unknown>;
    return String(owner['id'] ?? owner['_id'] ?? '');
  }
  return String(ownerRaw);
}

function normalizeProjectStatus(status: unknown): Project['status'] {
  if (typeof status === 'string') {
    const upper = status.toUpperCase();
    if (upper === 'ACTIVE' || upper === 'PAUSED' || upper === 'DONE') return upper;
  }
  return 'ACTIVE';
}

export function filterProjectsForUser(projects: Project[], userId: string | undefined, role: Role | null): Project[] {
  if (!userId || role === 'ADMIN') return projects;

  const normalizedUserId = String(userId);
  return projects.filter(
    (project) =>
      String(project.ownerId) === normalizedUserId ||
      (project.memberIds ?? []).some((memberId) => String(memberId) === normalizedUserId)
  );
}
