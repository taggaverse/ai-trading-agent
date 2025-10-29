// Mock Daydreams types for compilation
// In production, these would come from @daydreamsai packages

export function context(config: any) {
  return {
    create: async (args: any) => ({}),
    use: (fn: any) => ({
      create: async (args: any) => ({})
    })
  }
}

export function action(config: any) {
  return async (input: any) => ({})
}

export async function createDreams(config: any) {
  return {
    send: async (input: any) => ({})
  }
}

export async function createDreamsRouterAuth(account: any, config: any) {
  return {
    dreamsRouter: (model: string) => model,
    account
  }
}

export async function getAccount(config: any) {
  return {
    getBalance: async () => 1000000,
    refill: async (amount: bigint) => true
  }
}
