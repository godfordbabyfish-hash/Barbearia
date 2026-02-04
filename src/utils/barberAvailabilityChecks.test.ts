/**
 * Unit Tests for Barber Availability Checking Utilities
 * 
 * These tests verify specific scenarios and edge cases for the
 * barber availability checking functions.
 */

import { describe, it, expect } from 'vitest';
import {
  checkBarberAvailableForSlot,
  getAvailableBarbersForSlot,
  calculateSlotAvailability,
  type Appointment,
  type BarberBreak,
  type Barber,
} from './barberAvailabilityChecks';

describe('checkBarberAvailableForSlot', () => {
  const barberId = 'barber-1';
  const date = '2024-01-15';
  const duration = 30;

  describe('appointment conflicts', () => {
    it('should detect exact overlap with existing appointment', () => {
      const appointments: Appointment[] = [
        {
          appointment_time: '14:00',
          service: { duration: 30 },
        },
      ];
      const breaks: BarberBreak[] = [];

      const result = checkBarberAvailableForSlot(
        barberId,
        date,
        '14:00',
        duration,
        appointments,
        breaks
      );

      expect(result).toBe(false);
    });

    it('should detect partial overlap - new slot starts during existing appointment', () => {
      const appointments: Appointment[] = [
        {
          appointment_time: '14:00',
          service: { duration: 30 },
        },
      ];
      const breaks: BarberBreak[] = [];

      const result = checkBarberAvailableForSlot(
        barberId,
        date,
        '14:15',
        duration,
        appointments,
        breaks
      );

      expect(result).toBe(false);
    });

    it('should detect partial overlap - new slot ends during existing appointment', () => {
      const appointments: Appointment[] = [
        {
          appointment_time: '14:00',
          service: { duration: 30 },
        },
      ];
      const breaks: BarberBreak[] = [];

      const result = checkBarberAvailableForSlot(
        barberId,
        date,
        '13:45',
        duration,
        appointments,
        breaks
      );

      expect(result).toBe(false);
    });

    it('should detect overlap - new slot completely contains existing appointment', () => {
      const appointments: Appointment[] = [
        {
          appointment_time: '14:15',
          service: { duration: 15 },
        },
      ];
      const breaks: BarberBreak[] = [];

      const result = checkBarberAvailableForSlot(
        barberId,
        date,
        '14:00',
        60,
        appointments,
        breaks
      );

      expect(result).toBe(false);
    });

    it('should allow slot immediately after existing appointment', () => {
      const appointments: Appointment[] = [
        {
          appointment_time: '14:00',
          service: { duration: 30 },
        },
      ];
      const breaks: BarberBreak[] = [];

      const result = checkBarberAvailableForSlot(
        barberId,
        date,
        '14:30',
        duration,
        appointments,
        breaks
      );

      expect(result).toBe(true);
    });

    it('should allow slot immediately before existing appointment', () => {
      const appointments: Appointment[] = [
        {
          appointment_time: '14:30',
          service: { duration: 30 },
        },
      ];
      const breaks: BarberBreak[] = [];

      const result = checkBarberAvailableForSlot(
        barberId,
        date,
        '14:00',
        duration,
        appointments,
        breaks
      );

      expect(result).toBe(true);
    });

    it('should handle appointment without service duration (default 30 min)', () => {
      const appointments: Appointment[] = [
        {
          appointment_time: '14:00',
        },
      ];
      const breaks: BarberBreak[] = [];

      const result = checkBarberAvailableForSlot(
        barberId,
        date,
        '14:15',
        duration,
        appointments,
        breaks
      );

      expect(result).toBe(false);
    });
  });

  describe('break conflicts', () => {
    it('should detect overlap with break - slot starts during break', () => {
      const appointments: Appointment[] = [];
      const breaks: BarberBreak[] = [
        {
          start_time: '12:00',
          end_time: '13:00',
        },
      ];

      const result = checkBarberAvailableForSlot(
        barberId,
        date,
        '12:30',
        duration,
        appointments,
        breaks
      );

      expect(result).toBe(false);
    });

    it('should detect overlap with break - slot ends during break', () => {
      const appointments: Appointment[] = [];
      const breaks: BarberBreak[] = [
        {
          start_time: '12:00',
          end_time: '13:00',
        },
      ];

      const result = checkBarberAvailableForSlot(
        barberId,
        date,
        '11:30',
        duration,
        appointments,
        breaks
      );

      expect(result).toBe(false);
    });

    it('should detect overlap with break - slot completely contains break', () => {
      const appointments: Appointment[] = [];
      const breaks: BarberBreak[] = [
        {
          start_time: '12:15',
          end_time: '12:45',
        },
      ];

      const result = checkBarberAvailableForSlot(
        barberId,
        date,
        '12:00',
        60,
        appointments,
        breaks
      );

      expect(result).toBe(false);
    });

    it('should allow slot immediately after break', () => {
      const appointments: Appointment[] = [];
      const breaks: BarberBreak[] = [
        {
          start_time: '12:00',
          end_time: '13:00',
        },
      ];

      const result = checkBarberAvailableForSlot(
        barberId,
        date,
        '13:00',
        duration,
        appointments,
        breaks
      );

      expect(result).toBe(true);
    });

    it('should allow slot immediately before break', () => {
      const appointments: Appointment[] = [];
      const breaks: BarberBreak[] = [
        {
          start_time: '12:00',
          end_time: '13:00',
        },
      ];

      const result = checkBarberAvailableForSlot(
        barberId,
        date,
        '11:30',
        duration,
        appointments,
        breaks
      );

      expect(result).toBe(true);
    });
  });

  describe('combined scenarios', () => {
    it('should be available when no appointments or breaks', () => {
      const appointments: Appointment[] = [];
      const breaks: BarberBreak[] = [];

      const result = checkBarberAvailableForSlot(
        barberId,
        date,
        '14:00',
        duration,
        appointments,
        breaks
      );

      expect(result).toBe(true);
    });

    it('should be available when appointments and breaks do not conflict', () => {
      const appointments: Appointment[] = [
        {
          appointment_time: '10:00',
          service: { duration: 30 },
        },
      ];
      const breaks: BarberBreak[] = [
        {
          start_time: '12:00',
          end_time: '13:00',
        },
      ];

      const result = checkBarberAvailableForSlot(
        barberId,
        date,
        '14:00',
        duration,
        appointments,
        breaks
      );

      expect(result).toBe(true);
    });

    it('should handle multiple appointments correctly', () => {
      const appointments: Appointment[] = [
        {
          appointment_time: '10:00',
          service: { duration: 30 },
        },
        {
          appointment_time: '11:00',
          service: { duration: 30 },
        },
        {
          appointment_time: '15:00',
          service: { duration: 30 },
        },
      ];
      const breaks: BarberBreak[] = [];

      // Should be available between appointments
      const result = checkBarberAvailableForSlot(
        barberId,
        date,
        '14:00',
        duration,
        appointments,
        breaks
      );

      expect(result).toBe(true);
    });

    it('should handle multiple breaks correctly', () => {
      const appointments: Appointment[] = [];
      const breaks: BarberBreak[] = [
        {
          start_time: '10:00',
          end_time: '10:30',
        },
        {
          start_time: '12:00',
          end_time: '13:00',
        },
        {
          start_time: '15:00',
          end_time: '15:30',
        },
      ];

      // Should be available between breaks
      const result = checkBarberAvailableForSlot(
        barberId,
        date,
        '14:00',
        duration,
        appointments,
        breaks
      );

      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle different service durations', () => {
      const appointments: Appointment[] = [
        {
          appointment_time: '14:00',
          service: { duration: 45 },
        },
      ];
      const breaks: BarberBreak[] = [];

      // 60-minute service starting at 13:30 would end at 14:30, overlapping with appointment
      const result = checkBarberAvailableForSlot(
        barberId,
        date,
        '13:30',
        60,
        appointments,
        breaks
      );

      expect(result).toBe(false);
    });

    it('should handle 15-minute service duration', () => {
      const appointments: Appointment[] = [
        {
          appointment_time: '14:00',
          service: { duration: 30 },
        },
      ];
      const breaks: BarberBreak[] = [];

      // 15-minute service at 13:45 would end at 14:00, no overlap
      const result = checkBarberAvailableForSlot(
        barberId,
        date,
        '13:45',
        15,
        appointments,
        breaks
      );

      expect(result).toBe(true);
    });
  });
});

