/**
 * Central query-key factory.
 *
 * Invalidation is only reliable if every caller derives keys the same way;
 * hand-written string arrays scattered across pages is how stale caches happen.
 */
export const propertyKeys = {
  all: ['properties'] as const,
  list: (filters: Record<string, unknown>) => ['properties', 'list', filters] as const,
  detail: (id: string) => ['properties', 'detail', id] as const,
  mine: () => ['properties', 'mine'] as const,
};

export const bookingKeys = {
  all: ['bookings'] as const,
};

export const maintenanceKeys = {
  all: ['maintenance'] as const,
};

export const conversationKeys = {
  all: ['conversations'] as const,
  messages: (id: string) => ['conversations', id, 'messages'] as const,
};

export const documentKeys = {
  all: ['documents'] as const,
};

export const notificationKeys = {
  all: ['notifications'] as const,
};

export const leadKeys = {
  all: ['leads'] as const,
};
