import { IPerformanceMetrics } from "../interfaces/performance-metrics";
import { IPerformanceReport } from "../interfaces/performance-report";

export class PerformanceMonitor {
  private metrics: IPerformanceMetrics[] = [];
  private timers: Map<string, { start: number; metadata?: Record<string, any> }> = new Map();
  private maxMetrics = 10000;

  constructor(maxMetrics: number = 10000) {
    this.maxMetrics = maxMetrics;
  }

  start(operation: string, metadata?: Record<string, any>): void {
    this.timers.set(operation, {
      start: performance.now(),
      metadata,
    });
  }

  end(operation: string, additionalMetadata?: Record<string, any>): number {
    const timer = this.timers.get(operation);
    if (!timer) {
      console.warn(`Timer "${operation}" not found`);
      return 0;
    }

    const duration = performance.now() - timer.start;
    const metadata = { ...timer.metadata, ...additionalMetadata };

    this.metrics.push({
      operation,
      duration,
      timestamp: new Date(),
      metadata,
      memory: this.getMemoryUsage(),
    });

    this.timers.delete(operation);

    // Trim if exceeds max
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    return duration;
  }

  async measure<T>(operation: string, callback: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    this.start(operation, metadata);
    try {
      const result = await callback();
      this.end(operation);
      return result;
    } catch (error) {
      this.end(operation, { error: String(error) });
      throw error;
    }
  }

  measureSync<T>(operation: string, callback: () => T, metadata?: Record<string, any>): T {
    this.start(operation, metadata);
    try {
      const result = callback();
      this.end(operation);
      return result;
    } catch (error) {
      this.end(operation, { error: String(error) });
      throw error;
    }
  }

  getMetrics(operation?: string): IPerformanceMetrics[] {
    if (!operation) return [...this.metrics];
    return this.metrics.filter(m => m.operation === operation);
  }

  getAverageDuration(operation: string): number {
    const ops = this.getMetrics(operation);
    if (ops.length === 0) return 0;
    
    const total = ops.reduce((sum, op) => sum + op.duration, 0);
    return total / ops.length;
  }

  getReport(operation?: string): IPerformanceReport[] {
    const operations = operation 
      ? [operation]
      : [...new Set(this.metrics.map(m => m.operation))];

    return operations.map(op => {
      const metrics = this.getMetrics(op);
      const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
      
      return {
        operation: op,
        count: metrics.length,
        totalDuration: durations.reduce((sum, d) => sum + d, 0),
        avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        p50: this.percentile(durations, 50),
        p95: this.percentile(durations, 95),
        p99: this.percentile(durations, 99),
      };
    });
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      used: usage.heapUsed,
      total: usage.heapTotal,
    };
  }

  clear(): void {
    this.metrics = [];
    this.timers.clear();
  }

  printReport(operation?: string): void {
    console.log('\n⚡ Performance Report');
    console.log('═'.repeat(80));
    
    const reports = this.getReport(operation);
    
    for (const report of reports) {
      console.log(`\n${report.operation}:`);
      console.log(`  Count:        ${report.count}`);
      console.log(`  Total:        ${report.totalDuration.toFixed(2)}ms`);
      console.log(`  Average:      ${report.avgDuration.toFixed(2)}ms`);
      console.log(`  Min:          ${report.minDuration.toFixed(2)}ms`);
      console.log(`  Max:          ${report.maxDuration.toFixed(2)}ms`);
      console.log(`  P50 (median): ${report.p50.toFixed(2)}ms`);
      console.log(`  P95:          ${report.p95.toFixed(2)}ms`);
      console.log(`  P99:          ${report.p99.toFixed(2)}ms`);
    }

    console.log('\n' + '═'.repeat(80));
  }

  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }

  getSlowest(limit: number = 10): IPerformanceMetrics[] {
    return [...this.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  getMemoryStats(): { avg: number; max: number; min: number } {
    const memories = this.metrics
      .filter(m => m.memory)
      .map(m => m.memory!.used);

    if (memories.length === 0) {
      return { avg: 0, max: 0, min: 0 };
    }

    return {
      avg: memories.reduce((sum, m) => sum + m, 0) / memories.length,
      max: Math.max(...memories),
      min: Math.min(...memories),
    };
  }
}