describe('getAvailableBarbersForSlot', () => {
  const date = '2024-01-15';
  const time = '14:00';
  const serviceId = 'service-1';
  const serviceDuration = 30;

  const barbers: Barber[] = [
    { id: 'barber-1', name: 'Barber 1', specialty: 'Haircut' },
    { id: 'barber-2', name: 'Barber 2', specialty: 'Beard' },
    { id: 'barber-3', name: 'Barber 3', specialty: 'Styling' },
  ];

  it('should return all barbers when all are available', () => {
    const appointments = new Map<string, Appointment[]>();
    const breaks = new Map<string, BarberBreak[]>();

    const result = getAvailableBarbersForSlot(
      barbers,
      date,
      time,
      serviceId,
      appointments,
      breaks,
      serviceDuration
    );

    expect(result).toHaveLength(3);
    expect(result).toContain('barber-1');
    expect(result).toContain('barber-2');
    expect(result).toContain('barber-3');
  });

  it('should return only available barbers when some are busy', () => {
    const appointments = new Map<string, Appointment[]>();
    appointments.set('barber-1', [
      {
        appointment_time: '14:00',
        service: { duration: 30 },
      },
    ]);

    const breaks = new Map<string, BarberBreak[]>();

    const result = getAvailableBarbersForSlot(
      barbers,
      date,
      time,
      serviceId,
      appointments,
      breaks,
      serviceDuration
    );

    expect(result).toHaveLength(2);
    expect(result).not.toContain('barber-1');
    expect(result).toContain('barber-2');
    expect(result).toContain('barber-3');
  });

  it('should return only available barbers when some are on break', () => {
    const appointments = new Map<string, Appointment[]>();
    const breaks = new Map<string, BarberBreak[]>();
    breaks.set('barber-2', [
      {
        start_time: '13:30',
        end_time: '14:30',
      },
    ]);

    const result = getAvailableBarbersForSlot(
      barbers,
      date,
      time,
      serviceId,
      appointments,
      breaks,
      serviceDuration
    );

    expect(result).toHaveLength(2);
    expect(result).toContain('barber-1');
    expect(result).not.toContain('barber-2');
    expect(result).toContain('barber-3');
  });

  it('should return empty array when all barbers are busy', () => {
    const appointments = new Map<string, Appointment[]>();
    appointments.set('barber-1', [
      { appointment_time: '14:00', service: { duration: 30 } },
    ]);
    appointments.set('barber-2', [
      { appointment_time: '14:00', service: { duration: 30 } },
    ]);
    appointments.set('barber-3', [
      { appointment_time: '14:00', service: { duration: 30 } },
    ]);

    const breaks = new Map<string, BarberBreak[]>();

    const result = getAvailableBarbersForSlot(
      barbers,
      date,
      time,
      serviceId,
      appointments,
      breaks,
      serviceDuration
    );

    expect(result).toHaveLength(0);
  });

  it('should handle mixed scenarios - appointments and breaks', () => {
    const appointments = new Map<string, Appointment[]>();
    appointments.set('barber-1', [
      { appointment_time: '14:00', service: { duration: 30 } },
    ]);

    const breaks = new Map<string, BarberBreak[]>();
    breaks.set('barber-2', [
      { start_time: '13:30', end_time: '14:30' },
    ]);

    const result = getAvailableBarbersForSlot(
      barbers,
      date,
      time,
      serviceId,
      appointments,
      breaks,
      serviceDuration
    );

    expect(result).toHaveLength(1);
    expect(result).toContain('barber-3');
  });
});

