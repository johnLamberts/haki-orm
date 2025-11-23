/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-misused-promises */
export class JobScheduler {
  private jobs: Map<string, IJob> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private running = false;

  /**
   * Register a job
   */
  register(job: Omit<IJob, 'lastRun' | 'nextRun'>): void {
    const fullJob: IJob = {
      ...job,
      enabled: job.enabled ?? true,
    };
    
    this.jobs.set(job.id, fullJob);
    
    if (this.running && fullJob.enabled) {
      this.scheduleJob(fullJob);
    }
  }

  /**
   * Unregister a job
   */
  unregister(jobId: string): void {
    this.stopJob(jobId);
    this.jobs.delete(jobId);
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.running) return;
    
    this.running = true;
    
    for (const job of this.jobs.values()) {
      if (job.enabled) {
        this.scheduleJob(job);
      }
    }
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    this.running = false;
    
    for (const jobId of this.intervals.keys()) {
      this.stopJob(jobId);
    }
  }

  /**
   * Schedule a specific job
   */
  private scheduleJob(job: IJob): void {
    const interval = this.parseCronToInterval(job.schedule);
    
    const timerId = setInterval(async () => {
      try {
        console.log(`[${new Date().toISOString()}] Running job: ${job.name}`);
        
        job.lastRun = new Date();
        await job.handler();
        
        job.nextRun = new Date(Date.now() + interval);
        
        console.log(`[${new Date().toISOString()}] Completed job: ${job.name}`);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in job ${job.name}:`, error);
      }
    }, interval);
    
    this.intervals.set(job.id, timerId);
    
    // Set next run time
    job.nextRun = new Date(Date.now() + interval);
  }

  /**
   * Stop a specific job
   */
  private stopJob(jobId: string): void {
    const timerId = this.intervals.get(jobId);
    if (timerId) {
      clearInterval(timerId);
      this.intervals.delete(jobId);
    }
  }

  /**
   * Parse cron expression to milliseconds (simplified)
   */
  private parseCronToInterval(cron: string): number {
    // Simple parser for common patterns
    // Format: "* * * * *" (minute hour day month weekday)
    
    const patterns: Record<string, number> = {
      '* * * * *': 60000,           // Every minute
      '*/5 * * * *': 300000,        // Every 5 minutes
      '*/15 * * * *': 900000,       // Every 15 minutes
      '*/30 * * * *': 1800000,      // Every 30 minutes
      '0 * * * *': 3600000,         // Every hour
      '0 0 * * *': 86400000,        // Every day at midnight
      '0 0 * * 0': 604800000,       // Every week
    };
    
    return patterns[cron] || 60000; // Default to 1 minute
  }

  /**
   * Get all registered jobs
   */
  getJobs(): IJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): IJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Enable a job
   */
  enable(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.enabled = true;
      if (this.running) {
        this.scheduleJob(job);
      }
    }
  }

  /**
   * Disable a job
   */
  disable(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.enabled = false;
      this.stopJob(jobId);
    }
  }

  /**
   * Run a job immediately
   */
  async runNow(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    console.log(`[${new Date().toISOString()}] Manually running job: ${job.name}`);
    job.lastRun = new Date();
    await job.handler();
    console.log(`[${new Date().toISOString()}] Completed job: ${job.name}`);
  }
}

// src/advanced/jobs/database-jobs.ts
import { Connection } from '../../core/connection';
import { IJob } from '../../interfaces/job';

export class DatabaseJobs {
  /**
   * Cleanup old records job
   */
  static cleanupOldRecords(
    table: string,
    column: string,
    daysOld: number
  ): () => Promise<void> {
    return async () => {
      const conn = Connection.getInstance();
      const sql = `
        DELETE FROM ${table}
        WHERE ${column} < DATE_SUB(NOW(), INTERVAL ${daysOld} DAY)
      `;
      const [result] = await conn.execute(sql);
      console.log(`Cleaned up ${(result as any).affectedRows} old records from ${table}`);
    };
  }

  /**
   * Update statistics job
   */
  static updateStatistics(table: string): () => Promise<void> {
    return async () => {
      const conn = Connection.getInstance();
      await conn.execute(`ANALYZE TABLE ${table}`);
      console.log(`Updated statistics for table: ${table}`);
    };
  }

  /**
   * Optimize table job
   */
  static optimizeTable(table: string): () => Promise<void> {
    return async () => {
      const conn = Connection.getInstance();
      await conn.execute(`OPTIMIZE TABLE ${table}`);
      console.log(`Optimized table: ${table}`);
    };
  }

  /**
   * Backup database job
   */
  static backupDatabase(): () => Promise<void> {
    return async () => {
      // In production, you'd use mysqldump or similar
      console.log('Running database backup...');
      // Implementation depends on your backup strategy
    };
  }

  /**
   * Aggregate data job
   */
  static aggregateData(
    sourceTable: string,
    targetTable: string,
    aggregation: string
  ): () => Promise<void> {
    return async () => {
      const conn = Connection.getInstance();
      await conn.execute(`
        INSERT INTO ${targetTable}
        ${aggregation}
      `);
      console.log(`Aggregated data from ${sourceTable} to ${targetTable}`);
    };
  }

  /**
   * Send notifications job
   */
  static sendNotifications(query: string): () => Promise<void> {
    return async () => {
      const conn = Connection.getInstance();
      const results = await conn.query(query);
      console.log(`Found ${(results as any[]).length} notifications to send`);
      // Implement your notification logic here
    };
  }
}
