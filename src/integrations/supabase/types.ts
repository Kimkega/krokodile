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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      ads: {
        Row: {
          ad_code: string
          advertiser_name: string
          amount: number
          body: string | null
          checkout_request_id: string | null
          created_at: string
          days: number
          email: string
          ends_at: string | null
          id: string
          image_url: string | null
          merchant_request_id: string | null
          mpesa_receipt: string | null
          payment_message: string | null
          payment_status: string
          phone: string
          placement: string
          starts_at: string | null
          status: string
          target_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          ad_code: string
          advertiser_name: string
          amount?: number
          body?: string | null
          checkout_request_id?: string | null
          created_at?: string
          days?: number
          email: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          merchant_request_id?: string | null
          mpesa_receipt?: string | null
          payment_message?: string | null
          payment_status?: string
          phone: string
          placement?: string
          starts_at?: string | null
          status?: string
          target_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          ad_code?: string
          advertiser_name?: string
          amount?: number
          body?: string | null
          checkout_request_id?: string | null
          created_at?: string
          days?: number
          email?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          merchant_request_id?: string | null
          mpesa_receipt?: string | null
          payment_message?: string | null
          payment_status?: string
          phone?: string
          placement?: string
          starts_at?: string | null
          status?: string
          target_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      certificates: {
        Row: {
          buyer_name: string | null
          code: string
          created_at: string
          id: string
          issued_to: string | null
          last_scanned_at: string | null
          notes: string | null
          order_code: string | null
          order_id: string | null
          paid_at: string | null
          product_id: string | null
          product_name: string | null
          scans: number
          serial: string | null
          status: string
        }
        Insert: {
          buyer_name?: string | null
          code: string
          created_at?: string
          id?: string
          issued_to?: string | null
          last_scanned_at?: string | null
          notes?: string | null
          order_code?: string | null
          order_id?: string | null
          paid_at?: string | null
          product_id?: string | null
          product_name?: string | null
          scans?: number
          serial?: string | null
          status?: string
        }
        Update: {
          buyer_name?: string | null
          code?: string
          created_at?: string
          id?: string
          issued_to?: string | null
          last_scanned_at?: string | null
          notes?: string | null
          order_code?: string | null
          order_id?: string | null
          paid_at?: string | null
          product_id?: string | null
          product_name?: string | null
          scans?: number
          serial?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      couriers: {
        Row: {
          active: boolean
          created_at: string
          id: string
          kind: string
          name: string
          notes: string | null
          phone: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          kind?: string
          name: string
          notes?: string | null
          phone?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          kind?: string
          name?: string
          notes?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string
          created_at: string
          enabled: boolean
          id: string
          key: string
          label: string
          subject: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          enabled?: boolean
          id?: string
          key: string
          label: string
          subject: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          enabled?: boolean
          id?: string
          key?: string
          label?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      mpesa_config: {
        Row: {
          account_reference: string | null
          callback_url: string | null
          consumer_key: string | null
          consumer_secret: string | null
          enabled: boolean
          environment: string
          id: string
          party_b: string | null
          passkey: string | null
          paybill: string | null
          short_code: string | null
          updated_at: string
        }
        Insert: {
          account_reference?: string | null
          callback_url?: string | null
          consumer_key?: string | null
          consumer_secret?: string | null
          enabled?: boolean
          environment?: string
          id?: string
          party_b?: string | null
          passkey?: string | null
          paybill?: string | null
          short_code?: string | null
          updated_at?: string
        }
        Update: {
          account_reference?: string | null
          callback_url?: string | null
          consumer_key?: string | null
          consumer_secret?: string | null
          enabled?: boolean
          environment?: string
          id?: string
          party_b?: string | null
          passkey?: string | null
          paybill?: string | null
          short_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      order_events: {
        Row: {
          created_at: string
          id: string
          note: string | null
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          name: string
          order_id: string
          product_id: string | null
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          order_id: string
          product_id?: string | null
          quantity?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_notes: string | null
          admin_notes: string | null
          checkout_request_id: string | null
          county: string | null
          courier_contact: string | null
          courier_id: string | null
          created_at: string
          customer_name: string
          delivery_note_no: string | null
          email: string
          id: string
          merchant_request_id: string | null
          mpesa_receipt: string | null
          order_code: string
          payment_message: string | null
          payment_method: string
          payment_status: string
          phone: string
          shipping_fee: number
          status: string
          sub_county: string | null
          subtotal: number
          total: number
          town: string | null
          tracking_ref: string | null
          updated_at: string
          ward: string | null
        }
        Insert: {
          address_notes?: string | null
          admin_notes?: string | null
          checkout_request_id?: string | null
          county?: string | null
          courier_contact?: string | null
          courier_id?: string | null
          created_at?: string
          customer_name: string
          delivery_note_no?: string | null
          email: string
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt?: string | null
          order_code: string
          payment_message?: string | null
          payment_method?: string
          payment_status?: string
          phone: string
          shipping_fee?: number
          status?: string
          sub_county?: string | null
          subtotal?: number
          total?: number
          town?: string | null
          tracking_ref?: string | null
          updated_at?: string
          ward?: string | null
        }
        Update: {
          address_notes?: string | null
          admin_notes?: string | null
          checkout_request_id?: string | null
          county?: string | null
          courier_contact?: string | null
          courier_id?: string | null
          created_at?: string
          customer_name?: string
          delivery_note_no?: string | null
          email?: string
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt?: string | null
          order_code?: string
          payment_message?: string | null
          payment_method?: string
          payment_status?: string
          phone?: string
          shipping_fee?: number
          status?: string
          sub_county?: string | null
          subtotal?: number
          total?: number
          town?: string | null
          tracking_ref?: string | null
          updated_at?: string
          ward?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          category_id: string | null
          colors: string[]
          compare_at_price: number | null
          created_at: string
          description: string | null
          featured: boolean
          id: string
          low_stock_threshold: number
          material: string | null
          name: string
          price: number
          slug: string
          stock: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          colors?: string[]
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          low_stock_threshold?: number
          material?: string | null
          name: string
          price?: number
          slug: string
          stock?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          colors?: string[]
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          low_stock_threshold?: number
          material?: string | null
          name?: string
          price?: number
          slug?: string
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_zones: {
        Row: {
          county: string
          created_at: string
          eta: string | null
          fee: number
          id: string
        }
        Insert: {
          county: string
          created_at?: string
          eta?: string | null
          fee?: number
          id?: string
        }
        Update: {
          county?: string
          created_at?: string
          eta?: string | null
          fee?: number
          id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          courier_contact_note: string | null
          facebook_url: string | null
          free_shipping_threshold: number
          id: string
          instagram_url: string | null
          logo_url: string | null
          public_base_url: string | null
          site_name: string
          tagline: string | null
          tiktok_url: string | null
          updated_at: string
          whatsapp_number: string | null
          whatsapp_template: string | null
          x_url: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          courier_contact_note?: string | null
          facebook_url?: string | null
          free_shipping_threshold?: number
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          public_base_url?: string | null
          site_name?: string
          tagline?: string | null
          tiktok_url?: string | null
          updated_at?: string
          whatsapp_number?: string | null
          whatsapp_template?: string | null
          x_url?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          courier_contact_note?: string | null
          facebook_url?: string | null
          free_shipping_threshold?: number
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          public_base_url?: string | null
          site_name?: string
          tagline?: string | null
          tiktok_url?: string | null
          updated_at?: string
          whatsapp_number?: string | null
          whatsapp_template?: string | null
          x_url?: string | null
        }
        Relationships: []
      }
      smtp_config: {
        Row: {
          created_at: string
          enabled: boolean
          from_email: string | null
          from_name: string | null
          host: string | null
          id: string
          password: string | null
          port: number
          reply_to: string | null
          secure: boolean
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          from_email?: string | null
          from_name?: string | null
          host?: string | null
          id?: string
          password?: string | null
          port?: number
          reply_to?: string | null
          secure?: boolean
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean
          from_email?: string | null
          from_name?: string | null
          host?: string | null
          id?: string
          password?: string | null
          port?: number
          reply_to?: string | null
          secure?: boolean
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "user"
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
    Enums: {
      app_role: ["admin", "staff", "user"],
    },
  },
} as const
