-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table for secure role management
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles (admins only)
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- System Instructions table
CREATE TABLE public.system_instructions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.system_instructions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read system instructions"
ON public.system_instructions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update system instructions"
ON public.system_instructions FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Insert default system instructions row
INSERT INTO public.system_instructions (content) VALUES ('You are a helpful Discord assistant. Be friendly, concise, and helpful.');

-- Allowed Channels table
CREATE TABLE public.allowed_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id TEXT NOT NULL UNIQUE,
    channel_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.allowed_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage allowed channels"
ON public.allowed_channels FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Conversation Memory table
CREATE TABLE public.conversation_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    summary TEXT NOT NULL DEFAULT '',
    message_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read memory"
ON public.conversation_memory FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update memory"
ON public.conversation_memory FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete memory"
ON public.conversation_memory FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Insert default memory row
INSERT INTO public.conversation_memory (summary) VALUES ('');

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for auto-updating timestamps
CREATE TRIGGER update_system_instructions_updated_at
BEFORE UPDATE ON public.system_instructions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversation_memory_updated_at
BEFORE UPDATE ON public.conversation_memory
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();