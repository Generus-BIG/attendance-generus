import { type DataConfig } from './data'
import { createLupgOperationTools } from './lupg-operations'
import { createReportTools } from './reports'

export function createLupgTools(config: DataConfig) {
  return {
    ...createReportTools(config),
    ...createLupgOperationTools(config),
  }
}
