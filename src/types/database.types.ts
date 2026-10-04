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
      daily_reflections: {
        Row: {
          id: string;
          user_id: string;
          reflection_text: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reflection_text: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          reflection_text?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_reflections_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      commitments: {
        Row: {
          id: string;
          user_id: string;
          task_id: string;
          duration_minutes: number;
          status: 'scheduled' | 'active' | 'completed' | 'rescheduled' | 'abandoned';
          started_at: string;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          task_id: string;
          duration_minutes: number;
          status?: 'scheduled' | 'active' | 'completed' | 'rescheduled' | 'abandoned';
          started_at?: string;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          task_id?: string;
          duration_minutes?: number;
          status?: 'scheduled' | 'active' | 'completed' | 'rescheduled' | 'abandoned';
          started_at?: string;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "commitments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "commitments_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          }
        ];
      };
      focuscoin_wallets: {
        Row: {
          user_id: string;
          balance: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          balance?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          balance?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      streaks: {
        Row: {
          user_id: string;
          current_streak: number;
          longest_streak: number;
          last_success_date: string | null;
          recovery_passes: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          current_streak?: number;
          longest_streak?: number;
          last_success_date?: string | null;
          recovery_passes?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          current_streak?: number;
          longest_streak?: number;
          last_success_date?: string | null;
          recovery_passes?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      coin_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          transaction_type:
            | 'task_completion'
            | 'daily_bonus'
            | 'streak_bonus'
            | 'reward_purchase'
            | 'recovery_used';
          source_reference: string;
          description: string;
          balance_after: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          transaction_type:
            | 'task_completion'
            | 'daily_bonus'
            | 'streak_bonus'
            | 'reward_purchase'
            | 'recovery_used';
          source_reference: string;
          description: string;
          balance_after: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          transaction_type?:
            | 'task_completion'
            | 'daily_bonus'
            | 'streak_bonus'
            | 'reward_purchase'
            | 'recovery_used';
          source_reference?: string;
          description?: string;
          balance_after?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      reward_inventory: {
        Row: {
          id: string;
          user_id: string;
          reward_key: string;
          reward_name: string;
          reward_type: 'break_pass' | 'theme' | 'streak_recovery_pass' | 'badge';
          purchased_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reward_key: string;
          reward_name: string;
          reward_type: 'break_pass' | 'theme' | 'streak_recovery_pass' | 'badge';
          purchased_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          reward_key?: string;
          reward_name?: string;
          reward_type?: 'break_pass' | 'theme' | 'streak_recovery_pass' | 'badge';
          purchased_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      complete_commitment_with_rewards: {
        Args: {
          p_commitment_id: string;
          p_auto_complete_task?: boolean;
        };
        Returns: Json;
      };
      purchase_focus_reward: {
        Args: {
          p_reward_key: string;
        };
        Returns: Json;
      };
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
