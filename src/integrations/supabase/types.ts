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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      notas_fornecedores: {
        Row: {
          criado_em: string
          descricao: string | null
          fornecedor: string
          id: string
          retiro_id: string
          status: string
          valor: number
        }
        Insert: {
          criado_em?: string
          descricao?: string | null
          fornecedor: string
          id?: string
          retiro_id: string
          status?: string
          valor?: number
        }
        Update: {
          criado_em?: string
          descricao?: string | null
          fornecedor?: string
          id?: string
          retiro_id?: string
          status?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "notas_fornecedores_retiro_id_fkey"
            columns: ["retiro_id"]
            isOneToOne: false
            referencedRelation: "retiros"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoas: {
        Row: {
          created_at: string
          id: string
          nome: string
          retiro_id: string
          setor: string | null
          telefone: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          retiro_id: string
          setor?: string | null
          telefone?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          retiro_id?: string
          setor?: string | null
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pessoas_retiro_id_fkey"
            columns: ["retiro_id"]
            isOneToOne: false
            referencedRelation: "retiros"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          created_at: string
          fornecedor: string
          id: string
          nome: string
          retiro_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          fornecedor: string
          id?: string
          nome: string
          retiro_id: string
          valor?: number
        }
        Update: {
          created_at?: string
          fornecedor?: string
          id?: string
          nome?: string
          retiro_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "produtos_retiro_id_fkey"
            columns: ["retiro_id"]
            isOneToOne: false
            referencedRelation: "retiros"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          username: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          username: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          username?: string
        }
        Relationships: []
      }
      retiro_membros: {
        Row: {
          created_at: string
          id: string
          retiro_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          retiro_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          retiro_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "retiro_membros_retiro_id_fkey"
            columns: ["retiro_id"]
            isOneToOne: false
            referencedRelation: "retiros"
            referencedColumns: ["id"]
          },
        ]
      }
      retiros: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          criado_em: string
          fornecedor: string
          id: string
          pessoa_id: string
          produto_id: string
          produto_nome: string
          quantidade: number
          retiro_id: string
          status: string
          valor_total: number
          valor_unit: number
        }
        Insert: {
          criado_em?: string
          fornecedor: string
          id?: string
          pessoa_id: string
          produto_id: string
          produto_nome: string
          quantidade?: number
          retiro_id: string
          status?: string
          valor_total?: number
          valor_unit?: number
        }
        Update: {
          criado_em?: string
          fornecedor?: string
          id?: string
          pessoa_id?: string
          produto_id?: string
          produto_nome?: string
          quantidade?: number
          retiro_id?: string
          status?: string
          valor_total?: number
          valor_unit?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_retiro_id_fkey"
            columns: ["retiro_id"]
            isOneToOne: false
            referencedRelation: "retiros"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_retiro: {
        Args: { _retiro_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
