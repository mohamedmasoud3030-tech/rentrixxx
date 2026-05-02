drop trigger if exists before_contract_hard_delete on public.contracts;
create trigger before_contract_hard_delete
before delete on public.contracts
for each row
execute function public.guard_contract_delete();
