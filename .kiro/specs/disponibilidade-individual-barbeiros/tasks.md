# Implementation Plan: Disponibilidade Individual de Barbeiros

## Overview

This implementation plan transforms the booking system to check availability per barber rather than globally. The key changes are: (1) reordering the booking flow to select time before barber, (2) checking all barbers when determining slot availability, and (3) filtering barbers based on the selected time slot.

## Tasks

- [ ] 1. Create utility functions for barber availability checking
  - Create `src/utils/barberAvailabilityChecks.ts` with core availability logic
  - Implement `checkBarberAvailableForSlot(barberId, date, time, duration, appointments, breaks)` function
  - Implement `getAvailableBarbersForSlot(barbers, date, time, serviceId, appointments, breaks)` function
  - Implement `calculateSlotAvailability(barbers, date, timeSlots, serviceId)` function that returns availability metadata per slot
  - _Requirements: 1.1, 1.3, 1.4, 2.1, 3.1_

- [ ]* 1.1 Write property test for slot availability with partial barber availability
  - **Property 1: Slot Availability with Partial Barber Availability**
  - **Validates: Requirements 1.1**
  - Generate random time slots and barber schedules
  - Verify slot marked available if at least one barber is free
  - Run with minimum 100 iterations

- [ ]* 1.2 Write property test for service duration conflict detection
  - **Property 2: Service Duration Conflict Detection**
  - **Validates: Requirements 1.3**
  - Generate random service durations and appointment times
  - Verify overlap detection matches mathematical definition
  - Run with minimum 100 iterations

- [ ]* 1.3 Write property test for break period exclusion
  - **Property 3: Break Period Exclusion**
  - **Validates: Requirements 1.4**
  - Generate random break periods and service durations
  - Verify slots overlapping with breaks are marked unavailable
  - Run with minimum 100 iterations

- [ ]* 1.4 Write property test for barber filtering by time slot
  - **Property 4: Barber Filtering by Time Slot**
  - **Validates: Requirements 2.1**
  - Generate random time slots and barber schedules
  - Verify filtered list contains exactly available barbers
  - Run with minimum 100 iterations

- [ ]* 1.5 Write unit tests for utility functions
  - Test specific overlap scenarios (exact, partial, none)
  - Test break conflict scenarios
  - Test multi-barber availability scenarios
  - _Requirements: 1.1, 1.3, 1.4, 2.1_

- [~] 2. Modify Booking component state and flow
  - Update step type definition to reorder flow: `"service" | "time" | "barber" | "form" | "success"`
  - Add new state: `slotsWithAvailability: SlotAvailability[]`
  - Add new state: `availableBarbersForSelectedTime: Barber[]`
  - Update `handleServiceSelect()` to navigate to "time" step instead of "barber"
  - Remove barber pre-selection logic from service selection
  - _Requirements: 1.1, 2.1_

- [~] 3. Implement new getAvailableSlotsForDate function
  - Modify `getAvailableSlotsForDate()` to check all barbers instead of just selected barber
  - Remove dependency on `formData.barber` (not selected yet at this point)
  - Fetch all visible barbers from database
  - Use `Promise.all()` to fetch appointments and breaks for all barbers in parallel
  - For each time slot, use `calculateSlotAvailability()` to determine which barbers are available
  - Return slots with metadata: `{ time, availableBarberIds, availableCount }`
  - Update state with both simple slot list and detailed availability data
  - _Requirements: 1.1, 1.3, 1.4, 2.4_

- [ ]* 3.1 Write property test for available barber count accuracy
  - **Property 6: Available Barber Count Accuracy**
  - **Validates: Requirements 2.4**
  - Generate random schedules and verify count matches actual available barbers
  - Run with minimum 100 iterations

- [ ]* 3.2 Write unit tests for getAvailableSlotsForDate
  - Test with 3 barbers: 1 busy, 2 free → slot available
  - Test with 3 barbers: all busy → slot unavailable
  - Test with service duration spanning multiple slots
  - Test with barber breaks
  - _Requirements: 1.1, 1.3, 1.4_

- [~] 4. Update time selection UI
  - Modify time selection step to show availability count per slot
  - Add visual indicator: "X barbeiros disponíveis" below each time button
  - Update time selection to not require barber to be selected first
  - Ensure time selection works before barber selection
  - Update loading states and empty states for new flow
  - _Requirements: 2.4_

- [~] 5. Implement barber filtering for selected time
  - Create `loadAvailableBarbersForTime()` function
  - Call `getAvailableBarbersForSlot()` utility with selected time
  - Update `availableBarbersForSelectedTime` state
  - Modify `handleTimeSelect()` to load available barbers and navigate to "barber" step
  - _Requirements: 2.1_

