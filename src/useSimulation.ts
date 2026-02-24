import { useState, useEffect, useCallback } from 'react';
import { Task, Worker, LaneState, TaskType } from './types';

const TICK_INTERVAL = 100; // ms per tick
const IO_PROGRESS_SPEED = 20; // IO tasks complete quickly
const CPU_PROGRESS_SPEED = 2; // CPU tasks are slow
const IO_WAIT_TICKS = 10; // Number of ticks to wait for IO completion
const NUM_WORKERS = 4;

export function useSimulation() {
  const [isRunning, setIsRunning] = useState(false);
  const [processLane, setProcessLane] = useState<LaneState>(createInitialLane());
  const [threadLane, setThreadLane] = useState<LaneState>(createInitialLane());
  const [coroutineLane, setCoroutineLane] = useState<LaneState>(createInitialLane(1)); // Only 1 worker
  const [goroutineLane, setGoroutineLane] = useState<LaneState>(createInitialLane(NUM_WORKERS, true)); // With local queues

  function createInitialLane(workerCount: number = NUM_WORKERS, withLocalQueues: boolean = false): LaneState {
    const workers: Worker[] = Array.from({ length: workerCount }, (_, i) => ({
      id: i,
      currentTask: null,
    }));

    return {
      workers,
      globalQueue: [],
      localQueues: withLocalQueues ? Array.from({ length: workerCount }, () => []) : undefined,
      waitingIO: [],
      memoryUsage: 0,
      completedTasks: 0,
    };
  }

  const spawnIOTasks = useCallback((count: number = 20) => {
    const newTasks: Task[] = Array.from({ length: count }, (_, i) => ({
      id: `io-${Date.now()}-${i}`,
      type: 'IO' as TaskType,
      progress: 0,
      status: 'QUEUED' as const,
    }));

    setProcessLane(prev => ({ ...prev, globalQueue: [...prev.globalQueue, ...newTasks] }));
    setThreadLane(prev => ({ ...prev, globalQueue: [...prev.globalQueue, ...newTasks] }));
    setCoroutineLane(prev => ({ ...prev, globalQueue: [...prev.globalQueue, ...newTasks] }));
    
    // For Goroutine, distribute evenly across local queues
    setGoroutineLane(prev => {
      const localQueues = prev.localQueues!.map(q => [...q]);
      newTasks.forEach((task, idx) => {
        const queueIdx = idx % NUM_WORKERS;
        localQueues[queueIdx].push(task);
      });
      return { ...prev, localQueues };
    });
  }, []);

  const injectCPUTask = useCallback(() => {
    const cpuTask: Task = {
      id: `cpu-${Date.now()}`,
      type: 'CPU',
      progress: 0,
      status: 'QUEUED',
    };

    setProcessLane(prev => ({ ...prev, globalQueue: [...prev.globalQueue, cpuTask] }));
    setThreadLane(prev => ({ ...prev, globalQueue: [...prev.globalQueue, cpuTask] }));
    setCoroutineLane(prev => ({ ...prev, globalQueue: [...prev.globalQueue, cpuTask] }));
    
    // For Goroutine, add to first worker's local queue
    setGoroutineLane(prev => {
      const localQueues = prev.localQueues!.map(q => [...q]);
      localQueues[0].push(cpuTask);
      return { ...prev, localQueues };
    });
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setProcessLane(createInitialLane());
    setThreadLane(createInitialLane());
    setCoroutineLane(createInitialLane(1));
    setGoroutineLane(createInitialLane(NUM_WORKERS, true));
  }, []);

  // Simulation tick
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      // Update Process Lane
      setProcessLane(prev => updateProcessLane(prev));
      
      // Update Thread Lane
      setThreadLane(prev => updateThreadLane(prev));
      
      // Update Coroutine Lane
      setCoroutineLane(prev => updateCoroutineLane(prev));
      
      // Update Goroutine Lane
      setGoroutineLane(prev => updateGoroutineLane(prev));
    }, TICK_INTERVAL);

    return () => clearInterval(interval);
  }, [isRunning]);

  return {
    isRunning,
    setIsRunning,
    processLane,
    threadLane,
    coroutineLane,
    goroutineLane,
    spawnIOTasks,
    injectCPUTask,
    reset,
  };
}