describe('calculateSlotAvailability', () => {
  const date = '2024-01-15';
  const serviceId = 'service-1';
  const serviceDuration = 30;

  const barbers: Barber[] = [
    { id: 'barber-1', name: 'Barber 1', specialty: 'Haircut' },
    { id: 'barber-2', name: 'Barber 2', specialty: 'Beard' },
    { id: 'barber-3', name: 'Barber 3', specialty: 'Styling' },
  ];

  const timeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00'];

  it('should return all slots when all barbers are available', () => {
    const appointments = new Map<string, Appointment[]>();
    const breaks = new Map<string, BarberBreak[]>();

    const result = calculateSlotAvailability(
      barbers,
      date,
      timeSlots,
      serviceId,
      appointments,
      breaks,
      serviceDuration
    );

    expect(result).toHaveLength(5);
    result.forEach((slot) => {
      expect(slot.availableCount).toBe(3);
      expect(slot.availableBarberIds).toHaveLength(3);
    });
  });

  it('should only include slots with at least one available barber', () => {
    const appointments = new Map<string, Appointment[]>();
    // All barbers busy at 10:00
    appointments.set('barber-1', [
      { appointment_time: '10:00', service: { duration: 30 } },
    ]);
    appointments.set('barber-2', [
      { appointment_time: '10:00', service: { duration: 30 } },
    ]);
    appointments.set('barber-3', [
      { appointment_time: '10:00', service: { duration: 30 } },
    ]);

    const breaks = new Map<string, BarberBreak[]>();

    const result = calculateSlotAvailability(
      barbers,
      date,
      timeSlots,
      serviceId,
      appointments,
      breaks,
      serviceDuration
    );

    expect(result).toHaveLength(4);
    expect(result.find((s) => s.time === '10:00')).toBeUndefined();
  });

  it('should correctly count available barbers per slot', () => {
    const appointments = new Map<string, Appointment[]>();
    // Barber 1 busy at 09:30
    appointments.set('barber-1', [
      { appointment_time: '09:30', service: { duration: 30 } },
    ]);
    // Barber 2 busy at 10:30
    appointments.set('barber-2', [
      { appointment_time: '10:30', service: { duration: 30 } },
    ]);

    const breaks = new Map<string, BarberBreak[]>();

    const result = calculateSlotAvailability(
      barbers,
      date,
      timeSlots,
      serviceId,
      appointments,
      breaks,
      serviceDuration
    );

    expect(result).toHaveLength(5);

    const slot0900 = result.find((s) => s.time === '09:00');
    expect(slot0900?.availableCount).toBe(3);

    const slot0930 = result.find((s) => s.time === '09:30');
    expect(slot0930?.availableCount).toBe(2);

    const slot1030 = result.find((s) => s.time === '10:30');
    expect(slot1030?.availableCount).toBe(2);
  });

  it('should handle breaks correctly', () => {
    const appointments = new Map<string, Appointment[]>();
    const breaks = new Map<string, BarberBreak[]>();
    // Barber 1 on break from 10:00 to 11:00
    breaks.set('barber-1', [
      { start_time: '10:00', end_time: '11:00' },
    ]);

    const result = calculateSlotAvailability(
      barbers,
      date,
      timeSlots,
      serviceId,
      appointments,
      breaks,
      serviceDuration
    );

    expect(result).toHaveLength(5);

    const slot1000 = result.find((s) => s.time === '10:00');
    expect(slot1000?.availableCount).toBe(2);
    expect(slot1000?.availableBarberIds).not.toContain('barber-1');

    const slot1030 = result.find((s) => s.time === '10:30');
    expect(slot1030?.availableCount).toBe(2);
    expect(slot1030?.availableBarberIds).not.toContain('barber-1');
  });

  it('should return empty array when no slots are available', () => {
    const appointments = new Map<string, Appointment[]>();
    // All barbers busy for all slots
    timeSlots.forEach((slot) => {
      appointments.set('barber-1', [
        ...(appointments.get('barber-1') || []),
        { appointment_time: slot, service: { duration: 30 } },
      ]);
      appointments.set('barber-2', [
        ...(appointments.get('barber-2') || []),
        { appointment_time: slot, service: { duration: 30 } },
      ]);
      appointments.set('barber-3', [
        ...(appointments.get('barber-3') || []),
        { appointment_time: slot, service: { duration: 30 } },
      ]);
    });

    const breaks = new Map<string, BarberBreak[]>();

    const result = calculateSlotAvailability(
      barbers,
      date,
      timeSlots,
      serviceId,
      appointments,
      breaks,
      serviceDuration
    );

    expect(result).toHaveLength(0);
  });

  it('should handle complex mixed scenarios', () => {
    const appointments = new Map<string, Appointment[]>();
    appointments.set('barber-1', [
      { appointment_time: '09:00', service: { duration: 30 } },
      { appointment_time: '10:00', service: { duration: 30 } },
    ]);
    appointments.set('barber-2', [
      { appointment_time: '09:30', service: { duration: 30 } },
    ]);

    const breaks = new Map<string, BarberBreak[]>();
    breaks.set('barber-3', [
      { start_time: '10:30', end_time: '11:30' },
    ]);

    const result = calculateSlotAvailability(
      barbers,
      date,
      timeSlots,
      serviceId,
      appointments,
      breaks,
      serviceDuration
    );

    expect(result).toHaveLength(5);

    // 09:00 - barber-1 busy, barber-2 and barber-3 available
    const slot0900 = result.find((s) => s.time === '09:00');
    expect(slot0900?.availableCount).toBe(2);

    // 09:30 - barber-1 and barber-2 busy, barber-3 available
    const slot0930 = result.find((s) => s.time === '09:30');
    expect(slot0930?.availableCount).toBe(1);

    // 10:00 - barber-1 busy, barber-2 and barber-3 available
    const slot1000 = result.find((s) => s.time === '10:00');
    expect(slot1000?.availableCount).toBe(2);

    // 10:30 - barber-3 on break, barber-1 and barber-2 available
    const slot1030 = result.find((s) => s.time === '10:30');
    expect(slot1030?.availableCount).toBe(2);

    // 11:00 - all available
    const slot1100 = result.find((s) => s.time === '11:00');
    expect(slot1100?.availableCount).toBe(3);
  });
});
