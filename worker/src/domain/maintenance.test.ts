import { describe, expect, it } from 'vitest';
import { MAINTENANCE_PRIORITIES, RESPONSE_TARGET_HOURS } from './maintenance';
import type { MaintenanceRow } from './maintenance';

describe('RESPONSE_TARGET_HOURS', () => {
  it('publishes a target for every priority', () => {
    for (const priority of MAINTENANCE_PRIORITIES) {
      expect(RESPONSE_TARGET_HOURS[priority]).toBeGreaterThan(0);
    }
  });

  it('responds faster as priority rises', () => {
    expect(RESPONSE_TARGET_HOURS.emergency).toBeLessThan(RESPONSE_TARGET_HOURS.high);
    expect(RESPONSE_TARGET_HOURS.high).toBeLessThan(RESPONSE_TARGET_HOURS.medium);
    expect(RESPONSE_TARGET_HOURS.medium).toBeLessThan(RESPONSE_TARGET_HOURS.low);
  });
});

function row(overrides: Partial<MaintenanceRow> = {}): MaintenanceRow {
  return {
    id: 'm1',
    property_id: 'prop-1',
    tenant_id: 'tenant-1',
    landlord_id: 'landlord-1',
    contractor_id: null,
    title: 'Leaking tap',
    description: 'Kitchen tap drips constantly.',
    category: 'plumbing',
    priority: 'medium',
    status: 'pending',
    area_affected: null,
    access_instructions: null,
    images: '[]',
    tenant_notes: null,
    landlord_notes: null,
    contractor_notes: null,
    estimated_cost_amount: null,
    actual_cost_amount: null,
    assigned_at: null,
    completed_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as MaintenanceRow;
}

describe('toMaintenanceDto', () => {
  it('converts stored kobo into naira', async () => {
    const { toMaintenanceDto } = await import('./maintenance');
    const dto = toMaintenanceDto(row({ estimated_cost_amount: 25_000_00 }));
    expect(dto.estimated_cost).toBe(25_000);
  });

  it('reports null cost when none is recorded', async () => {
    const { toMaintenanceDto } = await import('./maintenance');
    expect(toMaintenanceDto(row()).actual_cost).toBeNull();
  });

  it('carries the response target implied by the priority', async () => {
    const { toMaintenanceDto } = await import('./maintenance');
    expect(toMaintenanceDto(row({ priority: 'emergency' })).response_target_hours).toBe(
      RESPONSE_TARGET_HOURS.emergency
    );
  });
});
