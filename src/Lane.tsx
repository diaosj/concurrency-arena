import { LaneState, Task } from './types';

interface LaneProps {
  title: string;
  description: string;
  state: LaneState;
  color: string;
}

export function Lane({ title, description, state, color }: LaneProps) {
  const { workers, globalQueue, localQueues, waitingIO, memoryUsage, completedTasks } = state;

  return (
    <div className={`${color} rounded-xl p-6 flex flex-col h-full shadow-2xl`}>
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
        <p className="text-sm text-gray-300">{description}</p>
        <div className="mt-2 text-xs text-gray-400">
          Completed: <span className="text-green-400 font-bold">{completedTasks}</span>
        </div>
      </div>

      {/* Memory Usage (for Process) */}
      {memoryUsage !== undefined && (
        <div className="mb-4">
          <div className="text-xs text-gray-300 mb-1">Memory Usage</div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className="bg-red-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${memoryUsage}%` }}
            />
          </div>
        </div>
      )}

      {/* Global Queue */}
      {globalQueue && globalQueue.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-gray-300 mb-2">Global Queue ({globalQueue.length})</div>
          <div className="flex flex-wrap gap-1">
            {globalQueue.slice(0, 20).map(task => (
              <TaskBlock key={task.id} task={task} size="sm" />
            ))}
            {globalQueue.length > 20 && (
              <div className="text-xs text-gray-400">+{globalQueue.length - 20} more</div>
            )}
          </div>
        </div>
      )}

      {/* Local Queues (for Goroutine) */}
      {localQueues && (
        <div className="mb-4">
          <div className="text-xs text-gray-300 mb-2">Local Queues</div>
          <div className="grid grid-cols-4 gap-2">
            {localQueues.map((queue, idx) => (
              <div key={idx} className="bg-gray-800 rounded p-1">
                <div className="text-xs text-gray-400 mb-1">Q{idx}</div>
                <div className="flex flex-col gap-1">
                  {queue.slice(0, 3).map(task => (
                    <TaskBlock key={task.id} task={task} size="xs" />
                  ))}
                  {queue.length > 3 && (
                    <div className="text-xs text-gray-500">+{queue.length - 3}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Waiting IO (for Coroutine) */}
      {waitingIO && waitingIO.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-gray-300 mb-2">Waiting I/O ({waitingIO.length})</div>
          <div className="flex flex-wrap gap-1">
            {waitingIO.slice(0, 10).map(task => (
              <TaskBlock key={task.id} task={task} size="sm" />
            ))}
            {waitingIO.length > 10 && (
              <div className="text-xs text-gray-400">+{waitingIO.length - 10} more</div>
            )}
          </div>
        </div>
      )}

      {/* Workers */}
      <div className="flex-1">
        <div className="text-xs text-gray-300 mb-2">Workers ({workers.length})</div>
        <div className="grid grid-cols-2 gap-3">
          {workers.map(worker => (
            <WorkerSlot key={worker.id} worker={worker} />
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkerSlot({ worker }: { worker: { id: number; currentTask: Task | null; isBlocked?: boolean } }) {
  return (
    <div className={`bg-gray-800 rounded-lg p-3 min-h-[100px] transition-all duration-200 ${
      worker.isBlocked ? 'opacity-50 border-2 border-red-500' : ''
    }`}>
      <div className="text-xs text-gray-400 mb-2">
        Worker {worker.id}
        {worker.isBlocked && <span className="text-red-400 ml-1">(LOCKED)</span>}
      </div>
      {worker.currentTask ? (
        <TaskBlock task={worker.currentTask} size="lg" showProgress />
      ) : (
        <div className="text-xs text-gray-600 text-center py-4">Idle</div>
      )}
    </div>
  );
}

function TaskBlock({ 
  task, 
  size = 'md', 
  showProgress = false 
}: { 
  task: Task; 
  size?: 'xs' | 'sm' | 'md' | 'lg'; 
  showProgress?: boolean;
}) {
  const sizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-full h-auto'
  };

  const bgColor = task.type === 'IO' ? 'bg-green-500' : 'bg-red-500';
  const statusColor = task.status === 'WAITING_IO' ? 'bg-yellow-500' : bgColor;

  if (size === 'lg' && showProgress) {
    return (
      <div className="space-y-2">
        <div className={`${statusColor} rounded px-2 py-1 text-xs text-white font-semibold`}>
          {task.type} Task
          {task.status === 'WAITING_IO' && ' (Waiting)'}
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className={`${bgColor} h-2 rounded-full transition-all duration-200`}
            style={{ width: `${task.progress}%` }}
          />
        </div>
        <div className="text-xs text-gray-400">{Math.floor(task.progress)}%</div>
      </div>
    );
  }

  return (
    <div
      className={`${statusColor} ${sizeClasses[size]} rounded transition-all duration-200`}
      title={`${task.type} Task - ${task.status}`}
    />
  );
}
