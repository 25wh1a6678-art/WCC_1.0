'use client';

import React from 'react';
import { TaskFilterOptions, TaskPriority, TaskStatus } from '@/types/task';
import { Search } from 'lucide-react';

interface TaskFilterProps {
  filter: TaskFilterOptions;
  onChange: (filter: TaskFilterOptions) => void;
  counts: {
    all: number;
    pending: number;
    in_progress: number;
    completed: number;
  };
}

export function TaskFilter({ filter, onChange, counts }: TaskFilterProps) {
  const statusTabs: { id: TaskStatus | 'all'; label: string; count: number }[] = [
    { id: 'all', label: 'All Tasks', count: counts.all },
    { id: 'pending', label: 'Pending', count: counts.pending },
    { id: 'in_progress', label: 'In Progress', count: counts.in_progress },
    { id: 'completed', label: 'Completed', count: counts.completed },
  ];

  return (
    <div className="space-y-4">
      {/* Status tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {statusTabs.map((tab) => {
          const isActive = filter.status === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange({ ...filter, status: tab.id })}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  isActive
                    ? 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and search controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={filter.searchQuery || ''}
            onChange={(e) => onChange({ ...filter, searchQuery: e.target.value })}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          />
        </div>

        {/* Priority & Sorting */}
        <div className="flex items-center gap-2">
          {/* Priority filter */}
          <select
            value={filter.priority || 'all'}
            onChange={(e) =>
              onChange({
                ...filter,
                priority: e.target.value as TaskPriority | 'all',
              })
            }
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Sort order */}
          <select
            value={`${filter.sortBy || 'created_at'}-${filter.sortOrder || 'desc'}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-') as [
                TaskFilterOptions['sortBy'],
                TaskFilterOptions['sortOrder']
              ];
              onChange({ ...filter, sortBy, sortOrder });
            }}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          >
            <option value="created_at-desc">Newest First</option>
            <option value="created_at-asc">Oldest First</option>
            <option value="deadline-asc">Deadline (Soonest)</option>
            <option value="estimated_minutes-asc">Duration (Shortest)</option>
            <option value="estimated_minutes-desc">Duration (Longest)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
