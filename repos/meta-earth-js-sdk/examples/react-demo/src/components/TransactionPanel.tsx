import React, { useState } from 'react'
import { Card, Space, Button, Form, Input, Select, message } from 'antd'
import type { MetaEarthSDK, Layer } from 'meta-earth-js-sdk'

interface TransactionPanelProps {
  sdk: MetaEarthSDK
  isInitialized: boolean
  addLog: (message: string) => void
}

export const TransactionPanel: React.FC<TransactionPanelProps> = ({
  sdk,
  isInitialized,
  addLog,
}) => {
  const [form] = Form.useForm()
  const [layer, setLayer] = useState<Layer>('hub')

  const handleTransfer = async () => {
    if (!isInitialized) {
      message.error('Please initialize the SDK first')
      return
    }

    try {
      const values = await form.validateFields()
      const denom = values.denom || 'umec'
      addLog('Preparing transfer...')
      addLog(`  From: ${values.fromAddress}`)
      addLog(`  To: ${values.toAddress}`)
      addLog(`  Amount: ${values.amount} ${denom}`)
      addLog(`  Layer: ${layer}`)

      const result = await sdk.transaction.transfer({
        fromAddress: values.fromAddress,
        toAddress: values.toAddress,
        amount: [{ amount: values.amount, denom }],
        layer,
        memo: values.memo,
      })

      addLog(`Transfer successful. Transaction hash: ${result}`)
      message.success('Transfer successful!')
      form.resetFields()
    } catch (error: any) {
      addLog(`Transfer failed: ${error.message}`)
      message.error(`Transfer failed: ${error.message}`)
    }
  }

  return (
    <Card title="Token Transfer" className="demo-section">
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          fromAddress: 'me1your_address_here',
          toAddress: 'me1recipient_address_here',
          amount: '1000',
          denom: 'umec',
          memo: '',
          layer: 'hub',
        }}
      >
        <Space.Compact style={{ width: '100%' }}>
          <Form.Item
            name="fromAddress"
            label="From Address"
            rules={[{ required: true }]}
            style={{ flex: 1 }}
          >
            <Input placeholder="metaearth1..." />
          </Form.Item>
        </Space.Compact>

        <Space.Compact style={{ width: '100%' }}>
          <Form.Item
            name="toAddress"
            label="To Address"
            rules={[{ required: true }]}
            style={{ flex: 1 }}
          >
            <Input placeholder="metaearth1..." />
          </Form.Item>
        </Space.Compact>

        <Space.Compact>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
            <Input placeholder="1000" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="denom" label="Token Denom" rules={[{ required: true }]}>
            <Input placeholder="uatom" style={{ width: 120 }} />
          </Form.Item>
          <Form.Item label="Layer">
            <Select value={layer} onChange={setLayer} style={{ width: 120 }}>
              <Select.Option value="hub">HUB Layer</Select.Option>
              <Select.Option value="rollapp">Rollapp Layer</Select.Option>
            </Select>
          </Form.Item>
        </Space.Compact>

        <Form.Item name="memo" label="Memo (optional)">
          <Input.TextArea rows={2} placeholder="Transfer memo" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" size="large" onClick={handleTransfer} style={{ width: '100%' }}>
            Send Tokens
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}