// Lane 1: Process (Multi-Process) - Blocking IO
function updateProcessLane(lane: LaneState): LaneState {
  const workers = lane.workers.map(w => ({ ...w }));
  let globalQueue = [...lane.globalQueue];
  let completedTasks = lane.completedTasks;
  let memoryUsage = lane.memoryUsage || 0;

  workers.forEach(worker => {
    if (worker.currentTask) {
      const task = { ...worker.currentTask };
      
      if (task.type === 'IO') {
        // IO task: quick progress, then wait
        if (task.progress < 30) {
          task.progress += IO_PROGRESS_SPEED;
        } else if (task.ioWaitTime === undefined) {
          // Start waiting
          task.status = 'WAITING_IO';
          task.ioWaitTime = IO_WAIT_TICKS;
        } else if (task.ioWaitTime > 0) {
          // Worker is blocked waiting for IO
          task.ioWaitTime--;
        } else {
          // IO complete
          task.progress = 100;
          task.status = 'DONE';
        }
      } else {
        // CPU task: slow progress, blocks worker
        task.progress += CPU_PROGRESS_SPEED;
        if (task.progress >= 100) {
          task.progress = 100;
          task.status = 'DONE';
        }
      }

      if (task.status === 'DONE') {
        worker.currentTask = null;
        completedTasks++;
      } else {
        worker.currentTask = task;
      }
    }

    // Assign new task if worker is idle
    if (!worker.currentTask && globalQueue.length > 0) {
      const task = globalQueue.shift()!;
      task.status = 'RUNNING';
      worker.currentTask = task;
      memoryUsage += 10; // Each process has large memory footprint
    }
  });

  return {
    ...lane,
    workers,
    globalQueue,
    completedTasks,
    memoryUsage: Math.min(memoryUsage, 100),
  };
}

// Lane 2: Thread (Multi-Thread) - Similar to Process but with lock contention
function updateThreadLane(lane: LaneState): LaneState {
  const workers = lane.workers.map(w => ({ ...w }));
  let globalQueue = [...lane.globalQueue];
  let completedTasks = lane.completedTasks;
  let memoryUsage = lane.memoryUsage || 0;

  // Simulate lock contention: randomly pause workers
  const activeWorkers = workers.filter(w => w.currentTask);
  if (activeWorkers.length > 2 && Math.random() < 0.3) {
    // Randomly block a worker for this tick
    const randomWorker = workers[Math.floor(Math.random() * workers.length)];
    randomWorker.isBlocked = true;
  } else {
    workers.forEach(w => w.isBlocked = false);
  }

  workers.forEach(worker => {
    if (worker.isBlocked) return; // Skip this tick due to lock contention

    if (worker.currentTask) {
      const task = { ...worker.currentTask };
      
      if (task.type === 'IO') {
        if (task.progress < 30) {
          task.progress += IO_PROGRESS_SPEED;
        } else if (task.ioWaitTime === undefined) {
          task.status = 'WAITING_IO';
          task.ioWaitTime = IO_WAIT_TICKS;
        } else if (task.ioWaitTime > 0) {
          task.ioWaitTime--;
        } else {
          task.progress = 100;
          task.status = 'DONE';
        }
      } else {
        task.progress += CPU_PROGRESS_SPEED;
        if (task.progress >= 100) {
          task.progress = 100;
          task.status = 'DONE';
        }
      }

      if (task.status === 'DONE') {
        worker.currentTask = null;
        completedTasks++;
      } else {
        worker.currentTask = task;
      }
    }

    if (!worker.currentTask && globalQueue.length > 0) {
      const task = globalQueue.shift()!;
      task.status = 'RUNNING';
      worker.currentTask = task;
      memoryUsage += 3; // Threads have smaller memory footprint
    }
  });

  return {
    ...lane,
    workers,
    globalQueue,
    completedTasks,
    memoryUsage: Math.min(memoryUsage, 100),
  };
}

