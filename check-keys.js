#!/usr/bin/env node

import dotenv from 'dotenv'
import { ethers } from 'ethers'
import { Keypair, PublicKey } from '@solana/web3.js'
import bs58 from 'bs58'

dotenv.config()

console.log('🔍 Checking Private Key Formats...\n')

// Check Ethereum keys
const ethKeys = ['BASE_PRIVATE_KEY', 'BSC_PRIVATE_KEY', 'HYPERLIQUID_PRIVATE_KEY']
for (const keyName of ethKeys) {
  const pk = process.env[keyName]
  console.log(`\n${keyName}:`)
  console.log(`  Length: ${pk?.length || 0}`)
  console.log(`  Starts with 0x: ${pk?.startsWith('0x') ? '✓' : '✗'}`)
  
  if (pk) {
    try {
      const wallet = new ethers.Wallet(pk)
      console.log(`  ✓ Valid Ethereum key`)
      console.log(`  Address: ${wallet.address}`)
    } catch (e) {
      console.log(`  ✗ Invalid: ${e.message}`)
      console.log(`  First 20 chars: ${pk.substring(0, 20)}...`)
    }
  }
}

// Check Solana key
console.log(`\nSOLANA_PRIVATE_KEY:`)
const solPk = process.env.SOLANA_PRIVATE_KEY
console.log(`  Length: ${solPk?.length || 0}`)
console.log(`  Starts with 0x: ${solPk?.startsWith('0x') ? '✓' : '✗'}`)
console.log(`  First 20 chars: ${solPk?.substring(0, 20)}...`)

if (solPk) {
  // Try different formats
  let success = false
  
  // Try as Base58
  try {
    const decoded = bs58.decode(solPk)
    if (decoded.length === 64) {
      const keypair = Keypair.fromSecretKey(decoded)
      console.log(`  ✓ Valid Solana key (Base58)`)
      console.log(`  Address: ${keypair.publicKey.toString()}`)
      success = true
    }
  } catch (e) {
    console.log(`  ✗ Not valid Base58: ${e.message}`)
  }
  
  // Try as hex (0x prefix)
  if (!success && solPk.startsWith('0x')) {
    try {
      const decoded = Buffer.from(solPk.slice(2), 'hex')
      if (decoded.length === 64) {
        const keypair = Keypair.fromSecretKey(decoded)
        console.log(`  ✓ Valid Solana key (Hex format)`)
        console.log(`  Address: ${keypair.publicKey.toString()}`)
        console.log(`  Note: Convert to Base58 for .env: ${bs58.encode(decoded)}`)
        success = true
      }
    } catch (e) {
      console.log(`  ✗ Not valid hex: ${e.message}`)
    }
  }
  
  // Try as JSON array
  if (!success) {
    try {
      const arr = JSON.parse(solPk)
      if (Array.isArray(arr) && arr.length === 64) {
        const decoded = Buffer.from(arr)
        const keypair = Keypair.fromSecretKey(decoded)
        console.log(`  ✓ Valid Solana key (JSON array format)`)
        console.log(`  Address: ${keypair.publicKey.toString()}`)
        console.log(`  Note: Convert to Base58 for .env: ${bs58.encode(decoded)}`)
        success = true
      }
    } catch (e) {
      // Not JSON
    }
  }
  
  if (!success) {
    console.log(`  ✗ Could not parse Solana key`)
    console.log(`  Expected: Base58 string (~88 chars)`)
    console.log(`  Or: 0x + 128 hex chars (hex format)`)
    console.log(`  Or: [1,2,3,...,64] (JSON array)`)
  }
}

console.log('\n✅ Check complete!')
