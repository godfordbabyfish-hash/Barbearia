-- This function is an internal trigger and must not be exposed as a Data API RPC.
revoke execute on function public.prevent_overlapping_barber_appointments() from public;
revoke execute on function public.prevent_overlapping_barber_appointments() from anon;
revoke execute on function public.prevent_overlapping_barber_appointments() from authenticated;