// Lane 3: Coroutine (Single-threaded Event Loop) - Non-blocking IO, but CPU blocks everything
function updateCoroutineLane(lane: LaneState): LaneState {
  const workers = lane.workers.map(w => ({ ...w }));
  let globalQueue = [...lane.globalQueue];
  let waitingIO = [...lane.waitingIO];
  let completedTasks = lane.completedTasks;

  const worker = workers[0]; // Only one worker

  // Process waiting IO tasks
  waitingIO = waitingIO.map(task => {
    const updated = { ...task };
    if (updated.ioWaitTime && updated.ioWaitTime > 0) {
      updated.ioWaitTime--;
      if (updated.ioWaitTime === 0) {
        updated.progress = 100;
        updated.status = 'DONE';
      }
    }
    return updated;
  });

  // Remove completed tasks from waitingIO
  const completedIO = waitingIO.filter(t => t.status === 'DONE');
  completedTasks += completedIO.length;
  waitingIO = waitingIO.filter(t => t.status !== 'DONE');

  if (worker.currentTask) {
    const task = { ...worker.currentTask };
    
    if (task.type === 'IO') {
      // IO task: quickly hand off to waiting pool
      if (task.progress < 30) {
        task.progress += IO_PROGRESS_SPEED;
        worker.currentTask = task;
      } else {
        // Hand off to waiting pool and take next task immediately
        task.status = 'WAITING_IO';
        task.ioWaitTime = IO_WAIT_TICKS;
        waitingIO.push(task);
        worker.currentTask = null;
      }
    } else {
      // CPU task: BLOCKS the entire event loop
      task.progress += CPU_PROGRESS_SPEED;
      if (task.progress >= 100) {
        task.progress = 100;
        task.status = 'DONE';
        worker.currentTask = null;
        completedTasks++;
      } else {
        worker.currentTask = task;
      }
    }
  }

  // Assign new task if worker is idle
  if (!worker.currentTask && globalQueue.length > 0) {
    const task = globalQueue.shift()!;
    task.status = 'RUNNING';
    worker.currentTask = task;
  }

  return {
    ...lane,
    workers,
    globalQueue,
    waitingIO,
    completedTasks,
  };
}

// Lane 4: Goroutine (M:N Scheduling with Work Stealing)
function updateGoroutineLane(lane: LaneState): LaneState {
  const workers = lane.workers.map(w => ({ ...w }));
  let localQueues = lane.localQueues!.map(q => [...q]);
  let completedTasks = lane.completedTasks;

  workers.forEach((worker, idx) => {
    if (worker.currentTask) {
      const task = { ...worker.currentTask };
      
      if (task.type === 'IO') {
        // Fast non-blocking IO
        task.progress += IO_PROGRESS_SPEED;
        if (task.progress >= 100) {
          task.progress = 100;
          task.status = 'DONE';
          worker.currentTask = null;
          completedTasks++;
        } else {
          worker.currentTask = task;
        }
      } else {
        // CPU task: slow but doesn't block other workers
        task.progress += CPU_PROGRESS_SPEED;
        if (task.progress >= 100) {
          task.progress = 100;
          task.status = 'DONE';
          worker.currentTask = null;
          completedTasks++;
        } else {
          worker.currentTask = task;
        }
      }
    }

    // Assign new task from local queue
    if (!worker.currentTask && localQueues[idx].length > 0) {
      const task = localQueues[idx].shift()!;
      task.status = 'RUNNING';
      worker.currentTask = task;
    }
  });

  // Work Stealing: Idle workers steal from busy workers
  workers.forEach((worker, idx) => {
    if (!worker.currentTask && localQueues[idx].length === 0) {
      // This worker is idle, try to steal
      for (let i = 0; i < workers.length; i++) {
        if (i !== idx && localQueues[i].length > 2) {
          // Steal half of the tasks
          const stealCount = Math.floor(localQueues[i].length / 2);
          const stolen = localQueues[i].splice(0, stealCount);
          localQueues[idx].push(...stolen);
          break;
        }
      }
    }
  });

  return {
    ...lane,
    workers,
    localQueues,
    completedTasks,
  };
}
