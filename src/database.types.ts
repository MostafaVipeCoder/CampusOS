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
      bookings: {
        Row: {
          attendees: number | null
          booking_date: string
          branch_id: string | null
          created_at: string | null
          customer_id: string | null
          duration: number
          extras: Json | null
          id: string
          service_id: string | null
          start_time: number
          status: string | null
          type: string | null
          updated_at: string | null
          user_code: string | null
          user_name: string | null
        }
        Insert: {
          attendees?: number | null
          booking_date: string
          branch_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          duration: number
          extras?: Json | null
          id?: string
          service_id?: string | null
          start_time: number
          status?: string | null
          type?: string | null
          updated_at?: string | null
          user_code?: string | null
          user_name?: string | null
        }
        Update: {
          attendees?: number | null
          booking_date?: string
          branch_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          duration?: number
          extras?: Json | null
          id?: string
          service_id?: string | null
          start_time?: number
          status?: string | null
          type?: string | null
          updated_at?: string | null
          user_code?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_activities: {
        Row: {
          activity_date: string
          branch_id: string | null
          created_at: string
          description: string | null
          id: string
          location: string | null
          name: string
          status: string | null
          target_type: string | null
          target_value: string | null
          updated_at: string
        }
        Insert: {
          activity_date: string
          branch_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          name: string
          status?: string | null
          target_type?: string | null
          target_value?: string | null
          updated_at?: string
        }
        Update: {
          activity_date?: string
          branch_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          name?: string
          status?: string | null
          target_type?: string | null
          target_value?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_activities_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
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
      catering_items: {
        Row: {
          branch_id: string | null
          category: string | null
          created_at: string | null
          id: string
          inventory_id: string | null
          is_active: boolean | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          inventory_id?: string | null
          is_active?: boolean | null
          name: string
          price?: number
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          inventory_id?: string | null
          is_active?: boolean | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catering_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catering_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          branch_id: string | null
          cashback: number | null
          conditions_partner: string[] | null
          conditions_us: string[] | null
          created_at: string | null
          discount: string | null
          end_date: string | null
          id: string
          members: number | null
          partner_name: string
          start_date: string | null
          status: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          cashback?: number | null
          conditions_partner?: string[] | null
          conditions_us?: string[] | null
          created_at?: string | null
          discount?: string | null
          end_date?: string | null
          id?: string
          members?: number | null
          partner_name: string
          start_date?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          cashback?: number | null
          conditions_partner?: string[] | null
          conditions_us?: string[] | null
          created_at?: string | null
          discount?: string | null
          end_date?: string | null
          id?: string
          members?: number | null
          partner_name?: string
          start_date?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          birth_date: string | null
          code: string
          created_at: string | null
          email: string | null
          email_error: string | null
          email_status: string | null
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
          email_error?: string | null
          email_status?: string | null
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
          email_error?: string | null
          email_status?: string | null
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
      inventory: {
        Row: {
          branch_id: string | null
          created_at: string | null
          id: string
          last_restock: string | null
          min_stock: number | null
          name: string
          stock: number | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          last_restock?: string | null
          min_stock?: number | null
          name: string
          stock?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          last_restock?: string | null
          min_stock?: number | null
          name?: string
          stock?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_branch_id_fkey"
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
          capacity: number | null
          category: string | null
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
          capacity?: number | null
          category?: string | null
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
          capacity?: number | null
          category?: string | null
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
      settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          branch_id: string | null
          created_at: string | null
          customer_id: string | null
          end_date: string | null
          id: string
          paid: number | null
          price: number | null
          remaining: number | null
          start_date: string | null
          status: string | null
          total_hours: number | null
          type: string
          updated_at: string | null
          used_hours: number | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          end_date?: string | null
          id?: string
          paid?: number | null
          price?: number | null
          remaining?: number | null
          start_date?: string | null
          status?: string | null
          total_hours?: number | null
          type: string
          updated_at?: string | null
          used_hours?: number | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          end_date?: string | null
          id?: string
          paid?: number | null
          price?: number | null
          remaining?: number | null
          start_date?: string | null
          status?: string | null
          total_hours?: number | null
          type?: string
          updated_at?: string | null
          used_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_orders: {
        Row: {
          catering_item_id: string | null
          created_at: string | null
          id: string
          quantity: number | null
          total_price: number
          unit_price: number
          visit_id: string | null
        }
        Insert: {
          catering_item_id?: string | null
          created_at?: string | null
          id?: string
          quantity?: number | null
          total_price: number
          unit_price: number
          visit_id?: string | null
        }
        Update: {
          catering_item_id?: string | null
          created_at?: string | null
          id?: string
          quantity?: number | null
          total_price?: number
          unit_price?: number
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_orders_catering_item_id_fkey"
            columns: ["catering_item_id"]
            isOneToOne: false
            referencedRelation: "catering_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_orders_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
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
