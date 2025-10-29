// Mock Daydreams types for compilation
// In production, these would come from @daydreamsai packages

export function context(config: any) {
  return {
    create: async (args: any) => {
      // Return a properly initialized context state
      return {
        ...args.args,
        initialized: true,
        timestamp: Date.now(),
      }
    },
    use: (fn: any) => ({
      create: async (args: any) => ({
        ...args.args,
        initialized: true,
        timestamp: Date.now(),
      })
    })
  }
}

export function action(config: any) {
  return async (input: any) => ({
    success: true,
    data: input
  })
}

export async function createDreams(config: any) {
  return {
    send: async (input: any) => ({
      success: true,
      data: input
    })
  }
}

export async function createDreamsRouterAuth(account: any, config: any) {
  return {
    dreamsRouter: (model: string) => model,
    account: {
      ...account,
      getBalance: async () => 1000000,
      refill: async (amount: bigint) => true
    }
  }
}

export async function getAccount(config: any) {
  return {
    address: config.walletAddress,
    getBalance: async () => 1000000,
    refill: async (amount: bigint) => true
  }
}
