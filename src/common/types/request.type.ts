import { z } from 'zod'

import type { paginationFilterSchema } from '#/common/schemas/request.schema'

export type TPaginationFilter = z.infer<typeof paginationFilterSchema>
