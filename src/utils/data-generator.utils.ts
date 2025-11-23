export class DataGenerator {
  private static readonly FIRST_NAMES = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Emma', 'Chris', 'Lisa'];
  private static readonly LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller'];
  private static readonly DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'example.com'];

  static randomString(length: number = 10, chars?: string): string {
    const characters = chars || 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  static randomEmail(domain?: string): string {
    const firstName = this.randomElement(this.FIRST_NAMES).toLowerCase();
    const lastName = this.randomElement(this.LAST_NAMES).toLowerCase();
    const selectedDomain = domain || this.randomElement(this.DOMAINS);
    return `${firstName}.${lastName}${this.randomInt(1, 999)}@${selectedDomain}`;
  }

  static randomName(): string {
    return `${this.randomElement(this.FIRST_NAMES)} ${this.randomElement(this.LAST_NAMES)}`;
  }

  static randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static randomFloat(min: number, max: number, decimals: number = 2): number {
    const value = Math.random() * (max - min) + min;
    return Number(value.toFixed(decimals));
  }

  static randomDate(start: Date, end: Date): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }

  static randomBoolean(probability: number = 0.5): boolean {
    return Math.random() < probability;
  }

  static randomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  static randomElements<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, array.length));
  }

  static uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  static generateUsers(count: number): Array<{ email: string; name: string; age: number }> {
    return Array.from({ length: count }, () => ({
      email: this.randomEmail(),
      name: this.randomName(),
      age: this.randomInt(18, 80),
    }));
  }

  static generateBulkData<T>(count: number, generator: (index: number) => T): T[] {
    return Array.from({ length: count }, (_, i) => generator(i));
  }

  static sequence(start: number, end: number, step: number = 1): number[] {
    const result: number[] = [];
    for (let i = start; i <= end; i += step) {
      result.push(i);
    }
    return result;
  }
}