- [~] 6. Update barber selection step
  - Move barber selection step to occur after time selection
  - Filter displayed barbers using `availableBarbersForSelectedTime`
  - Show message if no barbers available: "Nenhum barbeiro disponível neste horário"
  - Update barber selection cards to only show available barbers
  - Update back button navigation: barber step → time step
  - _Requirements: 2.1_

- [ ]* 6.1 Write property test for per-barber conflict isolation
  - **Property 7: Per-Barber Conflict Isolation**
  - **Validates: Requirements 3.1**
  - Generate scenarios with multiple barbers and appointments
  - Verify one barber's appointment doesn't block another barber
  - Run with minimum 100 iterations

- [ ]* 6.2 Write unit tests for barber filtering
  - Test filtering with various availability scenarios
  - Test empty barber list handling
  - Test all barbers unavailable scenario
  - _Requirements: 2.1_

- [~] 7. Implement barber deselection logic
  - Add logic to detect when selected barber becomes unavailable after time change
  - Clear barber selection if barber not available at new time
  - Show message: "O barbeiro selecionado não está disponível neste horário"
  - Automatically navigate to barber selection step with filtered list
  - _Requirements: 2.3_

- [ ]* 7.1 Write property test for barber deselection on unavailability
  - **Property 5: Barber Deselection on Unavailability**
  - **Validates: Requirements 2.3**
  - Generate random barber selections and time changes
  - Verify selection cleared when barber unavailable at new time
  - Run with minimum 100 iterations

- [ ]* 7.2 Write unit tests for barber deselection
  - Test barber selected, time changed to unavailable slot → barber cleared
  - Test barber selected, time changed to available slot → barber kept
  - Test state transitions and navigation
  - _Requirements: 2.3_

- [~] 8. Update form confirmation step
  - Ensure form step works with new flow order
  - Verify all required data is present: service, time, barber
  - Update back button navigation: form step → barber step
  - Maintain existing form validation and submission logic
  - _Requirements: 3.1_

- [~] 9. Update conflict validation in handleSubmit
  - Ensure `isTimeConflict()` is called with appointments for selected barber only
  - Verify conflict check uses correct service duration
  - Verify break checking for selected barber
  - Add validation that selected barber still exists and is visible
  - Handle concurrent booking conflicts with appropriate error messages
  - _Requirements: 3.1_

- [ ]* 9.1 Write integration tests for booking flow
  - Test complete flow: service → time → barber → confirm
  - Test concurrent booking conflict handling
  - Test error recovery scenarios
  - _Requirements: 1.1, 2.1, 2.3, 3.1_

- [~] 10. Update realtime subscription
  - Remove barber_id filter from realtime subscription
  - Listen for all appointment changes (not just selected barber)
  - Update debounced slot loading to recalculate for all barbers
  - Test that availability updates correctly when other users book
  - _Requirements: 1.1_

- [~] 11. Add performance optimizations
  - Implement parallel queries using `Promise.all()` for barber data
  - Add memoization for barber list using `useRef`
  - Ensure debouncing is working for realtime updates (500ms)
  - Add loading states during availability calculations
  - Test performance with realistic data (3 barbers, 30 slots, 20 appointments)
  - _Requirements: 1.1, 2.1_

- [~] 12. Update error handling
  - Add error handling for "no barbers available" scenario
  - Add error handling for "selected barber becomes unavailable"
  - Add error handling for concurrent booking conflicts
  - Add error handling for database query failures
  - Ensure backward compatibility with missing breaks table
  - Test all error scenarios and user feedback messages
  - _Requirements: 2.1, 2.3, 3.1_

- [~] 13. Checkpoint - Ensure all tests pass
  - Run all unit tests and verify they pass
  - Run all property-based tests and verify they pass
  - Test complete booking flow manually
  - Test error scenarios manually
  - Verify performance meets targets (< 500ms slot loading)
  - Ask the user if questions arise

- [~] 14. Update UI/UX polish
  - Add availability count indicator to time slot buttons
  - Add visual feedback for loading states
  - Add empty state messages for no available slots
  - Add empty state messages for no available barbers
  - Ensure smooth transitions between steps
  - Test responsive design on mobile devices
  - _Requirements: 2.4_

- [~] 15. Final testing and validation
  - Test with multiple concurrent users
  - Test with various service durations (15, 30, 45, 60 minutes)
  - Test with barber breaks at different times
  - Test with barbers having different weekly schedules
  - Test backward compatibility with existing appointments
  - Verify no regressions in existing functionality
  - _Requirements: 1.1, 1.3, 1.4, 2.1, 2.3, 2.4, 3.1_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties with minimum 100 iterations
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows
- Performance target: < 500ms to load available slots
- Backward compatibility maintained with existing appointments and data
