import { ActiveWallet } from "@/utils/walletManager";

export const mockActiveWallet = (overrides = {}): ActiveWallet => ({
  address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
  chain: 'base',
  signMessage: jest.fn().mockResolvedValue('0xmockedsignature'),
  sendTransaction: jest.fn().mockResolvedValue({
    txHash: '0xmockedtransactionhash' as `0x${string}`,
  }),
  publicClient: {
    waitForTransactionReceipt: jest.fn().mockResolvedValue({
      status: 'success',
    }),
  },
  ...overrides,
}); 