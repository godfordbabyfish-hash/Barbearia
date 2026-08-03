create index managerial_financial_closures_reopened_by_idx
  on public.managerial_financial_closures (reopened_by)
  where reopened_by is not null;
