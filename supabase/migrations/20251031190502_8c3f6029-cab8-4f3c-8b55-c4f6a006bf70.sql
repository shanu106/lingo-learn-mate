-- Create a secure function to assign admin role during signup
CREATE OR REPLACE FUNCTION public.assign_admin_role(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow if the user doesn't already have a role
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'admin');
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.assign_admin_role(uuid) TO authenticated;