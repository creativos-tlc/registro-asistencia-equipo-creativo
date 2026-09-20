// Interfaz mínima de base de datos que usan los handlers.
// Permite que el mismo código de negocio corra sobre D1 (producción, Worker)
// o sobre better-sqlite3 (desarrollo local, dev-server.js) sin duplicar lógica.
export interface Db {
  first<T = any>(sql: string, params?: any[]): Promise<T | null>;
  all<T = any>(sql: string, params?: any[]): Promise<T[]>;
  run(sql: string, params?: any[]): Promise<void>;
}

export function d1Db(database: D1Database): Db {
  return {
    async first<T>(sql: string, params: any[] = []) {
      return (await database.prepare(sql).bind(...params).first()) as T | null;
    },
    async all<T>(sql: string, params: any[] = []) {
      const res = await database.prepare(sql).bind(...params).all();
      return res.results as T[];
    },
    async run(sql: string, params: any[] = []) {
      await database.prepare(sql).bind(...params).run();
    },
  };
}
