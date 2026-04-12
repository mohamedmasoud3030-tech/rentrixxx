CREATE OR REPLACE FUNCTION public.prevent_notification_deletion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Notifications cannot be deleted.';
  END IF;
  RETURN NEW;
END;
$$;
