const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://hzszxgprampctfzceghs.supabase.co";

const supabaseKey = "sb_publishable_QmYjcsF7pzwqV6GBVfYIVA_pfgN9COa";

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;