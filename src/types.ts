export type TaskType = 'IO' | 'CPU';
export type TaskStatus = 'QUEUED' | 'RUNNING' | 'WAITING_IO' | 'DONE';

export interface Task {
  id: string;
  type: TaskType;
  progress: number;
  status: TaskStatus;
  ioWaitTime?: number; // For simulating IO wait duration
}

export interface Worker {
  id: number;
  currentTask: Task | null;
  isBlocked?: boolean; // For thread lock contention
}

export interface LaneState {
  workers: Worker[];
  globalQueue: Task[];
  localQueues?: Task[][]; // For Goroutine work stealing
  waitingIO: Task[]; // For Coroutine
  memoryUsage?: number; // For Process visualization
  completedTasks: number;
}

export type ConcurrencyModel = 'process' | 'thread' | 'coroutine' | 'goroutine';
