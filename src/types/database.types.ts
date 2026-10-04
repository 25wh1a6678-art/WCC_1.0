export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string | null;
          email: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          email?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          email?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          priority: 'low' | 'medium' | 'high' | 'urgent';
          estimated_minutes: number;
          deadline: string | null;
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          estimated_minutes?: number;
          deadline?: string | null;
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          estimated_minutes?: number;
          deadline?: string | null;
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      task_priority: 'low' | 'medium' | 'high' | 'urgent';
      task_status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
