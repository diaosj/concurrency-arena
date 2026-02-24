import { Play, Pause, RotateCcw, Zap, Activity } from 'lucide-react';
import { useSimulation } from './useSimulation';
import { Lane } from './Lane';

function App() {
  const {
    isRunning,
    setIsRunning,
    processLane,
    threadLane,
    coroutineLane,
    goroutineLane,
    spawnIOTasks,
    injectCPUTask,
    reset,
  } = useSimulation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-5xl font-bold text-white mb-3 flex items-center gap-3">
          <Activity className="w-12 h-12 text-blue-400" />
          Concurrency Arena
        </h1>
        <p className="text-gray-400 text-lg">
          Visual comparison of 4 concurrency models: Process, Thread, Coroutine, and Goroutine
        </p>
      </div>

      {/* Control Panel */}
      <div className="max-w-7xl mx-auto mb-8 bg-gray-900 rounded-xl p-6 shadow-2xl border border-gray-700">
        <div className="flex flex-wrap gap-4 items-center">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              isRunning
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-5 h-5" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Start
              </>
            )}
          </button>

          <button
            onClick={() => spawnIOTasks(20)}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all"
            disabled={isRunning}
          >
            <Activity className="w-5 h-5" />
            Spawn 20 I/O Tasks
          </button>

          <button
            onClick={injectCPUTask}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all"
            disabled={isRunning}
          >
            <Zap className="w-5 h-5" />
            Inject 1 CPU Task (Poison ☠️)
          </button>

          <button
            onClick={reset}
            className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all ml-auto"
          >
            <RotateCcw className="w-5 h-5" />
            Reset
          </button>
        </div>

        <div className="mt-4 p-4 bg-gray-800 rounded-lg">
          <div className="text-sm text-gray-300">
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>I/O Task (Fast, Non-blocking in some models)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>CPU Task (Slow, Blocking)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span>Waiting I/O</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The 4 Lanes */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Lane
          title="1. Multi-Process"
          description="4 Workers, Shared Queue. I/O blocks worker completely. Massive memory footprint."
          state={processLane}
          color="bg-gradient-to-br from-purple-900 to-purple-800"
        />

        <Lane
          title="2. Multi-Thread"
          description="4 Workers, Shared Queue. I/O blocks worker. Lock contention may pause workers randomly."
          state={threadLane}
          color="bg-gradient-to-br from-blue-900 to-blue-800"
        />

        <Lane
          title="3. Coroutine (Event Loop)"
          description="1 Worker, Event Loop. I/O is non-blocking! But CPU task freezes everything."
          state={coroutineLane}
          color="bg-gradient-to-br from-green-900 to-green-800"
        />

        <Lane
          title="4. Goroutine (M:N + Work Stealing)"
          description="4 Workers, Local Queues. Work stealing keeps throughput high even with CPU tasks."
          state={goroutineLane}
          color="bg-gradient-to-br from-cyan-900 to-cyan-800"
        />
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto mt-8 text-center text-gray-500 text-sm">
        <p>Observe how different concurrency models handle I/O and CPU-bound tasks!</p>
      </div>
    </div>
  );
}

export default App;
