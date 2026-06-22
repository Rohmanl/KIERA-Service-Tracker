-- Create trigger to update total_hours when volunteer hours status changes
CREATE TRIGGER on_volunteer_hours_status_change
  AFTER INSERT OR UPDATE ON public.volunteer_hours
  FOR EACH ROW
  EXECUTE FUNCTION public.update_total_hours();