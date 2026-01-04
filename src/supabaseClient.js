import { createClient } from '@supabase/supabase-js';

// Supabase конфигурация
const supabaseUrl = 'https://bnfigclshxuarnryvhma.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJuZmlnY2xzaHh1YXJucnl2aG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjI2OTIsImV4cCI6MjA4MzA5ODY5Mn0.A1deCDeuRkz9X8RuIcB9RB28JPqnZ654fiXLfpeTCow';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Пароль для входа в приложение
export const APP_PASSWORD = 'krasotka11';

