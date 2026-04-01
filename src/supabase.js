import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://rxdmednzimtbedhhlwee.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4ZG1lZG56aW10YmVkaGhsd2VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NTQ4NjMsImV4cCI6MjA5MDUzMDg2M30.AaECCcW_YiFgfGh0UWjZLEZoY-yT_JX-9JG6j5DCuVg";

export const supabase = createClient(supabaseUrl, supabaseKey);