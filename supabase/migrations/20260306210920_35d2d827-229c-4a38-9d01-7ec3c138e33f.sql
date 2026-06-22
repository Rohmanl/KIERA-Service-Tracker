
-- Fix profiles policies: drop restrictive, recreate as permissive
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Fix admin_adjustments policies
DROP POLICY IF EXISTS "Admins can insert adjustments" ON public.admin_adjustments;
DROP POLICY IF EXISTS "Admins can view all adjustments" ON public.admin_adjustments;

CREATE POLICY "Admins can insert adjustments" ON public.admin_adjustments FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = admin_id);
CREATE POLICY "Admins can view all adjustments" ON public.admin_adjustments FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Fix volunteer_hours policies
DROP POLICY IF EXISTS "Admins can update all hours" ON public.volunteer_hours;
DROP POLICY IF EXISTS "Admins can view all hours" ON public.volunteer_hours;
DROP POLICY IF EXISTS "Users can submit their own hours" ON public.volunteer_hours;
DROP POLICY IF EXISTS "Users can update their pending hours" ON public.volunteer_hours;
DROP POLICY IF EXISTS "Users can view their own hours" ON public.volunteer_hours;

CREATE POLICY "Admins can update all hours" ON public.volunteer_hours FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all hours" ON public.volunteer_hours FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can submit their own hours" ON public.volunteer_hours FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending' AND admin_notes IS NULL AND reviewed_by IS NULL AND reviewed_at IS NULL);
CREATE POLICY "Users can update their pending hours" ON public.volunteer_hours FOR UPDATE USING (auth.uid() = user_id AND status = 'pending') WITH CHECK (auth.uid() = user_id AND status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL AND admin_notes IS NULL);
CREATE POLICY "Users can view their own hours" ON public.volunteer_hours FOR SELECT USING (auth.uid() = user_id);

-- Fix user_roles policies
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Fix user_achievements policies
DROP POLICY IF EXISTS "Users can insert their own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can view their own achievements" ON public.user_achievements;

CREATE POLICY "Users can insert their own achievements" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
