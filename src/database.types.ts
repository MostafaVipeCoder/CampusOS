export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: "14.1"
    }
    public: {
        Tables: {
            branches: {
                Row: {
                    address: string | null
                    code: string
                    created_at: string | null
                    email: string | null
                    id: string
                    is_active: boolean | null
                    name: string
                    phone: string | null
                    settings: Json | null
                    updated_at: string | null
                }
                Insert: {
                    address?: string | null
                    code: string
                    created_at?: string | null
                    email?: string | null
                    id?: string
                    is_active?: boolean | null
                    name: string
                    phone?: string | null
                    settings?: Json | null
                    updated_at?: string | null
                }
                Update: {
                    address?: string | null
                    code?: string
                    created_at?: string | null
                    email?: string | null
                    id?: string
                    is_active?: boolean | null
                    name?: string
                    phone?: string | null
                    settings?: Json | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            customers: {
                Row: {
                    birth_date: string | null
                    code: string
                    created_at: string | null
                    email: string | null
                    full_name: string
                    gender: string | null
                    home_branch_id: string | null
                    id: string
                    is_active: boolean | null
                    phone: string
                    qr_code: string | null
                    referral_source: string | null
                    updated_at: string | null
                }
                Insert: {
                    birth_date?: string | null
                    code: string
                    created_at?: string | null
                    email?: string | null
                    full_name: string
                    gender?: string | null
                    home_branch_id?: string | null
                    id?: string
                    is_active?: boolean | null
                    phone: string
                    qr_code?: string | null
                    referral_source?: string | null
                    updated_at?: string | null
                }
                Update: {
                    birth_date?: string | null
                    code?: string
                    created_at?: string | null
                    email?: string | null
                    full_name?: string
                    gender?: string | null
                    home_branch_id?: string | null
                    id?: string
                    is_active?: boolean | null
                    phone?: string
                    qr_code?: string | null
                    referral_source?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "customers_home_branch_id_fkey"
                        columns: ["home_branch_id"]
                        isOneToOne: false
                        referencedRelation: "branches"
                        referencedColumns: ["id"]
                    },
                ]
            }
            employees: {
                Row: {
                    branch_id: string | null
                    created_at: string | null
                    email: string
                    full_name: string
                    id: string
                    is_active: boolean | null
                    phone: string | null
                    role: string
                    updated_at: string | null
                }
                Insert: {
                    branch_id?: string | null
                    created_at?: string | null
                    email: string
                    full_name: string
                    id: string
                    is_active?: boolean | null
                    phone?: string | null
                    role: string
                    updated_at?: string | null
                }
                Update: {
                    branch_id?: string | null
                    created_at?: string | null
                    email?: string
                    full_name?: string
                    id?: string
                    is_active?: boolean | null
                    phone?: string | null
                    role?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "employees_branch_id_fkey"
                        columns: ["branch_id"]
                        isOneToOne: false
                        referencedRelation: "branches"
                        referencedColumns: ["id"]
                    },
                ]
            }
            profiles: {
                Row: {
                    created_at: string | null
                    email: string | null
                    full_name: string | null
                    id: string
                    is_verified: boolean | null
                    updated_at: string | null
                    verification_code: string | null
                }
                Insert: {
                    created_at?: string | null
                    email?: string | null
                    full_name?: string | null
                    id: string
                    is_verified?: boolean | null
                    updated_at?: string | null
                    verification_code?: string | null
                }
                Update: {
                    created_at?: string | null
                    email?: string | null
                    full_name?: string | null
                    id?: string
                    is_verified?: boolean | null
                    updated_at?: string | null
                    verification_code?: string | null
                }
                Relationships: []
            }
            services: {
                Row: {
                    base_price: number
                    branch_id: string | null
                    created_at: string | null
                    currency: string | null
                    description: string | null
                    id: string
                    is_active: boolean | null
                    name: string
                    name_ar: string | null
                    service_type: string
                    updated_at: string | null
                }
                Insert: {
                    base_price: number
                    branch_id?: string | null
                    created_at?: string | null
                    currency?: string | null
                    description?: string | null
                    id?: string
                    is_active?: boolean | null
                    name: string
                    name_ar?: string | null
                    service_type: string
                    updated_at?: string | null
                }
                Update: {
                    base_price?: number
                    branch_id?: string | null
                    created_at?: string | null
                    currency?: string | null
                    description?: string | null
                    id?: string
                    is_active?: boolean | null
                    name?: string
                    name_ar?: string | null
                    service_type?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "services_branch_id_fkey"
                        columns: ["branch_id"]
                        isOneToOne: false
                        referencedRelation: "branches"
                        referencedColumns: ["id"]
                    },
                ]
            }
            visits: {
                Row: {
                    base_fee: number
                    branch_id: string | null
                    check_in: string
                    check_out: string | null
                    created_at: string | null
                    created_by: string | null
                    customer_id: string | null
                    discount_amount: number | null
                    discount_percentage: number | null
                    duration_minutes: number | null
                    id: string
                    notes: string | null
                    paid_amount: number | null
                    payment_method: string | null
                    payment_status: string | null
                    service_id: string | null
                    status: string | null
                    total_fee: number
                    updated_at: string | null
                }
                Insert: {
                    base_fee: number
                    branch_id?: string | null
                    check_in?: string
                    check_out?: string | null
                    created_at?: string | null
                    created_by?: string | null
                    customer_id?: string | null
                    discount_amount?: number | null
                    discount_percentage?: number | null
                    duration_minutes?: number | null
                    id?: string
                    notes?: string | null
                    paid_amount?: number | null
                    payment_method?: string | null
                    payment_status?: string | null
                    service_id?: string | null
                    status?: string | null
                    total_fee: number
                    updated_at?: string | null
                }
                Update: {
                    base_fee?: number
                    branch_id?: string | null
                    check_in?: string
                    check_out?: string | null
                    created_at?: string | null
                    created_by?: string | null
                    customer_id?: string | null
                    discount_amount?: number | null
                    discount_percentage?: number | null
                    duration_minutes?: number | null
                    id?: string
                    notes?: string | null
                    paid_amount?: number | null
                    payment_method?: string | null
                    payment_status?: string | null
                    service_id?: string | null
                    status?: string | null
                    total_fee?: number
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "visits_branch_id_fkey"
                        columns: ["branch_id"]
                        isOneToOne: false
                        referencedRelation: "branches"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "visits_customer_id_fkey"
                        columns: ["customer_id"]
                        isOneToOne: false
                        referencedRelation: "customers"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "visits_service_id_fkey"
                        columns: ["service_id"]
                        isOneToOne: false
                        referencedRelation: "services"
                        referencedColumns: ["id"]
                    },
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
    DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never

export type TablesInsert<
    DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
    }
    ? I
    : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
    }
    ? I
    : never
    : never

export type TablesUpdate<
    DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
    }
    ? U
    : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
    }
    ? U
    : never
    : never

export type Enums<
    DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
    EnumName extends DefaultSchemaEnumNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
    public: {
        Enums: {},
    },
} as const
