import { type DataConfig } from './data.js'
import { createLupgOperationTools } from './lupg-operations.js'
import { createReportTools } from './reports.js'

export function createLupgTools(config: DataConfig) {
  return {
    ...createReportTools(config),
    ...createLupgOperationTools(config),
  }
}
