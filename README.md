# Concurrency Arena

A visual sandbox for comparing 4 different concurrency models: **Multi-Process**, **Multi-Thread**, **Coroutine** (Event Loop), and **Goroutine** (M:N Scheduling with Work Stealing).

![Concurrency Arena](https://github.com/user-attachments/assets/19bf0742-e9e6-49e8-8355-ce60389446af)

## 🎯 Purpose

This interactive web application helps visualize and understand how different concurrency models handle **I/O-bound** and **CPU-bound** tasks. Watch in real-time as each model processes tasks using its unique approach to concurrency.

## 🚀 Features

### Four Concurrency Models

1. **Multi-Process** (Purple Lane)
   - 4 Workers with shared global queue
   - I/O operations **block** the worker completely
   - Massive memory footprint (visualized)
   - Best for: Isolated, memory-intensive tasks

2. **Multi-Thread** (Blue Lane)
   - 4 Workers with shared global queue
   - I/O operations block the worker
   - **Lock contention** randomly pauses workers
   - Smaller memory footprint than processes
   - Best for: CPU-bound tasks with occasional I/O

3. **Coroutine / Event Loop** (Green Lane)
   - **Single Worker** (single-threaded)
   - I/O is **non-blocking** - tasks yield to waiting pool
   - **CPU tasks freeze everything** - the "poison pill" effect
   - Best for: High I/O workloads, async operations
   - ⚠️ Vulnerable to CPU-intensive tasks blocking the event loop

4. **Goroutine / M:N Scheduling** (Cyan Lane)
   - 4 Workers with **local queues** per worker
   - **Work stealing**: Idle workers steal tasks from busy workers
   - Handles CPU tasks gracefully while maintaining throughput
   - Best for: Mixed workloads with excellent load balancing

### Task Types

- **🟢 I/O Tasks (Green)**: Simulate network requests - fast initial progress, then enters waiting state
- **🔴 CPU Tasks (Red)**: Simulate heavy computation - slow, steady progress, blocks workers
- **🟡 Waiting I/O (Yellow)**: Tasks suspended while waiting for I/O completion

## 🛠️ Tech Stack

- **React** 18.2 - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TailwindCSS** - Styling
- **lucide-react** - Icons

## 📦 Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🎮 How to Use

1. **Start the simulation**: Click "Start" button
2. **Spawn I/O Tasks**: Click "Spawn 20 I/O Tasks" to add green tasks
3. **Inject CPU Task**: Click "Inject 1 CPU Task (Poison ☠️)" to add a slow red task
4. **Observe**: Watch how each concurrency model handles the workload differently
5. **Reset**: Click "Reset" to clear and start over

### Interesting Experiments

**Experiment 1: Pure I/O Workload**
- Spawn 20 I/O tasks
- Observe: Goroutine completes fastest, Coroutine handles well, Process/Thread slower due to blocking

**Experiment 2: The CPU "Poison"**
- Spawn 20 I/O tasks
- Inject 1 CPU task
- Observe: 
  - **Coroutine freezes completely** - all I/O tasks stuck!
  - **Goroutine continues processing** - work stealing keeps other workers productive
  - **Process/Thread** - one worker blocked, others continue

## 📊 Visual Elements

- **Workers**: Show current task being processed with progress bar
- **Queues**: Display pending tasks waiting to be processed
- **Memory Usage**: Progress bar showing memory consumption (Process/Thread lanes)
- **Waiting I/O Pool**: Shows suspended I/O tasks (Coroutine lane)
- **Local Queues**: Per-worker queues (Goroutine lane)
- **Lock Indicator**: Red border shows thread lock contention (Thread lane)

## 🏗️ Architecture

### Core Components

- **`useSimulation.ts`**: Custom hook managing the tick-based state machine
  - 100ms tick interval
  - Separate update logic for each concurrency model
  - Immutable state updates for React optimization

- **`types.ts`**: TypeScript interfaces for Task, Worker, and LaneState

- **`Lane.tsx`**: Reusable component for rendering each concurrency model

- **`App.tsx`**: Main application with control panel and 4-lane layout

### Simulation Logic

Each tick (100ms):
1. **Process Lane**: Workers block on I/O, consume memory
2. **Thread Lane**: Similar to Process, with random lock contention
3. **Coroutine Lane**: Single worker, non-blocking I/O, CPU tasks block event loop
4. **Goroutine Lane**: Work stealing between local queues for load balancing

## 🎓 Learning Points

- **Process isolation** vs **Thread shared memory**
- **Blocking** vs **Non-blocking** I/O
- **Event loop** limitations with CPU tasks
- **Work stealing** for dynamic load balancing
- Trade-offs between different concurrency models

## 📝 License

This is an educational project for visualizing concurrency concepts.

## 🤝 Contributing

Feel free to open issues or submit PRs to improve the visualization or add new concurrency models!
