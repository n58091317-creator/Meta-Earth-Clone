import React, { useState } from 'react'
import { Card, Space, Button, Input, Select, message, Tabs, Form } from 'antd'
import type { MetaEarthSDK, Layer } from 'meta-earth-js-sdk'

interface QueryPanelProps {
  sdk: MetaEarthSDK
  isInitialized: boolean
  addLog: (message: string) => void
}

export const QueryPanel: React.FC<QueryPanelProps> = ({ sdk, isInitialized, addLog }) => {
  const [balanceForm] = Form.useForm()
  const [txHash, setTxHash] = useState('')
  const [layer, setLayer] = useState<Layer>('hub')

  const handleGetBalance = async () => {
    if (!isInitialized) {
      message.error('Please initialize the SDK first')
      return
    }

    try {
      const values = await balanceForm.validateFields()
      addLog(`Checking balance for ${values.address} (${layer})`)

      try {
        const balances = await sdk.wallet.getBalance(values.address, layer)
        // umec => hub
        // rollapp uses the first balance entry directly
        let balance = null
        if (layer === 'hub') {
          balance = balances.find((b) => b.denom === 'umec') || { amount: '0', denom: 'umec' }
        } else {
          balance = balances[0]
        }
        addLog(`Balance query successful: ${balance.amount} ${balance.denom}`)
        message.success(`Query successful: ${balance.amount} ${balance.denom}`)
      } catch (error: any) {
        addLog(`Query failed: ${error.message}`)
        message.error('Query failed')
      }
    } catch (error: any) {
      message.error('Please enter a valid address')
    }
  }

  const handleGetNetworkId = async () => {
    if (!isInitialized) {
      message.error('Please initialize the SDK first')
      return
    }

    try {
      addLog(`Loading network status (${layer})...`)
      const status = await sdk.wallet.getNetworkStatus(layer)
      const network = status.result.node_info.network
      const latestBlockHeight = status.result.sync_info.latest_block_height

      addLog(`Network ID: ${network}`)
      addLog(`Latest block height: ${latestBlockHeight}`)
      message.success(`Network: ${network}`)
    } catch (error: any) {
      addLog(`Query failed: ${error.message}`)
      message.error('Query failed')
    }
  }

  const handleGetNodeVersion = async () => {
    if (!isInitialized) {
      message.error('Please initialize the SDK first')
      return
    }

    try {
      addLog(`Loading node version (${layer})...`)
      const version = await sdk.wallet.getNodeVersion(layer)
      const nodeVersion = version.result.response.version

      addLog(`Node version: ${nodeVersion}`)
      message.success(`Node version: ${nodeVersion}`)
    } catch (error: any) {
      addLog(`Query failed: ${error.message}`)
      message.error('Query failed')
    }
  }

  const handleGetTransaction = async () => {
    if (!isInitialized) {
      message.error('Please initialize the SDK first')
      return
    }

    if (!txHash) {
      message.error('Please enter a transaction hash')
      return
    }

    try {
      addLog(`Fetching transaction details: ${txHash} (${layer})...`)
      const tx = await sdk.transaction.getTransaction(txHash, layer)
      addLog(`Transaction details: ${JSON.stringify(tx, null, 2)}`)
      message.success('Transaction loaded successfully')
    } catch (error: any) {
      addLog(`Query failed: ${error.message}`)
      message.error('Query failed')
    }
  }

  return (
    <Card title="Queries" className="demo-section">
      <Tabs
        items={[
          {
            key: 'balance',
            label: 'Balances',
            children: (
              <Space orientation="vertical" style={{ width: '100%' }}>
                <Form
                  form={balanceForm}
                  layout="inline"
                  initialValues={{ address: '', layer: 'hub' }}
                >
                  <Form.Item name="address" rules={[{ required: true }]}>
                    <Input placeholder="Enter an address" style={{ width: 400 }} />
                  </Form.Item>
                  <Form.Item>
                    <Select value={layer} onChange={setLayer} style={{ width: 120 }}>
                      <Select.Option value="hub">HUB Layer</Select.Option>
                      <Select.Option value="rollapp">Rollapp Layer</Select.Option>
                    </Select>
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" onClick={handleGetBalance}>
                      Check Balance
                    </Button>
                  </Form.Item>
                </Form>
              </Space>
            ),
          },
          {
            key: 'network',
            label: 'Network',
            children: (
              <Space>
                <Select value={layer} onChange={setLayer} style={{ width: 120 }}>
                  <Select.Option value="hub">HUB Layer</Select.Option>
                  <Select.Option value="rollapp">Rollapp Layer</Select.Option>
                </Select>
                <Button type="primary" onClick={handleGetNetworkId}>
                  View Network Status
                </Button>
                <Button onClick={handleGetNodeVersion}>View Node Version</Button>
              </Space>
            ),
          },
          {
            key: 'transaction',
            label: 'Transactions',
            children: (
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  placeholder="Enter a transaction hash (0x...)"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  style={{ width: '60%' }}
                />
                <Select value={layer} onChange={setLayer} style={{ width: 120 }}>
                  <Select.Option value="hub">HUB Layer</Select.Option>
                  <Select.Option value="rollapp">Rollapp Layer</Select.Option>
                </Select>
                <Button type="primary" onClick={handleGetTransaction}>
                  View Transaction
                </Button>
              </Space.Compact>
            ),
          },
        ]}
      />
    </Card>
  )
}
